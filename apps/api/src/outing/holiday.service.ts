import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { localDate, now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ParsedHoliday { date: string; name: string; substitute: boolean }

/**
 * 공공데이터포털 "한국천문연구원 특일 정보" getRestDeInfo 응답(JSON, _type=json)을 공휴일 목록으로 바꾼다.
 * items는 빈 문자열(결과 없음)·객체 하나·배열 셋 다 올 수 있다. isHoliday=Y만, 이름에 "대체"가 있으면 대체공휴일.
 */
export function parseHolidayResponse(json: unknown): ParsedHoliday[] {
  const res = (json as { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: unknown } } })?.response;
  const code = res?.header?.resultCode;
  if (code != null && code !== '00') throw new Error(`공휴일 API 오류: ${code} ${res?.header?.resultMsg ?? ''}`.trim());
  const items = res?.body?.items as { item?: unknown } | string | undefined;
  if (!items || typeof items === 'string') return [];
  const raw = Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
  return raw.flatMap((it: { isHoliday?: string; locdate?: number | string; dateName?: string }) => {
    if (it?.isHoliday !== 'Y' || it.locdate == null || !it.dateName) return [];
    const d = String(it.locdate);
    if (!/^\d{8}$/.test(d)) return [];
    const name = String(it.dateName).trim().slice(0, 50);
    return [{ date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, name, substitute: name.includes('대체') }];
  });
}

const toDate = (s: string) => new Date(`${s}T00:00:00Z`);

/** 공휴일 — 코드에 날짜를 박지 않는다. API(키 필요) 또는 관리자 수동 등록 */
@Injectable()
export class HolidayService {
  private readonly log = new Logger('HolidayService');
  constructor(private readonly prisma: PrismaService) {}

  async list(year: number) {
    const rows = await this.prisma.public_holidays.findMany({
      where: { holiday_date: { gte: toDate(`${year}-01-01`), lte: toDate(`${year}-12-31`) } }, orderBy: { holiday_date: 'asc' },
    });
    return rows.map((h) => ({ date: localDate(h.holiday_date), name: h.name, substitute: h.substitute === true, source: h.source }));
  }

  /** 한 달 범위의 공휴일(투표 후보 자동 생성용) */
  inMonth(year: number, month: number) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return this.prisma.public_holidays.findMany({
      where: { holiday_date: { gte: toDate(`${year}-${String(month).padStart(2, '0')}-01`), lte: toDate(`${year}-${String(month).padStart(2, '0')}-${last}`) } },
    });
  }

  async importYear(year: number) {
    const key = process.env.HOLIDAY_API_KEY;
    if (!key) throw AppError.status(503, '공휴일 API 키(HOLIDAY_API_KEY)가 설정되지 않았습니다. 관리자 화면에서 공휴일을 직접 등록하거나 서버에 키를 설정해 주세요.');
    const base = process.env.HOLIDAY_API_URL || 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';
    const found: ParsedHoliday[] = [];
    for (let m = 1; m <= 12; m++) {
      // 공공데이터포털 서비스키는 이미 인코딩된 값으로 발급되는 경우가 많아 그대로 붙인다
      const url = `${base}?serviceKey=${key}&solYear=${year}&solMonth=${String(m).padStart(2, '0')}&_type=json&numOfRows=50`;
      let json: unknown;
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        json = await r.json();
      } catch (e) {
        this.log.warn(`[HOLIDAY] ${year}-${m} 가져오기 실패: ${(e as Error).message}`);
        throw AppError.status(502, `공휴일 API 호출에 실패했습니다(${year}년 ${m}월). 잠시 후 다시 시도하거나 직접 등록해 주세요.`);
      }
      try {
        found.push(...parseHolidayResponse(json));
      } catch (e) {
        throw AppError.status(502, (e as Error).message);
      }
    }
    for (const h of found) {
      await this.prisma.public_holidays.upsert({
        where: { holiday_date: toDate(h.date) },
        create: { holiday_date: toDate(h.date), name: h.name, substitute: h.substitute || null, source: 'API', created_at: now() },
        update: { name: h.name, substitute: h.substitute || null, source: 'API' },
      });
    }
    this.log.log(`[HOLIDAY] ${year}년 공휴일 ${found.length}건 가져옴`);
    return { year, imported: found.length };
  }

  async add(date: Date, name: string, substitute: boolean) {
    if (await this.prisma.public_holidays.findUnique({ where: { holiday_date: date } })) throw AppError.status(409, '이미 등록된 날짜입니다.');
    const h = await this.prisma.public_holidays.create({ data: { holiday_date: date, name, substitute: substitute || null, source: 'MANUAL', created_at: now() } });
    return { date: localDate(h.holiday_date), name: h.name, substitute: h.substitute === true, source: h.source };
  }

  async remove(date: Date) {
    const r = await this.prisma.public_holidays.deleteMany({ where: { holiday_date: date } });
    if (r.count === 0) throw AppError.status(404, '등록된 공휴일이 아닙니다.');
  }
}
