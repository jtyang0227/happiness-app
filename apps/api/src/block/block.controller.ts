import { Controller, Delete, Get, HttpCode, Logger, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ok } from '../common/api-response.js';
import { AppError } from '../common/app-error.js';
import { localDateTime, now } from '../common/time.js';
import { AuthUser, CurrentUser } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Spring BlockController 1:1 — 전부 로그인 회원 기준 */
@Controller('api/blocks')
export class BlockController {
  private readonly log = new Logger('BlockController');
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async myBlocks(@CurrentUser() user: AuthUser) {
    const blocks = await this.prisma.member_blocks.findMany({ where: { blocker_id: BigInt(user.id) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    const members = await this.prisma.members.findMany({ where: { id: { in: blocks.map((b) => b.blocked_id) } } });
    const byId = new Map(members.map((m) => [m.id, m]));
    return ok(blocks.map((b) => {
      const m = byId.get(b.blocked_id);
      return {
        memberId: Number(b.blocked_id),
        name: m ? m.name : '(탈퇴한 회원)',
        profileName: m ? m.profile_name : null,
        avatarUrl: m ? m.avatar_url : null,
        blockedAt: localDateTime(b.created_at),
      };
    }));
  }

  @Post(':memberId')
  @HttpCode(200)
  async block(@Param('memberId', ParseIntPipe) memberId: number, @CurrentUser() user: AuthUser) {
    if (user.id === memberId) throw AppError.status(400, '자기 자신은 차단할 수 없습니다.');
    if (!(await this.prisma.members.findUnique({ where: { id: BigInt(memberId) }, select: { id: true } }))) {
      throw AppError.status(404, '회원을 찾을 수 없습니다.');
    }
    const key = { blocker_id: BigInt(user.id), blocked_id: BigInt(memberId) };
    if ((await this.prisma.member_blocks.count({ where: key })) === 0) {
      await this.prisma.member_blocks.create({ data: { ...key, created_at: now() } });
      this.log.log(`[ADMIN] 사용자 차단 — blockerId=${user.id} blockedId=${memberId}`);
    }
    return ok();
  }

  @Delete(':memberId')
  async unblock(@Param('memberId', ParseIntPipe) memberId: number, @CurrentUser() user: AuthUser) {
    await this.prisma.member_blocks.deleteMany({ where: { blocker_id: BigInt(user.id), blocked_id: BigInt(memberId) } });
    return ok();
  }
}
