import { createHash } from 'node:crypto';
import pg from 'pg';

/** 계약 테스트 준비용 — HTTP로 만들 수 없는 상태(관리자 권한, 재설정 토큰)만 DB에 직접 넣는다. 두 서버는 같은 DB를 본다. */
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://happy:happy@localhost:5432/happiness' });

export async function makeAdmin(memberId: number) {
  await pool.query("UPDATE members SET authority = 'SA' WHERE id = $1", [memberId]);
}

export async function setTel(memberId: number, tel: string) {
  await pool.query('UPDATE members SET tel = $2 WHERE id = $1', [memberId, tel]);
}

/** 원문 토큰을 정해서 넣는다(서버는 해시만 저장하므로). minutes가 음수면 이미 만료. */
export async function insertResetToken(memberId: number, raw: string, minutes = 30) {
  const hash = createHash('sha256').update(raw).digest('hex');
  await pool.query(
    "INSERT INTO password_reset_tokens (member_id, token_hash, expires_at, created_at) VALUES ($1, $2, (now() at time zone 'utc') + make_interval(mins => $3), now() at time zone 'utc')",
    [memberId, hash, minutes],
  );
}

export async function closeDb() {
  await pool.end();
}

/** 모임 상태를 바로 바꾼다(배치가 시간에 따라 바꾸는 ONGOING·ENDED를 테스트에서 만들 때) */
export async function setGatheringStatus(gatheringId: number, status: string) {
  await pool.query('UPDATE gatherings SET status = $2 WHERE id = $1', [gatheringId, status]);
}

export async function setInstagramId(memberId: number, instagramId: string | null) {
  await pool.query('UPDATE members SET instagram_id = $2 WHERE id = $1', [memberId, instagramId]);
}

export async function newsletterToken(memberId: number, email: string): Promise<string> {
  const r = await pool.query('SELECT token FROM newsletter_subscribers WHERE member_id = $1 AND email = $2', [memberId, email]);
  return r.rows[0].token;
}
