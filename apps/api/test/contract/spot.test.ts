import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, makeAdmin } from './db.js';
import { LOCAL_DATE_TIME, PASSWORD, call, createPhoto, signupAndLogin, uniq } from './helpers.js';

afterAll(closeDb);

// 테스트마다 다른 위치(공유 DB라 이전 실행의 스팟과 겹치지 않게)
const baseLat = () => 33 + Math.random() * 4;
const baseLng = () => 126 + Math.random() * 3;

describe('출사 스팟', () => {
  it('생성·검사·목록(범위·지역·이름·공개 사진 수·미리보기)·상세·수정·삭제, 사진 연결', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const tag = uniq();
    const lat = baseLat();
    const lng = baseLng();
    const c = await call('POST', '/api/spots', { token: u.token, body: { name: ` <b>노을</b> 언덕 ${tag} `, lat, lng: String(lng), address: '서울 마포구', region: `망원${tag}`, bestTime: '일몰', tips: '<i>삼각대</i> 필수' } });
    expect(c.status).toBe(201);
    expect(c.body).toEqual({ id: expect.any(Number), name: `노을 언덕 ${tag}`, lat, lng, address: '서울 마포구', region: `망원${tag}`, bestTime: '일몰', photoCount: 0, previewPhotos: [] });
    const id = c.body.id;

    const cases: [Record<string, unknown>, string][] = [
      [{ lat, lng }, '스팟 이름을(를) 입력해 주세요.'],
      [{ name: 'x'.repeat(51), lat, lng }, '스팟 이름은(는) 50자 이내로 입력해 주세요.'],
      [{ name: 'a', lng }, '위도 좌표가 필요합니다.'],
      [{ name: 'a', lat: 'abc', lng }, '위도 좌표가 올바르지 않습니다.'],
      [{ name: 'a', lat: 91, lng }, '위도 좌표가 범위를 벗어났습니다.'],
      [{ name: 'a', lat, lng: 200 }, '경도 좌표가 범위를 벗어났습니다.'],
      [{ name: 'a', lat, lng, tips: 'x'.repeat(1001) }, '팁은(는) 1000자 이내로 입력해 주세요.'],
    ];
    for (const [body, msg] of cases) expect((await call('POST', '/api/spots', { token: u.token, body })).body, msg).toMatchObject({ code: '400', message: msg });

    // 사진 연결 — 공개 프로필 사진만 집계
    const p1 = await createPhoto(u, { imageUrl: 'https://x/s1.jpg' });
    const p2 = await createPhoto(u, { imageUrl: 'https://x/s2.jpg' });
    expect((await call('PUT', `/api/photos/${p1}/spot`, { token: other.token, body: { spotId: id } })).body).toMatchObject({ code: '403', message: '본인 사진에만 스팟을 연결할 수 있어요.' });
    expect((await call('PUT', `/api/photos/${p1}/spot`, { token: u.token, body: { spotId: 'x' } })).body).toMatchObject({ code: '400', message: '스팟 id가 올바르지 않습니다.' });
    expect((await call('PUT', `/api/photos/${p1}/spot`, { token: u.token, body: { spotId: 999999999 } })).body).toMatchObject({ code: '404', message: '스팟을 찾을 수 없습니다.' });
    expect((await call('PUT', '/api/photos/999999999/spot', { token: u.token, body: { spotId: id } })).body).toMatchObject({ code: '404', message: '사진을 찾을 수 없습니다.' });
    const link = await call('PUT', `/api/photos/${p1}/spot`, { token: u.token, body: { spotId: String(id) } });
    expect(link.body).toEqual({ data: expect.objectContaining({ id, photoCount: 0, previewPhotos: [] }) });
    await call('PUT', `/api/photos/${p2}/spot`, { token: u.token, body: { spotId: id } });
    expect((await call('GET', `/api/photos/${p1}/spot`)).body.data.id).toBe(id);

    // region·q를 둘 다 줘야 Spring이 동작한다(아래 "의도적 차이" 참고)
    const bounds = `minLat=${lat - 0.001}&maxLat=${lat + 0.001}&minLng=${lng - 0.001}&maxLng=${lng + 0.001}`;
    const near = await call('GET', `/api/spots?${bounds}&region=${tag}&q=${tag}`);
    expect(near.status).toBe(200);
    expect(near.body).toMatchObject({ page: 0, size: 30, hasNext: false });
    expect(near.body.data).toEqual([expect.objectContaining({ id, photoCount: 2, previewPhotos: ['https://x/s2.jpg', 'https://x/s1.jpg'] })]);
    expect((await call('GET', `/api/spots?region=${encodeURIComponent(` 망원${tag.toUpperCase()} `)}&q=${tag}`)).body.data.map((s: any) => s.id)).toEqual([id]);
    expect((await call('GET', `/api/spots?q=${encodeURIComponent(`언덕 ${tag}`)}&region=${tag}&size=0`)).body).toMatchObject({ size: 1, data: [expect.objectContaining({ id })] });
    // 범위만(지역·이름 없이) — Spring도 2026-11-24 CAST 수정 뒤 PostgreSQL에서 정상(이전엔 text ~~ bytea 500)
    const onlyBounds = await call('GET', `/api/spots?${bounds}`);
    expect(onlyBounds.body.data.map((s: any) => s.id)).toEqual([id]);

    const d = await call('GET', `/api/spots/${id}`, { token: u.token });
    expect(d.body).toMatchObject({ id, tips: '삼각대 필수', createdBy: u.id, createdByName: '테스터', canEdit: true, photoCount: 2, previewPhotos: ['https://x/s2.jpg', 'https://x/s1.jpg'] });
    expect(d.body.updatedAt).toMatch(LOCAL_DATE_TIME);
    expect(d.body.photos.map((p: any) => [p.id, p.memberName])).toEqual([[p2, '테스터'], [p1, '테스터']]);
    expect((await call('GET', `/api/spots/${id}`)).body.canEdit).toBe(false);
    expect((await call('GET', `/api/spots/${id}`, { token: other.token })).body.canEdit).toBe(false);

    // 비공개 프로필이면 사진이 빠진다
    await call('PUT', `/api/auth/member/${u.id}/profile`, { token: u.token, body: { publicProfile: false } });
    expect((await call('GET', `/api/spots/${id}`)).body).toMatchObject({ photoCount: 0, photos: [] });
    await call('PUT', `/api/auth/member/${u.id}/profile`, { token: u.token, body: { publicProfile: true } });

    expect((await call('PUT', `/api/spots/${id}`, { token: other.token, body: { name: 'x' } })).body).toMatchObject({ code: '403', message: '스팟을 만든 사람만 수정할 수 있어요.' });
    const up = await call('PUT', `/api/spots/${id}`, { token: u.token, body: { bestTime: '', region: null } });
    expect(up.body).toMatchObject({ id, bestTime: null, region: null, address: '서울 마포구', photoCount: 0 });
    await makeAdmin(other.id);
    const adminTok = (await call('POST', '/api/auth/login', { body: { email: other.email, password: PASSWORD } })).body.data.accessToken;
    expect((await call('PUT', `/api/spots/${id}`, { token: adminTok, body: { tips: '관리자 수정' } })).status).toBe(200);

    expect((await call('PUT', `/api/photos/${p1}/spot`, { token: u.token, body: { spotId: '  ' } })).body).toEqual({ data: null });
    expect((await call('GET', `/api/photos/${p1}/spot`)).body).toEqual({ data: null });
    expect((await call('DELETE', `/api/spots/${id}`, { token: u.token })).status).toBe(204);
    expect((await call('GET', `/api/photos/${p2}/spot`)).body).toEqual({ data: null });
    expect((await call('GET', `/api/spots/${id}`)).body).toMatchObject({ code: '404', message: '스팟을 찾을 수 없습니다.' });
    expect((await call('POST', '/api/spots', { body: { name: 'a', lat, lng } })).status).toBe(401);
  });

  it('근처 중복 — 50m 이내는 이름 무관, 200m 이내는 이름 겹칠 때, 가까운 순', async () => {
    const u = await signupAndLogin();
    const lat = baseLat();
    const lng = baseLng();
    const tag = uniq();
    const a = (await call('POST', '/api/spots', { token: u.token, body: { name: `연남 계단 ${tag}`, lat, lng } })).body;
    const b = (await call('POST', '/api/spots', { token: u.token, body: { name: `벽화 ${tag}`, lat: lat + 0.0012, lng } })).body;   // 약 133m
    const r1 = await call('GET', `/api/spots/nearby-duplicate?lat=${lat + 0.0002}&lng=${lng}`);
    expect(r1.body).toEqual([{ id: a.id, name: `연남 계단 ${tag}`, region: null, distanceM: 22 }]);
    const r2 = await call('GET', `/api/spots/nearby-duplicate?name=${encodeURIComponent(`벽 화${tag}`)}&lat=${lat}&lng=${lng}`);
    expect(r2.body.map((x: any) => x.id)).toEqual([a.id, b.id]);
    expect(r2.body[1].distanceM).toBe(133);
    expect((await call('GET', `/api/spots/nearby-duplicate?lat=95&lng=${lng}`)).body).toMatchObject({ code: '400', message: '위도 좌표가 범위를 벗어났습니다.' });
    expect((await call('GET', `/api/spots/nearby-duplicate?lat=${lat}`)).status).toBe(500);
  });
});
