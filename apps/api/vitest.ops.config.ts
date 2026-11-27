import { defineConfig } from 'vitest/config';

// 운영 연동(노션 등) 단위 테스트 — 서버·DB 없이 fetch를 가짜로 바꿔 돈다.
export default defineConfig({
  test: { include: ['test/ops/**/*.test.ts'] },
});
