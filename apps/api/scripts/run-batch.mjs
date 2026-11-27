// 배치 하나를 지금 바로 실행한다(운영 점검·테스트용). 사용: node scripts/run-batch.mjs <deliveries|bookings|meets|gatherings|outing-polls|gathering-reminders|monthly-digest|all>
// .env(DATABASE_URL 등)를 읽고, 실행하는 동안만 BATCH_ENABLED=true로 둔다. 먼저 npm run build 필요.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';

process.env.BATCH_ENABLED = 'true';
const { AppModule } = await import('../dist/app.module.js');
const { BatchService } = await import('../dist/batch/batch.service.js');

const jobs = {
  deliveries: 'cleanupExpiredDeliveries',
  bookings: 'expireStaleBookings',
  meets: 'completeExpiredMeets',
  gatherings: 'transitionGatheringStatuses',
  'outing-polls': 'runOutingPollBatch',
  'gathering-reminders': 'sendGatheringReminders',
  'monthly-digest': 'sendMonthlyGatheringDigest',
};
const name = process.argv[2];
const selected = name === 'all' ? Object.values(jobs) : jobs[name] ? [jobs[name]] : null;
if (!selected) {
  console.error(`사용: node scripts/run-batch.mjs <${Object.keys(jobs).join('|')}|all>`);
  process.exit(1);
}
const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
const batch = app.get(BatchService);
for (const m of selected) await batch[m]();
await app.close();
