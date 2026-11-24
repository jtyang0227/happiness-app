import { defineConfig } from 'vitest/config';

// CRA(jest) 시절 테스트를 그대로 — describe/it/expect 전역
export default defineConfig({
  test: { globals: true, include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
});
