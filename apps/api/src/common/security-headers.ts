import type { NextFunction, Request, Response } from 'express';

/**
 * Spring SecurityConfig.headers(...)와 같은 응답 보안 헤더 — 앱 API(main.ts)·어드민 API(admin-main.ts) 공용.
 * Spring Security 기본값(X-XSS-Protection 0, Cache-Control no-store)까지 맞춘다. 외부 라이브러리(helmet) 없이.
 * HSTS는 HTTPS 요청에만(Spring도 secure 요청에만 쓴다) — Render·Cloudflare 뒤에서는 X-Forwarded-Proto로 판단.
 */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self';";

export function securityHeaders(frameOptions: 'SAMEORIGIN' | 'DENY' = 'SAMEORIGIN') {
  return (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', frameOptions);
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
    if (req.secure || proto === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000 ; includeSubDomains');
    }
    next();
  };
}
