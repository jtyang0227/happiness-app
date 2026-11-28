import { defineConfig } from 'vitest/config';

// 단위 테스트 — 서버·DB 없이 순수 로직만(계약 테스트와 분리)
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
  },
});
