import { Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { now } from '../common/time.js';
import { MemberResponse, toMemberResponse } from '../member/member.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Spring FollowService 1:1 */
@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: number, followingId: number) {
    if (followerId === followingId) throw AppError.badInput('자기 자신을 팔로우할 수 없습니다.');
    if (await this.isFollowing(followerId, followingId)) throw AppError.badInput('이미 팔로우 중입니다.');
    await this.prisma.follows.create({ data: { follower_id: BigInt(followerId), following_id: BigInt(followingId), created_at: now() } });
  }

  async unfollow(followerId: number, followingId: number) {
    await this.prisma.follows.deleteMany({ where: { follower_id: BigInt(followerId), following_id: BigInt(followingId) } });
  }

  async isFollowing(followerId: number, followingId: number) {
    return (await this.prisma.follows.count({ where: { follower_id: BigInt(followerId), following_id: BigInt(followingId) } })) > 0;
  }

  async counts(memberId: number) {
    const id = BigInt(memberId);
    const [followerCount, followingCount] = await Promise.all([
      this.prisma.follows.count({ where: { following_id: id } }),
      this.prisma.follows.count({ where: { follower_id: id } }),
    ]);
    return { followerCount, followingCount };
  }

  /** 팔로우 기록 순서 그대로(탈퇴한 회원은 빠짐) — Spring은 한 명씩 findById, 여기선 한 번에 */
  async followers(memberId: number): Promise<MemberResponse[]> {
    const rows = await this.prisma.follows.findMany({ where: { following_id: BigInt(memberId) }, orderBy: { id: 'asc' } });
    return this.membersInOrder(rows.map((r) => r.follower_id));
  }

  async following(memberId: number): Promise<MemberResponse[]> {
    const rows = await this.prisma.follows.findMany({ where: { follower_id: BigInt(memberId) }, orderBy: { id: 'asc' } });
    return this.membersInOrder(rows.map((r) => r.following_id));
  }

  async followingIds(memberId: number): Promise<bigint[]> {
    const rows = await this.prisma.follows.findMany({ where: { follower_id: BigInt(memberId) }, orderBy: { id: 'asc' }, select: { following_id: true } });
    return rows.map((r) => r.following_id);
  }

  private async membersInOrder(ids: bigint[]) {
    const members = await this.prisma.members.findMany({ where: { id: { in: ids } } });
    const byId = new Map(members.map((m) => [m.id, m]));
    return ids.flatMap((id) => (byId.has(id) ? [toMemberResponse(byId.get(id)!)] : []));
  }
}
