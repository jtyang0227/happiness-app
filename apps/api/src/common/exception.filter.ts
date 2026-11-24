import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { fail } from './api-response.js';
import { AppError, ErrorCode } from './app-error.js';
import { forwardToLegacy } from './legacy-proxy.js';

/**
 * Spring GlobalExceptionHandler와 같은 응답. 처리 못 한 예외는 500 C001 + `[ERROR] Unhandled exception` 로그.
 * 어떤 핸들러에도 걸리지 않은 경로(req.route 없음)는 Spring으로 넘긴다.
 */
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
    if (exception instanceof AppError) {
      res.status(exception.status).json(fail(exception.code, exception.message));
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 400) {
        // 본문 JSON이 깨진 경우 등 — Spring은 처리 못 한 예외로 500을 냈지만 400이 맞다(차이 기록: 계약 테스트 대상 아님)
        res.status(400).json(fail(ErrorCode.INVALID_INPUT.code, ErrorCode.INVALID_INPUT.message));
        return;
      }
      res.status(status).json(fail(String(status), exception.message));
      return;
    }
    this.log.error('[ERROR] Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json(fail(ErrorCode.INTERNAL_SERVER_ERROR.code, ErrorCode.INTERNAL_SERVER_ERROR.message));
  }
}
