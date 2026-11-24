import { HttpException } from '@nestjs/common';

/** 응답 본문을 그대로 내보내는 오류 — Spring에서 ApiResponse 대신 컨트롤러 고유 Map을 돌려주던 경로용 */
export class RawBodyError extends HttpException {
  constructor(status: number, body: Record<string, unknown>) {
    super(body, status);
  }
}

/** 본문 없는 상태 응답 — Spring `ResponseEntity.notFound().build()` 등 */
export class EmptyResponseError extends HttpException {
  constructor(status: number) {
    super('', status);
  }
}
