import { Controller, Delete, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ok } from '../common/api-response.js';
import { AppError } from '../common/app-error.js';
import { requiredLong } from '../common/params.js';
import { AuthUser, CurrentUser, isAdmin } from '../auth/auth.guard.js';
import { withoutContact } from '../member/member.mapper.js';
import { FollowService } from './follow.service.js';

/** Spring FollowController — 전부 로그인 필요, 팔로우·언팔로우는 본인(또는 관리자)만 */
@Controller('api/follows')
export class FollowController {
  constructor(private readonly follows: FollowService) {}

  @Post()
  @HttpCode(200)
  async follow(@Query('followerId') followerId: string | undefined, @Query('followingId') followingId: string | undefined, @CurrentUser() user: AuthUser) {
    const f = requiredLong(followerId, 'followerId');
    const t = requiredLong(followingId, 'followingId');
    requireSelf(user, f);
    await this.follows.follow(f, t);
    return ok();
  }

  @Delete()
  async unfollow(@Query('followerId') followerId: string | undefined, @Query('followingId') followingId: string | undefined, @CurrentUser() user: AuthUser) {
    const f = requiredLong(followerId, 'followerId');
    const t = requiredLong(followingId, 'followingId');
    requireSelf(user, f);
    await this.follows.unfollow(f, t);
    return ok();
  }

  @Get('check')
  async check(@Query('followerId') followerId?: string, @Query('followingId') followingId?: string) {
    return ok({ following: await this.follows.isFollowing(requiredLong(followerId, 'followerId'), requiredLong(followingId, 'followingId')) });
  }

  @Get('count')
  async count(@Query('memberId') memberId?: string) {
    return ok(await this.follows.counts(requiredLong(memberId, 'memberId')));
  }

  @Get('followers')
  async followers(@Query('memberId') memberId?: string) {
    return ok((await this.follows.followers(requiredLong(memberId, 'memberId'))).map(withoutContact));
  }

  @Get('following')
  async following(@Query('memberId') memberId?: string) {
    return ok((await this.follows.following(requiredLong(memberId, 'memberId'))).map(withoutContact));
  }
}

function requireSelf(user: AuthUser, followerId: number) {
  if (user.id !== followerId && !isAdmin(user)) throw AppError.status(403, '본인 계정으로만 할 수 있습니다.');
}
