import { randomUUID } from 'node:crypto';
import { AppError } from '../common/app-error.js';

/**
 * Spring PortfolioLayoutValidator — "직접 구성"(BLOCKS) sectionsJson·styleJson 검증·정규화.
 * 값 변환은 Jackson JsonNode.asText/asInt/asBoolean 규칙을 따른다(아래 as* 함수).
 * 새 블록 종류는 BLOCK_PROPS에 한 줄 + 웹 blocks/blockRegistry.js.
 */
const MAX_RAW_LENGTH = 20_000;
const MAX_BLOCKS = 30;
const ID = /^[a-z0-9-]{1,24}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const GENRE = /^[A-Z_]{0,20}$/;
const TAG = /<[^>]*>/g;

type Prop =
  | { kind: 'text'; max: number }
  | { kind: 'enum'; options: string[] }
  | { kind: 'int'; min: number; max: number }
  | { kind: 'bool' }
  | { kind: 'genre' }
  | { kind: 'hex' };

const text = (max: number): Prop => ({ kind: 'text', max });
const oneOf = (...options: string[]): Prop => ({ kind: 'enum', options });
const num = (min: number, max: number): Prop => ({ kind: 'int', min, max });
const bool: Prop = { kind: 'bool' };

const BLOCK_PROPS: Record<string, Record<string, Prop>> = {
  hero: { tagline: text(80), align: oneOf('left', 'center'), showStats: bool },
  featuredWork: { title: text(40) },
  works: { title: text(40) },
  photos: { title: text(40), columns: num(2, 4), limit: num(3, 60), genre: { kind: 'genre' } },
  text: { title: text(60), body: text(2000) },
  quote: { text: text(300), author: text(40) },
  testimonials: {},
  pricing: {},
  press: {},
  clients: {},
  contact: { title: text(40), body: text(300), showBooking: bool },
  newsletter: {},
};

const STYLE_PROPS: Record<string, Prop> = {
  accent: { kind: 'hex' },
  background: oneOf('light', 'paper', 'dark'),
  spacing: oneOf('compact', 'normal', 'airy'),
  headingFont: oneOf('sans', 'serif'),
};

const bad = (reason: string) => AppError.status(400, reason);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Java String.strip — Character.isWhitespace 기준(NBSP 등은 남긴다) */
const JAVA_WS = new RegExp('[\\t\\n\\u000B\\f\\r\\u001C-\\u001F \\u1680\\u2000-\\u2006\\u2008-\\u200A\\u2028\\u2029\\u205F\\u3000]');
function strip(s: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && JAVA_WS.test(s[a])) a++;
  while (b > a && JAVA_WS.test(s[b - 1])) b--;
  return s.slice(a, b);
}

/** JsonNode.asText(def) — 문자열·숫자·불리언은 글자로, 객체·배열은 "", null/없음은 def */
function asText(v: unknown, def: string): string {
  if (v === undefined || v === null) return def;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** JsonNode.asInt(def) — 숫자는 버림, 불리언 1/0, 문자열은 정수(안 되면 실수→버림) 아니면 def */
function asInt(v: unknown, def: number): number {
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^[+-]?\d+$/.test(s)) {
      const n = Number(s);
      return n > 2147483647 || n < -2147483648 ? def : n;
    }
    const d = Number(s);
    return s !== '' && Number.isFinite(d) ? Math.trunc(d) : def;
  }
  return def;
}

/** JsonNode.asBoolean(def) — 불리언 그대로, 정수는 !=0, 문자열 "true"/"false", 그 외 def */
function asBoolean(v: unknown, def: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isInteger(v) ? v !== 0 : def;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return def;
}

function parse(raw: string | null | undefined, what: string): Record<string, unknown> | null {
  if (raw == null || strip(raw) === '') return null;
  if (raw.length > MAX_RAW_LENGTH) throw bad(`${what} 내용이 너무 큽니다.`);
  let node: unknown;
  try {
    node = JSON.parse(raw);
  } catch {
    throw bad(`${what} 형식이 올바르지 않습니다.`);
  }
  if (!isObj(node)) throw bad(`${what} 형식이 올바르지 않습니다.`);
  return node;
}

function normalizeProps(input: unknown, spec: Record<string, Prop>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isObj(input)) return out;
  for (const [key, p] of Object.entries(spec)) {
    const v = input[key];
    if (v === undefined || v === null) continue;
    switch (p.kind) {
      case 'text': {
        const s = strip(asText(v, '').replace(TAG, ''));
        out[key] = s.length > p.max ? s.slice(0, p.max) : s;
        break;
      }
      case 'int':
        out[key] = Math.max(p.min, Math.min(p.max, asInt(v, p.min)));
        break;
      case 'bool':
        out[key] = asBoolean(v, false);
        break;
      case 'enum': {
        const s = asText(v, '');
        if (!p.options.includes(s)) throw bad(`허용되지 않는 설정 값입니다: ${key}`);
        out[key] = s;
        break;
      }
      case 'hex': {
        const s = asText(v, '');
        if (!HEX.test(s)) throw bad('색은 #RRGGBB 형식이어야 합니다.');
        out[key] = s.toUpperCase();
        break;
      }
      case 'genre': {
        const s = asText(v, '');
        if (!GENRE.test(s)) throw bad('장르 코드가 올바르지 않습니다.');
        out[key] = s;
        break;
      }
    }
  }
  return out;
}

/** null·빈 문자열은 "구성 없음"(null) */
export function normalizeSections(raw: string | null | undefined): string | null {
  const root = parse(raw, '구성');
  if (root == null) return null;
  const blocks = root.blocks;
  if (!Array.isArray(blocks)) throw bad('구성에 블록 목록(blocks)이 없습니다.');
  if (blocks.length > MAX_BLOCKS) throw bad(`블록은 최대 ${MAX_BLOCKS}개까지 둘 수 있습니다.`);

  const outBlocks: unknown[] = [];
  const ids = new Set<string>();
  for (const b of blocks) {
    const node = isObj(b) ? b : {};
    const type = asText(node.type, '');
    const spec = Object.prototype.hasOwnProperty.call(BLOCK_PROPS, type) ? BLOCK_PROPS[type] : undefined;
    if (!spec) throw bad(`알 수 없는 블록 종류입니다: ${strip(type.replace(TAG, ''))}`);

    let id = asText(node.id, '');
    if (!ID.test(id) || ids.has(id)) id = randomUUID().slice(0, 8);
    ids.add(id);
    outBlocks.push({
      id,
      type,
      visible: !('visible' in node) || asBoolean(node.visible, true),
      props: normalizeProps(node.props, spec),
    });
  }
  return JSON.stringify({ version: 1, blocks: outBlocks });
}

export function normalizeStyle(raw: string | null | undefined): string | null {
  const root = parse(raw, '스타일');
  if (root == null) return null;
  return JSON.stringify({ ...normalizeProps(root, STYLE_PROPS), version: 1 });
}
