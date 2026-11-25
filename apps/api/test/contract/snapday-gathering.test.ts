import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, notificationsOf } from './db.js';
import { IS_SPRING, LOCAL_DATE_TIME, User, call, signupAndLogin } from './helpers.js';

// SNAPDAY — 출사 시작·종료, 스토리, AI 추천(키 없으면 SAMPLE), 베스트 포토, 내 출사 기록. 새 API에만 있는 경로.
afterAll(closeDb);

const Y = new Date().getUTCFullYear() + 1;
async function outing(host: User, members: User[]) {
  const g = (await call('POST', '/api/gatherings', { token: host.token, body: {
    title: '경주 벚꽃 출사', location: '대릉원', maxParticipants: 10,
    startDateTime: `${Y}-03-27T10:00:00`, endDateTime: `${Y}-03-27T17:00:00`, recruitmentEndDateTime: `${Y}-03-26T18:00:00`,
  } })).body;
  for (const m of members) await call('POST', `/api/gatherings/${g.id}/participation`, { token: m.token, body: { status: 'PARTICIPATING' } });
  return g.id as number;
}
const post = (u: User, gid: number, urls: string[]) =>
  call('POST', `/api/gatherings/${gid}/posts`, { token: u.token, body: { content: '현장', photos: urls.map((imageUrl, i) => ({ imageUrl, sortOrder: i })) } });

