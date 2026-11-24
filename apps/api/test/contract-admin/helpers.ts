import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q } from './db.js';

export const BASE = (process.env.ADMIN_API_BASE_URL ?? 'http://localhost:8091').replace(/\/$/, '');
/** 서버 간 토큰 호환 테스트용(선택) */
export const OTHER = process.env.OTHER_ADMIN_API_BASE_URL?.replace(/\/$/, '');
/** Spring 어드민에서만 다른 의도적 차이(Spring 버그를 고친 곳)를 가를 때만 쓴다 */
export const IS_SPRING = /:8081\b/.test(BASE);

export interface Res<T = any> { status: number; body: T; headers: Headers }

export async function call<T = any>(method: string, path: string, opts: { token?: string; body?: unknown; raw?: string; headers?: Record<string, string>; base?: string } = {}): Promise<Res<T>> {
  const r = await fetch((opts.base ?? BASE) + path, {
    method,
    headers: {
      ...(opts.body !== undefined || opts.raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const text = await r.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* 텍스트 그대로 */ }
  return { status: r.status, body, headers: r.headers };
}

export const uniq = () => randomUUID().slice(0, 8);
export const PASSWORD = 'Admin123!';
const HASH = bcrypt.hashSync(PASSWORD, 10).replace(/^\$2b\$/, '$2a$');

export interface Account { id: number; email: string; name: string; token?: string }

/** 어드민 스키마 members에 계정을 바로 넣는다(prod 프로필엔 회원가입·시드가 없다) */
export async function insertMember(opts: { authority?: string; status?: string; name?: string; email?: string; tel?: string; profileName?: string | null; password?: string | null } = {}): Promise<Account> {
  const s = uniq();
  const email = opts.email ?? `ca-${s}@test.com`;
  const name = opts.name ?? `관리-${s}`;
  const rows = await q(
    `INSERT INTO members (authority, status, email, name, tel, profile_name, password, is_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, now() at time zone 'utc', now() at time zone 'utc') RETURNING id`,
    [opts.authority ?? 'US', opts.status ?? 'ACTIVE', email, name, opts.tel ?? '010-1234-5678', opts.profileName === undefined ? null : opts.profileName, opts.password === undefined ? HASH : opts.password],
  );
  return { id: Number(rows[0].id), email, name };
}

export async function login(email: string, password = PASSWORD): Promise<string> {
  const r = await call('POST', '/api/auth/login', { body: { email, password } });
  if (r.status !== 200) throw new Error(`login ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token;
}

/** WM(웹마스터) 관리자 하나 + 토큰 */
export async function admin(authority: 'WM' | 'SA' = 'WM'): Promise<Account & { token: string }> {
  const a = await insertMember({ authority });
  return { ...a, token: await login(a.email) };
}

/** Spring LocalDateTime JSON — 시간대 표시 없음 */
export const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/;

export const SERVER_ERROR = { error: '서버 오류가 발생했습니다.' };
export const INVALID = { error: '잘못된 요청입니다.' };
