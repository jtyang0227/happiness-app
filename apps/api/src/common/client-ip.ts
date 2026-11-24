import type { Request } from 'express';
import { header } from './xss-query.middleware.js';

/** Spring common/web/ClientIp — APP_CLIENT_IP_HEADER(예: CF-Connecting-IP) → X-Forwarded-For 첫 값 → 소켓 주소 */
export function clientIp(req: Request): string {
  const trustedHeader = process.env.APP_CLIENT_IP_HEADER?.trim();
  if (trustedHeader) {
    const v = header(req, trustedHeader)?.trim();
    if (v) return v;
  }
  const fwd = header(req, 'x-forwarded-for');
  if (fwd && fwd.trim()) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress ?? '';
}
