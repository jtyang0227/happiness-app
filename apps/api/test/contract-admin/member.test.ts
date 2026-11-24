import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, insertInquiry, insertPhoto, insertPortfolio, insertSeries, q } from './db.js';
import { admin, call, INVALID, insertMember, LOCAL_DATE_TIME, SERVER_ERROR, uniq } from './helpers.js';

afterAll(closeDb);

const DTO_KEYS = ['authority', 'createdAt', 'email', 'id', 'inquiryCount', 'name', 'photoCount', 'portfolioCount', 'profileName', 'provider',
  'seriesCount', 'status', 'suspendReason', 'suspendUntil', 'suspendedAt', 'tel', 'verified', 'verifiedAt'];
const PAGE_KEYS = ['content', 'last', 'page', 'size', 'totalElements', 'totalPages'];

async function lastPrivacyLog(adminId: number) {
  return (await q('SELECT * FROM admin_privacy_access_logs WHERE admin_id = $1 ORDER BY id DESC LIMIT 1', [adminId]))[0];
}

describe('회원 목록·상세·요약', () => {
  it('목록 — 검색(이름·이메일 LIKE)·페이지·마스킹·개수, 접속기록 LIST(검색어 이메일은 마스킹)', async () => {
    const a = await admin();
    const tag = `T${uniq()}`;
    const m1 = await insertMember({ name: `가${tag}`, email: `ab${tag.toLowerCase()}@test.com`, tel: '010-1234-0002' });
    const m2 = await insertMember({ name: `나${tag}`, tel: '01012340003' });
    await q("UPDATE members SET created_at = created_at - interval '1 hour' WHERE id = $1", [m1.id]);
    await insertPhoto(m2.id); await insertPhoto(m2.id); await insertSeries(m2.id); await insertInquiry(m2.id, m1.id); await insertPortfolio(m2.id);
    const r = await call('GET', `/api/admin/members?search=${tag}&size=1`, { token: a.token, headers: { 'X-Forwarded-For': '203.0.113.7, 10.0.0.1' } });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(PAGE_KEYS);
    expect(r.body).toMatchObject({ page: 0, size: 1, totalElements: 2, totalPages: 2, last: false });
    const d = r.body.content[0];
    expect(Object.keys(d).sort()).toEqual(DTO_KEYS);
    expect(d).toMatchObject({ id: m2.id, name: m2.name, tel: '010****0003', authority: 'US', status: 'ACTIVE', verified: false, photoCount: 2, seriesCount: 1, inquiryCount: 1, portfolioCount: 1, suspendReason: null, provider: null });
    expect(d.email).toMatch(/^ca\*\*\*@test\.com$/);
    expect(d.createdAt).toMatch(LOCAL_DATE_TIME);
    const log = await lastPrivacyLog(a.id);
    expect(log).toMatchObject({ action: 'LIST', subject_count: 1, detail: `회원 목록 p0 검색=${tag}`, ip_address: '203.0.113.7', admin_name: a.name });
    const r2 = await call('GET', `/api/admin/members?search=${encodeURIComponent(m1.email)}&status=ACTIVE&authority=US&page=0`, { token: a.token });
    expect(r2.body.content.map((x: any) => x.id)).toEqual([m1.id]);
    expect(r2.body.content[0].tel).toBe('010-****-0002');
    expect((await lastPrivacyLog(a.id)).detail).toBe(`회원 목록 p0 상태=ACTIVE 역할=US 검색=ab***@test.com`);
  });

  it('목록 — 잘못된 역할·상태는 enum 메시지 400, 페이지 오류', async () => {
    const a = await admin();
    expect(await call('GET', '/api/admin/members?authority=XX', { token: a.token })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.Authority.XX' } });
    expect(await call('GET', '/api/admin/members?status=nope', { token: a.token })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.MemberStatus.nope' } });
    expect(await call('GET', '/api/admin/members?page=-1', { token: a.token })).toMatchObject({ status: 400, body: { error: 'Page index must not be less than zero' } });
    expect(await call('GET', '/api/admin/members?size=0', { token: a.token })).toMatchObject({ status: 400, body: { error: 'Page size must not be less than one' } });
    expect(await call('GET', '/api/admin/members?page=x', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect((await call('GET', '/api/admin/members?authority=&status=&page=', { token: a.token })).status).toBe(200);
  });

  it('상세 — 마스킹 DTO + 접속기록 VIEW, 없는 회원 400, 잘못된 id 400', async () => {
    const a = await admin();
    const m = await insertMember({ tel: '010-5555-6666' });
    const r = await call('GET', `/api/admin/members/${m.id}`, { token: a.token });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(DTO_KEYS);
    expect(r.body.tel).toBe('010-****-6666');
    expect(await lastPrivacyLog(a.id)).toMatchObject({ action: 'VIEW', subject_member_id: String(m.id), subject_count: 1, detail: '회원 상세(마스킹)', reason: null });
    expect(await call('GET', '/api/admin/members/999999999', { token: a.token })).toMatchObject({ status: 400, body: { error: '회원을 찾을 수 없습니다.' } });
    expect(await call('GET', '/api/admin/members/abc', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
  });

  it('요약 — 키 순서·숫자', async () => {
    const a = await admin();
    const r = await call('GET', '/api/admin/members/summary', { token: a.token });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(['total', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED', 'new7d', 'suspensionsEnding3d']);
    expect(r.body.total).toBeGreaterThan(0);
  });
});

describe('원문 열람·내보내기', () => {
  it('reveal — 사유 5자 미만 400, 성공하면 원문 + REVEAL 기록', async () => {
    const a = await admin();
    const m = await insertMember({ tel: '010-7777-8888' });
    expect(await call('POST', `/api/admin/members/${m.id}/reveal`, { token: a.token, body: { reason: ' 짧음 ' } })).toMatchObject({ status: 400, body: { error: '처리 사유를 5자 이상 입력해 주세요.' } });
    expect(await call('POST', `/api/admin/members/${m.id}/reveal`, { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('POST', `/api/admin/members/999999999/reveal`, { token: a.token, body: { reason: '고객 문의 확인' } })).toMatchObject({ status: 400, body: { error: '회원을 찾을 수 없습니다.' } });
    const r = await call('POST', `/api/admin/members/${m.id}/reveal`, { token: a.token, body: { reason: '  고객 문의 확인  ' } });
    expect(r).toMatchObject({ status: 200, body: { email: m.email, tel: '010-7777-8888' } });
    expect(Object.keys(r.body)).toEqual(['email', 'tel']);
    expect(await lastPrivacyLog(a.id)).toMatchObject({ action: 'REVEAL', reason: '고객 문의 확인', detail: '이메일·전화번호 원문 열람' });
  });

  it('export — 사유 필수, 필터 결과 행(연락처 제외) + 작업 이력·접속기록', async () => {
    const a = await admin();
    const tag = `E${uniq()}`;
    const m = await insertMember({ name: `내보내기${tag}`, profileName: `p${tag.toLowerCase()}` });
    expect(await call('POST', '/api/admin/members/export', { token: a.token })).toMatchObject({ status: 400, body: { error: '처리 사유를 5자 이상 입력해 주세요.' } });
    expect(await call('POST', '/api/admin/members/export', { token: a.token, body: { reason: '월간 점검 자료', authority: 'ZZ' } })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.Authority.ZZ' } });
    const r = await call('POST', '/api/admin/members/export', { token: a.token, body: { reason: '월간 점검 자료', search: tag, status: 'ACTIVE' } });
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(Object.keys(r.body[0])).toEqual(['id', 'name', 'email', 'profileName', 'authority', 'status', 'verified', 'createdAt']);
    expect(r.body[0]).toMatchObject({ id: m.id, email: m.email, authority: 'US', status: 'ACTIVE', verified: false });
    const act = (await q("SELECT * FROM admin_activity_logs WHERE admin_id = $1 AND action = 'MEMBER_EXPORT' ORDER BY id DESC LIMIT 1", [a.id]))[0];
    expect(act.details).toBe(`회원 1명 CSV 내보내기 (상태=ACTIVE, 역할=전체, 검색=${tag})`);
    expect(await lastPrivacyLog(a.id)).toMatchObject({ action: 'EXPORT', subject_count: 1, reason: '월간 점검 자료', detail: '회원 CSV (이메일 포함, 연락처 제외)' });
  });
});

describe('운영 메모·이력', () => {
  it('메모 — 추가(암호화 저장)·목록(최신순)·삭제 권한', async () => {
    const wm = await admin('WM');
    const sa = await admin('SA');
    const m = await insertMember();
    expect(await call('POST', `/api/admin/members/${m.id}/notes`, { token: sa.token, body: { content: '   ' } })).toMatchObject({ status: 400, body: { error: '메모 내용을 입력해 주세요.' } });
    expect(await call('POST', `/api/admin/members/${m.id}/notes`, { token: sa.token, body: { content: 'x'.repeat(2001) } })).toMatchObject({ status: 400, body: { error: '메모는 2,000자까지 쓸 수 있습니다.' } });
    const n1 = await call('POST', `/api/admin/members/${m.id}/notes`, { token: sa.token, body: { content: '  첫 메모  ' } });
    expect(n1.status).toBe(200);
    expect(Object.keys(n1.body).sort()).toEqual(['adminId', 'adminName', 'content', 'createdAt', 'id', 'memberId']);
    expect(n1.body).toMatchObject({ memberId: m.id, adminId: sa.id, adminName: sa.name, content: '첫 메모' });
    const raw = (await q('SELECT content FROM admin_member_notes WHERE id = $1', [n1.body.id]))[0].content;
    expect(raw.startsWith('enc:v1:')).toBe(true);
    const n2 = await call('POST', `/api/admin/members/${m.id}/notes`, { token: wm.token, body: { content: '둘째' } });
    const list = await call('GET', `/api/admin/members/${m.id}/notes`, { token: sa.token });
    expect(list.body.map((x: any) => x.content)).toEqual(['둘째', '첫 메모']);
    expect(await call('DELETE', `/api/admin/members/${m.id}/notes/${n2.body.id}`, { token: sa.token })).toMatchObject({ status: 400, body: { error: '본인이 쓴 메모만 삭제할 수 있습니다.' } });
    expect(await call('DELETE', `/api/admin/members/${m.id + 1}/notes/${n2.body.id}`, { token: wm.token })).toMatchObject({ status: 400, body: { error: '메모를 찾을 수 없습니다.' } });
    expect(await call('DELETE', `/api/admin/members/${m.id}/notes/${n1.body.id}`, { token: wm.token })).toMatchObject({ status: 200, body: { message: '메모가 삭제되었습니다.' } });
    expect((await call('GET', `/api/admin/members/${m.id}/notes`, { token: sa.token })).body).toHaveLength(1);
  });

  it('역할 변경 — WM만(SA 403), 본인 400, 잘못된 값 400, null 500, 같으면 이력 없음', async () => {
    const wm = await admin('WM');
    const sa = await admin('SA');
    const m = await insertMember();
    expect(await call('PATCH', `/api/admin/members/${m.id}/role`, { token: sa.token, body: { authority: 'SA' } })).toMatchObject({ status: 403, body: { error: '이 작업을 할 권한이 없습니다.' } });
    expect(await call('PATCH', `/api/admin/members/${wm.id}/role`, { token: wm.token, body: { authority: 'SA' } })).toMatchObject({ status: 400, body: { error: '본인 계정의 역할은 변경할 수 없습니다.' } });
    expect(await call('PATCH', `/api/admin/members/${m.id}/role`, { token: wm.token, body: { authority: 'BOSS' } })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.Authority.BOSS' } });
    expect(await call('PATCH', `/api/admin/members/${m.id}/role`, { token: wm.token, body: {} })).toMatchObject({ status: 500, body: SERVER_ERROR });
    expect(await call('PATCH', `/api/admin/members/${m.id}/role`, { token: wm.token, raw: 'x' })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('PATCH', `/api/admin/members/${m.id}/role`, { token: wm.token, body: { authority: 'US' } })).toMatchObject({ status: 200, body: { message: '역할이 변경되었습니다.' } });
    expect(await call('PATCH', `/api/admin/members/${m.id}/role`, { token: wm.token, body: { authority: 'SA' } })).toMatchObject({ status: 200 });
    const h = await call('GET', `/api/admin/members/${m.id}/history`, { token: sa.token });
    expect(h.body).toHaveLength(1);
    expect(Object.keys(h.body[0])).toEqual(['id', 'action', 'adminName', 'details', 'createdAt']);
    expect(h.body[0]).toMatchObject({ action: 'MEMBER_ROLE_CHANGE', adminName: wm.name, details: `${m.name}: US → SA` });
  });

  it('상태 변경 — 검증, 정지(사유 암호화·기간)·해제 이력, SA는 관리자 정지 불가', async () => {
    const wm = await admin('WM');
    const sa = await admin('SA');
    const m = await insertMember();
    const other = await insertMember({ authority: 'SA' });
    const url = `/api/admin/members/${m.id}/status`;
    expect(await call('PATCH', url, { token: sa.token, body: { status: 'FROZEN' } })).toMatchObject({ status: 400, body: { error: '잘못된 상태 값입니다: FROZEN' } });
    expect(await call('PATCH', url, { token: sa.token, body: {} })).toMatchObject({ status: 400, body: { error: '잘못된 상태 값입니다: null' } });
    expect(await call('PATCH', url, { token: sa.token, body: { status: 'SUSPENDED' } })).toMatchObject({ status: 400, body: { error: '정지 사유를 입력해 주세요.' } });
    expect(await call('PATCH', url, { token: sa.token, body: { status: 'SUSPENDED', reason: 'x'.repeat(101) } })).toMatchObject({ status: 400, body: { error: '정지 사유는 100자까지 쓸 수 있습니다.' } });
    expect(await call('PATCH', url, { token: sa.token, body: { status: 'SUSPENDED', reason: 'r', suspendDays: 'abc' } })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('PATCH', `/api/admin/members/${other.id}/status`, { token: sa.token, body: { status: 'SUSPENDED', reason: '규정 위반' } })).toMatchObject({ status: 400, body: { error: '관리자 계정의 정지·탈퇴는 웹관리자만 할 수 있습니다.' } });
    expect(await call('PATCH', `/api/admin/members/${sa.id}/status`, { token: sa.token, body: { status: 'INACTIVE' } })).toMatchObject({ status: 400, body: { error: '본인 계정의 상태는 변경할 수 없습니다.' } });
    expect(await call('PATCH', url, { token: sa.token, body: { status: 'SUSPENDED', reason: '스팸 게시', suspendDays: 3 } })).toMatchObject({ status: 200, body: { message: '회원 상태가 변경되었습니다.' } });
    const row = (await q('SELECT * FROM members WHERE id = $1', [m.id]))[0];
    expect(row.status).toBe('SUSPENDED');
    expect(row.suspend_reason.startsWith('enc:v1:')).toBe(true);
    expect(String(row.suspended_by_id)).toBe(String(sa.id));
    const d = (await call('GET', `/api/admin/members/${m.id}`, { token: wm.token })).body;
    expect(d).toMatchObject({ status: 'SUSPENDED', suspendReason: '스팸 게시' });
    const days = (Date.parse(d.suspendUntil + 'Z') - Date.parse(d.suspendedAt + 'Z')) / 86400000;
    expect(Math.abs(days - 3)).toBeLessThan(0.01);
    expect(await call('PATCH', url, { token: sa.token, body: { status: 'ACTIVE' } })).toMatchObject({ status: 200 });
    const cleared = (await q('SELECT suspend_reason, suspend_until, suspended_at, suspended_by_id FROM members WHERE id = $1', [m.id]))[0];
    expect(cleared).toEqual({ suspend_reason: null, suspend_until: null, suspended_at: null, suspended_by_id: null });
    await call('PATCH', url, { token: wm.token, body: { status: 'SUSPENDED', reason: '재위반' } });
    const h = (await call('GET', `/api/admin/members/${m.id}/history`, { token: wm.token })).body;
    expect(h.map((x: any) => x.action)).toEqual(['MEMBER_SUSPEND', 'MEMBER_UNSUSPEND', 'MEMBER_SUSPEND']);
    expect(h[0].details).toBe(`${m.name}: ACTIVE → SUSPENDED · 영구 · 사유: 재위반`);
    expect(h[2].details).toBe(`${m.name}: ACTIVE → SUSPENDED · 3일 · 사유: 스팸 게시`);
  });

  it('영구 삭제 — WM만, 탈퇴 처리된 회원만, 연관 데이터 정리', async () => {
    const wm = await admin('WM');
    const sa = await admin('SA');
    const m = await insertMember();
    const other = await insertMember();
    const p = await insertPhoto(m.id);
    await insertSeries(m.id); await insertPortfolio(m.id); await insertInquiry(other.id, m.id);
    await q("INSERT INTO comments (photo_id, member_id, member_name, content, created_at) VALUES ($1, $2, 'x', 'c', now())", [p, other.id]);
    await call('POST', `/api/admin/members/${m.id}/notes`, { token: wm.token, body: { content: '메모' } });
    expect(await call('DELETE', `/api/admin/members/${m.id}`, { token: sa.token })).toMatchObject({ status: 403, body: { error: '이 작업을 할 권한이 없습니다.' } });
    expect(await call('DELETE', `/api/admin/members/${m.id}`, { token: wm.token })).toMatchObject({ status: 400, body: { error: '먼저 탈퇴 처리한 회원만 영구 삭제할 수 있습니다.' } });
    await call('PATCH', `/api/admin/members/${m.id}/status`, { token: wm.token, body: { status: 'DELETED' } });
    expect(await call('DELETE', `/api/admin/members/${m.id}`, { token: wm.token })).toMatchObject({ status: 200, body: { message: '회원이 영구 삭제되었습니다.' } });
    for (const [t, c] of [['members', 'id'], ['photos', 'member_id'], ['series', 'member_id'], ['portfolios', 'member_id'], ['inquiries', 'receiver_id'], ['admin_member_notes', 'member_id']]) {
      expect((await q(`SELECT COUNT(*)::int AS c FROM ${t} WHERE ${c} = $1`, [m.id]))[0].c, t).toBe(0);
    }
    expect((await q('SELECT COUNT(*)::int AS c FROM comments WHERE photo_id = $1', [p]))[0].c).toBe(0);
    const act = (await q("SELECT details FROM admin_activity_logs WHERE action = 'MEMBER_DELETE' AND target_id = $1", [m.id]))[0];
    expect(act.details).toBe(`${m.name} (#${m.id}) 영구 삭제 · 사진 1 · 시리즈 1`);
  });
});

describe('개인정보 접속기록·보안 감사', () => {
  it('접속기록 — WM만, 필터·요약·점검·체인 검증(두 서버가 쓴 기록이 섞여도 유효)', async () => {
    const wm = await admin('WM');
    const sa = await admin('SA');
    expect(await call('GET', '/api/admin/privacy-logs', { token: sa.token })).toMatchObject({ status: 403, body: { error: '이 작업을 할 권한이 없습니다.' } });
    expect(await call('GET', '/api/admin/privacy-logs?adminId=x', { token: sa.token })).toMatchObject({ status: 400, body: INVALID });
    const m = await insertMember();
    await call('GET', `/api/admin/members/${m.id}`, { token: sa.token, headers: { 'X-Forwarded-For': '198.51.100.9' } });
    const r = await call('GET', `/api/admin/privacy-logs?subjectMemberId=${m.id}&action=VIEW`, { token: wm.token });
    expect(r.status).toBe(200);
    expect(r.body.totalElements).toBe(1);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'adminId', 'adminName', 'ipAddress', 'action', 'subjectMemberId', 'subjectCount', 'reason', 'detail', 'accessedAt', 'hash']);
    expect(r.body.content[0]).toMatchObject({ adminId: sa.id, ipAddress: '198.51.100.9', action: 'VIEW', subjectMemberId: m.id, subjectCount: 1 });
    expect(r.body.content[0].accessedAt).toMatch(LOCAL_DATE_TIME);
    expect(await call('POST', '/api/admin/privacy-logs/inspections', { token: wm.token, body: { note: '짧음' } })).toMatchObject({ status: 400, body: { error: '처리 사유를 5자 이상 입력해 주세요.' } });
    expect(await call('POST', '/api/admin/privacy-logs/inspections', { token: wm.token, body: { note: '11월 정기 점검' } })).toMatchObject({ status: 200, body: { message: '점검 기록을 남겼습니다.' } });
    const s = await call('GET', '/api/admin/privacy-logs/summary', { token: wm.token });
    expect(Object.keys(s.body)).toEqual(['counts30d', 'lastInspection', 'retentionYears']);
    expect(Object.keys(s.body.counts30d)).toEqual(['LIST', 'VIEW', 'REVEAL', 'EXPORT', 'INSPECTION']);
    expect(s.body.lastInspection).toMatchObject({ action: 'INSPECTION', reason: '11월 정기 점검', adminId: wm.id, subjectMemberId: null, subjectCount: null });
    expect(s.body.retentionYears).toBe(2);
    const v = await call('GET', '/api/admin/privacy-logs/verify', { token: wm.token });
    expect(v.status).toBe(200);
    expect(v.body).toMatchObject({ valid: true });
    expect(Object.keys(v.body)).toEqual(['total', 'valid']);
  });

  it('체인이 깨지면 그 행을 알려 준다', async () => {
    const wm = await admin('WM');
    const m = await insertMember();
    await call('GET', `/api/admin/members/${m.id}`, { token: wm.token });
    const row = await lastPrivacyLog(wm.id);
    await q("UPDATE admin_privacy_access_logs SET detail = 'tampered' WHERE id = $1", [row.id]);
    try {
      const v = await call('GET', '/api/admin/privacy-logs/verify', { token: wm.token });
      expect(v.body).toMatchObject({ valid: false, brokenAtId: Number(row.id) });
      expect(Object.keys(v.body)).toEqual(['total', 'valid', 'brokenAtId']);
    } finally {
      await q('UPDATE admin_privacy_access_logs SET detail = $2 WHERE id = $1', [row.id, row.detail]);
    }
  });

  it('보안 감사 — 필터·이름·요약', async () => {
    const a = await admin('SA');
    const m = await insertMember();
    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 3; i++) {
      await q(`INSERT INTO security_audit_log (member_id, action_type, action_detail, ip_address, role, success, created_at) VALUES ($1, 'LOGIN_FAILURE', 'bad pw', $2, 'US', false, (now() at time zone 'utc') - make_interval(mins => $3))`, [m.id, ip, i]);
    }
    const r = await call('GET', `/api/admin/security-audit?ip=${ip}&success=false&actionType=LOGIN_FAILURE`, { token: a.token });
    expect(r.status).toBe(200);
    expect(r.body.totalElements).toBe(3);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'memberId', 'memberName', 'actionType', 'actionDetail', 'ipAddress', 'role', 'success', 'errorMessage', 'createdAt']);
    expect(r.body.content[0]).toMatchObject({ memberId: m.id, memberName: m.name, success: false, role: 'US' });
    expect(await call('GET', '/api/admin/security-audit?success=maybe', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    const s = await call('GET', '/api/admin/security-audit/summary', { token: a.token });
    expect(Object.keys(s.body)).toEqual(['loginFailures24h', 'loginSuccess24h', 'adminApi7d', 'topFailureIps']);
    const mine = s.body.topFailureIps.find((x: any) => x.ip === ip);
    if (mine) {
      expect(mine.count).toBe(3);
      expect(mine.lastAt).toMatch(LOCAL_DATE_TIME);
    }
  });
});
