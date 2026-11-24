import { describe, expect, it } from 'vitest';
import { BASE, signupAndLogin } from './helpers.js';

const FAKE = process.env.FAKE_SUPABASE_URL ?? 'http://localhost:54321';
// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function upload(token: string | null, file: { data: Buffer; type: string; name: string } | null, folder?: string) {
  const form = new FormData();
  if (file) form.append('file', new Blob([new Uint8Array(file.data)], { type: file.type }), file.name);
  const q = folder === undefined ? '' : `?folder=${encodeURIComponent(folder)}`;
  const r = await fetch(`${BASE}/api/upload/image${q}`, {
    method: 'POST', body: form,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Forwarded-For': `10.7.${Math.floor(Math.random() * 250)}.1` },
  });
  const text = await r.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, body };
}

describe('이미지 업로드 (/api/upload/image, 가짜 Supabase)', () => {
  it('성공 — {url,status} 래퍼 없음, folder/UUID.확장자, 서비스 키·upsert로 저장소에 올림', async () => {
    const u = await signupAndLogin();
    await fetch(`${FAKE}/__log`, { method: 'DELETE' });
    const r = await upload(u.token, { data: PNG, type: 'image/png', name: 'My.Photo.PNG' }, 'avatars');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ url: expect.stringMatching(/\/storage\/v1\/object\/public\/images\/avatars\/[0-9a-f-]{36}\.png$/), status: 'success' });
    const log = await (await fetch(`${FAKE}/__log`)).json();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ method: 'POST', contentType: 'image/png', auth: 'Bearer test-service-key', upsert: 'true', size: PNG.length });
    // Spring WebClient가 키의 `/`를 %2F로 인코딩해 보낸다(양쪽 같음)
    expect(log[0].url).toMatch(/^\/storage\/v1\/object\/images\/avatars%2F[0-9a-f-]{36}\.png$/);
    const def = await upload(u.token, { data: PNG, type: 'image/png', name: 'noext' });
    expect(def.body.url).toMatch(/\/images\/photos\/[0-9a-f-]{36}\.jpg$/);
  });

  it('잘못된 folder 400 {error}, 허용 안 되는 형식 500 C001(Spring StorageException 미처리), 비로그인 401, 20MB 초과 400 F002', async () => {
    const u = await signupAndLogin();
    for (const folder of ['../x', 'a/b']) {
      const r = await upload(u.token, { data: PNG, type: 'image/png', name: 'a.png' }, folder);
      expect(r.status).toBe(400);
      expect(r.body).toEqual({ error: '유효하지 않은 folder 값입니다.' });
    }
    const txt = await upload(u.token, { data: Buffer.from('hello'), type: 'text/plain', name: 'a.txt' });
    expect(txt.status).toBe(500);
    expect(txt.body).toMatchObject({ success: false, code: 'C001' });
    expect((await upload(null, { data: PNG, type: 'image/png', name: 'a.png' })).status).toBe(401);
    const big = await upload(u.token, { data: Buffer.alloc(21 * 1024 * 1024, 1), type: 'image/png', name: 'big.png' });
    expect(big.status).toBe(400);
    expect(big.body).toMatchObject({ success: false, code: 'F002' });
  }, 60000);
});
