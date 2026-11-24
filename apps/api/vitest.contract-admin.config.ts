import { defineConfig } from 'vitest/config';

// 어드민 계약 테스트 — ADMIN_API_BASE_URL을 바꿔 Spring 어드민(8081)과 Nest 어드민(8091)에 똑같이 돌린다.
export default defineConfig({
  test: {
    include: ['test/contract-admin/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
