/**
 * Jackson이 JSON 본문을 DTO 필드에 넣을 때의 기본 변환. 변환할 수 없으면 Spring은
 * HttpMessageNotReadableException(처리 안 된 예외 → 500)이라 일반 Error를 던진다.
 */
export function jsonLong(v: unknown, name: string): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return null;
    if (/^[+-]?\d+$/.test(s)) return Number(s);
  }
  throw new Error(`Cannot deserialize ${name}`);
}

/** String 필드 — 숫자·불리언은 글자로 바꾸고, 객체·배열은 실패 */
export function jsonString(v: unknown, name: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  throw new Error(`Cannot deserialize ${name}`);
}

/** Java String.isBlank — Character.isWhitespace 기준 */
export function isBlank(s: string | null | undefined): boolean {
  return s == null || javaStrip(s) === '';
}

const JAVA_WS = new RegExp('[\\t\\n\\u000B\\f\\r\\u001C-\\u001F \\u1680\\u2000-\\u2006\\u2008-\\u200A\\u2028\\u2029\\u205F\\u3000]');

/** Java String.strip */
export function javaStrip(s: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && JAVA_WS.test(s[a])) a++;
  while (b > a && JAVA_WS.test(s[b - 1])) b--;
  return s.slice(a, b);
}

/** Java String.trim — 코드 U+0020 이하만 자른다 */
export function javaTrim(s: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && s.charCodeAt(a) <= 0x20) a++;
  while (b > a && s.charCodeAt(b - 1) <= 0x20) b--;
  return s.slice(a, b);
}

/** Spring HtmlUtils.htmlEscape */
export function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
