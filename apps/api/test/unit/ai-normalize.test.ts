import { describe, expect, it } from 'vitest';
import { normalizeAiResult, sampleResult, seasonOf } from '../../src/gathering/gathering-ai.controller.js';

describe('SNAPDAY AI 추천 결과 정리', () => {
  it('모르는 키 버림·태그 제거·길이 컷·이름 없는 장소 제외', () => {
    const r = normalizeAiResult({
      summary: '<b>봄</b> 출사', season: '봄', hack: 'x',
      places: [{ name: '대릉원', area: '경주', reason: 'r', bestTime: '오전', shootingPoints: ['돌담', 1, ''], concept: 'c', rainAlternative: '박물관', address: '주소' }, { name: '' }],
      foods: [{ name: '찰보리빵', note: 'n' }], cautions: 'not-array',
    });
    expect(r.summary).toBe('봄 출사');
    expect(r.places).toEqual([{ name: '대릉원', area: '경주', reason: 'r', bestTime: '오전', shootingPoints: ['돌담'], concept: 'c', rainAlternative: '박물관' }]);
    expect(r).not.toHaveProperty('hack');
    expect(r.cautions).toEqual([]);
    expect(normalizeAiResult(null).places).toEqual([]);
  });
  it('계절·샘플은 실제 장소가 아님을 표시', () => {
    expect([1, 3, 7, 10, 12].map(seasonOf)).toEqual(['겨울', '봄', '여름', '가을', '겨울']);
    const s = sampleResult(3, '경주');
    expect(s.summary.startsWith('[샘플]')).toBe(true);
    expect(s.places.every((p) => p.name.startsWith('(예시)'))).toBe(true);
  });
});
