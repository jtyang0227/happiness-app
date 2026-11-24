import { describe, expect, it } from 'vitest';
import { LOCAL_DATE_TIME, call, createPhoto, signupAndLogin } from './helpers.js';

describe('무드보드 (래퍼 없는 JSON)', () => {
  it('만들기(태그 제거)·담기(멱등)·목록(미리보기·containsPhoto)·상세·이름 바꾸기·빼기·삭제 204', async () => {
    const u = await signupAndLogin();
    const artist = await signupAndLogin();
    const p1 = await createPhoto(artist, { imageUrl: 'https://x/1.jpg' });
    const p2 = await createPhoto(artist, { imageUrl: 'https://x/2.jpg' });
    const c = await call('POST', '/api/moodboards', { token: u.token, body: { name: ' <b>여름</b> 무드 ' } });
    expect(c.status).toBe(201);
    expect(c.body).toEqual({ id: expect.any(Number), name: '여름 무드' });
    const id = c.body.id;
    expect((await call('POST', `/api/moodboards/${id}/photos`, { token: u.token, body: { photoId: p1 } })).body).toEqual({ moodboardId: id, photoId: p1, contains: true });
    await call('POST', `/api/moodboards/${id}/photos`, { token: u.token, body: { photoId: p2 } });
    await call('POST', `/api/moodboards/${id}/photos`, { token: u.token, body: { photoId: p2 } });

    const list = await call('GET', `/api/moodboards?photoId=${p1}`, { token: u.token });
    expect(list.status).toBe(200);
    expect(list.body).toEqual([{ id, name: '여름 무드', itemCount: 2, previewPhotos: ['https://x/2.jpg', 'https://x/1.jpg'], containsPhoto: true, updatedAt: expect.stringMatching(LOCAL_DATE_TIME) }]);
    expect(Object.keys((await call('GET', '/api/moodboards', { token: u.token })).body[0])).toEqual(['id', 'name', 'itemCount', 'previewPhotos', 'updatedAt']);

    const d = await call('GET', `/api/moodboards/${id}`, { token: u.token });
    expect(d.body).toMatchObject({ id, name: '여름 무드', shareToken: null });
    expect(d.body.photos.map((p: any) => p.id)).toEqual([p2, p1]);
    expect((await call('PUT', `/api/moodboards/${id}`, { token: u.token, body: { name: '가을' } })).body).toEqual({ id, name: '가을' });
    expect((await call('DELETE', `/api/moodboards/${id}/photos/${p2}`, { token: u.token })).body).toEqual({ moodboardId: id, photoId: p2, contains: false });
    const del = await call('DELETE', `/api/moodboards/${id}`, { token: u.token });
    expect(del.status).toBe(204);
    expect((await call('GET', `/api/moodboards/${id}`, { token: u.token })).status).toBe(404);
  });

  it('입력 오류 400, 남의 보드 404, 없는 사진 404, 공유 링크 켜기·공개 보기·끄기', async () => {
    const u = await signupAndLogin({ name: '보드주인' });
    const other = await signupAndLogin();
    const artist = await signupAndLogin({ name: '원작자' });
    const pid = await createPhoto(artist);
    expect((await call('POST', '/api/moodboards', { token: u.token, body: { name: ' ' } })).body).toMatchObject({ code: '400', message: '보드 이름을 입력해 주세요.' });
    expect((await call('POST', '/api/moodboards', { token: u.token, body: { name: 'x'.repeat(51) } })).body.message).toBe('보드 이름은 50자 이내로 입력해 주세요.');
    const id = (await call('POST', '/api/moodboards', { token: u.token, body: { name: '공유' } })).body.id;
    expect((await call('GET', `/api/moodboards/${id}`, { token: other.token })).body).toMatchObject({ code: '404', message: '보드를 찾을 수 없습니다.' });
    expect((await call('POST', `/api/moodboards/${id}/photos`, { token: u.token, body: { photoId: 'x' } })).body.message).toBe('photoId가 필요합니다.');
    expect((await call('POST', `/api/moodboards/${id}/photos`, { token: u.token, body: { photoId: 999999999 } })).status).toBe(404);
    await call('POST', `/api/moodboards/${id}/photos`, { token: u.token, body: { photoId: pid } });

    const on = await call('PUT', `/api/moodboards/${id}/share`, { token: u.token, body: { enabled: true } });
    expect(on.body).toEqual({ id, shareToken: expect.stringMatching(/^[0-9a-f]{32}$/) });
    const again = await call('PUT', `/api/moodboards/${id}/share`, { token: u.token, body: { enabled: true } });
    expect(again.body.shareToken).toBe(on.body.shareToken);
    const pub = await call('GET', `/api/moodboards/shared/${on.body.shareToken}`);
    expect(pub.status).toBe(200);
    expect(Object.keys(pub.body)).toEqual(['name', 'ownerName', 'photos']);
    expect(pub.body).toMatchObject({ name: '공유', ownerName: '보드주인', photos: [{ id: pid, memberName: '원작자' }] });
    expect((await call('PUT', `/api/moodboards/${id}/share`, { token: u.token, body: { enabled: false } })).body).toEqual({ id, shareToken: null });
    expect((await call('GET', `/api/moodboards/shared/${on.body.shareToken}`)).body).toMatchObject({ code: '404', message: '공유가 끝났거나 없는 보드예요.' });
    expect((await call('GET', '/api/moodboards/shared/short')).status).toBe(404);
    expect((await call('GET', '/api/moodboards')).status).toBe(401);
  });
});
