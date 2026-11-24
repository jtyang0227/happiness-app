/**
 * Spring `@RequestParam Long x` 대응 — 없거나 숫자가 아니면 Spring은 처리하지 않은 예외(500 C001)를 낸다.
 * 같은 결과를 내려고 일반 Error를 던진다(전역 필터 → 500).
 */
export function requiredLong(value: string | undefined, name: string): number {
  if (value == null) throw new Error(`Required request parameter ${name} is not present`);
  return toLong(value, name);
}

export function optionalInt(value: string | undefined, name: string, defaultValue: number): number {
  return value == null ? defaultValue : toLong(value, name);
}

function toLong(value: string, name: string): number {
  const v = value.trim();
  if (!/^[+-]?\d+$/.test(v)) throw new Error(`Failed to convert ${name}: ${value}`);
  return Number(v);
}
