import { describe, expect, it } from 'vitest';
import { IS_SPRING, call, signupAndLogin } from './helpers.js';

// 월간·연말 베스트 포토 순위 — 새 API에만 있는 경로. 다른 실행과 섞이지 않게 먼 미래의 무작위 연·월을 쓴다.
const YEAR = 2060 + Math.floor(Math.random() * 40);
const MONTH = 1 + Math.floor(Math.random() * 12);
const mm = String(MONTH).padStart(2, '0');

describe.skipIf(IS_SPRING)('베스트 포토 월간·연간 순위', () => {
  it('끝난 출사의 표만 모아 순위(동점은 같은 순위), 월·연 필터, 잘못된 값 400', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const g = (await call('POST', '/api/gatherings', { token: host.token, body: {
      title: '랭킹 출사', location: '서울숲', maxParticipants: 10,
      startDateTime: `${YEAR}-${mm}-10T10:00:00`, endDateTime: `${YEAR}-${mm}-10T17:00:00`, recruitmentEndDateTime: `${YEAR}-${mm}-09T18:00:00`,
    } })).body;
    for (const m of [a, b]) await call('POST', `/api/gatherings/${g.id}/participation`, { token: m.token, body: { status: 'PARTICIPATING' } });

    // 끝나기 전엔 순위에 없음
    expect((await call('POST', `/api/gatherings/${g.id}/start`, { token: host.token })).status).toBe(201);
    await call('POST', `/api/gatherings/${g.id}/posts`, { token: a.token, body: { content: 'a', photos: [{ imageUrl: 'https://x/r1.jpg', sortOrder: 0 }, { imageUrl: 'https://x/r2.jpg', sortOrder: 1 }] } });
    await call('POST', `/api/gatherings/${g.id}/posts`, { token: b.token, body: { content: 'b', photos: [{ imageUrl: 'https://x/r3.jpg', sortOrder: 0 }] } });
    expect((await call('GET', `/api/gatherings/best/ranking?year=${YEAR}&month=${MONTH}`)).body).toEqual({ year: YEAR, month: MONTH, items: [] });
    await call('POST', `/api/gatherings/${g.id}/end`, { token: host.token });

    const ids = (await call('GET', `/api/gatherings/${g.id}/best`)).body.photos.map((p: any) => p.photoId).sort((x: number, y: number) => x - y);
    const [p1, p2, p3] = ids;
    // p3: 2표, p1·p2: 1표씩(동점) — 표 없는 사진은 빠진다
    await call('POST', `/api/gatherings/${g.id}/best/${p3}`, { token: a.token });
    await call('POST', `/api/gatherings/${g.id}/best/${p3}`, { token: b.token });
    await call('POST', `/api/gatherings/${g.id}/best/${p1}`, { token: b.token });
    await call('POST', `/api/gatherings/${g.id}/best/${p2}`, { token: a.token });

    const r = await call('GET', `/api/gatherings/best/ranking?year=${YEAR}&month=${MONTH}`);
    expect(r.status).toBe(200);
    expect(r.body.items.map((i: any) => [i.rank, i.photoId, i.votes])).toEqual([[1, p3, 2], [2, p1, 1], [2, p2, 1]]);
    expect(r.body.items[0]).toMatchObject({ imageUrl: 'https://x/r3.jpg', gatheringId: g.id, gatheringTitle: '랭킹 출사', memberId: b.id, memberName: '테스터' });
    expect(r.body.items[0].gatheringStartDateTime).toBe(`${YEAR}-${mm}-10T10:00:00`);

    // 연간·size, 다른 달은 비어 있음
    expect((await call('GET', `/api/gatherings/best/ranking?year=${YEAR}&size=1`)).body.items.map((i: any) => i.photoId)).toEqual([p3]);
    const otherMonth = MONTH === 12 ? 1 : MONTH + 1;
    expect((await call('GET', `/api/gatherings/best/ranking?year=${YEAR}&month=${otherMonth}`)).body.items).toEqual([]);

    // 잘못된 값
    expect((await call('GET', '/api/gatherings/best/ranking?year=2026&month=13')).status).toBe(400);
    expect((await call('GET', '/api/gatherings/best/ranking?year=abc')).status).toBe(400);
  });
});
