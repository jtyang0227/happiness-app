/**
 * Spring의 LocalDateTime JSON과 같은 모양("2026-11-24T03:12:34.123", 시간대 표시 없음)으로 바꾼다.
 * DB는 timestamp without time zone이고, 두 서버 모두 UTC로 돈다는 전제(TZ=UTC)에서 같은 값이 된다.
 */
export function localDateTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  const iso = d.toISOString(); // 2026-11-24T03:12:34.123Z
  // toISOString은 늘 .mmm까지 — ISO_LOCAL_DATE_TIME처럼 소수 초 끝의 0을 지운다(.500 → .5, .000 → 없음)
  const [sec, frac] = iso.slice(0, -1).split('.');
  const trimmed = frac.replace(/0+$/, '');
  return trimmed ? `${sec}.${trimmed}` : sec;
}

/** Spring의 LocalDateTime.now()에 해당 — 프로세스가 UTC라는 전제에서 그대로 저장한다 */
export function now(): Date {
  return new Date();
}

/** LocalDate JSON("2026-11-24") — DB date 컬럼은 UTC 자정 Date로 온다 */
export function localDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** LocalDate.now() (UTC) — UTC 자정 Date */
export function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * 사용자가 입력한 "벽시계" 시각(모임 시작·모집 마감 등, 시간대 없이 한국 시간 그대로 저장)과 비교할 지금 시각.
 * 서버는 TZ=UTC라 now()와 그대로 비교하면 9시간 어긋난다(시작 10:00 모임이 19:00에 ONGOING이 되던 문제).
 * APP_WALL_CLOCK_OFFSET_MINUTES로 바꿀 수 있고 기본은 한국 시간(+540분).
 */
export function wallClockNow(): Date {
  const raw = process.env.APP_WALL_CLOCK_OFFSET_MINUTES;
  const offset = raw != null && raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : 540;
  return new Date(Date.now() + offset * 60000);
}
