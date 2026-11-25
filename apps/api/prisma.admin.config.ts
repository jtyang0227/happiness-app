import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * 어드민 진입점(admin-main.ts) 전용 Prisma 설정 — 표는 Spring 어드민이 만든 `DB_SCHEMA`(기본 admin) 스키마.
 * pull: ADMIN_DATABASE_URL="postgresql://…/happiness?schema=admin" npm run prisma:pull:admin
 * generate만 할 때는 URL이 쓰이지 않으므로 DATABASE_URL로 대신한다.
 */
export default defineConfig({
  schema: 'prisma/admin/schema.prisma',
  migrations: { path: 'prisma/admin/migrations' },
  datasource: { url: process.env.ADMIN_DATABASE_URL ?? env('DATABASE_URL') },
});
