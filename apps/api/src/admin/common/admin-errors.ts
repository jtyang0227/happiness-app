import { HttpException } from '@nestjs/common';

/**
 * Spring 어드민 GlobalExceptionHandler의 응답 — 본문은 `{error: 메시지}`.
 * IllegalArgumentException → 400 {error: e.getMessage()}
 * 타입 불일치·필수 파라미터 누락·본문 해석 불가·메서드 불일치 → 400 {error:"잘못된 요청입니다."}
 * AccessDeniedException → 403 {error:"이 작업을 할 권한이 없습니다."}
 * 그 밖의 예외(IllegalStateException, 없는 경로의 NoHandlerFoundException 포함) → 500 {error:"서버 오류가 발생했습니다."}
 */
export class AdminError extends HttpException {
  constructor(status: number, message: string) {
    super({ error: message }, status);
  }
}

export const INVALID_REQUEST = '잘못된 요청입니다.';
export const SERVER_ERROR = '서버 오류가 발생했습니다.';

/** java IllegalArgumentException — 메시지 그대로 400 */
export class IllegalArgument extends AdminError {
  constructor(message: string) {
    super(400, message);
  }
}
/** 타입 불일치·필수 파라미터 누락 등 */
export const invalidRequest = () => new AdminError(400, INVALID_REQUEST);
/** IllegalStateException·EntityNotFound 등 처리하지 않는 예외 — 500 */
export const serverError = (detail?: string) => new AdminServerError(detail);

export class AdminServerError extends Error {
  constructor(detail?: string) {
    super(detail ?? SERVER_ERROR);
  }
}
