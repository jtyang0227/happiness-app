import pg from 'pg';

/** 어드민 스키마(기본 admin) 준비용 — 두 서버가 같은 스키마를 본다 */
const schema = process.env.ADMIN_DB_SCHEMA ?? 'admin';
const pool = new pg.Pool({
  connectionString: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://happy:happy@localhost:5432/happiness',
  options: `-c search_path=${schema}`,
});

export async function q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(sql, params)).rows as T[];
}

export async function closeDb() {
  await pool.end();
}

const NOW = "now() at time zone 'utc'";

/** 어드민 스키마 photos 한 장 */
export async function insertPhoto(memberId: number, extra: { title?: string; categoryCode?: string; colorMood?: string; likes?: number; displayOrder?: number } = {}) {
  const r = await q(`INSERT INTO photos (member_id, title, image_url, category_code, color_mood, likes_count, saves_count, shares_count, display_order, created_at, updated_at)
    VALUES ($1, $2, 'https://example.com/p.jpg', $3, $4, $5, 0, 0, $6, ${NOW}, ${NOW}) RETURNING id`,
    [memberId, extra.title ?? 'p', extra.categoryCode ?? null, extra.colorMood ?? null, extra.likes ?? 0, extra.displayOrder ?? 0]);
  return Number(r[0].id);
}

export async function insertSeries(memberId: number, extra: { title?: string; displayOrder?: number } = {}) {
  const r = await q(`INSERT INTO series (member_id, title, display_order, likes_count, view_count, created_at, updated_at) VALUES ($1, $2, $3, 0, 0, ${NOW}, ${NOW}) RETURNING id`,
    [memberId, extra.title ?? 's', extra.displayOrder ?? 0]);
  return Number(r[0].id);
}

export async function insertInquiry(senderId: number | null, receiverId: number | null, extra: { shootType?: string; isRead?: boolean } = {}) {
  const r = await q(`INSERT INTO inquiries (sender_id, receiver_id, sender_name, sender_email, message, shoot_type, is_read, process_status, created_at)
    VALUES ($1, $2, '보낸이', 's@test.com', '문의', $3, $4, 'NEW', ${NOW}) RETURNING id`, [senderId, receiverId, extra.shootType ?? null, extra.isRead ?? false]);
  return Number(r[0].id);
}

export async function insertPortfolio(memberId: number, extra: { title?: string; status?: string; visibility?: string } = {}) {
  const r = await q(`INSERT INTO portfolios (member_id, title, status, visibility, likes_count, view_count, is_pinned, created_at, updated_at) VALUES ($1, $2, $3, $4, 0, 0, false, ${NOW}, ${NOW}) RETURNING id`,
    [memberId, extra.title ?? 'pf', extra.status ?? 'DRAFT', extra.visibility ?? 'PRIVATE']);
  return Number(r[0].id);
}
