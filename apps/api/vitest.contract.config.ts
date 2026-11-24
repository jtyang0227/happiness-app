import { defineConfig } from 'vitest/config';

// 계약 테스트 — HTTP로만 말하므로 API_BASE_URL을 바꿔 Spring(8080)과 Nest(8090)에 똑같이 돌린다.
export default defineConfig({
  test: {
    include: ['test/contract/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
