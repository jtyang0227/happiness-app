#!/usr/bin/env node
// 컷오버 스모크 점검 — 운영에 돌려도 안전한 읽기 위주 확인(쓰기는 존재하지 않는 계정의 로그인 실패 1번뿐).
// Spring·Nest 어느 쪽에도 같은 결과가 나와야 한다(전환 전후 비교용).
//   node scripts/smoke.mjs --api https://api.happiness.io.kr --admin-api https://admin-api.example.com --web https://happiness.io.kr --admin-web https://admin.example.com
// 주소를 준 대상만 점검한다. 하나라도 실패하면 종료 코드 1.
import { randomUUID } from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const trim = (u) => u?.replace(/\/$/, '');
const targets = { api: trim(args.api), adminApi: trim(args['admin-api']), web: trim(args.web), adminWeb: trim(args['admin-web']) };
if (!Object.values(targets).some(Boolean)) {
  console.error('사용법: node scripts/smoke.mjs [--api URL] [--admin-api URL] [--web URL] [--admin-web URL]');
  process.exit(2);
}

let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name} — ${e instanceof Error ? e.message : String(e)}`);
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function req(method, url, body) {
  // 잠든 무료 인스턴스가 깨는 시간(최대 약 60초)을 기다린다
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* html 등 */ }
  return { status: r.status, text, json };
}
const nobody = () => `smoke-${randomUUID().slice(0, 8)}@example.invalid`;

if (targets.api) {
  const b = targets.api;
  console.log(`\n[앱 API] ${b}`);
  await check('health UP', async () => {
    const r = await req('GET', `${b}/actuator/health`);
    expect(r.status === 200 && r.json?.status === 'UP', `${r.status} ${r.text.slice(0, 80)}`);
  });
  await check('공개 사진 목록 GET /api/photos?page=0&size=1', async () => {
    const r = await req('GET', `${b}/api/photos?page=0&size=1`);
    expect(r.status === 200 && Array.isArray(r.json?.data), `${r.status} ${r.text.slice(0, 80)}`);
  });
  await check('공개 작업 탐색 GET /api/series/discover?size=1', async () => {
    const r = await req('GET', `${b}/api/series/discover?size=1`);
    expect(r.status === 200 && Array.isArray(r.json?.data) && typeof r.json?.hasNext === 'boolean', `${r.status} ${r.text.slice(0, 80)}`);
  });
  await check('없는 포트폴리오 404', async () => {
    const r = await req('GET', `${b}/api/portfolio/smoke-${randomUUID().slice(0, 8)}`);
    expect(r.status === 404, `${r.status}`);
  });
  await check('인증 필요 경로 무토큰 401', async () => {
    const r = await req('GET', `${b}/api/auth/members`);
    expect(r.status === 401, `${r.status}`);
  });
  await check('없는 계정 로그인 실패 401(ApiResponse)', async () => {
    const r = await req('POST', `${b}/api/auth/login`, { email: nobody(), password: 'smoke-wrong' });
    expect(r.status === 401 && r.json?.success === false && typeof r.json?.message === 'string', `${r.status} ${r.text.slice(0, 80)}`);
  });
}

if (targets.adminApi) {
  const b = targets.adminApi;
  console.log(`\n[어드민 API] ${b}`);
  await check('health UP', async () => {
    const r = await req('GET', `${b}/actuator/health`);
    expect(r.status === 200 && r.json?.status === 'UP', `${r.status} ${r.text.slice(0, 80)}`);
  });
  await check('무토큰 403 빈 본문', async () => {
    const r = await req('GET', `${b}/api/admin/hello`);
    expect(r.status === 403 && r.text === '', `${r.status} ${r.text.slice(0, 80)}`);
  });
  await check('없는 계정 로그인 401 {message}', async () => {
    const r = await req('POST', `${b}/api/auth/login`, { email: nobody(), password: 'smoke-wrong' });
    expect(r.status === 401 && r.json?.message === '이메일 또는 비밀번호가 올바르지 않습니다.', `${r.status} ${r.text.slice(0, 80)}`);
  });
  await check('공개 팝업 GET /api/popups/active', async () => {
    const r = await req('GET', `${b}/api/popups/active`);
    expect(r.status === 200 && Array.isArray(r.json), `${r.status} ${r.text.slice(0, 80)}`);
  });
}

for (const [label, base, deep] of [['웹', targets.web, '/explore'], ['어드민 웹', targets.adminWeb, '/members']]) {
  if (!base) continue;
  console.log(`\n[${label}] ${base}`);
  await check('첫 화면 HTML', async () => {
    const r = await req('GET', `${base}/`);
    expect(r.status === 200 && /<div id="(root|__next)"/.test(r.text), `${r.status}`);
  });
  await check(`깊은 링크 ${deep} → SPA 셸(200)`, async () => {
    const r = await req('GET', `${base}${deep}`);
    expect(r.status === 200 && /<div id="(root|__next)"/.test(r.text), `${r.status}`);
  });
}

console.log(failed ? `\n실패 ${failed}건` : '\n모두 통과');
process.exit(failed ? 1 : 0);
