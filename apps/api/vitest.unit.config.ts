import { defineConfig } from 'vitest/config';

// 서버·DB 없이 도는 순수 함수 테스트
export default defineConfig({ test: { include: ['test/unit/**/*.test.ts'] } });
