import { isBlank } from '../../common/json-body.js';
import { IllegalArgument } from '../common/admin-errors.js';

/**
 * java.net.URI의 http(s) 판정 근사 — 금지 문자·잘못된 %이스케이프면 URISyntaxException, 호스트가 RFC 2396
 * 호스트명/IPv4/[IPv6]가 아니면(예: 밑줄, 숫자로 시작하는 마지막 라벨) 레지스트리 기반이라 getHost()가 null.
 */
function hasHttpHost(v: string): boolean {
  if (/[\s"<>\\^`{|}\u0000-\u001f\u007f]/.test(v)) return false;
  if (/%(?![0-9A-Fa-f]{2})/.test(v)) return false;
  const m = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)/.exec(v);
  if (!m) return false;
  const scheme = m[1].toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') return false;
  let auth = m[2];
  const at = auth.lastIndexOf('@');
  if (at >= 0) auth = auth.slice(at + 1);
  let host = auth;
  const portM = /^(.*?)(?::(\d*))?$/.exec(auth.startsWith('[') ? auth.replace(/^(\[[^\]]*\])/, '$1') : auth);
  if (auth.startsWith('[')) {
    const end = auth.indexOf(']');
    if (end < 0) return false;
    host = auth.slice(0, end + 1);
    const rest = auth.slice(end + 1);
    if (rest && !/^:\d*$/.test(rest)) return false;
    return /^\[[0-9A-Fa-f:.]+\]$/.test(host);
  }
  if (portM) host = portM[1];
  if (!host) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host.split('.').every((p) => Number(p) <= 255);
  const labels = host.replace(/\.$/, '').split('.');
  if (labels.some((l) => !/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/.test(l))) return false;
  return /^[A-Za-z]/.test(labels[labels.length - 1]);
}

function requireHttp(v: string, field: string): string {
  if (hasHttpHost(v)) return v;
  throw new IllegalArgument(`${field}은(는) http(s):// 주소${field === '링크' ? ' 또는 /로 시작하는 앱 내부 경로' : ''}여야 합니다.`);
}

/** 링크: 앱 내부 상대 경로("/events/summer") 또는 http(s) 절대 URL만. 빈 값은 그대로(링크 없음) */
export function requireSafeLink(url: string | null, field: string): string | null {
  if (url === null || isBlank(url)) return url;
  const v = url.trim();
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  return requireHttp(v, field);
}

/** 이미지: http(s) 절대 URL만 */
export function requireSafeImage(url: string | null, field: string): string | null {
  if (url === null || isBlank(url)) return url;
  return requireHttp(url.trim(), field);
}
