import { Controller, HttpCode, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StorageService, UploadedFileLike } from './storage.service.js';

/** Spring StorageController — 래퍼 없는 {url, status}. folder에 `..`·`/`가 있으면 400 {error} */
@Controller('api/upload')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('image')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: UploadedFileLike | undefined, @Query('folder') folder: string | undefined, @Res({ passthrough: true }) res: Response) {
    if (!file) throw new Error("Required part 'file' is not present."); // Spring: 500
    const f = folder ?? 'photos';
    if (f.includes('..') || f.includes('/')) {
      res.status(400);
      return { error: '유효하지 않은 folder 값입니다.' };
    }
    return { url: await this.storage.uploadImage(file, f), status: 'success' };
  }
}
