import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from './db.js';
import { call, createPhoto, signupAndLogin, uniq } from './helpers.js';

afterAll(closeDb);

const track = (body: Record<string, unknown>) => call('POST', '/api/analytics/track', { body });
const SUMMARY_KEYS = ['inquiryCount', 'inquiryCountChange', 'inquiryCountPrev', 'period', 'photoViews', 'photoViewsChange', 'photoViewsPrev', 'portfolioViews',
  'portfolioViewsChange', 'portfolioViewsPrev', 'totalLikes', 'totalLikesChange', 'totalLikesPrev', 'totalSaves', 'totalSavesChange', 'totalSavesPrev'];

describe('분석', () => {
  it('track(공개, 소유 검사) → summary·daily·top-photos·top-works·genre-distribution', async () => {
    const u = await signupAndLogin();
    const fan = await signupAndLogin();
    const p1 = await createPhoto(u, { genre: 'PORTRAIT' });
    const p2 = await createPhoto(u, { genre: 'PORTRAIT' });
    const p3 = await createPhoto(u, { genre: 'LANDSCAPE' });
    const theirs = await createPhoto(fan);
    const s1 = await call('POST', '/api/series', { token: u.token, body: { title: '작업1' } });

    const vt = uniq();
    for (const b of [
      { eventType: 'PORTFOLIO_VIEW', targetType: 'PORTFOLIO', memberId: u.id, visitorToken: vt },
      { eventType: 'PORTFOLIO_VIEW', targetType: 'PORTFOLIO', memberId: u.id },
      { eventType: 'PHOTO_VIEW', targetType: 'PHOTO', targetId: p2, memberId: u.id },
      { eventType: 'PHOTO_VIEW', targetType: 'PHOTO', targetId: p2, memberId: u.id },
      { eventType: 'PHOTO_VIEW', targetType: 'PHOTO', targetId: p1, memberId: u.id },
      { eventType: 'PHOTO_VIEW', targetType: 'PHOTO', targetId: theirs, memberId: u.id },   // 남의 사진 → 버림
      { eventType: 'WORK_VIEW', targetType: 'SERIES', targetId: s1.body.id, memberId: u.id },
      { eventType: 'WORK_VIEW', targetType: 'SERIES', targetId: 99999999, memberId: u.id },  // 없는 작업 → 버림
      { eventType: '  ', memberId: u.id },                                                  // 빈 타입 → 버림
      { eventType: 'PORTFOLIO_VIEW' },                                                      // memberId 없음 → 버림
    ]) {
      const r = await track(b);
      expect(r.status).toBe(200);
      expect(r.body).toBeNull();
    }
    await call('POST', '/api/inquiry', { body: { receiverMemberId: u.id, senderName: '김', senderEmail: 'k@x.com', message: 'm', sourceSeriesId: s1.body.id } });
    await call('POST', `/api/photos/${p3}/likes?memberId=${fan.id}`, { token: fan.token });
    await call('POST', `/api/photos/${p3}/saves?memberId=${fan.id}`, { token: fan.token });

    const s = await call('GET', `/api/analytics/summary?memberId=${u.id}`, { token: u.token });
    expect(s.status).toBe(200);
    expect(Object.keys(s.body).sort()).toEqual(SUMMARY_KEYS);
    expect(s.body).toEqual({ portfolioViews: 2, portfolioViewsPrev: 0, portfolioViewsChange: 100, photoViews: 3, photoViewsPrev: 0, photoViewsChange: 100,
      totalLikes: 1, totalLikesPrev: 0, totalLikesChange: 0, totalSaves: 1, totalSavesPrev: 0, totalSavesChange: 0,
      inquiryCount: 1, inquiryCountPrev: 0, inquiryCountChange: 100, period: 7 });
    expect((await call('GET', `/api/analytics/summary?memberId=${fan.id}&period=30`, { token: fan.token })).body).toMatchObject({ portfolioViews: 0, portfolioViewsChange: 0, period: 30 });

    const daily = await call('GET', `/api/analytics/daily?memberId=${u.id}`, { token: u.token });
    expect(daily.body).toEqual([{ date: new Date().toISOString().slice(0, 10), count: 2 }]);

    const views = await call('GET', `/api/analytics/top-photos?memberId=${u.id}`, { token: u.token });
    expect(views.body.map((x: any) => [x.photoId, x.count, x.metric])).toEqual([[p2, 2, 'views'], [p1, 1, 'views']]);
    expect(Object.keys(views.body[0]).sort()).toEqual(['count', 'likesCount', 'metric', 'photoId', 'savesCount', 'sharesCount', 'thumbnailUrl', 'title']);
    expect(views.body[0].thumbnailUrl).toBe('https://example.com/a.jpg');
    const likes = await call('GET', `/api/analytics/top-photos?memberId=${u.id}&metric=LIKES&limit=50`, { token: u.token });
    expect(likes.body).toEqual([expect.objectContaining({ photoId: p3, count: 1, metric: 'likes', likesCount: 1, savesCount: 1 })]);
    expect((await call('GET', `/api/analytics/top-photos?memberId=${u.id}&metric=shares`, { token: u.token })).body).toEqual([]);

    const works = await call('GET', `/api/analytics/top-works?memberId=${u.id}`, { token: u.token });
    expect(works.body).toEqual([{ seriesId: s1.body.id, title: '작업1', coverImageUrl: null, views: 1, inquiries: 1 }]);

    const g = await call('GET', `/api/analytics/genre-distribution?memberId=${u.id}`, { token: u.token });
    expect(g.body).toEqual([{ genre: 'PORTRAIT', count: 2 }, { genre: 'LANDSCAPE', count: 1 }]);

    for (const p of ['summary', 'daily', 'top-photos', 'top-works', 'genre-distribution']) {
      const f = await call('GET', `/api/analytics/${p}?memberId=${u.id}`, { token: fan.token });
      expect(f.body, p).toMatchObject({ code: '403', message: '접근 권한이 없습니다' });
    }
    expect((await call('GET', `/api/analytics/summary?memberId=${u.id}`)).status).toBe(401);
    expect((await call('GET', '/api/analytics/summary', { token: u.token })).status).toBe(400);
  });

  it('track rate limit — 같은 visitorToken 분당 60회 초과 429', async () => {
    const u = await signupAndLogin();
    const vt = uniq();
    const codes: number[] = [];
    for (let i = 0; i < 61; i++) codes.push((await track({ eventType: 'PORTFOLIO_VIEW', memberId: u.id, visitorToken: vt })).status);
    expect(codes.filter((c) => c === 200)).toHaveLength(60);
    expect(codes[60]).toBe(429);
    const r = await track({ eventType: 'PORTFOLIO_VIEW', memberId: u.id, visitorToken: vt });
    expect(r.body).toMatchObject({ success: false, code: '429', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' });
  });

  it('track 저장 실패(visitorToken 33자) — 500', async () => {
    const u = await signupAndLogin();
    expect((await track({ eventType: 'PORTFOLIO_VIEW', memberId: u.id, visitorToken: 'x'.repeat(33) })).status).toBe(500);
  });
});
