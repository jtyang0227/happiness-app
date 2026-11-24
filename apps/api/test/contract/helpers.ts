import { randomUUID } from 'node:crypto';

export const BASE = (process.env.API_BASE_URL ?? 'http://localhost:8090').replace(/\/$/, '');

export interface Res<T = any> { status: number; body: T }

export async function call<T = any>(method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<Res<T>> {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      // 서버 간 rate limit에 걸리지 않게 요청마다 다른 IP로 보이게 한다
      'X-Forwarded-For': `10.${rand()}.${rand()}.${rand()}`,
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* 텍스트 그대로 */ }
  return { status: r.status, body };
}

const rand = () => Math.floor(Math.random() * 250) + 1;

export const PASSWORD = 'Passw0rd!!';

export interface User { id: number; email: string; profileName: string; token: string; refreshToken: string }

export function uniq() {
  return randomUUID().slice(0, 8);
}

export async function signupAndLogin(extra: Record<string, unknown> = {}): Promise<User> {
  const s = uniq();
  const email = `ct-${s}@test.com`;
  const profileName = `ct${s}`;
  const su = await call('POST', '/api/auth/signup', { body: { email, password: PASSWORD, name: '테스터', profileName, termsAgreed: true, privacyAgreed: true, ...extra } });
  if (su.status !== 201) throw new Error(`signup ${su.status} ${JSON.stringify(su.body)}`);
  const li = await call('POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  if (li.status !== 200) throw new Error(`login ${li.status} ${JSON.stringify(li.body)}`);
  return { id: li.body.data.member.id, email, profileName, token: li.body.data.accessToken, refreshToken: li.body.data.refreshToken };
}

/** Spring LocalDateTime JSON — 시간대 표시 없음 */
export const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/;

export const MEMBER_KEYS = [
  'id', 'email', 'name', 'tel', 'profileName', 'instagramId', 'avatarUrl', 'coverUrl', 'bio', 'websiteUrl', 'location',
  'specialties', 'provider', 'publicProfile', 'emailNotifications', 'portfolioLayout', 'portfolioCoverPhotoId', 'status',
  'authority', 'role', 'createdAt', 'updatedAt',
];

/** 사진 등록 — 사진 API는 아직 Spring(프록시)이라 양쪽 서버 모두 같은 경로로 만든다. 응답은 {status,data} 래퍼 */
export async function createPhoto(u: User, extra: Record<string, unknown> = {}): Promise<number> {
  const r = await call('POST', '/api/photos', { token: u.token, body: { title: `사진-${uniq()}`, imageUrl: 'https://example.com/a.jpg', memberId: u.id, ...extra } });
  if (r.status !== 200 && r.status !== 201) throw new Error(`photo ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data.id;
}
