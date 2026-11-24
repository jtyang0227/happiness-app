import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // DB의 timestamp without time zone을 Spring(LocalDateTime, UTC 서버)과 같은 값으로 읽고 쓰기 위해 UTC로 고정
  process.env.TZ = process.env.TZ ?? 'UTC';
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:19006,http://localhost:8081')
    .split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
  });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 8090);
  await app.listen(port);
  console.log(`happiness-api listening on ${port} (legacy: ${process.env.LEGACY_API_URL ?? 'none'})`);
}
bootstrap();
