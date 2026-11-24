import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { invalidRequest } from './admin-errors.js';

/**
 * Spring 어드민 prod: server.forward-headers-strategy=framework — X-Forwarded-For 첫 값이 getRemoteAddr()가 된다.
 * 소켓 주소는 Tomcat 표기(IPv4는 그대로, ::1 → 0:0:0:0:0:0:0:1)에 맞춘다.
 */
export function adminClientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
  if (first) return first;
  const a = req.socket.remoteAddress ?? null;
  if (a === null) return null;
  if (a.startsWith('::ffff:')) return a.slice(7);
  if (a === '::1') return '0:0:0:0:0:0:0:1';
  return a;
}

export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext) => adminClientIp(ctx.switchToHttp().getRequest<Request>()));

/** @RequestBody Map<String,String> (필수) — 객체가 아니면 400, 값은 문자열로(숫자·불리언은 글자, 객체·배열은 400) */
export function stringMap(body: unknown, required = true): Record<string, string | null> {
  if (body === undefined || body === null) {
    if (required) throw invalidRequest();
    return {};
  }
  if (typeof body !== 'object' || Array.isArray(body)) throw invalidRequest();
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (v === null) out[k] = null;
    else if (typeof v === 'string') out[k] = v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
    else throw invalidRequest();
  }
  return out;
}

/** DTO 본문(@RequestBody SomeRequest) — 객체가 아니면 400 */
export function objectBody(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) throw invalidRequest();
  return body as Record<string, unknown>;
}

/** Jackson 변환 실패를 400 잘못된 요청으로 */
export function jsonField<T>(fn: () => T): T {
  try {
    return fn();
  } catch {
    throw invalidRequest();
  }
}
