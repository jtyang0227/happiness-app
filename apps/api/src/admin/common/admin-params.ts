import { IllegalArgument, invalidRequest } from './admin-errors.js';

/** Spring @RequestParam/@PathVariable 변환 규칙 — 실패는 400 {error:"잘못된 요청입니다."} */

type Raw = unknown;

function first(v: Raw): string | undefined {
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return v === undefined || v === null ? undefined : String(v);
}

/** defaultValue가 있으면 빈 문자열도 기본값, 없고 필수면 누락 400 */
function resolve(v: Raw, def: string | undefined, required: boolean): string | undefined {
  const s = first(v);
  if (s === undefined || (s === '' && def !== undefined)) {
    if (def !== undefined) return def;
    if (required) throw invalidRequest();
    return undefined;
  }
  return s;
}

const INT_RE = /^[+-]?\d+$/;

function parseJavaInteger(s: string, min: number, max: number): number {
  if (!INT_RE.test(s)) throw invalidRequest();
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw invalidRequest();
  return n;
}

export function intParam(v: Raw, def?: number, required = true): number {
  const s = resolve(v, def === undefined ? undefined : String(def), required);
  return parseJavaInteger(s!, -2147483648, 2147483647);
}

export function optIntParam(v: Raw): number | null {
  const s = resolve(v, undefined, false);
  return s === undefined || s === '' ? null : parseJavaInteger(s, -2147483648, 2147483647);
}

export function longParam(v: Raw, def?: number, required = true): number {
  const s = resolve(v, def === undefined ? undefined : String(def), required);
  // Long 범위 전체는 JS 안전 정수를 넘는다 — 실제 id는 안전 범위 안이라 그 밖은 잘못된 요청으로 본다
  return parseJavaInteger(s!, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
}

export function optLongParam(v: Raw): number | null {
  const s = resolve(v, undefined, false);
  return s === undefined || s === '' ? null : parseJavaInteger(s, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
}

export function strParam(v: Raw, def?: string): string {
  return resolve(v, def, true)!;
}

/** required=false String — 없으면 null, 빈 문자열은 그대로 */
export function optStrParam(v: Raw): string | null {
  const s = first(v);
  return s === undefined ? null : s;
}

/** Spring StringToBooleanConverter: true/on/yes/1 · false/off/no/0 (대소문자 무시), 빈 값은 null */
export function optBoolParam(v: Raw): boolean | null {
  const s = first(v);
  if (s === undefined || s.trim() === '') return null;
  const t = s.trim().toLowerCase();
  if (['true', 'on', 'yes', '1'].includes(t)) return true;
  if (['false', 'off', 'no', '0'].includes(t)) return false;
  throw invalidRequest();
}

/** Enum.valueOf — 대소문자까지 정확히. 빈 문자열은 null(StringToEnumConverterFactory) */
export function optEnumParam<T extends string>(v: Raw, values: readonly T[]): T | null {
  const s = first(v);
  if (s === undefined || s.trim() === '') return null;
  const t = s.trim();
  if (!(values as readonly string[]).includes(t)) throw invalidRequest();
  return t as T;
}

/** Spring Pageable 대신 page·size를 직접 받는 컨트롤러가 많다 — PageRequest.of 검증(page<0, size<1 → IllegalArgumentException) */
export function pageRequest(page: number, size: number) {
  if (page < 0) throw new IllegalArgument('Page index must not be less than zero');
  if (size < 1) throw new IllegalArgument('Page size must not be less than one');
  return { skip: page * size, take: size, page, size };
}

/** Spring Page → 어드민 PageResponse {content,page,size,totalElements,totalPages,last} */
export function pageResponse<T>(content: T[], page: number, size: number, total: number) {
  const totalPages = size === 0 ? 1 : Math.ceil(total / size);
  return { content, page, size, totalElements: total, totalPages, last: !(page + 1 < totalPages) };
}
