import type { Request } from 'express';
import { header } from './xss-query.middleware.js';

/**
 * Spring common/web/ClientIp — APP_CLIENT_IP_HEADER(예: CF-Connecting-IP) → X-Forwarded-For → 소켓 주소.
 * APP_TRUSTED_PROXY_HOPS=N(1~10)이면 X-Forwarded-For의 오른쪽에서 N번째(우리 프록시가 덧붙인 값, 클라이언트가 못 바꿈), 아니면 첫 값.
 */
const HOPS = (() => {
  const n = Number.parseInt(process.env.APP_TRUSTED_PROXY_HOPS ?? '', 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 10)) : 0;
})();

export function clientIp(req: Request): string {
  const trustedHeader = process.env.APP_CLIENT_IP_HEADER?.trim();
  if (trustedHeader) {
    const v = header(req, trustedHeader)?.trim();
    if (v) return v;
  }
  const fwd = header(req, 'x-forwarded-for');
  if (fwd && fwd.trim()) {
    const parts = fwd.split(',');
    if (HOPS > 0) {
      const v = parts[Math.max(0, parts.length - HOPS)].trim();
      if (v) return v;
    }
    return parts[0].trim();
  }
  return req.socket.remoteAddress ?? '';
}
