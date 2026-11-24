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
