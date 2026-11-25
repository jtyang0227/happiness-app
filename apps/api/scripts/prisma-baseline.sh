#!/usr/bin/env bash
# 컷오버 C-2 — 운영 DB를 Prisma 마이그레이션 기준선(0_baseline)에 올린다. 앱·어드민 각각 한 번.
#
#   사용: apps/api/scripts/prisma-baseline.sh <app|admin> <check|apply|resolve|status>
#     DATABASE_URL(앱) / ADMIN_DATABASE_URL(어드민, 끝에 ?schema=<ADMIN_DB_SCHEMA>) = 운영 DB 주소(Supabase 직접 연결 5432 권장)
#
#   check   — 읽기 전용. 운영 DB → prisma 스키마로 가는 차이를 SQL 파일로 쓰고 요약한다.
#             운영엔 아직 SNAPDAY 표 7개(outing_polls 등)가 없다 — 작업 브랜치 Spring 엔티티로만 정의됐기 때문. 그래서
#             "CREATE TABLE …" 몇 개가 나오는 것이 정상이다. DROP·ALTER … DROP·타입 변경이 보이면 멈추고 확인할 것.
#   apply   — check가 만든 SQL을 운영 DB에 실행(추가만 있을 때). DROP이 섞여 있으면 거부한다.
#   resolve — 0_baseline을 "이미 적용됨"으로 기록(_prisma_migrations 표가 생김). 차이가 없을 때만 실행한다.
#   status  — 마이그레이션 상태.
# 이후 스키마 변경은 `npx prisma migrate dev --name …`(로컬) → 커밋 → 운영 `npx prisma migrate deploy`.
set -euo pipefail
target="${1:-}"; cmd="${2:-}"
cd "$(dirname "$0")/.."
case "$target" in
  app)   cfg=prisma.config.ts;       schema=prisma/schema.prisma;       var=DATABASE_URL ;;
  admin) cfg=prisma.admin.config.ts; schema=prisma/admin/schema.prisma; var=ADMIN_DATABASE_URL ;;
  *) echo "사용: $0 <app|admin> <check|apply|resolve|status>" >&2; exit 2 ;;
esac
[ -n "${!var:-}" ] || { echo "$var 가 비어 있습니다(운영 DB 주소)." >&2; exit 2; }
out="${TMPDIR:-/tmp}/prisma-baseline-$target.sql"
danger='DROP |ALTER COLUMN .* (TYPE|SET DATA TYPE)'

case "$cmd" in
  check)
    npx prisma migrate diff --config "$cfg" --from-config-datasource --to-schema "$schema" --script -o "$out"
    if ! grep -qvE '^\s*(--.*)?$' "$out"; then echo "차이 없음 — 바로 resolve 하면 됩니다."; exit 0; fi
    echo "차이 SQL: $out"
    grep -E '^(CREATE|ALTER|DROP)' "$out" | sed -E 's/\(.*//' | sort | uniq -c
    if grep -qE "$danger" "$out"; then echo "⚠️ 삭제·타입 변경이 있습니다 — apply 하지 말고 내용을 확인하세요." >&2; exit 1; fi
    echo "추가만 있습니다 — 내용을 확인한 뒤 apply → check(차이 없음) → resolve." ;;
  apply)
    [ -s "$out" ] || { echo "먼저 check를 실행하세요." >&2; exit 2; }
    if grep -qE "$danger" "$out"; then echo "삭제·타입 변경이 있어 실행하지 않습니다: $out" >&2; exit 1; fi
    npx prisma db execute --config "$cfg" --file "$out" ;;
  resolve)
    npx prisma migrate resolve --config "$cfg" --applied 0_baseline ;;
  status)
    npx prisma migrate status --config "$cfg" ;;
  *) echo "사용: $0 <app|admin> <check|apply|resolve|status>" >&2; exit 2 ;;
esac
