import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, makeAdmin, setTel } from './db.js';
import { call, createPhoto, signupAndLogin, uniq } from './helpers.js';

afterAll(closeDb);

const tpl = (p: string) => `/api/portfolio/${p}/template`;

describe('포트폴리오', () => {
  it('공개 조회 — 연락처 제외·사진 최신순·초안 시리즈 제외·카운트·예약 받는 중', async () => {
    const u = await signupAndLogin();
    await setTel(u.id, '010-5555-6666');
    const fan = await signupAndLogin();
    const p1 = await createPhoto(u, { imageUrl: 'https://x/1.jpg' });
    const p2 = await createPhoto(u, { imageUrl: 'https://x/2.jpg' });
    expect((await call('POST', `/api/photos/${p1}/likes?memberId=${fan.id}`, { token: fan.token })).status).toBe(201);
    expect((await call('POST', `/api/follows?followerId=${fan.id}&followingId=${u.id}`, { token: fan.token })).status).toBe(200);
    const s1 = await call('POST', '/api/series', { token: u.token, body: { title: '공개 작업' } });
    await call('POST', `/api/series/${s1.body.id}/photos`, { token: u.token, body: { photoId: p2 } });
    await call('POST', '/api/series', { token: u.token, body: { title: '초안', draft: true } });

    const r = await call('GET', `/api/portfolio/${u.profileName}`);
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['acceptingBookings', 'followerCount', 'followingCount', 'member', 'photoCount', 'photos', 'series', 'totalLikes']);
    expect(r.body.member).toMatchObject({ id: u.id, email: null, tel: null, profileName: u.profileName });
    expect(r.body.photos.map((p: any) => p.id)).toEqual([p2, p1]);
    expect(r.body.photos[0]).toMatchObject({ memberName: null, liked: false });
    expect(r.body).toMatchObject({ photoCount: 2, totalLikes: 1, followerCount: 1, followingCount: 0, acceptingBookings: false });
    expect(r.body.series).toHaveLength(1);
    expect(r.body.series[0]).toMatchObject({ title: '공개 작업', photoCount: 1, coverImageUrl: 'https://x/2.jpg', previewPhotos: ['https://x/2.jpg'], photos: null });

    const set = await call('PUT', '/api/booking/availability-settings', { token: u.token, body: { weekdays: '1,2,3,4,5,6,7', timeSlots: '10:00', bufferHours: 0, active: true } });
    expect(set.status).toBeLessThan(300);
    expect((await call('GET', `/api/portfolio/${u.profileName}`)).body.acceptingBookings).toBe(true);
  });

  it('없는 주소 404(본문 없음), 비공개 403', async () => {
    const miss = await call('GET', `/api/portfolio/nobody-${uniq()}`);
    expect(miss.status).toBe(404);
    expect(miss.body).toBeNull();

    const u = await signupAndLogin();
    expect((await call('PUT', `/api/auth/member/${u.id}/profile`, { token: u.token, body: { publicProfile: false } })).status).toBe(200);
    const r = await call('GET', `/api/portfolio/${u.profileName}`);
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ status: 'private', message: '비공개 포트폴리오입니다.' });
  });

  it('config — 기본 EDITORIAL, 없는 주소 404 ApiResponse', async () => {
    const u = await signupAndLogin();
    const c = await call('GET', `/api/portfolio/${u.profileName}/config`);
    expect(c.status).toBe(200);
    expect(c.body).toEqual({ template: 'EDITORIAL', styleJson: null, sectionsJson: null });
    const miss = await call('GET', `/api/portfolio/nobody-${uniq()}/config`);
    expect(miss.status).toBe(404);
    expect(miss.body).toMatchObject({ success: false, code: '404', message: '포트폴리오를 찾을 수 없습니다.' });
  });

  it('템플릿 저장 — 블록 정규화(모르는 키 버림·태그 제거·클램프·id 재발급·문자열 JSON), 스타일 대문자', async () => {
    const u = await signupAndLogin();
    const r = await call('PUT', tpl(u.profileName), { token: u.token, body: {
      template: 'BLOCKS',
      sectionsJson: { blocks: [
        { id: 'hero-1', type: 'hero', props: { tagline: '  <b>빛</b>을 담다  ', align: 'center', showStats: 'true', extra: 1 } },
        { id: 'hero-1', type: 'photos', visible: false, props: { columns: 9, limit: '2', genre: 'PORTRAIT', title: 5 } },
        { id: 'BAD ID', type: 'contact', props: { showBooking: 1, body: 'x'.repeat(400) } },
        { type: 'newsletter', visible: null },
      ] },
      styleJson: JSON.stringify({ accent: '#3182f6', background: 'paper', unknown: 'x' }),
    } });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('success');
    expect(r.body.template).toBe('BLOCKS');
    const sec = JSON.parse(r.body.sectionsJson);
    expect(sec.version).toBe(1);
    const [hero, photos, contact, news] = sec.blocks;
    expect(hero).toEqual({ id: 'hero-1', type: 'hero', visible: true, props: { tagline: '빛을 담다', align: 'center', showStats: true } });
    expect(photos.id).not.toBe('hero-1');
    expect(photos.id).toMatch(/^[0-9a-f-]{8}$/);
    expect(photos).toMatchObject({ type: 'photos', visible: false, props: { columns: 4, limit: 3, genre: 'PORTRAIT', title: '5' } });
    expect(contact.id).toMatch(/^[0-9a-f-]{8}$/);
    expect(contact.props).toEqual({ showBooking: true, body: 'x'.repeat(300) });
    expect(news).toMatchObject({ type: 'newsletter', visible: true, props: {} });
    expect(JSON.parse(r.body.styleJson)).toEqual({ accent: '#3182F6', background: 'paper', version: 1 });

    const c = await call('GET', `/api/portfolio/${u.profileName}/config`);
    expect(c.body).toEqual({ template: 'BLOCKS', styleJson: r.body.styleJson, sectionsJson: r.body.sectionsJson });

    // 빈 값은 null로, template 없이 보내면 그대로
    const clear = await call('PUT', tpl(u.profileName), { token: u.token, body: { sectionsJson: '', styleJson: null } });
    expect(clear.body).toEqual({ status: 'success', template: 'BLOCKS', sectionsJson: null, styleJson: null });
  });

  it('검증 오류 — 400과 사유', async () => {
    const u = await signupAndLogin();
    const cases: [Record<string, unknown>, number, unknown][] = [
      [{ template: 'NOPE' }, 400, { message: '유효하지 않은 템플릿입니다.' }],
      [{ sectionsJson: '{bad' }, 400, '구성 형식이 올바르지 않습니다.'],
      [{ sectionsJson: '[1]' }, 400, '구성 형식이 올바르지 않습니다.'],
      [{ sectionsJson: 5 }, 400, '구성 형식이 올바르지 않습니다.'],
      [{ styleJson: '"x"' }, 400, '스타일 형식이 올바르지 않습니다.'],
      [{ sectionsJson: '{"a":' + '1'.repeat(20000) + '}' }, 400, '구성 내용이 너무 큽니다.'],
      [{ sectionsJson: {} }, 400, '구성에 블록 목록(blocks)이 없습니다.'],
      [{ sectionsJson: { blocks: Array.from({ length: 31 }, () => ({ type: 'press' })) } }, 400, '블록은 최대 30개까지 둘 수 있습니다.'],
      [{ sectionsJson: { blocks: [{ type: ' <i>video</i> ' }] } }, 400, '알 수 없는 블록 종류입니다: video'],
      [{ sectionsJson: { blocks: [{ type: 'hero', props: { align: 'right' } }] } }, 400, '허용되지 않는 설정 값입니다: align'],
      [{ sectionsJson: { blocks: [{ type: 'photos', props: { genre: 'portrait' } }] } }, 400, '장르 코드가 올바르지 않습니다.'],
      [{ styleJson: { accent: 'blue' } }, 400, '색은 #RRGGBB 형식이어야 합니다.'],
    ];
    for (const [body, status, expected] of cases) {
      const r = await call('PUT', tpl(u.profileName), { token: u.token, body });
      expect(r.status, JSON.stringify(body).slice(0, 80)).toBe(status);
      if (typeof expected === 'string') expect(r.body).toMatchObject({ success: false, code: '400', message: expected });
      else expect(r.body).toEqual(expected);
    }
    // 실패한 요청은 아무것도 바꾸지 않는다
    expect((await call('GET', `/api/portfolio/${u.profileName}/config`)).body).toEqual({ template: 'EDITORIAL', styleJson: null, sectionsJson: null });
  });

  it('권한 — 무토큰 401, 남의 포트폴리오 403, 관리자 허용, 없는 주소 404', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    expect((await call('PUT', tpl(u.profileName), { body: { template: 'MINIMAL' } })).status).toBe(401);
    const f = await call('PUT', tpl(u.profileName), { token: other.token, body: { template: 'MINIMAL' } });
    expect(f.status).toBe(403);
    expect(f.body).toEqual({ message: '본인의 포트폴리오만 수정할 수 있습니다.' });
    const miss = await call('PUT', tpl(`nobody-${uniq()}`), { token: u.token, body: { template: 'MINIMAL' } });
    expect(miss.status).toBe(404);
    expect(miss.body).toMatchObject({ code: '404', message: '포트폴리오를 찾을 수 없습니다.' });

    await makeAdmin(other.id);
    const relog = await call('POST', '/api/auth/login', { body: { email: other.email, password: 'Passw0rd!!' } });
    const ok = await call('PUT', tpl(u.profileName), { token: relog.body.data.accessToken, body: { template: 'MINIMAL' } });
    expect(ok.status).toBe(200);
    expect(ok.body.template).toBe('MINIMAL');
  });
});
