import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { optionalInt, optionalLong } from '../common/params.js';
import { Public } from '../auth/auth.guard.js';
import { photoError } from './photo.mapper.js';
import { PhotoQueryService } from './photo-query.service.js';

/**
 * Spring PhotoController 조회 경로. 응답은 {status, data} 래퍼(ApiResponse 아님), 오류는 {status:'error', message}.
 * 공개: 목록·단건·비슷한 사진, 그리고 `/{id}` 패턴에 걸리는 `/suggestions`(Spring SecurityConfig와 같은 결과).
 * 쓰기 경로(등록·수정·삭제·좋아요·저장·공유·태그·순서·업로드·AI 태그)는 아직 Spring.
 */
@Controller('api/photos')
export class PhotoController {
  constructor(private readonly photos: PhotoQueryService) {}

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
