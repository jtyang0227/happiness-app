import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, insertInquiry, insertPhoto, insertPortfolio, q } from './db.js';
import { admin, call, INVALID, insertMember, IS_SPRING, LOCAL_DATE_TIME, SERVER_ERROR, uniq } from './helpers.js';

afterAll(closeDb);

const NOW = "now() at time zone 'utc'";
const today = () => new Date().toISOString().slice(0, 10);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

describe('문의', () => {
  it('목록(필터·마스킹·read 키)·읽음·처리 상태·전체 읽음·삭제', async () => {
    const a = await admin();
    const sender = await insertMember();
    const receiver = await insertMember({ profileName: `r${uniq()}` });
    const st = `T${uniq()}`;
    const i1 = await insertInquiry(sender.id, receiver.id, { shootType: st });
    await q("UPDATE inquiries SET sender_email = 'client@example.com', shoot_date = '2026-12-24', budget = '50만' WHERE id = $1", [i1]);
    const r = await call('GET', `/api/admin/inquiries?shootType=${st}&receiverId=${receiver.id}&isRead=false`, { token: a.token });
    expect(r.status).toBe(200);
    expect(r.body.totalElements).toBe(1);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'senderId', 'receiverId', 'senderName', 'senderEmail', 'receiverName', 'receiverProfileName', 'shootType',
      'shootDate', 'budget', 'message', 'processStatus', 'createdAt', 'read']);
    expect(r.body.content[0]).toMatchObject({ senderId: sender.id, receiverId: receiver.id, senderEmail: 'cl***@example.com', receiverName: receiver.name, shootDate: '2026-12-24', read: false, processStatus: 'NEW' });
    expect(await call('GET', '/api/admin/inquiries?processStatus=DONE', { token: a.token })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.InquiryProcessStatus.DONE' } });
    expect(await call('PATCH', `/api/admin/inquiries/${i1}/read`, { token: a.token })).toMatchObject({ status: 200, body: { message: '읽음 처리되었습니다.' } });
    expect((await call('GET', `/api/admin/inquiries?shootType=${st}&isRead=true`, { token: a.token })).body.totalElements).toBe(1);
    expect(await call('PATCH', `/api/admin/inquiries/${i1}/process-status`, { token: a.token, body: { processStatus: 'RESOLVED' } })).toMatchObject({ status: 200, body: { message: '처리 상태가 변경되었습니다.' } });
    expect(await call('PATCH', `/api/admin/inquiries/${i1}/process-status`, { token: a.token, body: { processStatus: 'X' } })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.InquiryProcessStatus.X' } });
    expect(await call('PATCH', `/api/admin/inquiries/${i1}/process-status`, { token: a.token, body: {} })).toMatchObject({ status: 500, body: SERVER_ERROR });
    await insertInquiry(sender.id, null, { shootType: st });
    const all = await call('PATCH', '/api/admin/inquiries/read-all', { token: a.token });
    expect(all.body.message).toBe('모든 미읽음 문의를 읽음 처리했습니다.');
    expect(all.body.count).toBeGreaterThanOrEqual(1);
    expect((await q('SELECT COUNT(*)::int AS c FROM inquiries WHERE is_read = false'))[0].c).toBe(0);
    expect(await call('DELETE', `/api/admin/inquiries/${i1}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '문의가 삭제되었습니다.' } });
    expect(await call('PATCH', `/api/admin/inquiries/${i1}/read`, { token: a.token })).toMatchObject({ status: 400, body: { error: '문의를 찾을 수 없습니다.' } });
  });
});

describe('예약', () => {
  it('달력 점·이번 주·목록(Spring Page 모양)·날짜별', async () => {
    const a = await admin();
    const ph = await insertMember({ profileName: `ph${uniq()}` });
    const y = 2031 + Math.floor(Math.random() * 900);
    await q("DELETE FROM bookings WHERE shoot_date BETWEEN make_date($1, 3, 1) AND make_date($1, 3, 31)", [y]);
    const mk = (date: string, status: string) => q(`INSERT INTO bookings (photographer_id, client_name, shoot_date, status, shoot_type, created_at, updated_at) VALUES ($1, '고객', $2, $3, 'WEDDING', ${NOW}, ${NOW}) RETURNING id`, [ph.id, date, status]).then((r) => Number(r[0].id));
    const b1 = await mk(`${y}-03-05`, 'REQUESTED');
    await mk(`${y}-03-05`, 'CONFIRMED');
    await mk(`${y}-03-20`, 'REJECTED');
    const cal = await call('GET', `/api/admin/bookings/calendar?year=${y}&month=3`, { token: a.token });
    expect(cal.body).toEqual([{ date: `${y}-03-05`, count: 2 }, { date: `${y}-03-20`, count: 1 }]);
    expect(await call('GET', `/api/admin/bookings/calendar?year=${y}`, { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('GET', `/api/admin/bookings/calendar?year=${y}&month=13`, { token: a.token })).toMatchObject({ status: 500, body: SERVER_ERROR });
    const byDate = await call('GET', `/api/admin/bookings/by-date?date=${y}-03-05`, { token: a.token });
    expect(byDate.body.map((b: any) => b.status)).toEqual(['CONFIRMED', 'REQUESTED']);
    expect(Object.keys(byDate.body[0])).toEqual(['id', 'photographerId', 'photographerName', 'photographerProfileName', 'clientId', 'clientName', 'shootType', 'shootDate',
      'shootLocation', 'budget', 'message', 'status', 'rejectedReason', 'createdAt']);
    expect(await call('GET', '/api/admin/bookings/by-date?date=2026-02-30', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    // 날짜 필터 — Spring은 PostgreSQL에서 `:date IS NULL` 바인딩 형식을 못 정해 500(의도적 차이, README). Nest는 정상
    const byDay = await call('GET', `/api/admin/bookings?date=${y}-03-05&status=REQUESTED&size=5`, { token: a.token });
    if (IS_SPRING) {
      expect(byDay).toMatchObject({ status: 500, body: SERVER_ERROR });
    } else {
      expect(byDay.body.content.map((b: any) => b.id)).toEqual([b1]);
      expect(byDay.body).toMatchObject({ totalElements: 1, size: 5, number: 0, first: true, last: true, numberOfElements: 1, empty: false });
    }
    const list = await call('GET', '/api/admin/bookings?status=REQUESTED&size=1', { token: a.token });
    expect(Object.keys(list.body)).toEqual(['content', 'pageable', 'totalPages', 'totalElements', 'last', 'size', 'number', 'sort', 'numberOfElements', 'first', 'empty']);
    expect(list.body).toMatchObject({ size: 1, number: 0, first: true, numberOfElements: 1, pageable: { pageNumber: 0, pageSize: 1, offset: 0 } });
    expect(list.body.content[0].status).toBe('REQUESTED');
    expect(await call('GET', '/api/admin/bookings?status=DONE', { token: a.token })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.BookingStatus.DONE' } });
    const tw = await mk(day(2), 'CONFIRMED');
    expect((await call('GET', '/api/admin/bookings/this-week', { token: a.token })).body.some((b: any) => b.id === tw)).toBe(true);
  });
});

describe('거래·모임·뉴스레터·인증', () => {
  it('거래 요약(정체 약속·만료 임박 납품)·목록', async () => {
    const a = await admin();
    const m1 = await insertMember();
    const m2 = await insertMember();
    const meet = Number((await q(`INSERT INTO meets (requester_id, receiver_id, status, created_at, updated_at) VALUES ($1, $2, 'PENDING', ${NOW} - interval '20 days', ${NOW} - interval '20 days') RETURNING id`, [m1.id, m2.id]))[0].id);
    const del = Number((await q(`INSERT INTO delivery_sets (member_id, title, client_name, status, expires_at, created_at) VALUES ($1, '납품', '고객', NULL, ${NOW} + interval '1 day', ${NOW}) RETURNING id`, [m1.id]))[0].id);
    const s = await call('GET', '/api/admin/transactions/summary', { token: a.token });
    expect(Object.keys(s.body)).toEqual(['meetCounts', 'deliveryCounts', 'meetStallDays', 'deliveryExpiryWarnDays', 'stalledMeets', 'expiringDeliveries']);
    expect(s.body).toMatchObject({ meetStallDays: 7, deliveryExpiryWarnDays: 3 });
    expect(s.body.deliveryCounts.PENDING).toBeGreaterThanOrEqual(1);
    const sm = s.body.stalledMeets.find((x: any) => x.id === meet);
    if (sm) expect(sm).toMatchObject({ requesterName: m1.name, receiverName: m2.name, status: 'PENDING' });
    const ms = await call('GET', '/api/admin/transactions/meets?status=PENDING', { token: a.token });
    expect(Object.keys(ms.body.content[0])).toEqual(['id', 'requesterId', 'requesterName', 'receiverId', 'receiverName', 'status', 'confirmedDate', 'createdAt', 'updatedAt']);
    const ds = await call('GET', `/api/admin/transactions/deliveries?status=`, { token: a.token });
    const d = ds.body.content.find((x: any) => x.id === del);
    expect(Object.keys(d)).toEqual(['id', 'memberId', 'memberName', 'title', 'clientName', 'status', 'expiresAt', 'expired', 'viewed', 'approvedAt', 'createdAt']);
    expect(d).toMatchObject({ status: 'PENDING', expired: false, viewed: false, memberName: m1.name });
  });

  it('모임 — 목록(참여·게시물 수)·상태 개수·게시물·게시물 삭제 이력', async () => {
    const a = await admin();
    const host = await insertMember();
    const tag = `G${uniq()}`;
    const g = Number((await q(`INSERT INTO gatherings (title, location, start_date_time, end_date_time, recruitment_end_date_time, max_participants, status, created_by, created_at)
      VALUES ($1, '서울숲', ${NOW}, ${NOW} + interval '2 hours', ${NOW}, 10, 'ONGOING', $2, ${NOW}) RETURNING id`, [`출사 ${tag}`, host.id]))[0].id);
    await q(`INSERT INTO gathering_participants (gathering_id, member_id, status, joined_at) VALUES ($1, $2, 'PARTICIPATING', ${NOW}), ($1, $3, 'WAITING', ${NOW})`, [g, host.id, (await insertMember()).id]);
    const post = Number((await q(`INSERT INTO gathering_posts (gathering_id, member_id, member_name, content, created_at) VALUES ($1, $2, '호스트', $3, ${NOW}) RETURNING id`, [g, host.id, '긴'.repeat(70)]))[0].id);
    await q(`INSERT INTO gathering_photos (gathering_post_id, image_url, sort_order, created_at) VALUES ($1, 'https://x/2.jpg', 2, ${NOW}), ($1, 'https://x/1.jpg', 1, ${NOW})`, [post]);
    await q('INSERT INTO gathering_post_likes (gathering_post_id, member_id) VALUES ($1, $2)', [post, host.id]);
    const r = await call('GET', `/api/admin/gatherings?search=${tag.toLowerCase()}&status=ONGOING`, { token: a.token });
    expect(r.body.totalElements).toBe(1);
    expect(r.body.content[0]).toMatchObject({ id: g, participantCount: 1, postCount: 1, hostName: host.name, maxParticipants: 10, status: 'ONGOING' });
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'title', 'description', 'location', 'shootTheme', 'thumbnailUrl', 'status', 'startDateTime', 'endDateTime',
      'recruitmentEndDateTime', 'maxParticipants', 'participantCount', 'postCount', 'createdBy', 'hostName', 'createdAt']);
    const c = await call('GET', '/api/admin/gatherings/counts', { token: a.token });
    expect(Object.keys(c.body).slice(0, 5)).toEqual(['RECRUITING', 'RECRUITMENT_CLOSED', 'SCHEDULED', 'ONGOING', 'ENDED']);
    const ps = await call('GET', `/api/admin/gatherings/${g}/posts`, { token: a.token });
    expect(ps.body[0]).toMatchObject({ id: post, photoUrls: ['https://x/1.jpg', 'https://x/2.jpg'], likeCount: 1, commentCount: 0 });
    expect(await call('GET', '/api/admin/gatherings/999999999/posts', { token: a.token })).toMatchObject({ status: 400, body: { error: '모임을 찾을 수 없습니다.' } });
    expect(await call('DELETE', `/api/admin/gatherings/posts/${post}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '게시글이 삭제되었습니다.' } });
    expect((await q('SELECT COUNT(*)::int AS c FROM gathering_photos WHERE gathering_post_id = $1', [post]))[0].c).toBe(0);
    expect((await q("SELECT details FROM admin_activity_logs WHERE action = 'GATHERING_POST_DELETE' AND target_id = $1", [post]))[0].details).toBe(`모임 #${g} · 호스트: ${'긴'.repeat(60)}…`);
  });

  it('뉴스레터 — 목록(마스킹·active)·개수·내보내기(사유·이력·접속기록)', async () => {
    const a = await admin();
    const m = await insertMember();
    const tag = uniq();
    await q(`INSERT INTO newsletter_subscribers (member_id, email, token, subscribed_at, unsubscribed_at) VALUES ($1, $2, $3, ${NOW}, NULL), ($1, $4, $5, ${NOW} - interval '1 day', ${NOW})`,
      [m.id, `sub-${tag}@ex.com`, `t1${tag}`, `old-${tag}@ex.com`, `t2${tag}`]);
    const r = await call('GET', `/api/admin/newsletter?search=${tag}&active=true`, { token: a.token });
    expect(r.body.content).toHaveLength(1);
    expect(r.body.content[0]).toMatchObject({ memberName: m.name, email: 'su***@ex.com', active: true, unsubscribedAt: null });
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'memberId', 'memberName', 'email', 'active', 'subscribedAt', 'unsubscribedAt']);
    expect((await call('GET', `/api/admin/newsletter?search=${tag}&active=false`, { token: a.token })).body.content[0].active).toBe(false);
    expect(Object.keys((await call('GET', '/api/admin/newsletter/counts', { token: a.token })).body)).toEqual(['active', 'unsubscribed', 'new7d', 'unsubscribed7d']);
    expect(await call('POST', '/api/admin/newsletter/export', { token: a.token })).toMatchObject({ status: 400, body: { error: '처리 사유를 5자 이상 입력해 주세요.' } });
    const ex = await call('POST', '/api/admin/newsletter/export', { token: a.token, body: { reason: '발송 도구 이관' } });
    expect(ex.status).toBe(200);
    expect(Object.keys(ex.body[0])).toEqual(['email', 'memberName', 'subscribedAt']);
    expect(ex.body.some((x: any) => x.email === `sub-${tag}@ex.com`)).toBe(true);
    expect(ex.body.some((x: any) => x.email === `old-${tag}@ex.com`)).toBe(false);
    expect((await q('SELECT action, detail FROM admin_privacy_access_logs WHERE admin_id = $1 ORDER BY id DESC LIMIT 1', [a.id]))[0]).toEqual({ action: 'EXPORT', detail: '뉴스레터 활성 구독자 CSV (이메일)' });
  });

  it('인증 — 목록·개수·승인(회원 인증 표시)·반려', async () => {
    const a = await admin();
    const m = await insertMember({ email: `verify-${uniq()}@test.com` });
    const v1 = Number((await q(`INSERT INTO verification_requests (member_id, status, portfolio_url, bio, created_at) VALUES ($1, 'PENDING', 'https://p', '소개', ${NOW}) RETURNING id`, [m.id]))[0].id);
    const v2 = Number((await q(`INSERT INTO verification_requests (member_id, status, created_at) VALUES ($1, 'PENDING', ${NOW}) RETURNING id`, [m.id]))[0].id);
    const r = await call('GET', `/api/admin/verifications?memberId=${m.id}&status=PENDING`, { token: a.token });
    expect(r.body.totalElements).toBe(2);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'memberId', 'memberName', 'memberEmail', 'memberProfileName', 'portfolioUrl', 'bio', 'status', 'rejectReason', 'reviewedAt', 'createdAt']);
    expect(r.body.content.find((x: any) => x.id === v1).memberEmail).toMatch(/^ve\*\*\*@test\.com$/);
    expect(Object.keys((await call('GET', '/api/admin/verifications/counts', { token: a.token })).body).sort()).toEqual(['APPROVED', 'PENDING', 'REJECTED']);
    const ap = await call('POST', `/api/admin/verifications/${v1}/approve`, { token: a.token });
    expect(ap.body).toMatchObject({ status: 'APPROVED' });
    expect(ap.body.reviewedAt).toMatch(LOCAL_DATE_TIME);
    expect((await call('GET', `/api/admin/members/${m.id}`, { token: a.token })).body.verified).toBe(true);
    const rj = await call('POST', `/api/admin/verifications/${v2}/reject`, { token: a.token, body: { reason: '포트폴리오 부족' } });
    expect(rj.body).toMatchObject({ status: 'REJECTED', rejectReason: '포트폴리오 부족' });
    expect(await call('POST', `/api/admin/verifications/${v2}/reject`, { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('POST', '/api/admin/verifications/999999999/approve', { token: a.token })).toMatchObject({ status: 400, body: { error: '인증 신청을 찾을 수 없습니다.' } });
  });
});

