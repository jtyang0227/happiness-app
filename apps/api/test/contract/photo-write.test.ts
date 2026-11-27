import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, makeAdmin } from './db.js';
import { call, createPhoto, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const err = (message: string) => ({ status: 'error', message });

describe('사진 쓰기', () => {
  it('등록 201 — 기본값, 남의 명의 403, 필수값 400 (오류 본문 {status:error,message})', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const r = await call('POST', '/api/photos', { token: u.token, body: { memberId: u.id, title: '첫 사진', imageUrl: 'https://x/a.jpg', gridColSpan: 99 } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'success', message: '사진이 등록되었습니다.', data: { memberId: u.id, title: '첫 사진', gridColSpan: 6, imageRatio: '1:1', likesCount: 0, panType: 'EDITORIAL', imageRight: false, memberName: null } });
    const forbidden = await call('POST', '/api/photos', { token: u.token, body: { memberId: other.id, title: 't', imageUrl: 'u' } });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual(err('본인 명의로만 사진을 등록할 수 있습니다.'));
    expect((await call('POST', '/api/photos', { token: u.token, body: { title: 't' } })).body).toEqual(err('memberId는 필수입니다.'));
    expect((await call('POST', '/api/photos', { token: u.token, body: { memberId: u.id, title: ' ', imageUrl: 'u' } })).body).toEqual(err('사진 제목은 필수입니다.'));
    expect((await call('POST', '/api/photos', { token: u.token, body: { memberId: u.id, title: 't' } })).body).toEqual(err('이미지 URL은 필수입니다.'));
    expect((await call('POST', '/api/photos', { body: { memberId: u.id, title: 't', imageUrl: 'u' } })).status).toBe(401);
  });

  it('수정 — 부분 수정·빈 장르는 비우기, 남의 사진 403, 없는 사진 404', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const id = await createPhoto(u, { genre: 'PORTRAIT', description: '원래' });
    const r = await call('PUT', `/api/photos/${id}`, { token: u.token, body: { title: '새 제목', genre: '', gridColSpan: 4, colorMood: ' ', imageRight: true } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: 'success', message: '사진이 수정되었습니다.', data: { title: '새 제목', genre: null, gridColSpan: 4, description: '원래', imageRight: true } });
    expect((await call('PUT', `/api/photos/${id}`, { token: other.token, body: { title: 'x' } })).body).toEqual(err('본인 사진만 수정할 수 있습니다.'));
    const missing = await call('PUT', '/api/photos/999999999', { token: u.token, body: { title: 'x' } });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(err('사진을 찾을 수 없습니다.'));
  });

  it('좋아요·저장·공유 — 카운터, 중복 400, 기록 없음 400, 남의 이름 403', async () => {
    const owner = await signupAndLogin();
    const fan = await signupAndLogin();
    const id = await createPhoto(owner);
    expect((await call('POST', `/api/photos/${id}/likes?memberId=${owner.id}`, { token: fan.token })).body).toEqual(err('본인 계정으로만 할 수 있습니다.'));
    const like = await call('POST', `/api/photos/${id}/likes?memberId=${fan.id}`, { token: fan.token });
    expect(like.status).toBe(201);
    expect(like.body).toEqual({ status: 'success', message: '좋아요가 추가되었습니다.' });
    expect((await call('POST', `/api/photos/${id}/likes?memberId=${fan.id}`, { token: fan.token })).body).toEqual(err('이미 좋아요한 사진입니다.'));
    expect((await call('POST', `/api/photos/${id}/saves?memberId=${fan.id}`, { token: fan.token })).status).toBe(201);
    expect((await call('POST', `/api/photos/${id}/shares?memberId=${fan.id}&platform=kakao`, { token: fan.token })).body).toEqual({ status: 'success', message: '사진이 공유되었습니다.' });
    let p = (await call('GET', `/api/photos/${id}`)).body.data;
    expect(p).toMatchObject({ likesCount: 1, savesCount: 1, sharesCount: 1 });
    expect((await call('DELETE', `/api/photos/${id}/likes?memberId=${fan.id}`, { token: fan.token })).body).toEqual({ status: 'success', message: '좋아요가 취소되었습니다.' });
    expect((await call('DELETE', `/api/photos/${id}/likes?memberId=${fan.id}`, { token: fan.token })).body).toEqual(err('좋아요 기록이 없습니다.'));
    expect((await call('DELETE', `/api/photos/${id}/saves?memberId=${fan.id}`, { token: fan.token })).body).toEqual({ status: 'success', message: '저장이 취소되었습니다.' });
    p = (await call('GET', `/api/photos/${id}`)).body.data;
    expect(p).toMatchObject({ likesCount: 0, savesCount: 0, sharesCount: 1 });
    expect((await call('POST', `/api/photos/999999999/likes?memberId=${fan.id}`, { token: fan.token })).status).toBe(404);
    expect((await call('POST', `/api/photos/${id}/shares?memberId=${fan.id}`, { token: fan.token })).status).toBe(400);
  });

  it('태그 — 사진 주인만 추가(이름은 서버가), 중복 400, 태그된 본인이 삭제, 다른 사진 태그 404', async () => {
    const owner = await signupAndLogin();
    const friend = await signupAndLogin({ name: '친구' });
    const stranger = await signupAndLogin();
    const id = await createPhoto(owner);
    expect((await call('POST', `/api/photos/${id}/tags?memberId=${friend.id}`, { token: stranger.token })).body).toEqual(err('내 사진에만 태그할 수 있습니다.'));
    const add = await call('POST', `/api/photos/${id}/tags?memberId=${friend.id}&memberName=사칭&positionX=0.5&positionY=0.25`, { token: owner.token });
    expect(add.status).toBe(201);
    expect(add.body).toEqual({ status: 'success', message: '사용자가 태그되었습니다.' });
    expect((await call('POST', `/api/photos/${id}/tags?memberId=${friend.id}`, { token: owner.token })).body).toEqual(err('이미 태그된 사용자입니다.'));
    expect((await call('POST', `/api/photos/${id}/tags?memberId=999999999`, { token: owner.token })).body).toEqual(err('태그할 회원을 찾을 수 없습니다.'));
    const tags = (await call('GET', `/api/photos/${id}/tags`, { token: owner.token })).body.data;
    expect(tags).toEqual([{ id: expect.any(Number), memberId: friend.id, memberName: '친구', positionX: 0.5, positionY: 0.25, createdAt: expect.any(String) }]);
    const tagged = await call('GET', `/api/photos?tags=${encodeURIComponent('친구')}&memberId=${owner.id}`);
    expect(tagged.body.data.map((x: any) => x.id)).toEqual([id]);
    const otherPhoto = await createPhoto(owner);
    expect((await call('DELETE', `/api/photos/${otherPhoto}/tags/${tags[0].id}`, { token: owner.token })).body).toEqual(err('태그를 찾을 수 없습니다.'));
    expect((await call('DELETE', `/api/photos/${id}/tags/${tags[0].id}`, { token: stranger.token })).body).toEqual(err('이 태그를 지울 권한이 없습니다.'));
    expect((await call('DELETE', `/api/photos/${id}/tags/${tags[0].id}`, { token: friend.token })).body).toEqual({ status: 'success', message: '태그가 제거되었습니다.' });
  });

  it('순서 — 본인 사진만 반영(남의 것은 조용히 건너뜀), 관리자는 모두', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const admin = await signupAndLogin();
    await makeAdmin(admin.id);
    const mine = await createPhoto(u);
    const theirs = await createPhoto(other);
    const r = await call('PUT', '/api/photos/reorder', { token: u.token, body: [{ id: mine, displayOrder: 3 }, { id: theirs, displayOrder: 1 }, { id: 'x' }] });
    expect(r.body).toEqual({ status: 'success', message: '순서가 저장되었습니다.' });
    expect((await call('GET', `/api/photos/${mine}`)).body.data.displayOrder).toBe(3);
    expect((await call('GET', `/api/photos/${theirs}`)).body.data.displayOrder).toBeNull();
    await call('PUT', '/api/photos/reorder', { token: admin.token, body: [{ id: theirs, displayOrder: 7 }] });
    expect((await call('GET', `/api/photos/${theirs}`)).body.data.displayOrder).toBe(7);
  });
});