describe.skipIf(IS_SPRING)('SNAPDAY 출사 현장·스토리·AI·베스트 포토', () => {
  it('시작(만든 사람만) → 현장 피드·스토리·AI(SAMPLE) → 종료 → 베스트 포토 3표 → 내 기록', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const outsider = await signupAndLogin();
    const gid = await outing(host, [a, b]);

    // 시작
    expect((await call('POST', `/api/gatherings/${gid}/start`, { token: a.token })).status).toBe(403);
    expect((await call('POST', `/api/gatherings/${gid}/end`, { token: host.token })).body.message).toBe('진행 중인 출사만 종료할 수 있습니다.');
    expect((await call('POST', `/api/gatherings/${gid}/start`, { token: host.token })).body).toEqual({ id: gid, status: 'ONGOING' });
    expect((await call('POST', `/api/gatherings/${gid}/start`, { token: host.token })).body.message).toBe('이미 진행 중인 출사입니다.');
    expect((await call('GET', `/api/gatherings/${gid}`)).body.status).toBe('ONGOING');
    expect((await notificationsOf(a.id, 'GATHERING_STARTED')).at(-1)?.gathering_id).toBe(String(gid));

    // 현장 사진 — a 3장, b 1장
    expect((await post(a, gid, ['https://x/a1.jpg', 'https://x/a2.jpg', 'https://x/a3.jpg'])).status).toBe(201);
    expect((await post(b, gid, ['https://x/b1.jpg'])).status).toBe(201);

    // 스토리 — 참여자만, 태그는 같은 출사 참여자만 남김
    expect((await call('POST', `/api/gatherings/${gid}/stories`, { token: outsider.token, body: { imageUrl: 'https://x/s.png' } })).status).toBe(403);
    expect((await call('POST', `/api/gatherings/${gid}/stories`, { token: a.token, body: { imageUrl: 'javascript:alert(1)' } })).status).toBe(400);
    const st = await call('POST', `/api/gatherings/${gid}/stories`, { token: a.token, body: { imageUrl: 'https://x/story.png', caption: ' <b>벚꽃</b> 출사 ', taggedMemberIds: [b.id, outsider.id, b.id] } });
    expect(st.status).toBe(201);
    expect(st.body).toMatchObject({ gatheringId: gid, memberId: a.id, caption: '벚꽃 출사', imageUrl: 'https://x/story.png', taggedMembers: [{ memberId: b.id, name: '테스터', instagramId: null }] });
    expect(st.body.createdAt).toMatch(LOCAL_DATE_TIME);
    expect((await call('GET', `/api/gatherings/${gid}/stories`)).body.map((s: any) => s.id)).toEqual([st.body.id]);
    expect((await call('GET', '/api/gatherings/stories/mine', { token: a.token })).body[0].id).toBe(st.body.id);
    expect((await notificationsOf(b.id, 'STORY_TAG')).length).toBe(1);
    expect((await call('DELETE', `/api/gatherings/stories/${st.body.id}`, { token: b.token })).status).toBe(403);

    // AI 추천 — 키가 없으면 SAMPLE(실제 장소 아님 표시), 비참여자 403
    expect((await call('POST', `/api/gatherings/${gid}/ai-recommendations`, { token: outsider.token, body: {} })).status).toBe(403);
    const ai = await call('POST', `/api/gatherings/${gid}/ai-recommendations`, { token: a.token, body: { question: '우천 시 대안도 알려줘' } });
    expect(ai.status).toBe(201);
    if (!process.env.GEMINI_API_KEY) {
      expect(ai.body).toMatchObject({ source: 'SAMPLE', model: null, question: '우천 시 대안도 알려줘', memberId: a.id });
      expect(ai.body.result.season).toBe('봄');
      expect(ai.body.result.places.length).toBeGreaterThan(0);
      expect(ai.body.result.places.every((p: any) => p.name.startsWith('(예시)'))).toBe(true);
    }
    expect((await call('GET', `/api/gatherings/${gid}/ai-recommendations`)).body.map((r: any) => r.id)).toEqual([ai.body.id]);
    // 10분 5회 제한
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await call('POST', `/api/gatherings/${gid}/ai-recommendations`, { token: a.token, body: {} })).status);
    expect(codes.slice(0, 4)).toEqual([201, 201, 201, 201]);
    expect(codes[4]).toBe(429);

    // 베스트 포토 — 끝나기 전엔 불가
    const before = (await call('GET', `/api/gatherings/${gid}/best`, { token: a.token })).body;
    expect(before).toMatchObject({ open: false, maxVotes: 3, canVote: false, myVotes: [] });
    expect(before.photos).toHaveLength(4);
    const [p1, p2, p3, p4] = before.photos.map((p: any) => p.photoId).sort((x: number, y: number) => x - y);
    expect((await call('POST', `/api/gatherings/${gid}/best/${p1}`, { token: a.token })).body.message).toBe('출사가 끝난 뒤에 베스트 포토 투표를 할 수 있습니다.');

    // 종료
    expect((await call('POST', `/api/gatherings/${gid}/end`, { token: b.token })).status).toBe(403);
    expect((await call('POST', `/api/gatherings/${gid}/end`, { token: host.token })).body).toEqual({ id: gid, status: 'ENDED' });
    expect((await post(a, gid, ['https://x/late.jpg'])).body.message).toBe('진행 중인 모임에만 게시물을 올릴 수 있습니다.');
    expect((await call('GET', `/api/gatherings/${gid}/album`)).body.photoCount).toBe(4);

    // 3표까지, 멱등, 4번째 400, 빼고 다시, 비참여자 403, 다른 출사 사진 404
    for (const p of [p1, p2, p3]) expect((await call('POST', `/api/gatherings/${gid}/best/${p}`, { token: a.token })).status).toBe(201);
    expect((await call('POST', `/api/gatherings/${gid}/best/${p1}`, { token: a.token })).body.myVotes.sort()).toEqual([p1, p2, p3].sort());
    expect((await call('POST', `/api/gatherings/${gid}/best/${p4}`, { token: a.token })).body.message).toContain('3장까지');
    expect((await call('DELETE', `/api/gatherings/${gid}/best/${p3}`, { token: a.token })).body.myVotes.sort()).toEqual([p1, p2].sort());
    expect((await call('POST', `/api/gatherings/${gid}/best/${p4}`, { token: a.token })).status).toBe(201);
    await call('POST', `/api/gatherings/${gid}/best/${p4}`, { token: b.token });
    expect((await call('POST', `/api/gatherings/${gid}/best/${p1}`, { token: outsider.token })).status).toBe(403);
    const other = await outing(host, [a]);
    await call('POST', `/api/gatherings/${other}/start`, { token: host.token });
    await call('POST', `/api/gatherings/${other}/end`, { token: host.token });
    expect((await call('POST', `/api/gatherings/${other}/best/${p1}`, { token: a.token })).status).toBe(404);
    const ranked = (await call('GET', `/api/gatherings/${gid}/best`)).body;
    expect(ranked.open).toBe(true);
    expect(ranked.photos[0]).toMatchObject({ photoId: p4, votes: 2, memberName: '테스터' });
    expect(ranked.photos.map((p: any) => p.votes)).toEqual([2, 1, 1, 0]);

    // 내 출사 기록
    const hist = (await call('GET', '/api/gatherings/my/history', { token: a.token })).body;
    expect(hist.count).toBe(2);
    expect(hist.storyCount).toBe(1);
    expect(hist.items.find((i: any) => i.id === gid)).toMatchObject({ title: '경주 벚꽃 출사', status: 'ENDED', myPostCount: 1 });
    expect((await call('GET', '/api/gatherings/my/history')).status).toBe(401);

    expect((await call('DELETE', `/api/gatherings/stories/${st.body.id}`, { token: a.token })).status).toBe(204);
  });
});
