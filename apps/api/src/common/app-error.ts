/** Spring `ErrorCode`와 같은 표 — 상태·코드·기본 문구를 그대로 쓴다 */
export const ErrorCode = {
  INTERNAL_SERVER_ERROR: { status: 500, code: 'C001', message: '서버 내부 오류가 발생했습니다.' },
  INVALID_INPUT: { status: 400, code: 'C002', message: '잘못된 입력값입니다.' },
  NOT_FOUND: { status: 404, code: 'C004', message: '요청한 리소스를 찾을 수 없습니다.' },
  UNAUTHORIZED: { status: 401, code: 'A001', message: '인증이 필요합니다.' },
  INVALID_TOKEN: { status: 401, code: 'A002', message: '유효하지 않은 토큰입니다.' },
  EXPIRED_TOKEN: { status: 401, code: 'A003', message: '만료된 토큰입니다.' },
  INVALID_REFRESH_TOKEN: { status: 401, code: 'A004', message: '유효하지 않은 리프레시 토큰입니다.' },
  LOGIN_FAILED: { status: 401, code: 'A005', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
  ACCOUNT_LOCKED: { status: 423, code: 'A006', message: '계정이 잠겼습니다. 잠시 후 다시 시도해주세요.' },
  FORBIDDEN: { status: 403, code: 'B001', message: '접근 권한이 없습니다.' },
  TOO_MANY_REQUESTS: { status: 429, code: 'R001', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  MEMBER_NOT_FOUND: { status: 404, code: 'M001', message: '사용자를 찾을 수 없습니다.' },
  FILE_SIZE_EXCEEDED: { status: 400, code: 'F002', message: '파일 크기가 초과되었습니다.' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;

/** 응답 본문 code까지 정해진 오류 (Spring SecurityException(ErrorCode)·fail(ErrorCode, detail)에 해당) */
export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }

  static of(key: ErrorCodeKey, detail?: string): AppError {
    const e = ErrorCode[key];
    return new AppError(e.status, e.code, detail ?? e.message);
  }

  /** Spring IllegalArgumentException → 400 C002 + 사유 */
  static badInput(message: string): AppError {
    return AppError.of('INVALID_INPUT', message);
  }

  /** Spring ResponseStatusException(status, reason) → code는 상태 숫자 문자열 */
  static status(status: number, reason: string): AppError {
    return new AppError(status, String(status), reason);
  }
}
