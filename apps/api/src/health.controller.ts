import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.guard.js';

/** LocalDateTime.toString — 초·나노가 0이면 생략, 소수는 3자리 단위(여기선 밀리초) */
function javaLocalDateTimeString(d: Date) {
  const iso = d.toISOString().slice(0, -1); // 2026-11-24T07:07:48.375
  const [head, ms] = iso.split('.');
  if (ms !== '000') return iso;
  return head.endsWith(':00') ? head.slice(0, -3) : head;
}

/** 배포 헬스체크 주소를 Spring Actuator와 같게 둔다 (Render·Railway·keepalive 설정을 바꾸지 않기 위해) */
@Controller()
export class HealthController {
  @Public()
  @Get('actuator/health')
  health() {
    return { status: 'UP' };
  }

  /** Spring HelloController — 인증 필요(anyRequest().authenticated()) */
  @Get('api/hello')
  hello() {
    return { message: '해피니스 모바일 앱 백엔드에서 Hello World!', status: 'success', timestamp: javaLocalDateTimeString(new Date()) };
  }
}
