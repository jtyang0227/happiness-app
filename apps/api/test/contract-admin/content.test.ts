import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, insertPhoto, insertPortfolio, insertSeries, q } from './db.js';
import { admin, call, INVALID, insertMember, LOCAL_DATE_TIME, SERVER_ERROR, uniq } from './helpers.js';

afterAll(closeDb);

const NOW = "now() at time zone 'utc'";
const PAGE_KEYS = ['content', 'last', 'page', 'size', 'totalElements', 'totalPages'];

async function seriesPhoto(seriesId: number, photoId: number, order = 0) {
  return Number((await q('INSERT INTO series_photos (series_id, photo_id, display_order) VALUES ($1, $2, $3) RETURNING id', [seriesId, photoId, order]))[0].id);
}

describe('사진·분류', () => {
  it('목록 — 무드 별칭·분류 단계·검색·정렬, DTO 키', async () => {
    const a = await admin();
    const tag = `P${uniq()}`;
    const m = await insertMember({ name: `작가${tag}` });
    const p1 = await insertPhoto(m.id, { title: `노을 ${tag}`, colorMood: 'WARM', categoryCode: '0102000000', likes: 5 });
    const p2 = await insertPhoto(m.id, { title: `바다 ${tag}`, colorMood: 'COOL', categoryCode: '0103000000', likes: 9 });
    const r = await call('GET', `/api/admin/photos?search=${tag}&sortBy=likes`, { token: a.token });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(PAGE_KEYS);
    expect(r.body.content.map((x: any) => x.id)).toEqual([p2, p1]);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'title', 'imageUrl', 'thumbnailUrl', 'colorMood', 'likesCount', 'savesCount', 'sharesCount', 'memberId',
      'authorName', 'categoryCode', 'l1Name', 'l2Name', 'displayOrder', 'createdAt']);
    expect(r.body.content[0]).toMatchObject({ memberId: m.id, authorName: m.name, l1Name: '01', l2Name: '03', likesCount: 9 });
    expect((await call('GET', `/api/admin/photos?search=${tag}&colorMood=${encodeURIComponent('따뜻한 느낌')}`, { token: a.token })).body.content.map((x: any) => x.id)).toEqual([p1]);
    expect((await call('GET', `/api/admin/photos?search=${tag}&colorMood=cool`, { token: a.token })).body.content.map((x: any) => x.id)).toEqual([p2]);
    expect((await call('GET', `/api/admin/photos?search=${tag}&l1=01&l2=02`, { token: a.token })).body.content.map((x: any) => x.id)).toEqual([p1]);
    expect((await call('GET', `/api/admin/photos?search=${tag.toLowerCase()}&memberId=${m.id}`, { token: a.token })).body.totalElements).toBe(2);
    expect(await call('GET', '/api/admin/photos?memberId=x', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
  });

  it('상세·분류 코드 변경·삭제(시리즈 연결 정리)', async () => {
    const a = await admin();
    const m = await insertMember();
    const p = await insertPhoto(m.id);
    const s = await insertSeries(m.id);
    await seriesPhoto(s, p);
    const d = await call('GET', `/api/admin/photos/${p}`, { token: a.token });
    expect(d.body).toMatchObject({ id: p, categoryCode: null, l1Name: '00', l2Name: '00' });
    const u = await call('PATCH', `/api/admin/photos/${p}/category-code`, { token: a.token, body: { categoryCode: '0204050000' } });
    expect(u).toMatchObject({ status: 200, body: { categoryCode: '0204050000', l1Name: '02', l2Name: '04' } });
    expect(await call('PATCH', `/api/admin/photos/${p}/category-code`, { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('GET', '/api/admin/photos/999999999', { token: a.token })).toMatchObject({ status: 400, body: { error: '사진을 찾을 수 없습니다.' } });
    expect(await call('DELETE', `/api/admin/photos/${p}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '사진이 삭제되었습니다.' } });
    expect((await q('SELECT COUNT(*)::int AS c FROM series_photos WHERE photo_id = $1', [p]))[0].c).toBe(0);
  });

  it('분류 — level 지정·전체 묶음(활성만, 순서대로)', async () => {
    const a = await admin();
    const code = String(Math.floor(Math.random() * 90) + 10);
    await q('INSERT INTO photo_categories (level, code, name_ko, name_en, sort_order, is_active) VALUES (9, $1, $2, $3, 2, true), (9, $4, $5, null, 1, true), (9, $6, $7, null, 0, false) ON CONFLICT DO NOTHING',
      [code, `분류${code}`, `Cat${code}`, `${code}`.split('').reverse().join('') === code ? 'zz' : `${code}`.split('').reverse().join(''), '먼저', 'x' + code.slice(1), '숨김']);
    const r = await call('GET', '/api/admin/categories?level=9', { token: a.token });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body[0])).toEqual(['level', 'code', 'nameKo', 'nameEn', 'sortOrder']);
    expect(r.body.every((c: any) => c.level === 9)).toBe(true);
    expect(r.body.map((c: any) => c.sortOrder)).toEqual([...r.body.map((c: any) => c.sortOrder)].sort((x: number, y: number) => x - y));
    expect(r.body.some((c: any) => c.nameKo === '숨김')).toBe(false);
    const all = await call('GET', '/api/admin/categories', { token: a.token });
    expect(all.body['9']).toEqual(r.body);
    expect(await call('GET', '/api/admin/categories?level=x', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
  });
});

describe('시리즈·큐레이션', () => {
  it('목록·상세·추천 올리기/내리기(초안·사진 없음 거부)·삭제', async () => {
    const a = await admin();
    const tag = `S${uniq()}`;
    const m = await insertMember({ name: `작가${tag}` });
    const s1 = await insertSeries(m.id, { title: `여름 ${tag}` });
    const s2 = await insertSeries(m.id, { title: `겨울 ${tag}` });
    const p = await insertPhoto(m.id);
    await seriesPhoto(s1, p);
    const r = await call('GET', `/api/admin/series?search=${tag}`, { token: a.token });
    expect(r.body.totalElements).toBe(2);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'title', 'coverImageUrl', 'memberId', 'authorName', 'photoCount', 'likesCount', 'viewCount', 'shootType', 'draft', 'featured', 'featuredAt', 'createdAt']);
    const one = r.body.content.find((x: any) => x.id === s1);
    expect(one).toMatchObject({ photoCount: 1, draft: false, featured: false, featuredAt: null, authorName: m.name });
    expect(await call('PUT', `/api/admin/series/${s2}/featured`, { token: a.token, body: { featured: true } })).toMatchObject({ status: 400, body: { error: '사진이 없는 작업은 추천할 수 없어요.' } });
    expect(await call('PUT', `/api/admin/series/${s1}/featured`, { token: a.token, body: { featured: 'yes' } })).toMatchObject({ status: 400, body: { error: 'featured(true/false)가 필요합니다.' } });
    expect(await call('PUT', `/api/admin/series/999999999/featured`, { token: a.token, body: { featured: true } })).toMatchObject({ status: 400, body: { error: '작업을 찾을 수 없습니다.' } });
    const before = (await q('SELECT updated_at FROM series WHERE id = $1', [s1]))[0].updated_at;
    const f = await call('PUT', `/api/admin/series/${s1}/featured`, { token: a.token, body: { featured: true } });
    expect(f).toMatchObject({ status: 200, body: { id: s1, featured: true, photoCount: 1 } });
    expect(f.body.featuredAt).toMatch(LOCAL_DATE_TIME);
    expect((await q('SELECT updated_at FROM series WHERE id = $1', [s1]))[0].updated_at).toEqual(before);
    const cur = await call('GET', `/api/admin/series/curation?featured=true&search=${tag}`, { token: a.token });
    expect(cur.body.content.map((x: any) => x.id)).toEqual([s1]);
    expect((await call('GET', `/api/admin/series/curation?featured=false&search=${tag}`, { token: a.token })).body.totalElements).toBe(0);
    expect((await q("SELECT action, details FROM admin_activity_logs WHERE target_type = 'SERIES' AND target_id = $1", [s1]))[0]).toEqual({ action: 'CURATION_FEATURE', details: `여름 ${tag}` });
    await q('UPDATE series SET draft = true WHERE id = $1', [s1]);
    expect(await call('PUT', `/api/admin/series/${s1}/featured`, { token: a.token, body: { featured: true } })).toMatchObject({ status: 400, body: { error: '초안 작업은 추천할 수 없어요.' } });
    expect((await call('PUT', `/api/admin/series/${s1}/featured`, { token: a.token, body: { featured: false } })).body).toMatchObject({ featured: false, draft: true });
    expect((await call('GET', `/api/admin/series/${s2}`, { token: a.token })).body).toMatchObject({ id: s2, photoCount: 0 });
    expect(await call('GET', `/api/admin/series/999999999`, { token: a.token })).toMatchObject({ status: 400, body: { error: '시리즈를 찾을 수 없습니다.' } });
    expect(await call('DELETE', `/api/admin/series/${s1}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '시리즈가 삭제되었습니다.' } });
    expect((await q('SELECT COUNT(*)::int AS c FROM series_photos WHERE series_id = $1', [s1]))[0].c).toBe(0);
  });
});

describe('포트폴리오', () => {
  it('목록·통계·상세·승인/반려/숨김·삭제', async () => {
    const a = await admin();
    const tag = `F${uniq()}`;
    const m = await insertMember({ profileName: `p${tag.toLowerCase()}` });
    const pf = await insertPortfolio(m.id, { title: `포폴 ${tag}`, status: 'PENDING', visibility: 'PUBLIC' });
    const p = await insertPhoto(m.id);
    await q("INSERT INTO portfolio_items (portfolio_id, photo_id, item_type, display_order, is_featured) VALUES ($1, $2, 'PHOTO', 1, false)", [pf, p]);
    const r = await call('GET', `/api/admin/portfolios?search=${tag}&status=PENDING`, { token: a.token });
    expect(r.body.totalElements).toBe(1);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'title', 'subtitle', 'coverImageUrl', 'memberId', 'authorName', 'authorProfile', 'categoryCode', 'l1Name', 'tags',
      'status', 'visibility', 'viewCount', 'likesCount', 'pinned', 'adminNote', 'photoCount', 'seriesCount', 'reviewedAt', 'createdAt']);
    expect(r.body.content[0]).toMatchObject({ id: pf, photoCount: 1, seriesCount: 0, l1Name: '00', authorProfile: `p${tag.toLowerCase()}`, pinned: false });
    expect(await call('GET', '/api/admin/portfolios?status=OPEN', { token: a.token })).toMatchObject({ status: 400, body: { error: 'No enum constant com.happiness.admin.entity.PortfolioStatus.OPEN' } });
    const st = await call('GET', '/api/admin/portfolios/stats', { token: a.token });
    expect(Object.keys(st.body).sort()).toEqual(['APPROVED', 'DRAFT', 'PENDING', 'REJECTED']);
    const ap = await call('PATCH', `/api/admin/portfolios/${pf}/approve`, { token: a.token, body: { adminNote: '좋아요' } });
    expect(ap.body).toMatchObject({ status: 'APPROVED', adminNote: '좋아요', photoCount: 1 });
    expect(ap.body.reviewedAt).toMatch(LOCAL_DATE_TIME);
    expect((await call('PATCH', `/api/admin/portfolios/${pf}/approve`, { token: a.token })).body).toMatchObject({ adminNote: null });
    expect((await call('PATCH', `/api/admin/portfolios/${pf}/reject`, { token: a.token, body: {} })).body).toMatchObject({ status: 'REJECTED', adminNote: '' });
    expect(await call('PATCH', `/api/admin/portfolios/${pf}/reject`, { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect((await call('PATCH', `/api/admin/portfolios/${pf}/hide`, { token: a.token })).body).toMatchObject({ visibility: 'PRIVATE' });
    expect(await call('GET', `/api/admin/portfolios/999999999`, { token: a.token })).toMatchObject({ status: 400, body: { error: '포트폴리오를 찾을 수 없습니다.' } });
    expect(await call('DELETE', `/api/admin/portfolios/${pf}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '포트폴리오가 삭제되었습니다.' } });
    expect((await q('SELECT COUNT(*)::int AS c FROM portfolio_items WHERE portfolio_id = $1', [pf]))[0].c).toBe(0);
  });
});

describe('정렬', () => {
  it('사진·시리즈·시리즈 사진·포트폴리오 항목 순서 조회/저장(0은 뒤로, 같은 id는 마지막 값)', async () => {
    const a = await admin('SA');
    const m = await insertMember();
    const p1 = await insertPhoto(m.id, { displayOrder: 0 });
    const p2 = await insertPhoto(m.id, { displayOrder: 2 });
    const p3 = await insertPhoto(m.id, { displayOrder: 1 });
    const g = await call('GET', `/api/admin/sort/photos?memberId=${m.id}`, { token: a.token });
    expect(g.body.map((x: any) => x.id)).toEqual([p3, p2, p1]);
    expect(Object.keys(g.body[0])).toEqual(['id', 'title', 'thumbnailUrl', 'displayOrder', 'memberName', 'createdAt']);
    const put = await call('PUT', '/api/admin/sort/photos', { token: a.token, body: [{ id: p1, displayOrder: 1 }, { id: p3, displayOrder: 3 }, { id: p1, displayOrder: 2 }, { id: 999999999, displayOrder: 1 }] });
    expect(put.status).toBe(200);
    expect(put.body).toBeNull();
    const orders = Object.fromEntries((await q('SELECT id, display_order FROM photos WHERE member_id = $1', [m.id])).map((r: any) => [Number(r.id), r.display_order]));
    expect(orders).toEqual({ [p1]: 2, [p2]: 2, [p3]: 3 });
    expect(await call('PUT', '/api/admin/sort/photos', { token: a.token, body: { id: 1 } })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('PUT', '/api/admin/sort/photos', { token: a.token, body: [null] })).toMatchObject({ status: 500, body: SERVER_ERROR });

    const s = await insertSeries(m.id, { displayOrder: 5 });
    const sp1 = await seriesPhoto(s, p1, 1);
    const sp2 = await seriesPhoto(s, p2, 0);
    const ser = await call('GET', '/api/admin/sort/series', { token: a.token });
    expect(Object.keys(ser.body.find((x: any) => x.id === s))).toEqual(['id', 'title', 'coverImageUrl', 'displayOrder', 'memberName', 'photoCount']);
    expect(ser.body.find((x: any) => x.id === s).photoCount).toBe(2);
    expect((await call('PUT', '/api/admin/sort/series', { token: a.token, body: [{ id: s, displayOrder: 7 }] })).status).toBe(200);
    expect((await q('SELECT display_order FROM series WHERE id = $1', [s]))[0].display_order).toBe(7);
    const sps = await call('GET', `/api/admin/sort/series/${s}/photos`, { token: a.token });
    expect(sps.body.map((x: any) => x.id)).toEqual([sp2, sp1]);
    expect(Object.keys(sps.body[0])).toEqual(['id', 'photoId', 'title', 'thumbnailUrl', 'displayOrder']);
    await call('PUT', `/api/admin/sort/series/${s}/photos`, { token: a.token, body: [{ id: sp2, displayOrder: 9 }] });
    expect((await call('GET', `/api/admin/sort/series/${s}/photos`, { token: a.token })).body.map((x: any) => x.id)).toEqual([sp1, sp2]);

    const pf = await insertPortfolio(m.id);
    const i1 = Number((await q("INSERT INTO portfolio_items (portfolio_id, photo_id, item_type, display_order, is_featured) VALUES ($1, $2, 'PHOTO', 2, true) RETURNING id", [pf, p1]))[0].id);
    const i2 = Number((await q("INSERT INTO portfolio_items (portfolio_id, series_id, item_type, display_order, is_featured) VALUES ($1, $2, 'SERIES', 1, false) RETURNING id", [pf, s]))[0].id);
    const its = await call('GET', `/api/admin/sort/portfolios/${pf}/items`, { token: a.token });
    expect(its.body.map((x: any) => x.id)).toEqual([i2, i1]);
    expect(its.body[1]).toEqual({ id: i1, itemType: 'PHOTO', title: 'p', thumbnailUrl: null, displayOrder: 2, featured: true });
    expect(its.body[0]).toMatchObject({ itemType: 'SERIES', title: 's' });
    await call('PUT', `/api/admin/sort/portfolios/${pf}/items`, { token: a.token, body: [{ id: i1, displayOrder: 0 }] });
    expect((await call('GET', `/api/admin/sort/portfolios/${pf}/items`, { token: a.token })).body.map((x: any) => x.id)).toEqual([i1, i2]);
  });
});

describe('댓글·피처드·프로필 콘텐츠', () => {
  it('댓글 — 목록(사진 정보·답글 수)·개수·삭제(답글 포함)', async () => {
    const a = await admin();
    const m = await insertMember();
    const p = await insertPhoto(m.id, { title: '댓글사진' });
    const tag = `C${uniq()}`;
    const c1 = Number((await q(`INSERT INTO comments (photo_id, member_id, member_name, content, created_at) VALUES ($1, $2, '작성자', $3, ${NOW} - interval '1 minute') RETURNING id`, [p, m.id, `좋아요 ${tag} ${'긴'.repeat(70)}`]))[0].id);
    const c2 = Number((await q(`INSERT INTO comments (photo_id, member_id, member_name, content, parent_id, created_at) VALUES ($1, $2, '답글러', $3, $4, ${NOW}) RETURNING id`, [p, m.id, `답글 ${tag}`, c1]))[0].id);
    const r = await call('GET', `/api/admin/comments?search=${tag}`, { token: a.token });
    expect(r.body.content.map((x: any) => x.id)).toEqual([c2, c1]);
    expect(Object.keys(r.body.content[0])).toEqual(['id', 'photoId', 'photoTitle', 'photoThumbnailUrl', 'memberId', 'memberName', 'content', 'parentId', 'replyCount', 'createdAt']);
    expect(r.body.content[1]).toMatchObject({ replyCount: 1, parentId: null, photoTitle: '댓글사진' });
    expect(r.body.content[0]).toMatchObject({ replyCount: 0, parentId: c1 });
    expect((await call('GET', `/api/admin/comments?photoId=${p}&memberId=${m.id}`, { token: a.token })).body.totalElements).toBe(2);
    const cnt = await call('GET', '/api/admin/comments/counts', { token: a.token });
    expect(Object.keys(cnt.body).sort()).toEqual(['today', 'total']);
    const d = await call('DELETE', `/api/admin/comments/${c1}`, { token: a.token });
    expect(d.body).toEqual({ message: '댓글이 삭제되었습니다.', deleted: 2 });
    const log = (await q("SELECT details FROM admin_activity_logs WHERE action = 'COMMENT_DELETE' AND target_id = $1", [c1]))[0];
    expect(log.details).toBe(`작성자: 좋아요 ${tag} ${'긴'.repeat(70)}`.slice(0, `작성자: `.length + 60) + '… (답글 1개 포함)');
    expect(await call('DELETE', `/api/admin/comments/${c1}`, { token: a.token })).toMatchObject({ status: 400, body: { error: '댓글을 찾을 수 없습니다.' } });
  });

  it('피처드 — 추가(최대 10·중복)·목록·순서·제거 후 재정렬', async () => {
    const a = await admin();
    await q('DELETE FROM featured_items');
    const m = await insertMember();
    const ps = [];
    for (let i = 0; i < 3; i++) ps.push(await insertPhoto(m.id, { title: `f${i}`, likes: i }));
    const f0 = await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: ps[0], startsAt: '2026-12-01', endsAt: '' } });
    expect(f0.status).toBe(200);
    expect(Object.keys(f0.body)).toEqual(['id', 'photoId', 'photoTitle', 'thumbnailUrl', 'authorName', 'likesCount', 'displayOrder', 'startsAt', 'endsAt', 'addedAt']);
    expect(f0.body).toMatchObject({ photoId: ps[0], displayOrder: 0, startsAt: '2026-12-01', endsAt: null, authorName: m.name });
    expect(await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: ps[0] } })).toMatchObject({ status: 400, body: { error: '이미 피처드에 등록된 사진입니다.' } });
    expect(await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: 999999999 } })).toMatchObject({ status: 400, body: { error: '사진을 찾을 수 없습니다.' } });
    expect(await call('POST', '/api/admin/featured', { token: a.token, body: {} })).toMatchObject({ status: 500, body: SERVER_ERROR });
    expect(await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: ps[1], startsAt: '2026-13-01' } })).toMatchObject({ status: 400, body: INVALID });
    const f1 = (await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: ps[1] } })).body;
    const f2 = (await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: ps[2] } })).body;
    expect((await q('SELECT added_by_id FROM featured_items WHERE id = $1', [f1.id]))[0].added_by_id).toBeNull();
    const re = await call('PATCH', '/api/admin/featured/reorder', { token: a.token, body: { orderedIds: [f2.id, f0.body.id] } });
    expect(re.body[0].id).toBe(f2.id);
    expect(Object.fromEntries(re.body.map((x: any) => [x.id, x.displayOrder]))).toEqual({ [f2.id]: 0, [f0.body.id]: 1, [f1.id]: 1 });
    expect(await call('PATCH', '/api/admin/featured/reorder', { token: a.token, body: {} })).toMatchObject({ status: 500, body: SERVER_ERROR });
    expect(await call('DELETE', `/api/admin/featured/${f2.id}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '피처드에서 제거되었습니다.' } });
    expect((await call('GET', '/api/admin/featured', { token: a.token })).body.map((x: any) => x.displayOrder)).toEqual([0, 1]);
    for (let i = 0; i < 8; i++) await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: await insertPhoto(m.id) } });
    expect(await call('POST', '/api/admin/featured', { token: a.token, body: { photoId: await insertPhoto(m.id) } })).toMatchObject({ status: 400, body: { error: '피처드 사진은 최대 10개까지 등록할 수 있습니다.' } });
    await q('DELETE FROM featured_items');
  });

  it('프로필 콘텐츠 — 종류별 목록(제목·부제·태그)·개수·삭제 이력, 잘못된 종류 400', async () => {
    const a = await admin();
    const m = await insertMember();
    await q(`INSERT INTO testimonials (member_id, client_name, client_role, content, shoot_date, featured, display_order, series_id, created_at) VALUES ($1, '김고객', '신부', '최고', '2026.05', true, 0, 7, ${NOW})`, [m.id]);
    const pid = Number((await q(`INSERT INTO pricing_packages (member_id, name, price, price_label, description, featured, active, display_order, created_at) VALUES ($1, '스냅', 1234567, null, '설명', false, false, 0, ${NOW}) RETURNING id`, [m.id]))[0].id);
    await q(`INSERT INTO achievements (member_id, type, title, organizer, location, year_month, display_order, created_at) VALUES ($1, 'AWARD', '대상', '협회', '', '2025.05', 0, ${NOW})`, [m.id]);
    const t = await call('GET', `/api/admin/profile-content?type=testimonials&memberId=${m.id}`, { token: a.token });
    expect(t.status).toBe(200);
    expect(Object.keys(t.body.content[0])).toEqual(['id', 'type', 'memberId', 'memberName', 'title', 'subtitle', 'body', 'linkUrl', 'imageUrl', 'tags', 'createdAt']);
    expect(t.body.content[0]).toMatchObject({ type: 'testimonials', memberName: m.name, title: '김고객', subtitle: '신부 · 2026.05', body: '최고', tags: ['대표 후기', '작업 #7'] });
    const pr = await call('GET', `/api/admin/profile-content?type=pricing&memberId=${m.id}`, { token: a.token });
    expect(pr.body.content[0]).toMatchObject({ title: '스냅', subtitle: '1,234,567원', tags: ['비활성'], linkUrl: null });
    const ac = await call('GET', `/api/admin/profile-content?type=achievements&memberId=${m.id}`, { token: a.token });
    expect(ac.body.content[0]).toMatchObject({ subtitle: '협회 · 2025.05', tags: ['수상'] });
    const bad = await call('GET', '/api/admin/profile-content?type=photos', { token: a.token });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/^type은 .+ 중 하나여야 합니다\.$/);
    expect(await call('GET', '/api/admin/profile-content', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect(Object.keys((await call('GET', '/api/admin/profile-content/counts', { token: a.token })).body)).toEqual(['testimonials', 'pricing', 'press', 'achievements', 'brands']);
    expect(await call('DELETE', `/api/admin/profile-content/pricing/${pid}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '삭제되었습니다.' } });
    expect((await q("SELECT target_type, details FROM admin_activity_logs WHERE action = 'PROFILE_CONTENT_DELETE' AND target_id = $1", [pid]))[0]).toEqual({ target_type: 'PRICING', details: `가격 패키지 · 작가 #${m.id} · 스냅` });
    expect(await call('DELETE', `/api/admin/profile-content/pricing/${pid}`, { token: a.token })).toMatchObject({ status: 400, body: { error: '콘텐츠를 찾을 수 없습니다.' } });
  });
});

describe('배너·팝업·공지', () => {
  it('배너 — 생성(isActive 키는 무시되고 active만 읽음)·URL 검사·수정·토글·순서·삭제', async () => {
    const a = await admin();
    expect(await call('POST', '/api/admin/banners', { token: a.token, body: { title: 'x', imageUrl: 'javascript:alert(1)' } })).toMatchObject({ status: 400, body: { error: '이미지은(는) http(s):// 주소여야 합니다.' } });
    expect(await call('POST', '/api/admin/banners', { token: a.token, body: { title: 'x', imageUrl: 'https://a.com/b.jpg', linkUrl: '//evil.com' } })).toMatchObject({ status: 400, body: { error: '링크은(는) http(s):// 주소 또는 /로 시작하는 앱 내부 경로여야 합니다.' } });
    expect(await call('POST', '/api/admin/banners', { token: a.token, body: { title: 'x', imageUrl: 'https://my_host/b.jpg' } })).toMatchObject({ status: 400 });
    const b1 = await call('POST', '/api/admin/banners', { token: a.token, body: { title: '여름', imageUrl: ' https://cdn.example.com/a.jpg ', linkUrl: ' /events/summer ', isActive: true, startsAt: '2026-12-01T10:00' } });
    expect(b1.status).toBe(200);
    expect(Object.keys(b1.body)).toEqual(['id', 'title', 'imageUrl', 'linkUrl', 'displayOrder', 'startsAt', 'endsAt', 'createdAt', 'active']);
    expect(b1.body).toMatchObject({ imageUrl: 'https://cdn.example.com/a.jpg', linkUrl: '/events/summer', active: false, startsAt: '2026-12-01T10:00:00' });
    const b2 = await call('POST', '/api/admin/banners', { token: a.token, body: { title: '겨울', imageUrl: 'http://cdn.example.com:8080/b.jpg', active: true } });
    expect(b2.body).toMatchObject({ active: true, displayOrder: b1.body.displayOrder + 1 });
    expect(await call('POST', '/api/admin/banners', { token: a.token, body: { imageUrl: 'https://a.com/x.jpg' } })).toMatchObject({ status: 500, body: SERVER_ERROR });
    expect((await call('PATCH', `/api/admin/banners/${b1.body.id}/toggle`, { token: a.token })).body.active).toBe(true);
    const up = await call('PUT', `/api/admin/banners/${b1.body.id}`, { token: a.token, body: { title: '여름2', imageUrl: 'https://cdn.example.com/a2.jpg', active: true } });
    expect(up.body).toMatchObject({ title: '여름2', linkUrl: null, startsAt: null, active: true });
    expect(await call('PATCH', '/api/admin/banners/reorder', { token: a.token, body: { orderedIds: [b2.body.id, b1.body.id] } })).toMatchObject({ status: 200, body: { message: '순서가 저장되었습니다.' } });
    const list = (await call('GET', '/api/admin/banners', { token: a.token })).body;
    expect(list.findIndex((x: any) => x.id === b2.body.id)).toBeLessThan(list.findIndex((x: any) => x.id === b1.body.id));
    expect(await call('DELETE', `/api/admin/banners/${b1.body.id}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '배너가 삭제되었습니다.' } });
    expect(await call('DELETE', `/api/admin/banners/${b1.body.id}`, { token: a.token })).toMatchObject({ status: 400, body: { error: '배너를 찾을 수 없습니다.' } });
    await call('DELETE', `/api/admin/banners/${b2.body.id}`, { token: a.token });
  });

  it('팝업 — 생성·토글·공개 활성 목록(대상 화면·기간)·순서·삭제', async () => {
    const a = await admin();
    const screen = `S${uniq()}`;
    const p1 = await call('POST', '/api/admin/popups', { token: a.token, body: { title: '공지', content: '내용', targetScreen: screen, isActive: true, showOnce: true } });
    expect(p1.status).toBe(200);
    expect(Object.keys(p1.body)).toEqual(['id', 'title', 'content', 'imageUrl', 'linkUrl', 'targetScreen', 'showOnce', 'displayOrder', 'startsAt', 'endsAt', 'createdAt', 'updatedAt', 'active']);
    expect(p1.body).toMatchObject({ active: false, showOnce: true, targetScreen: screen });
    const p2 = await call('POST', '/api/admin/popups', { token: a.token, body: { title: '미래', content: 'c', targetScreen: screen, active: true, startsAt: '2099-01-01T00:00:00' } });
    expect(p2.body.active).toBe(true);
    expect((await call('GET', `/api/popups/active?screen=${screen}`)).body).toEqual([]);
    await call('PATCH', `/api/admin/popups/${p1.body.id}/toggle`, { token: a.token });
    const act = await call('GET', `/api/popups/active?screen=${screen}`);
    expect(act.status).toBe(200);
    expect(act.body.map((x: any) => x.id)).toEqual([p1.body.id]);
    expect(await call('POST', '/api/admin/popups', { token: a.token, body: { title: 't' } })).toMatchObject({ status: 500, body: SERVER_ERROR });
    const up = await call('PUT', `/api/admin/popups/${p2.body.id}`, { token: a.token, body: { title: '수정', content: 'c', active: true } });
    expect(up.body).toMatchObject({ targetScreen: 'ALL', startsAt: null });
    expect((await call('PATCH', '/api/admin/popups/reorder', { token: a.token, body: { orderedIds: [p2.body.id, p1.body.id] } })).body).toEqual({ message: '순서가 저장되었습니다.' });
    expect((await q('SELECT display_order FROM popups WHERE id = $1', [p1.body.id]))[0].display_order).toBe(2);
    for (const p of [p1, p2]) expect(await call('DELETE', `/api/admin/popups/${p.body.id}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '팝업이 삭제되었습니다.' } });
    expect(await call('PATCH', `/api/admin/popups/${p1.body.id}/toggle`, { token: a.token })).toMatchObject({ status: 400, body: { error: '팝업을 찾을 수 없습니다.' } });
  });

  it('공지 — 생성(PUBLISHED면 게시 시각)·목록(고정 우선)·수정·삭제, isPinned 키는 무시', async () => {
    const a = await admin();
    const tag = `N${uniq()}`;
    const n1 = await call('POST', '/api/admin/notices', { token: a.token, body: { type: '일반', title: `점검 ${tag}`, content: '본문', status: 'DRAFT', isPinned: true } });
    expect(n1.status).toBe(200);
    expect(Object.keys(n1.body)).toEqual(['id', 'type', 'title', 'content', 'status', 'publishedAt', 'expiresAt', 'createdAt', 'updatedAt', 'pinned']);
    expect(n1.body).toMatchObject({ pinned: false, publishedAt: null });
    const n2 = await call('POST', '/api/admin/notices', { token: a.token, body: { type: '이벤트', title: `행사 ${tag}`, content: 'c', status: 'PUBLISHED', pinned: true, expiresAt: '2027-01-01T00:00' } });
    expect(n2.body).toMatchObject({ pinned: true, expiresAt: '2027-01-01T00:00:00' });
    expect(n2.body.publishedAt).toMatch(LOCAL_DATE_TIME);
    const l = await call('GET', `/api/admin/notices?search=${tag.toLowerCase()}`, { token: a.token });
    expect(l.body.content.map((x: any) => x.id)).toEqual([n2.body.id, n1.body.id]);
    expect((await call('GET', `/api/admin/notices?search=${tag}&status=DRAFT&type=일반`, { token: a.token })).body.totalElements).toBe(1);
    const up = await call('PUT', `/api/admin/notices/${n1.body.id}`, { token: a.token, body: { type: '일반', title: '바뀜', content: '본문', status: 'PUBLISHED' } });
    expect(up.body.publishedAt).toMatch(LOCAL_DATE_TIME);
    expect(await call('PUT', `/api/admin/notices/${n1.body.id}`, { token: a.token, body: { type: '일반', content: '본문', status: 'PUBLISHED' } })).toMatchObject({ status: 500, body: SERVER_ERROR });
    expect((await call('GET', `/api/admin/notices/${n1.body.id}`, { token: a.token })).body.title).toBe('바뀜');
    for (const n of [n1, n2]) expect(await call('DELETE', `/api/admin/notices/${n.body.id}`, { token: a.token })).toMatchObject({ status: 200, body: { message: '공지사항이 삭제되었습니다.' } });
    expect(await call('GET', `/api/admin/notices/${n1.body.id}`, { token: a.token })).toMatchObject({ status: 400, body: { error: '공지사항을 찾을 수 없습니다.' } });
  });
});
