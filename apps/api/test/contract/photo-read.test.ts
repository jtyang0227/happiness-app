import { describe, expect, it } from 'vitest';
import { LOCAL_DATE_TIME, call, createPhoto, signupAndLogin, uniq } from './helpers.js';

const PHOTO_KEYS = [
  'aperture', 'cameraModel', 'colorMood', 'colorPalette', 'createdAt', 'description', 'displayOrder', 'dominantColor', 'focalLength',
  'genre', 'gridColSpan', 'id', 'imageRatio', 'imageRight', 'imageUrl', 'imageUrl128', 'imageUrl512', 'iso', 'lensModel', 'liked',
  'likesCount', 'magazineCaption', 'memberAvatarUrl', 'memberId', 'memberName', 'memberProfileName', 'panType', 'saved', 'savesCount',
  'sharesCount', 'shutterSpeed', 'subGenres', 'tags', 'thumbnailUrl', 'title', 'updatedAt',
];

describe('사진 조회 ({status,data} 래퍼)', () => {
  it('목록 — 작가 필터, 키 모양, 작성자 정보, 최신순, page opt-in(hasNext)', async () => {
    const u = await signupAndLogin({ name: '사진가' });
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push(await createPhoto(u, { imageUrl: 'https://cdn/x/abc_1024.jpg', subGenres: '["FASHION","LIFESTYLE"]' }));
    const all = await call('GET', `/api/photos?memberId=${u.id}`);
    expect(all.status).toBe(200);
    expect(Object.keys(all.body).sort()).toEqual(['data', 'status']);
    expect(all.body.status).toBe('success');
    expect(all.body.data.map((p: any) => p.id)).toEqual([...ids].reverse());
    const p = all.body.data[0];
    expect(Object.keys(p).sort()).toEqual(PHOTO_KEYS);
    expect(p).toMatchObject({ memberId: u.id, memberName: '사진가', memberProfileName: u.profileName, liked: false, saved: false, tags: null,
      imageUrl512: 'https://cdn/x/abc_512.jpg', imageUrl128: 'https://cdn/x/abc_128.jpg', subGenres: ['FASHION', 'LIFESTYLE'], panType: 'EDITORIAL', imageRight: false, gridColSpan: 6, imageRatio: '1:1' });
    expect(p.createdAt).toMatch(LOCAL_DATE_TIME);

    const page0 = await call('GET', `/api/photos?memberId=${u.id}&page=0&size=2`);
    expect(page0.body).toMatchObject({ status: 'success', page: 0, size: 2, hasNext: true });
    expect(page0.body.data).toHaveLength(2);
    const page1 = await call('GET', `/api/photos?memberId=${u.id}&page=1&size=2&sortBy=bogus&order=desc`);
    expect(page1.body).toMatchObject({ page: 1, hasNext: false });
    expect(page1.body.data.map((x: any) => x.id)).toEqual([ids[0]]);
    const asc = await call('GET', `/api/photos?memberId=${u.id}&sortBy=createdAt&order=ASC&page=0&size=500`);
    expect(asc.body.size).toBe(100);
    expect(asc.body.data.map((x: any) => x.id)).toEqual(ids);
  });

  it('키워드(제목·설명, 대소문자 무시)·장르 필터·조회순 정렬·추천어', async () => {
    const u = await signupAndLogin();
    const tag = uniq();
    const a = await createPhoto(u, { title: `Sunset ${tag}`, genre: 'LANDSCAPE' });
    const b = await createPhoto(u, { title: '무제', description: `밤 SUNSET ${tag}` });
    const kw = await call('GET', `/api/photos?keyword=${encodeURIComponent('sunset ' + tag.toUpperCase())}&memberId=${u.id}`);
    expect(new Set(kw.body.data.map((x: any) => x.id))).toEqual(new Set([a, b]));  // 설명에도 들어 있음
    const kw2 = await call('GET', `/api/photos?keyword=${tag}&memberId=${u.id}&page=0&size=1`);
    expect(kw2.body).toMatchObject({ page: 0, size: 1, hasNext: true });
    const genre = await call('GET', `/api/photos?genre=LANDSCAPE&memberId=${u.id}`);
    expect(genre.body.data.map((x: any) => x.id)).toEqual([a]);
    const views = await call('GET', `/api/photos?memberId=${u.id}&sortBy=views&page=0&size=10`);
    expect(views.body.data.map((x: any) => x.id)).toEqual([b, a]);
    const sug = await call('GET', `/api/photos/suggestions?q=${encodeURIComponent('sunset ' + tag)}`);
    expect(sug.body).toEqual({ status: 'success', data: [`Sunset ${tag}`] });
    expect((await call('GET', '/api/photos/suggestions')).body).toEqual({ status: 'success', data: [] });
  });

  it('단건·없는 사진 404 {status:error}·비슷한 사진·좋아요/공유/태그 목록·저장 목록·장르 통계', async () => {
    const u = await signupAndLogin();
    const fan = await signupAndLogin();
    const mood = `M${uniq()}`;
    const base = await createPhoto(u, { genre: 'PORTRAIT', colorMood: mood });
    const twin = await createPhoto(fan, { genre: 'PORTRAIT', colorMood: mood });
    const one = await call('GET', `/api/photos/${base}`);
    expect(one.body).toMatchObject({ status: 'success', data: { id: base, memberId: u.id } });
    const missing = await call('GET', '/api/photos/999999999');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ status: 'error', message: '사진을 찾을 수 없습니다.' });
    const sim = await call('GET', `/api/photos/${base}/similar?size=50`);
    expect(sim.body.data[0].id).toBe(twin);
    expect((await call('GET', '/api/photos/999999999/similar')).status).toBe(404);

    expect((await call('POST', `/api/photos/${base}/likes?memberId=${fan.id}`, { token: fan.token })).status).toBe(201);
    expect((await call('POST', `/api/photos/${base}/saves?memberId=${fan.id}`, { token: fan.token })).status).toBeLessThan(300);
    const likes = await call('GET', `/api/photos/${base}/likes`, { token: u.token });
    expect(likes.body).toMatchObject({ status: 'success', count: 1 });
    expect(likes.body.data[0]).toEqual({ id: expect.any(Number), photoId: base, memberId: fan.id, createdAt: expect.stringMatching(LOCAL_DATE_TIME) });
    expect((await call('GET', `/api/photos/${base}/shares`, { token: u.token })).body).toEqual({ status: 'success', count: 0, data: [] });
    expect((await call('GET', `/api/photos/${base}/tags`, { token: u.token })).body).toEqual({ status: 'success', data: [] });
    const saved = await call('GET', `/api/photos/saves/${fan.id}`, { token: fan.token });
    expect(saved.body.data.map((x: any) => x.id)).toEqual([base]);
    expect(saved.body.data[0].memberName).toBeNull();
    const stats = await call('GET', `/api/photos/genres/stats?memberId=${u.id}`, { token: u.token });
    expect(stats.body).toEqual({ status: 'success', data: [{ genre: 'PORTRAIT', count: 1 }] });
    expect((await call('GET', '/api/photos/genres/stats')).status).toBe(401);
    expect((await call('GET', `/api/photos/${base}/likes`)).status).toBe(401);
  });
});
