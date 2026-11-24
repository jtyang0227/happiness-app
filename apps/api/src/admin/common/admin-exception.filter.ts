import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EmptyResponseError, RawBodyError } from '../../common/raw-body-error.js';
import { AdminError, INVALID_REQUEST, SERVER_ERROR } from './admin-errors.js';
import { pathHasOtherMethod } from './admin-routes.js';

@Catch()
export class AdminExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('AdminException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (exception instanceof NotFoundException && !(req as Request & { route?: unknown }).route) {
      // Spring: 같은 경로에 다른 메서드가 있으면 HttpRequestMethodNotSupportedException → 400,
      // 아예 없는 경로는 NoHandlerFoundException(전용 핸들러 없음) → 500
      const path = req.originalUrl.split('?')[0];
      if (pathHasOtherMethod(path)) {
        res.status(400).json({ error: INVALID_REQUEST });
      } else {
        this.log.error(`[ERROR] Unhandled exception — No endpoint ${req.method} ${path}`);
        res.status(500).json({ error: SERVER_ERROR });
      }
      return;
    }
    if (exception instanceof EmptyResponseError) {
      res.status(exception.getStatus()).end();
      return;
    }
    if (exception instanceof RawBodyError || exception instanceof AdminError) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // 본문 JSON 해석 실패(body-parser) 등 — Spring HttpMessageNotReadableException과 같은 400
      if (status === 400 || status === 413 || status === 415) {
        res.status(400).json({ error: INVALID_REQUEST });
        return;
      }
    }
    this.log.error('[ERROR] Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ error: SERVER_ERROR });
  }
}
