/**
 * Spring의 LocalDateTime JSON과 같은 모양("2026-11-24T03:12:34.123", 시간대 표시 없음)으로 바꾼다.
 * DB는 timestamp without time zone이고, 두 서버 모두 UTC로 돈다는 전제(TZ=UTC)에서 같은 값이 된다.
 */
export function localDateTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  const iso = d.toISOString(); // 2026-11-24T03:12:34.123Z
  const noZone = iso.slice(0, -1);
  return noZone.endsWith('.000') ? noZone.slice(0, -4) : noZone;
}

/** Spring의 LocalDateTime.now()에 해당 — 프로세스가 UTC라는 전제에서 그대로 저장한다 */
export function now(): Date {
  return new Date();
}
