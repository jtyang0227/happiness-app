/**
 * iCalendar(RFC 5545) 한 건 — 예매 단계를 기기 캘린더로 가져가게 한다.
 * UID는 단계 id로 고정하고 SEQUENCE = schedule_revision이라, 일정이 바뀐 뒤 다시 받은 파일이 기존 일정을 덮어쓴다.
 */

export interface IcsPhase {
  id: number;
  name: string;
  scheduledAt: Date;
  revision: number;
  scheduleStatus: string;
  sessionTitle: string;
  venue: string | null;
  url: string;
  updatedAt: Date;
}

/** 20261201T110000Z */
export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** TEXT 값 이스케이프 — 역슬래시·세미콜론·쉼표·줄바꿈 */
export function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 한 줄 75바이트(UTF-8)에서 접는다 — 이어지는 줄은 공백 하나로 시작. 한글 글자를 가르지 않는다 */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8');
    const limit = out.length ? 74 : 75; // 이어지는 줄은 앞 공백 1바이트
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const HEADER = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Happiness//Ticket Schedule//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

function vevent(p: IcsPhase, now: Date, hint: string): string[] {
  const cancelled = p.scheduleStatus === 'CANCELLED';
  return [
    'BEGIN:VEVENT',
    `UID:ticket-phase-${p.id}@happiness.io.kr`,
    `SEQUENCE:${p.revision}`,
    `DTSTAMP:${icsDate(now)}`,
    `LAST-MODIFIED:${icsDate(p.updatedAt)}`,
    `DTSTART:${icsDate(p.scheduledAt)}`,
    `DTEND:${icsDate(new Date(p.scheduledAt.getTime() + 30 * 60_000))}`,
    `SUMMARY:${icsText(`[${p.name}] ${p.sessionTitle} 예매 오픈`)}`,
    ...(p.venue ? [`LOCATION:${icsText(p.venue)}`] : []),
    `DESCRIPTION:${icsText(`예매 오픈 예정 시각입니다. ${hint}\n${p.url}`)}`,
    `URL:${p.url}`,
    `STATUS:${cancelled ? 'CANCELLED' : p.scheduleStatus === 'TENTATIVE' ? 'TENTATIVE' : 'CONFIRMED'}`,
    ...(cancelled ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`10분 후 ${p.sessionTitle} 예매 오픈`)}`, 'TRIGGER:-PT10M', 'END:VALARM']),
    'END:VEVENT',
  ];
}

function serialize(lines: string[]): string {
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function buildIcs(p: IcsPhase, now: Date): string {
  return serialize([...HEADER, ...vevent(p, now, '일정이 바뀌면 파일을 다시 받아 주세요.'), 'END:VCALENDAR']);
}

/** 구독 캘린더(webcal) — 켠 알림 단계 전부. 캘린더 앱이 주기적으로 다시 가져가므로 같은 UID·SEQUENCE로 갱신된다 */
export function buildFeed(phases: IcsPhase[], now: Date): string {
  return serialize([
    ...HEADER,
    `X-WR-CALNAME:${icsText('Happiness 예매 일정')}`,
    'X-WR-TIMEZONE:Asia/Seoul',
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...phases.flatMap((p) => vevent(p, now, '일정이 바뀌면 캘린더가 자동으로 갱신합니다.')),
    'END:VCALENDAR',
  ]);
}
