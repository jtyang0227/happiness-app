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

/** Integer(래퍼) 필드 — 범위 밖·숫자가 아니면 실패, 실수는 버림 */
export function jsonInt(v: unknown, name: string): number | null {
  const n = jsonLong(v, name);
  if (n != null && (n > 2147483647 || n < -2147483648)) throw new Error(`Cannot deserialize ${name}`);
  return n;
}

/** primitive int — null·없음은 0 */
export function jsonPrimitiveInt(v: unknown, name: string): number {
  return jsonInt(v, name) ?? 0;
}

/** primitive boolean — null·없음은 false, 문자열 "true"/"false", 정수는 !=0 */
export function jsonPrimitiveBool(v: unknown, name: string): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number' && Number.isInteger(v)) return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === 'true') return true;
    if (s === 'false' || s === '') return false;
  }
  throw new Error(`Cannot deserialize ${name}`);
}

/** LocalDate("yyyy-MM-dd") 필드 — 빈 문자열은 null, 잘못된 날짜는 실패. 반환은 UTC 자정 Date */
export function jsonLocalDate(v: unknown, name: string): Date | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      if (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return d;
    }
  }
  throw new Error(`Cannot deserialize ${name}`);
}

/** Double(래퍼) 필드 — 숫자 또는 숫자 문자열 */
export function jsonDouble(v: unknown, name: string): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return null;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  throw new Error(`Cannot deserialize ${name}`);
}

/** List<String> DTO 필드 — 숫자·불리언 요소는 글자로 */
export function jsonStringList(v: unknown, name: string): string[] | null {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) throw new Error(`Cannot deserialize ${name}`);
  return v.map((x) => jsonString(x, name) as string);
}

/** Java String.split(",") — 끝의 빈 문자열은 버린다 */
export function javaSplit(s: string, sep: string): string[] {
  const parts = s.split(sep);
  while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
  return parts.length === 1 && parts[0] === '' && s !== '' ? [] : parts;
}

/** LocalDateTime 필드 — "yyyy-MM-ddTHH:mm[:ss[.f…]]", 끝의 Z는 UTC로(Jackson lenient). 빈 문자열 null */
export function jsonLocalDateTime(v: unknown, name: string): Date | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?Z?$/.exec(s);
    if (m) {
      const [y, mo, d, h, mi, se] = [+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0)];
      const ms = m[7] ? Math.floor(Number(`0.${m[7]}`) * 1000) : 0;
      const dt = new Date(Date.UTC(y, mo - 1, d, h, mi, se, ms));
      if (dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && h < 24 && mi < 60 && se < 60) return dt;
    }
  }
  throw new Error(`Cannot deserialize ${name}`);
}

/** Boolean(래퍼) 필드 */
export function jsonBool(v: unknown, name: string): boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return jsonPrimitiveBool(v, name);
}