describe('신고·통계·시스템·정책', () => {
  it('신고 — 목록·개수·상세·처리(삭제 조치는 사진 삭제)·AI 분류(키 없으면 실패로 셈)', async () => {
    const a = await admin();
    const reporter = await insertMember({ email: `rep-${uniq()}@test.com` });
    const owner = await insertMember();
    const p = await insertPhoto(owner.id);
    const tt = `T${uniq()}`.slice(0, 10);
    const r1 = Number((await q(`INSERT INTO reports (reporter_id, target_type, target_id, reason, status, created_at) VALUES ($1, $2, $3, '스팸', 'PENDING', ${NOW}) RETURNING id`, [reporter.id, tt, p]))[0].id);
    const r2 = Number((await q(`INSERT INTO reports (reporter_id, target_type, target_id, reason, status, created_at) VALUES (NULL, 'PHOTO', $1, '저작권', 'PENDING', ${NOW}) RETURNING id`, [p]))[0].id);
    const l = await call('GET', `/api/admin/reports?targetType=${tt}&status=PENDING`, { token: a.token });
    expect(l.body.totalElements).toBe(1);
    expect(Object.keys(l.body.content[0])).toEqual(['id', 'reporterId', 'reporterName', 'reporterEmail', 'targetType', 'targetId', 'reason', 'details', 'status', 'processMemo',
      'processedAt', 'createdAt', 'aiSummary', 'aiSeverity', 'aiSuggestedAction', 'aiAnalyzedAt']);
    expect(l.body.content[0]).toMatchObject({ id: r1, reporterName: reporter.name, reporterEmail: 're***@test.com' });
    expect((await call('GET', `/api/admin/reports/${r2}`, { token: a.token })).body).toMatchObject({ reporterId: null, reporterEmail: null });
    expect(Object.keys((await call('GET', '/api/admin/reports/counts', { token: a.token })).body).sort()).toEqual(['ACTION_TAKEN', 'DISMISSED', 'IN_REVIEW', 'PENDING']);
    expect((await call('POST', `/api/admin/reports/${r1}/process`, { token: a.token, body: { action: 'DISMISS', memo: '문제없음' } })).body).toMatchObject({ status: 'DISMISSED', processMemo: '문제없음' });
    expect(await call('POST', `/api/admin/reports/${r1}/process`, { token: a.token, body: { memo: 'x' } })).toMatchObject({ status: 500, body: SERVER_ERROR });
    const del = await call('POST', `/api/admin/reports/${r2}/process`, { token: a.token, body: { action: 'DELETE_CONTENT' } });
    expect(del.body).toMatchObject({ status: 'ACTION_TAKEN', processMemo: null });
    expect((await q('SELECT COUNT(*)::int AS c FROM photos WHERE id = $1', [p]))[0].c).toBe(0);
    expect(await call('POST', '/api/admin/reports/ai-triage/run?limit=0', { token: a.token })).toMatchObject({ status: 400, body: { error: 'Page size must not be less than one' } });
  });

  it('통계 — 요약·일별·인기 사진·분포·작가', async () => {
    const a = await admin();
    const m = await insertMember();
    // 이전 실행의 사진보다 늘 위에 오도록 시각 기반 좋아요 수
    const likes = 1_000_000_000 + (Date.now() % 1_000_000_000);
    const pid = await insertPhoto(m.id, { likes, colorMood: 'WARM' });
    await insertPortfolio(m.id, { status: 'PENDING' });
    const s = await call('GET', '/api/admin/stats/summary', { token: a.token });
    expect(Object.keys(s.body)).toEqual(['totalMembers', 'totalPhotos', 'todayInquiries', 'unreadInquiries', 'todayBookings', 'pendingBookings', 'pendingPortfolios']);
    expect(s.body.pendingPortfolios).toBeGreaterThanOrEqual(1);
    const d = await call('GET', '/api/admin/stats/daily?days=3', { token: a.token });
    expect(d.body.map((x: any) => x.day)).toEqual([day(-2), day(-1), today()]);
    expect(Object.keys(d.body[0])).toEqual(['day', 'photos', 'signups', 'inquiries']);
    expect(d.body[2].photos).toBeGreaterThanOrEqual(1);
    const top = await call('GET', '/api/admin/stats/top-photos', { token: a.token });
    expect(top.body[0]).toMatchObject({ id: pid, likesCount: likes, authorName: m.name });
    expect(Object.keys(top.body[0])).toEqual(['id', 'title', 'thumbnailUrl', 'authorName', 'likesCount', 'savesCount', 'sharesCount']);
    expect((await call('GET', '/api/admin/stats/mood-dist', { token: a.token })).body.find((x: any) => x.label === 'WARM').count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray((await call('GET', '/api/admin/stats/shoot-type-dist', { token: a.token })).body)).toBe(true);
    const ph = await call('GET', '/api/admin/stats/photographers?limit=3', { token: a.token });
    expect(ph.body.length).toBeLessThanOrEqual(3);
    expect(Object.keys(ph.body[0])).toEqual(['memberId', 'name', 'profileName', 'photoCount', 'totalLikes', 'totalSaves', 'inquiryCount']);
    expect(ph.body[0].inquiryCount).toBe(0);
    expect(await call('GET', '/api/admin/stats/photographers?limit=0', { token: a.token })).toMatchObject({ status: 400, body: { error: 'Page size must not be less than one' } });
  });

  it('시스템 — 상태·Gemini 미설정 502·작업 이력·히트맵', async () => {
    const a = await admin();
    const st = await call('GET', '/api/admin/system/status', { token: a.token });
    expect(Object.keys(st.body)).toEqual(['mailConfigured', 'mailHost', 'mailUsername', 'rateLimitCapacity', 'rateLimitRefillTokens', 'rateLimitRefillSeconds', 'dbType', 'activeProfile', 'geminiConfigured', 'geminiModel']);
    expect(st.body).toMatchObject({ rateLimitCapacity: '100', dbType: 'PostgreSQL', geminiConfigured: false, geminiModel: 'gemini-3.6-flash' });
    expect(await call('POST', '/api/admin/system/gemini-test', { token: a.token, body: {} })).toMatchObject({ status: 502, body: { error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' } });
    expect(await call('POST', '/api/admin/system/gemini-test', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    const logs = await call('GET', `/api/admin/system/activity-logs?adminId=${a.id}`, { token: a.token });
    expect(logs.body.totalElements).toBe(0);
    const m = await insertMember();
    await call('PATCH', `/api/admin/members/${m.id}/status`, { token: a.token, body: { status: 'INACTIVE' } });
    const l2 = await call('GET', `/api/admin/system/activity-logs?adminId=${a.id}&action=MEMBER_STATUS_CHANGE`, { token: a.token });
    expect(l2.body.content[0]).toMatchObject({ adminId: a.id, adminName: a.name, targetType: 'MEMBER', targetId: m.id });
    expect(Object.keys(l2.body.content[0])).toEqual(['id', 'adminId', 'adminName', 'action', 'targetType', 'targetId', 'details', 'createdAt']);
    const hm = await call('GET', '/api/admin/system/activity-heatmap?weeks=1', { token: a.token });
    expect(hm.body).toHaveLength(7);
    expect(hm.body[6].day).toBe(today());
    expect(hm.body[6].count).toBeGreaterThanOrEqual(1);
    expect((await call('GET', '/api/admin/system/activity-heatmap?weeks=0', { token: a.token })).body).toEqual([]);
  });

  it('콘텐츠 정책 — 기본값·변경·유지보수 토글', async () => {
    const a = await admin();
    await q("DELETE FROM system_configs WHERE config_key IN ('maintenance.enabled', 'sort.default')");
    const g = await call('GET', '/api/admin/content-policy', { token: a.token });
    expect(g.body).toMatchObject({ 'sort.default': 'composite', 'maintenance.enabled': 'false', 'sort.new_author_boost_days': '30' });
    expect((await call('GET', '/api/admin/content-policy/maintenance', { token: a.token })).body).toEqual({ enabled: false });
    const p = await call('PATCH', '/api/admin/content-policy', { token: a.token, body: { 'sort.default': 'latest' } });
    expect(p.body['sort.default']).toBe('latest');
    expect(await call('PATCH', '/api/admin/content-policy', { token: a.token, body: { 'sort.default': null } })).toMatchObject({ status: 500, body: SERVER_ERROR });
    const t = await call('POST', '/api/admin/content-policy/maintenance/toggle', { token: a.token, body: { enabled: true } });
    expect(t.body).toEqual({ enabled: true, message: '유지보수 모드가 활성화되었습니다.' });
    expect((await call('GET', '/api/admin/content-policy/maintenance', { token: a.token })).body).toEqual({ enabled: true });
    expect((await call('POST', '/api/admin/content-policy/maintenance/toggle', { token: a.token, body: {} })).body).toEqual({ enabled: false, message: '유지보수 모드가 비활성화되었습니다.' });
    await q("DELETE FROM system_configs WHERE config_key IN ('maintenance.enabled', 'sort.default')");
  });
});
