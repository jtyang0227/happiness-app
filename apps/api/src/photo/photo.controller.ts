import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { escapeHtml4 } from '../common/escape-html4.js';
import type { Response } from 'express';
import { optionalInt, optionalLong, requiredLong } from '../common/params.js';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { PhotoCommandService, PhotoRequest } from './photo-command.service.js';
import { optionalInt as optInt } from '../common/params.js';
import { photoError } from './photo.mapper.js';
import { PhotoQueryService } from './photo-query.service.js';

/**
 * Spring PhotoController 조회 경로. 응답은 {status, data} 래퍼(ApiResponse 아님), 오류는 {status:'error', message}.
 * 공개: 목록·단건·비슷한 사진, 그리고 `/{id}` 패턴에 걸리는 `/suggestions`(Spring SecurityConfig와 같은 결과).
 * 쓰기 중 삭제·업로드·AI 태그는 아직 Spring(저장소 파일 삭제·리사이즈·외부 API가 걸려 있음).
 */
@Controller('api/photos')
export class PhotoController {
  constructor(private readonly photos: PhotoQueryService, private readonly commands: PhotoCommandService) {}

  @Public()
  @Get()
  async list(
    @Query('keyword') keyword?: string, @Query('colorMood') colorMood?: string, @Query('memberId') memberId?: string,
    @Query('imageRatio') imageRatio?: string, @Query('genre') genre?: string, @Query('sortBy') sortBy?: string,
    @Query('order') order?: string, @Query('tags') tags?: string, @Query('page') page?: string, @Query('size') size?: string,
  ) {
    return this.photos.list({
      keyword, colorMood, memberId: optionalLong(memberId, 'memberId'), imageRatio, genre,
      sortBy: sortBy ?? 'createdAt', order: order ?? 'desc', tags,
      page: optionalLong(page, 'page'), size: optionalInt(size, 'size', 30),
    });
  }

  @Public()
  @Get('suggestions')
  async suggestions(@Query('q') q?: string) {
    return { data: await this.photos.suggestions(q ?? ''), status: 'success' };
  }

  @Get('saves/:memberId')
  async saved(@Param('memberId', ParseIntPipe) memberId: number) {
    return { data: await this.photos.saved(memberId), status: 'success' };
  }

  @Get('genres/stats')
  async genreStats(@Query('memberId') memberId?: string) {
    return { data: await this.photos.genreStats(optionalLong(memberId, 'memberId')), status: 'success' };
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: PhotoRequest | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.create(body ?? {}, user);
  }

  /** multipart — 텍스트 칸은 폼 파라미터라 Spring XSS 필터처럼 이스케이프된다 */
  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(@UploadedFile() file: { buffer: Buffer; size: number; mimetype: string } | undefined, @Body() raw: Record<string, string> | undefined, @CurrentUser() user: AuthUser) {
    const b: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(raw ?? {})) b[k] = escapeHtml4(typeof v === 'string' ? v : String(v));
    const memberId = requiredLong(b.memberId, 'memberId');
    if (b.title == null) throw new Error('Required request parameter title is not present');
    if (!file) throw new Error("Required part 'file' is not present.");
    return this.commands.upload({
      memberId, title: b.title, description: b.description, imageRatio: b.imageRatio, gridColSpan: optInt(b.gridColSpan, 'gridColSpan', 6),
      colorMood: b.colorMood, genre: b.genre, subGenres: b.subGenres,
    }, file, user);
  }

  @Put('reorder')
  reorder(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.commands.reorder(body, user);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: PhotoRequest | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.update(id, body ?? {}, user);
  }

  @Post(':photoId/tags')
  @HttpCode(201)
  addTag(@Param('photoId', ParseIntPipe) photoId: number, @Query('memberId') memberId: string | undefined,
    @Query('positionX') x: string | undefined, @Query('positionY') y: string | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.addTag(photoId, requiredLong(memberId, 'memberId'), toDouble(x), toDouble(y), user);
  }

  @Delete(':photoId/tags/:tagId')
  removeTag(@Param('photoId', ParseIntPipe) photoId: number, @Param('tagId', ParseIntPipe) tagId: number, @CurrentUser() user: AuthUser) {
    return this.commands.removeTag(photoId, tagId, user);
  }

  @Post(':photoId/likes')
  @HttpCode(201)
  like(@Param('photoId', ParseIntPipe) photoId: number, @Query('memberId') memberId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.toggle('like', true, photoId, requiredLong(memberId, 'memberId'), user);
  }

  @Delete(':photoId/likes')
  unlike(@Param('photoId', ParseIntPipe) photoId: number, @Query('memberId') memberId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.toggle('like', false, photoId, requiredLong(memberId, 'memberId'), user);
  }

  @Post(':photoId/saves')
  @HttpCode(201)
  save(@Param('photoId', ParseIntPipe) photoId: number, @Query('memberId') memberId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.toggle('save', true, photoId, requiredLong(memberId, 'memberId'), user);
  }

  @Delete(':photoId/saves')
  unsave(@Param('photoId', ParseIntPipe) photoId: number, @Query('memberId') memberId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.commands.toggle('save', false, photoId, requiredLong(memberId, 'memberId'), user);
  }

  @Post(':photoId/shares')
  @HttpCode(201)
  share(@Param('photoId', ParseIntPipe) photoId: number, @Query('memberId') memberId: string | undefined,
    @Query('platform') platform: string | undefined, @CurrentUser() user: AuthUser) {
    const m = requiredLong(memberId, 'memberId');
    if (platform == null) throw new Error('Required request parameter platform is not present');
    return this.commands.share(photoId, m, platform, user);
  }

  @Public()
  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const p = await this.photos.one(id);
    if (!p) {
      res.status(404);
      return photoError('사진을 찾을 수 없습니다.');
    }
    return { data: p, status: 'success' };
  }

  @Public()
  @Get(':id/similar')
  async similar(@Param('id', ParseIntPipe) id: number, @Query('size') size: string | undefined, @Res({ passthrough: true }) res: Response) {
    const list = await this.photos.similar(id, optionalInt(size, 'size', 12));
    if (!list) {
      res.status(404);
      return photoError('사진을 찾을 수 없습니다.');
    }
    return { data: list, status: 'success' };
  }

  @Get(':photoId/tags')
  async tags(@Param('photoId', ParseIntPipe) photoId: number) {
    return { data: await this.photos.tags(photoId), status: 'success' };
  }

  @Get(':photoId/likes')
  async likes(@Param('photoId', ParseIntPipe) photoId: number) {
    const data = await this.photos.likes(photoId);
    return { data, count: data.length, status: 'success' };
  }

  @Get(':photoId/shares')
  async shares(@Param('photoId', ParseIntPipe) photoId: number) {
    const data = await this.photos.shares(photoId);
    return { data, count: data.length, status: 'success' };
  }
}

/** @RequestParam Double — 없으면 null, 숫자가 아니면 500 */
function toDouble(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (v.trim() === '' || Number.isNaN(n)) throw new Error(`Failed to convert ${v}`);
  return n;
}
