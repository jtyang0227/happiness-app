import { Controller, Get, Query } from '@nestjs/common';
import { ok } from '../common/api-response.js';
import { AppError } from '../common/app-error.js';
import { optionalInt, requiredLong } from '../common/params.js';
import { AuthUser, CurrentUser, isAdmin } from '../auth/auth.guard.js';
import { FollowService } from '../follow/follow.service.js';
import { attachMembers, toPhotoResponse } from '../photo/photo.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Spring FeedController — 팔로우한 사람들의 사진 최신순(ApiResponse 래퍼). 본인(관리자) 피드만, size 1~50 */
@Controller('api/feed')
export class FeedController {
  constructor(private readonly prisma: PrismaService, private readonly follows: FollowService) {}

  @Get()
  async feed(@Query('memberId') memberIdRaw: string | undefined, @Query('page') pageRaw: string | undefined, @Query('size') sizeRaw: string | undefined, @CurrentUser() user: AuthUser) {
    const memberId = requiredLong(memberIdRaw, 'memberId');
    let page = optionalInt(pageRaw, 'page', 0);
    let size = optionalInt(sizeRaw, 'size', 20);
    if (user.id !== memberId && !isAdmin(user)) throw AppError.status(403, '본인 피드만 볼 수 있습니다.');
    page = Math.max(0, page);
    size = Math.max(1, Math.min(size, 50));
    const ids = await this.follows.followingIds(memberId);
    if (ids.length === 0) return ok([]);
    const rows = await this.prisma.photos.findMany({
      where: { member_id: { in: ids } }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: page * size, take: size,
    });
    return ok(await attachMembers(this.prisma, rows.map(toPhotoResponse)));
  }
}
