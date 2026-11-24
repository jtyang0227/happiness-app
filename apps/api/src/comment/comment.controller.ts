import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ok } from '../common/api-response.js';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { CommentService } from './comment.service.js';

/** Spring CommentController — 읽기는 공개, 작성·삭제는 로그인 */
@Controller()
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Public()
  @Get('api/photos/:photoId/comments')
  async list(@Param('photoId', ParseIntPipe) photoId: number) {
    return ok(await this.comments.list(photoId));
  }

  @Post('api/photos/:photoId/comments')
  @HttpCode(200)
  async add(@Param('photoId', ParseIntPipe) photoId: number, @Body() body: { content?: string; parentId?: number | null } | undefined, @CurrentUser() user: AuthUser) {
    return ok(await this.comments.add(photoId, body ?? {}, user.id));
  }

  /** memberId 쿼리 파라미터는 예전 웹 호환용 — 보내와도 무시 */
  @Delete('api/comments/:id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.comments.remove(id, user.id, isAdmin(user));
    return ok();
  }
}
