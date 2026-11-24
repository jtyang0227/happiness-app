#!/usr/bin/env bash
# TypeScript 전환 로컬 검증 환경 — PostgreSQL 16 + Redis + Spring(8080, 같은 PG) + Nest(8090)
# 새 클라우드 컨테이너에서도 그대로 돌도록 멱등. 사용: apps/api/scripts/dev-env.sh [up|down|status]
# 로그: $LOG_DIR/spring.log, nest.log (기본 /tmp/happiness-dev)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
LOG_DIR="${LOG_DIR:-/tmp/happiness-dev}"
mkdir -p "$LOG_DIR"
cmd="${1:-up}"

wait_health() { # $1=port $2=초
  for _ in $(seq 1 "$2"); do curl -sf "localhost:$1/actuator/health" >/dev/null && return 0; sleep 2; done
  echo "port $1 health 실패 — $LOG_DIR 로그 확인" >&2; return 1
}

if [ "$cmd" = down ]; then
  fuser -k 8080/tcp 8090/tcp 54321/tcp >/dev/null 2>&1 || true   # pkill -f 금지(내 셸까지 죽음)
  echo "stopped 8080/8090/54321"; exit 0
fi
if [ "$cmd" = status ]; then
  for p in 8080 8090; do printf '%s ' "$p"; curl -s "localhost:$p/actuator/health" || printf 'down'; echo; done
  redis-cli ping 2>/dev/null || echo "redis down"; pg_lsclusters 2>/dev/null | tail -1; exit 0
fi

# 1) PostgreSQL — 클러스터 시작 + 역할/DB(happy/happy, happiness)
pg_lsclusters | grep -q "16 *main.*online" || pg_ctlcluster 16 main start
su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='happy'\"" | grep -q 1 \
  || su postgres -c "psql -c \"CREATE ROLE happy LOGIN SUPERUSER PASSWORD 'happy'\""
su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='happiness'\"" | grep -q 1 \
  || su postgres -c "createdb -O happy happiness"

# 2) Redis (토큰 회전·블랙리스트 테스트에 필요)
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes --dir "$LOG_DIR" >/dev/null 2>&1 < /dev/null

# 2-1) 가짜 Supabase Storage(업로드 계약 테스트용) — 두 서버 모두 이쪽으로 업로드
export SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}" SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-test-service-key}"
curl -sf localhost:54321/__log >/dev/null || (setsid nohup node "$ROOT/apps/api/scripts/fake-supabase.mjs" > "$LOG_DIR/fake-supabase.log" 2>&1 < /dev/null &)

# 3) Spring — 같은 PG에 ddl-auto=update로 스키마 생성(스키마 주인은 Hibernate)
if ! curl -sf localhost:8080/actuator/health >/dev/null; then
  (cd "$ROOT/backend" && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/happiness \
    SPRING_DATASOURCE_USERNAME=happy SPRING_DATASOURCE_PASSWORD=happy \
    SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver SPRING_JPA_HIBERNATE_DDL_AUTO=update \
    SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect TZ=UTC \
    setsid nohup ./gradlew bootRun -q > "$LOG_DIR/spring.log" 2>&1 < /dev/null &)
fi
wait_health 8080 120

# 4) Nest — .env 없으면 예시에서 만들고 빌드(prisma generate 포함)
cd "$ROOT/apps/api"
[ -f .env ] || sed -e 's#^DATABASE_URL=.*#DATABASE_URL="postgresql://happy:happy@localhost:5432/happiness"#' .env.example > .env
[ -d node_modules ] || npm ci
[ -f dist/main.js ] || npm run build
if ! curl -sf localhost:8090/actuator/health >/dev/null; then
  (PORT=8090 LEGACY_API_URL=http://localhost:8080 setsid nohup node dist/main.js > "$LOG_DIR/nest.log" 2>&1 < /dev/null &)
fi
wait_health 8090 30
echo "ready — Spring 8080, Nest 8090. 계약 테스트: API_BASE_URL=http://localhost:8080|8090 npm run test:contract"
