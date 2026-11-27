import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { fail } from './api-response.js';
import { EmptyResponseError, RawBodyError } from './raw-body-error.js';
import { AppError, ErrorCode } from './app-error.js';
import { forwardToLegacy } from './legacy-proxy.js';

/**
 * Spring GlobalExceptionHandler와 같은 응답. 처리 못 한 예외는 500 C001 + `[ERROR] Unhandled exception` 로그.
 * 어떤 핸들러에도 걸리지 않은 경로(req.route 없음)는 Spring으로 넘긴다.
 */
/** Spring MissingServletRequestParameter·MethodArgumentTypeMismatch·HttpMessageNotReadable을 흉내 낸 오류 메시지(common/params.ts 등) */
const CLIENT_FORMAT_ERROR = /^(Required request parameter|Failed to convert|Cannot deserialize|Required request body)/;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (exception instanceof NotFoundException && !(req as Request & { route?: unknown }).route) {
      if (forwardToLegacy(req, res)) return;
      res.status(404).json(fail(ErrorCode.NOT_FOUND.code, `${req.originalUrl.split('?')[0]} 경로를 찾을 수 없습니다.`));
      return;
    }
    if (exception instanceof EmptyResponseError) {
      res.status(exception.getStatus()).end();
      return;
    }
    if (exception instanceof RawBodyError) {
      // PhotoController처럼 ApiResponse가 아닌 고유 오류 본문을 쓰는 컨트롤러 — 본문 그대로
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    if (exception instanceof AppError) {
      res.status(exception.status).json(fail(exception.code, exception.message));
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 413) {
        // 업로드 용량 초과 — Spring MaxUploadSizeExceededException 핸들러와 같은 400 F002
        res.status(400).json(fail(ErrorCode.FILE_SIZE_EXCEEDED.code, ErrorCode.FILE_SIZE_EXCEEDED.message));
        return;
      }
      if (status === 400) {
        // 본문 JSON이 깨진 경우 등 — Spring은 처리 못 한 예외로 500을 냈지만 400이 맞다(차이 기록: 계약 테스트 대상 아님)
        res.status(400).json(fail(ErrorCode.INVALID_INPUT.code, ErrorCode.INVALID_INPUT.message));
        return;
      }
      res.status(status).json(fail(String(status), exception.message));
      return;
    }
    if (exception instanceof Error && CLIENT_FORMAT_ERROR.test(exception.message)) {
      // Spring GlobalExceptionHandler.handleBadRequest(095e0f0)와 같게 — 필수 파라미터 누락·타입 변환 실패·본문 역직렬화 실패는 400 C002
      res.status(400).json(fail(ErrorCode.INVALID_INPUT.code, ErrorCode.INVALID_INPUT.message));
      return;
    }
    this.log.error('[ERROR] Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json(fail(ErrorCode.INTERNAL_SERVER_ERROR.code, ErrorCode.INTERNAL_SERVER_ERROR.message));
  }
}
