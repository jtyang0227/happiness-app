/** Spring 어드민 util/CategoryCode — 10자리(2자리 × 5단계) 분류 코드 */
export function parseCategoryCode(code: string | null): string[] {
  const c = code === null || code.length !== 10 ? '0000000000' : code;
  return [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6), c.slice(6, 8), c.slice(8, 10)];
}

export function categoryLevel(code: string | null, level: number): string {
  if (code === null || code.length < level * 2) return '00';
  return code.slice((level - 1) * 2, (level - 1) * 2 + 2);
}
