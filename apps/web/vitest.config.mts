import { defineConfig } from 'vitest/config';

/** CRA(jest)에서 쓰던 전역 test/expect/beforeEach와 브라우저 저장소를 그대로 */
export default defineConfig({
  test: { globals: true, environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
