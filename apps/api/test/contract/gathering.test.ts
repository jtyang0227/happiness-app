import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from './db.js';
import { LOCAL_DATE_TIME, User, call, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const Y = new Date().getUTCFullYear() + 1;
const base = (extra: Record<string, unknown> = {}) => ({
  title: ' <b>한강</b> 야경 출사 ', location: '여의도', maxParticipants: 2,
  startDateTime: `${Y}-06-01T19:00:00`, endDateTime: `${Y}-06-01T22:00`, recruitmentEndDateTime: `${Y}-05-30T23:59:59.5`, ...extra,
});
const create = (u: User, extra: Record<string, unknown> = {}) => call('POST', '/api/gatherings', { token: u.token, body: base(extra) });

const KEYS = ['beginnerFriendly', 'createdAt', 'createdBy', 'description', 'detailDescription', 'endDateTime', 'fee', 'hashtags', 'id', 'location', 'locationIntro',
  'maxParticipants', 'participantCount', 'portraitConsentRule', 'preparationNote', 'recruitmentEndDateTime', 'referenceImageUrl', 'shootTheme', 'spotId', 'spotLat',
  'spotLng', 'spotName', 'spotRegion', 'startDateTime', 'status', 'thumbnailUrl', 'title', 'waitingCount'];

describe('모임', () => {
  it('생성·상세·수정, 참여 → 정원 초과 대기 → 취소 시 대기자 승격·알림, 모집 마감 알림, 내 모임', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const c = await signupAndLogin();
    const g = await create(host, { beginnerFriendly: true, portraitConsentRule: false, hashtags: '#야경' });
    expect(g.status).toBe(201);
    expect(Object.keys(g.body).sort()).toEqual(KEYS);
    expect(g.body).toMatchObject({ title: '한강 야경 출사', location: '여의도', status: 'RECRUITING', createdBy: host.id, maxParticipants: 2,
      startDateTime: `${Y}-06-01T19:00:00`, endDateTime: `${Y}-06-01T22:00:00`, recruitmentEndDateTime: `${Y}-05-30T23:59:59.5`,
      beginnerFriendly: true, portraitConsentRule: false, spotId: null, participantCount: 0, waitingCount: 0 });
    const id = g.body.id;
    expect((await call('GET', `/api/gatherings/${id}`)).body.id).toBe(id);

    const up = await call('PUT', `/api/gatherings/${id}`, { token: host.token, body: { title: '  ', fee: '<i>무료</i>', beginnerFriendly: false, maxParticipants: 2 } });
    expect(up.status).toBe(200);
    expect(up.body).toMatchObject({ title: '한강 야경 출사', fee: '무료', beginnerFriendly: false });
    expect((await call('PUT', `/api/gatherings/${id}`, { token: a.token, body: {} })).body).toMatchObject({ code: '403', message: '모임을 찾을 수 없거나 수정 권한이 없습니다.' });
    expect((await call('PUT', `/api/gatherings/${id}`, { token: host.token, body: { endDateTime: `${Y}-06-01T18:00:00` } })).body).toMatchObject({ code: '400', message: '모임 시작 시간은 종료 시간보다 이전이어야 합니다.' });
    expect((await call('PUT', `/api/gatherings/${id}`, { token: host.token, body: { spotId: 999999999 } })).body).toMatchObject({ code: '400', message: '출사 스팟을 찾을 수 없습니다.' });

    const ra = await call('POST', `/api/gatherings/${id}/participation`, { token: a.token, body: { status: 'PARTICIPATING', reason: '무시' } });
    expect(ra.status).toBe(200);
    expect(ra.body).toEqual({ id: expect.any(Number), memberId: a.id, status: 'PARTICIPATING', reason: null, joinedAt: expect.stringMatching(LOCAL_DATE_TIME) });
    expect((await call('POST', `/api/gatherings/${id}/participation`, { token: b.token, body: { status: 'PARTICIPATING' } })).body.status).toBe('PARTICIPATING');
    expect((await call('POST', `/api/gatherings/${id}/participation`, { token: c.token, body: { status: 'PARTICIPATING' } })).body.status).toBe('WAITING');
    const no = await call('POST', `/api/gatherings/${id}/participation`, { token: host.token, body: { status: 'NOT_PARTICIPATING', reason: ' <b>일정</b> ' } });
    expect(no.body).toMatchObject({ status: 'NOT_PARTICIPATING', reason: '일정' });
    expect((await call('POST', `/api/gatherings/${id}/participation`, { token: a.token, body: { status: 'MAYBE' } })).body).toMatchObject({ code: '400', message: 'status는 PARTICIPATING 또는 NOT_PARTICIPATING만 가능합니다.' });

    const ps = await call('GET', `/api/gatherings/${id}/participants`, { token: host.token });
    expect(ps.body).toMatchObject({ participantCount: 2, waitingCount: 1, maxParticipants: 2 });
    expect(ps.body.participating.map((p: any) => p.memberId)).toEqual([a.id, b.id]);
    expect(ps.body.notParticipating).toEqual([expect.objectContaining({ memberId: host.id, reason: '일정' })]);
    expect((await call('GET', `/api/gatherings/${id}/participants`, { token: a.token })).body).toMatchObject({ code: '403', message: '모임을 찾을 수 없거나 접근 권한이 없습니다.' });

    expect((await call('DELETE', `/api/gatherings/${id}/participation`, { token: a.token })).status).toBe(204);
    expect((await call('DELETE', `/api/gatherings/${id}/participation`, { token: a.token })).body).toMatchObject({ code: '400', message: '취소할 수 있는 상태가 아닙니다.' });
    expect((await call('GET', `/api/gatherings/${id}`)).body).toMatchObject({ participantCount: 2, waitingCount: 0 });
    const cn = await call('GET', '/api/gatherings/notifications', { token: c.token });
    expect(cn.status).toBe(200);
    expect(cn.body).toMatchObject({ totalElements: 1, number: 0, size: 20, first: true, last: true });
    expect(cn.body.content[0]).toEqual({ id: expect.any(Number), gatheringId: id, type: 'PARTICIPATION_CONFIRMED', message: "'한강 야경 출사' 모임 참여가 확정되었습니다.",
      relatedPostId: null, read: false, createdAt: expect.stringMatching(LOCAL_DATE_TIME) });

    const mine = await call('GET', '/api/gatherings/my', { token: c.token });
    expect(mine.body.map((x: any) => x.id)).toEqual([id]);
    expect((await call('GET', '/api/gatherings/my', { token: a.token })).body).toEqual([]);

    const closed = await call('POST', `/api/gatherings/${id}/close-recruitment`, { token: host.token });
    expect(closed.body.status).toBe('RECRUITMENT_CLOSED');
    expect((await call('POST', `/api/gatherings/${id}/close-recruitment`, { token: host.token })).body.status).toBe('RECRUITMENT_CLOSED');
    expect((await call('POST', `/api/gatherings/${id}/participation`, { token: a.token, body: { status: 'PARTICIPATING' } })).body).toMatchObject({ code: '400', message: '모집이 마감된 모임에는 참여/미참여 응답을 변경할 수 없습니다.' });
    expect((await call('GET', '/api/gatherings/notifications/unread-count', { token: c.token })).body).toEqual({ count: 2 });
    const bn = (await call('GET', '/api/gatherings/notifications', { token: b.token })).body.content;
    expect(bn.map((n: any) => n.type)).toEqual(['RECRUITMENT_CLOSED']);
    expect((await call('PUT', `/api/gatherings/notifications/${bn[0].id}/read`, { token: c.token })).body).toMatchObject({ code: '403', message: '본인의 알림만 읽음 처리할 수 있습니다.' });
    expect((await call('PUT', `/api/gatherings/notifications/${bn[0].id}/read`, { token: b.token })).status).toBe(204);
    expect((await call('PUT', '/api/gatherings/notifications/999999999/read', { token: b.token })).body).toMatchObject({ code: '404', message: '알림을 찾을 수 없습니다.' });
    expect((await call('POST', '/api/gatherings/notifications/read-all', { token: c.token })).status).toBe(204);
    expect((await call('GET', '/api/gatherings/notifications/unread-count', { token: c.token })).body).toEqual({ count: 0 });
    expect((await call('GET', '/api/gatherings/notifications?size=1&page=1', { token: c.token })).body).toMatchObject({ totalElements: 2, totalPages: 2, numberOfElements: 1, last: true, first: false });

    expect((await call('DELETE', `/api/gatherings/${id}`, { token: a.token })).body).toMatchObject({ code: '403', message: '모임을 찾을 수 없거나 삭제 권한이 없습니다.' });
    expect((await call('DELETE', `/api/gatherings/${id}`, { token: host.token })).status).toBe(204);
    expect((await call('GET', `/api/gatherings/${id}`)).body).toMatchObject({ code: '404', message: '모임을 찾을 수 없습니다.' });
  });

  it('생성 검사와 목록(상태 필터·페이지)', async () => {
    const u = await signupAndLogin();
    const cases: [Record<string, unknown>, string][] = [
      [{ title: ' ' }, '모임 제목은 필수입니다.'],
      [{ location: null }, '모임 장소는 필수입니다.'],
      [{ maxParticipants: 0 }, '최대 참여 인원은 1명 이상이어야 합니다.'],
      [{ endDateTime: null }, '모임 시작/종료 시간은 필수입니다.'],
      [{ endDateTime: `${Y}-06-01T19:00:00` }, '모임 시작 시간은 종료 시간보다 이전이어야 합니다.'],
      [{ recruitmentEndDateTime: null }, '모집 마감 시간은 필수입니다.'],
      [{ recruitmentEndDateTime: `${Y}-06-02T00:00:00` }, '모집 마감 시간은 모임 시작 시간 이전이어야 합니다.'],
      [{ spotId: 999999999 }, '출사 스팟을 찾을 수 없습니다.'],
    ];
    for (const [extra, msg] of cases) expect((await create(u, extra)).body, msg).toMatchObject({ code: '400', message: msg });
    const g1 = await create(u);
    const g2 = await create(u);
    const list = await call('GET', '/api/gatherings?status=RECRUITING&size=2');
    expect(list.body.content.map((x: any) => x.id)).toEqual([g2.body.id, g1.body.id]);
    expect(list.body).toMatchObject({ size: 2, number: 0, numberOfElements: 2 });
    expect((await call('GET', '/api/gatherings?size=0')).body).toMatchObject({ code: 'C002', message: 'Page size must not be less than one' });
    expect((await call('GET', '/api/gatherings?size=500')).body.size).toBe(50);
    expect((await call('GET', '/api/gatherings/my')).status).toBe(401);
  });

  it('장소 투표 — 후보 2~5·만든 사람만, 참여·대기자 투표·표 이동, 표가 생기면 409, 마감 시 최다 득표로 장소 확정', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const g = (await create(host, { maxParticipants: 5 })).body;
    const url = `/api/gatherings/${g.id}/place-poll`;
    expect((await call('GET', url)).body).toEqual({ options: [], totalVotes: 0, open: true, myOptionId: null, winnerOptionId: null });
    expect((await call('PUT', url, { token: host.token, body: { options: [{ label: '하나' }] } })).body).toMatchObject({ code: '400', message: '장소 후보는 2~5개로 정해 주세요.' });
    expect((await call('PUT', url, { token: host.token, body: { options: 'x' } })).body).toMatchObject({ code: '400', message: 'options는 배열이어야 합니다.' });
    expect((await call('PUT', url, { token: host.token, body: { options: [1, 2] } })).body).toMatchObject({ code: '400', message: '장소 후보 형식이 올바르지 않습니다.' });
    expect((await call('PUT', url, { token: host.token, body: { options: [{ label: '' }, { label: 'b' }] } })).body).toMatchObject({ code: '400', message: '장소 후보 이름을 입력해 주세요.' });
    expect((await call('PUT', url, { token: host.token, body: { options: [{ label: 'a', spotId: 'x1' }, { label: 'b' }] } })).body).toMatchObject({ code: '400', message: '스팟 id가 올바르지 않습니다.' });
    expect((await call('PUT', url, { token: a.token, body: { options: [] } })).body).toMatchObject({ code: '403', message: '모임을 만든 사람만 장소 후보를 정할 수 있어요.' });
    const set = await call('PUT', url, { token: host.token, body: { options: [{ label: ' <b>여의도</b> ' }, { label: '성수', spotId: '' }, { label: '뚝섬' }] } });
    expect(set.status).toBe(200);
    expect(set.body.options.map((o: any) => [o.label, o.spotId, o.voteCount])).toEqual([['여의도', null, 0], ['성수', null, 0], ['뚝섬', null, 0]]);
    const [o1, o2] = set.body.options.map((o: any) => o.id);

    expect((await call('POST', `${url}/vote`, { token: a.token, body: { optionId: o1 } })).body).toMatchObject({ code: '403', message: '참여 신청한 사람만 투표할 수 있어요.' });
    await call('POST', `/api/gatherings/${g.id}/participation`, { token: a.token, body: { status: 'PARTICIPATING' } });
    await call('POST', `/api/gatherings/${g.id}/participation`, { token: b.token, body: { status: 'PARTICIPATING' } });
    expect((await call('POST', `${url}/vote`, { token: a.token, body: { optionId: 'abc' } })).body).toMatchObject({ code: '400', message: '후보 id가 올바르지 않습니다.' });
    expect((await call('POST', `${url}/vote`, { token: a.token, body: {} })).body).toMatchObject({ code: '400', message: '투표할 후보를 골라 주세요.' });
    expect((await call('POST', `${url}/vote`, { token: a.token, body: { optionId: 999999999 } })).body).toMatchObject({ code: '404', message: '장소 후보를 찾을 수 없습니다.' });
    expect((await call('POST', `${url}/vote`, { token: a.token, body: { optionId: o1 } })).body).toMatchObject({ myOptionId: o1, totalVotes: 1 });
    const moved = await call('POST', `${url}/vote`, { token: a.token, body: { optionId: String(o2) } });
    expect(moved.body).toMatchObject({ myOptionId: o2, totalVotes: 1 });
    await call('POST', `${url}/vote`, { token: b.token, body: { optionId: o1 } });
    expect((await call('PUT', url, { token: host.token, body: { options: [] } })).body).toMatchObject({ code: '409', message: '이미 투표가 시작돼 후보를 바꿀 수 없어요.' });
    expect((await call('GET', url, { token: b.token })).body).toMatchObject({ myOptionId: o1, open: true, winnerOptionId: null });

    // 1:1 동점 → 먼저 등록된 후보(여의도)
    const closed = await call('POST', `/api/gatherings/${g.id}/close-recruitment`, { token: host.token });
    expect(closed.body).toMatchObject({ status: 'RECRUITMENT_CLOSED', location: '여의도' });
    expect((await call('GET', url)).body).toMatchObject({ open: false, winnerOptionId: o1, totalVotes: 2 });
    expect((await call('POST', `${url}/vote`, { token: a.token, body: { optionId: o1 } })).body).toMatchObject({ code: '400', message: '모집이 끝나 투표할 수 없어요.' });
    const an = (await call('GET', '/api/gatherings/notifications', { token: a.token })).body.content.map((n: any) => n.type);
    expect(an.sort()).toEqual(['PLACE_DECIDED', 'RECRUITMENT_CLOSED']);
    expect((await call('GET', '/api/gatherings/999999999/place-poll')).body).toMatchObject({ code: '404', message: '모임을 찾을 수 없습니다.' });
  });
});