describe('피드 (ApiResponse 래퍼)', () => {
  it('팔로우한 작가 사진 최신순·작성자 정보, 팔로우 없으면 빈 배열, 남의 피드 403, size 상한', async () => {
    const me = await signupAndLogin();
    const artist = await signupAndLogin({ name: '작가' });
    expect((await call('GET', `/api/feed?memberId=${me.id}`, { token: me.token })).body).toMatchObject({ success: true, data: [] });
    const a = await createPhoto(artist);
    const b = await createPhoto(artist);
    await call('POST', `/api/follows?followerId=${me.id}&followingId=${artist.id}`, { token: me.token });
    const feed = await call('GET', `/api/feed?memberId=${me.id}&size=500`, { token: me.token });
    expect(feed.status).toBe(200);
    expect(feed.body.data.map((x: any) => x.id)).toEqual([b, a]);
    expect(feed.body.data[0]).toMatchObject({ memberName: '작가', liked: false });
    expect((await call('GET', `/api/feed?memberId=${me.id}&page=1&size=1`, { token: me.token })).body.data.map((x: any) => x.id)).toEqual([a]);
    const denied = await call('GET', `/api/feed?memberId=${artist.id}`, { token: me.token });
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: '403', message: '본인 피드만 볼 수 있습니다.' });
  });
});

