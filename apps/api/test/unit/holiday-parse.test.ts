import { describe, expect, it } from 'vitest';
import { parseHolidayResponse } from '../../src/outing/holiday.service.js';

// 공공데이터포털 특일정보 getRestDeInfo(_type=json) 응답 모양 — items가 배열·객체·빈 문자열로 온다
const wrap = (items: unknown, code = '00') => ({ response: { header: { resultCode: code, resultMsg: 'NORMAL SERVICE.' }, body: { items, numOfRows: 50, pageNo: 1, totalCount: 0 } } });

describe('parseHolidayResponse', () => {
  it('배열 — 휴일만, 날짜 변환, 대체공휴일 표시', () => {
    expect(parseHolidayResponse(wrap({ item: [
      { dateKind: '01', dateName: '삼일절', isHoliday: 'Y', locdate: 20270301, seq: 1 },
      { dateKind: '01', dateName: '대체공휴일', isHoliday: 'Y', locdate: 20270302, seq: 1 },
      { dateKind: '02', dateName: '기념일', isHoliday: 'N', locdate: 20270303, seq: 1 },
    ] }))).toEqual([
      { date: '2027-03-01', name: '삼일절', substitute: false },
      { date: '2027-03-02', name: '대체공휴일', substitute: true },
    ]);
  });
  it('객체 하나·빈 결과', () => {
    expect(parseHolidayResponse(wrap({ item: { dateName: '어린이날', isHoliday: 'Y', locdate: '20270505' } }))).toEqual([{ date: '2027-05-05', name: '어린이날', substitute: false }]);
    expect(parseHolidayResponse(wrap(''))).toEqual([]);
    expect(parseHolidayResponse(wrap({}))).toEqual([]);
  });
  it('오류 코드는 예외', () => {
    expect(() => parseHolidayResponse(wrap('', '30'))).toThrow('공휴일 API 오류: 30');
  });
});
