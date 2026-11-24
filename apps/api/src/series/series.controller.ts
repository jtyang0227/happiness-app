import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { optionalInt, optionalLong } from '../common/params.js';
import { AuthUser, CurrentUser, Public, Roles } from '../auth/auth.guard.js';
import { SeriesRequest, SeriesService } from './series.service.js';

/** Spring SeriesController — 래퍼 없는 JSON. 공개: 목록·탐색·상세(초안은 본인·관리자만) */
@Controller('api/series')
export class SeriesController {
  constructor(private readonly series: SeriesService) {}

  @Public()
  @Get()
  list(@Query('memberId') memberId?: string) {
    return this.series.publicList(optionalLong(memberId, 'memberId'));
  }

  @Public()
  @Get('discover')
  discover(@Query('shootType') shootType?: string, @Query('location') location?: string, @Query('sort') sort?: string,
    @Query('featured') featured?: string, @Query('page') page?: string, @Query('size') size?: string) {
    if (featured != null && !/^(true|false|on|off|yes|no|1|0)$/i.test(featured.trim())) throw new Error(`Failed to convert featured: ${featured}`);
    return this.series.discover({
      shootType, location, sort: sort ?? 'recent', featured: featured != null && /^(true|on|yes|1)$/i.test(featured.trim()),
      page: optionalInt(page, 'page', 0), size: optionalInt(size, 'size', 24),
    });
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.series.mine(user);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    return this.series.detail(id, user);
  }

  @Get(':id/appreciation')
  myAppreciation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.series.myAppreciation(id, user);
  }

  @Post(':id/appreciation')
  @HttpCode(200)
  appreciate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.series.appreciate(id, user);
  }

  @Delete(':id/appreciation')
  unappreciate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.series.unappreciate(id, user);
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: SeriesRequest | undefined, @CurrentUser() user: AuthUser) {
    return this.series.create(body ?? {}, user);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: SeriesRequest | undefined, @CurrentUser() user: AuthUser) {
    return this.series.update(id, body ?? {}, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.series.remove(id, user);
  }

  @Post(':id/photos')
  @HttpCode(201)
  async addPhoto(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    await this.series.addPhoto(id, body, user);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  async removePhoto(@Param('id', ParseIntPipe) id: number, @Param('photoId', ParseIntPipe) photoId: number, @CurrentUser() user: AuthUser) {
    await this.series.removePhoto(id, photoId, user);
  }
}

/** Spring AdminSeriesController — 에디터 추천 */
@Controller('api/admin/series')
export class AdminSeriesController {
  constructor(private readonly series: SeriesService) {}

  @Put(':id/featured')
  @Roles('WM', 'SA')
  setFeatured(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    return this.series.setFeatured(id, body, user);
  }
}
