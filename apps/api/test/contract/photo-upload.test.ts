import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BASE, call, signupAndLogin } from './helpers.js';

const FAKE = process.env.FAKE_SUPABASE_URL ?? 'http://localhost:54321';

async function post(token: string | null, fields: Record<string, string>, file?: { data: Buffer; type: string; name: string }) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (file) form.append('file', new Blob([new Uint8Array(file.data)], { type: file.type }), file.name);
  const r = await fetch(`${BASE}/api/photos/upload`, {
    method: 'POST', body: form,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Forwarded-For': `10.6.${Math.floor(Math.random() * 250)}.1` },
  });
  const text = await r.text();
  try { return { status: r.status, body: JSON.parse(text) }; } catch { return { status: r.status, body: text }; }
}

const solid = (fmt: 'png' | 'webp', r: number, g: number, b: number) =>
  sharp({ create: { width: 40, height: 20, channels: 3, background: { r, g, b } } })[fmt]().toBuffer();

describe('사진 업로드 (/api/photos/upload — 4단계 변형 + 색 분석, 가짜 Supabase)', () => {
  it('PNG — 201, 1024/256 주소, 변형 4개 업로드, 단색이면 대표색·분위기·팔레트가 결정적', async () => {
    const u = await signupAndLogin();
    await fetch(`${FAKE}/__log`, { method: 'DELETE' });
    const r = await post(u.token, { memberId: String(u.id), title: '빨강 <b>', gridColSpan: '99', genre: 'PORTRAIT' },
      { data: await solid('png', 255, 0, 0), type: 'image/png', name: 'red.png' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'success', message: '사진이 업로드되었습니다.' });
    const d = r.body.data;
    // 폼 값은 Spring XSS 필터처럼 이스케이프돼 저장된다(양쪽 같음)
    expect(d).toMatchObject({ memberId: u.id, title: '빨강 &lt;b&gt;', gridColSpan: 6, genre: 'PORTRAIT', dominantColor: '#FF0000', colorMood: 'VIBRANT', colorPalette: '["#FF0000"]', imageRatio: '1:1' });
    expect(d.imageUrl).toMatch(/\/images\/photos\/[0-9a-f-]{36}_1024\.png$/);
    expect(d.thumbnailUrl).toBe(d.imageUrl.replace('_1024.', '_256.'));
    expect(d.imageUrl128).toBe(d.imageUrl.replace('_1024.', '_128.'));
    const log = await (await fetch(`${FAKE}/__log`)).json();
    expect(log.map((x: any) => x.url.replace(/^.*_(\d+)\.png$/, '$1'))).toEqual(['1024', '512', '256', '128']);
    expect(new Set(log.map((x: any) => x.contentType))).toEqual(new Set(['image/png']));
  });

  it('WebP는 jpg로 저장(Nest) / Spring은 읽기 실패, 요청 colorMood가 분석값보다 우선', async () => {
    const u = await signupAndLogin();
    const r = await post(u.token, { memberId: String(u.id), title: 'w', colorMood: 'SERENE' }, { data: await solid('webp', 0, 0, 255), type: 'image/webp', name: 'b.webp' });
    // Spring은 ImageIO에 WebP 읽기 기능이 없어 항상 500 "이미지를 읽을 수 없습니다"(알려진 차이 — Nest는 정상 처리)
    if (r.status === 500) {
      expect(r.body).toEqual({ status: 'error', message: '사진 업로드 중 오류: 이미지를 읽을 수 없습니다.' });
      return;
    }
    expect(r.status).toBe(201);
    expect(r.body.data.imageUrl).toMatch(/_1024\.jpg$/);
    expect(r.body.data.colorMood).toBe('SERENE');
  });

  it('남의 명의 403, 이미지 아님 500 {status:error, 사진 업로드 중 오류: …}, 비로그인 401', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const png = await solid('png', 0, 255, 0);
    const forbidden = await post(u.token, { memberId: String(other.id), title: 't' }, { data: png, type: 'image/png', name: 'a.png' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ status: 'error', message: '본인 명의로만 사진을 등록할 수 있습니다.' });
    const txt = await post(u.token, { memberId: String(u.id), title: 't' }, { data: Buffer.from('hi'), type: 'text/plain', name: 'a.txt' });
    expect(txt.status).toBe(500);
    expect(txt.body).toEqual({ status: 'error', message: '사진 업로드 중 오류: 지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF 허용)' });
    const broken = await post(u.token, { memberId: String(u.id), title: 't' }, { data: Buffer.from('not a png'), type: 'image/png', name: 'a.png' });
    expect(broken.body).toEqual({ status: 'error', message: '사진 업로드 중 오류: 이미지를 읽을 수 없습니다.' });
    expect((await post(null, { memberId: String(u.id), title: 't' }, { data: png, type: 'image/png', name: 'a.png' })).status).toBe(401);
    expect((await call('GET', `/api/photos?memberId=${u.id}`)).body.data).toEqual([]);
  });
});
