#!/usr/bin/env bash
set -e

echo "=== Happiness App Dev Container Setup ==="

# Node.js 설치 (devcontainers feature 대신 수동)
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "--- Java version ---"
java -version

echo "--- Node version ---"
node -v
npm -v

echo "--- Backend: Gradle 의존성 캐시 ---"
cd /workspace/backend
./gradlew dependencies --quiet 2>/dev/null || true

echo "--- Frontend: npm install ---"
cd /workspace/frontend
npm install --prefer-offline 2>/dev/null || npm install

echo "--- Mobile: npm install ---"
cd /workspace/mobile
npm install --prefer-offline 2>/dev/null || npm install

echo "=== Setup complete! ==="
echo ""
echo "실행 명령어:"
echo "  Backend : cd backend && ./gradlew bootRun"
echo "  Frontend: cd frontend && npm start"
echo "  All     : docker compose up (루트에서)"
