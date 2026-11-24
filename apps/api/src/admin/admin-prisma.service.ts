import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/admin-prisma/client.js';

/**
 * 어드민 전용 Prisma — Spring 어드민(application-prod.properties)처럼 `DB_SCHEMA`(기본 admin) 스키마의 표를 쓴다.
 * 생성된 쿼리는 schema 옵션으로, $queryRaw는 search_path로 같은 스키마를 가리킨다.
 */
export const ADMIN_DB_SCHEMA = process.env.ADMIN_DB_SCHEMA ?? 'admin';

@Injectable()
export class AdminPrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('ADMIN_DATABASE_URL 또는 DATABASE_URL이 필요합니다.');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ADMIN_DB_SCHEMA)) throw new Error('ADMIN_DB_SCHEMA는 영문·숫자·밑줄만 쓸 수 있습니다.');
    super({ adapter: new PrismaPg({ connectionString: url, options: `-c search_path=${ADMIN_DB_SCHEMA}` }, { schema: ADMIN_DB_SCHEMA }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