describe('사진 삭제·AI 태그', () => {
  it('삭제 — 남의 사진 403, 연관 기록 정리, 업로드한 사진은 저장소 변형 4개 삭제 요청, 없는 사진 404', async () => {
    const owner = await signupAndLogin();
    const fan = await signupAndLogin();
    const id = await createPhoto(owner, { imageUrl: 'http://localhost:54321/storage/v1/object/public/images/photos/abc_1024.jpg' });
    await call('POST', `/api/photos/${id}/likes?memberId=${fan.id}`, { token: fan.token });
    await call('POST', `/api/photos/${id}/saves?memberId=${fan.id}`, { token: fan.token });
    expect((await call('DELETE', `/api/photos/${id}`, { token: fan.token })).body).toEqual(err('본인 사진만 삭제할 수 있습니다.'));
    await fetch('http://localhost:54321/__log', { method: 'DELETE' });
    const r = await call('DELETE', `/api/photos/${id}`, { token: owner.token });
    expect(r.body).toEqual({ status: 'success', message: '사진이 삭제되었습니다.' });
    const log = await (await fetch('http://localhost:54321/__log')).json();
    expect(log.map((x: any) => JSON.parse(x.body).prefixes[0])).toEqual(['photos/abc_1024.jpg', 'photos/abc_512.jpg', 'photos/abc_256.jpg', 'photos/abc_128.jpg']);
    expect((await call('GET', `/api/photos/${id}`)).status).toBe(404);
    expect((await call('GET', `/api/photos/saves/${fan.id}`, { token: fan.token })).body.data).toEqual([]);
    const missing = await call('DELETE', `/api/photos/${id}`, { token: owner.token });
    expect(missing.status).toBe(404);
  });

  it('AI 태그 — 키워드(최대 6, 불용어 제외) + 색 분위기 태그, 남의 사진 403', async () => {
    const owner = await signupAndLogin();
    const other = await signupAndLogin();
    const id = await createPhoto(owner, { title: '서울 야경 the 한강', description: '여름밤 산책', colorMood: 'WARM' });
    const r = await call('POST', `/api/photos/${id}/auto-tags`, { token: owner.token });
    expect(r.body).toEqual({ status: 'success', data: ['서울', '야경', '한강', '여름밤', '산책', '따뜻한', '황금빛', '노을', '여름', '일몰'] });
    expect((await call('POST', `/api/photos/${id}/auto-tags`, { token: other.token })).body).toEqual(err('내 사진에만 쓸 수 있습니다.'));
  });
});
