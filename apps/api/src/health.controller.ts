import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.guard.js';

/** 배포 헬스체크 주소를 Spring Actuator와 같게 둔다 (Render·Railway·keepalive 설정을 바꾸지 않기 위해) */
@Controller()
export class HealthController {
  @Public()
  @Get('actuator/health')
  health() {
    return { status: 'UP' };
  }
}
