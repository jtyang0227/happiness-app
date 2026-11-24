import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/** 운영과 같은 PostgreSQL(Supabase)을 쓴다. 풀러(트랜잭션 모드) 대비로 prepared statement를 쓰지 않는 pg 드라이버 어댑터 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL이 필요합니다.');
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
