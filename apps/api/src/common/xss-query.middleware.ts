import type { NextFunction, Request, Response } from 'express';
import { escapeHtml4 } from './escape-html4.js';

const RAW_URL = Symbol('rawUrl');

/**
 * Spring XssProtectionFilter와 같게 — 쿼리 파라미터 값을 escapeHtml4로 바꾼 URL로 라우팅한다(@Query가 그 값을 받음).
 * 레거시 프록시로 넘길 때는 원래 URL로 되돌린다(Spring이 한 번 더 이스케이프하지 않게).
 */
export function xssQueryMiddleware(req: Request, _res: Response, next: NextFunction) {
  const q = req.url.indexOf('?');
  if (q >= 0) {
    const params = new URLSearchParams(req.url.slice(q + 1));
    let changed = false;
    const out = new URLSearchParams();
    for (const [k, v] of params) {
      const e = escapeHtml4(v);
      if (e !== v) changed = true;
      out.append(k, e);
    }
    if (changed) {
      (req as unknown as Record<symbol, string>)[RAW_URL] = req.url;
      req.url = `${req.url.slice(0, q)}?${out.toString()}`;
    }
  }
  next();
}

export function restoreRawUrl(req: Request) {
  const raw = (req as unknown as Record<symbol, string | undefined>)[RAW_URL];
  if (raw) req.url = raw;
}

/** 헤더 값 — Spring 래퍼의 getHeader와 같음 */
export function header(req: Request, name: string): string | undefined {
  return escapeHtml4(req.header(name));
}
