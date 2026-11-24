import { Controller, Get } from '@nestjs/common';

/** java LocalDateTime.toString — 초가 0이면 생략, 소수는 3·6·9자리 단위(JS는 밀리초까지) */
export function javaLocalDateTimeToString(d: Date) {
  const iso = d.toISOString().slice(0, -1);
  const [head, ms] = iso.split('.');
  if (ms !== '000') return iso;
  return head.endsWith(':00') ? head.slice(0, -3) : head;
}

@Controller()
export class AdminHelloController {
  /** Spring Actuator — 배포 헬스체크 주소를 그대로 둔다 */
  @Get('actuator/health')
  health() {
    return { status: 'UP' };
  }

  @Get('api/admin/hello')
  hello() {
    return { message: '👋 해피니스 어드민 백엔드에서 Hello World! 🎉', status: 'success', timestamp: javaLocalDateTimeToString(new Date()) };
  }
}
