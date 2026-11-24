import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { isBlank, javaTrim } from '../common/json-body.js';
import { now } from '../common/time.js';
import type { gathering_place_options, gatherings } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GatheringNotificationService } from './gathering-notification.service.js';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

/** Java Long.parseLong — 앞뒤 공백·소수 불가 */
function parseLong(s: string): number | null {
  return /^[+-]?\d+$/.test(s) && Math.abs(Number(s)) <= Number.MAX_SAFE_INTEGER ? Number(s) : null;
}
/** Map<String,Object> 값의 toString — 숫자·불리언은 글자로(실수는 Java처럼 .0 유지 못 함) */
const javaToString = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Spring GatheringPlacePollService — 장소 후보 2~5개, 참여·대기자 투표, 모집 마감 때 최다 득표로 장소 확정 */
@Injectable()
export class GatheringPlacePollService {
  private readonly log = new Logger('GatheringPlacePollService');
  constructor(private readonly prisma: PrismaService, private readonly notifications: GatheringNotificationService) {}

  private async gathering(id: number) {
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(id) } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    return g;
  }

  private async counts(gatheringId: bigint) {
    const rows = await this.prisma.gathering_place_votes.groupBy({ by: ['option_id'], where: { gathering_id: gatheringId }, _count: { _all: true } });
    return new Map(rows.map((r) => [r.option_id, r._count._all]));
  }

  /** id 오름차순으로 가장 많은 표(동점은 먼저 등록된 후보, 0표면 없음) */
  private winner(options: gathering_place_options[], counts: Map<bigint, number>) {
    let best: gathering_place_options | null = null;
    let bestCount = 0;
    for (const o of options) {
      const c = counts.get(o.id) ?? 0;
      if (c > bestCount) { best = o; bestCount = c; }
    }
    return best;
  }

  async getPoll(gatheringId: number, viewerId?: number) {
    const g = await this.gathering(gatheringId);
    const options = await this.prisma.gathering_place_options.findMany({ where: { gathering_id: g.id }, orderBy: { id: 'asc' } });
    const counts = await this.counts(g.id);
    const open = g.status === 'RECRUITING';
    const w = open ? null : this.winner(options, counts);
    let myOptionId: number | null = null;
    if (viewerId != null) {
      const v = await this.prisma.gathering_place_votes.findFirst({ where: { gathering_id: g.id, member_id: BigInt(viewerId) }, select: { option_id: true } });
      myOptionId = v ? Number(v.option_id) : null;
    }
    return {
      options: options.map((o) => ({ id: Number(o.id), label: o.label, spotId: o.spot_id == null ? null : Number(o.spot_id), voteCount: counts.get(o.id) ?? 0 })),
      totalVotes: [...counts.values()].reduce((a, b) => a + b, 0),
      open,
      myOptionId,
      winnerOptionId: w ? Number(w.id) : null,
    };
  }

  async setOptions(gatheringId: number, memberId: number, items: Record<string, unknown>[]) {
    const g = await this.prisma.gatherings.findFirst({ where: { id: BigInt(gatheringId), created_by: BigInt(memberId) } });
    if (!g) throw AppError.status(403, '모임을 만든 사람만 장소 후보를 정할 수 있어요.');
    if (g.status !== 'RECRUITING') throw AppError.status(400, '모집 중인 모임에서만 장소 투표를 열 수 있어요.');
    if (await this.prisma.gathering_place_votes.count({ where: { gathering_id: g.id } })) throw AppError.status(409, '이미 투표가 시작돼 후보를 바꿀 수 없어요.');
    if (items.length && (items.length < MIN_OPTIONS || items.length > MAX_OPTIONS)) throw AppError.status(400, '장소 후보는 2~5개로 정해 주세요.');
    const next: { spot_id: bigint | null; label: string }[] = [];
    for (const it of items) {
      let spotId: number | null = null;
      const raw = it.spotId;
      if (raw != null && !isBlank(javaToString(raw))) {
        spotId = typeof raw === 'number' ? Math.trunc(raw) : parseLong(javaToString(raw));
        if (spotId == null) throw AppError.status(400, '스팟 id가 올바르지 않습니다.');
      }
      const spot = spotId == null ? null : await this.prisma.spots.findUnique({ where: { id: BigInt(spotId) }, select: { id: true, name: true } });
      if (spotId != null && !spot) throw AppError.status(400, '출사 스팟을 찾을 수 없습니다.');
      let label = it.label == null ? '' : javaTrim(javaToString(it.label).replace(/<[^>]*>/g, ''));
      if (label === '' && spot) label = spot.name;
      if (label === '') throw AppError.status(400, '장소 후보 이름을 입력해 주세요.');
      if (label.length > 100) throw AppError.status(400, '장소 후보 이름은 100자 이내로 입력해 주세요.');
      next.push({ spot_id: spot ? spot.id : null, label });
    }
    await this.prisma.$transaction([
      this.prisma.gathering_place_options.deleteMany({ where: { gathering_id: g.id } }),
      this.prisma.gathering_place_options.createMany({ data: next.map((n) => ({ ...n, gathering_id: g.id, created_at: now() })) }),
    ]);
    this.log.log(`[GATHERING] 장소 후보 설정: gatheringId=${gatheringId}, count=${next.length}`);
    return this.getPoll(gatheringId, memberId);
  }

  async vote(gatheringId: number, memberId: number, optionId: number | null) {
    const g = await this.gathering(gatheringId);
    if (g.status !== 'RECRUITING') throw AppError.status(400, '모집이 끝나 투표할 수 없어요.');
    const p = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: g.id, member_id: BigInt(memberId) }, select: { status: true } });
    if (p?.status !== 'PARTICIPATING' && p?.status !== 'WAITING') throw AppError.status(403, '참여 신청한 사람만 투표할 수 있어요.');
    if (optionId == null) throw AppError.status(400, '투표할 후보를 골라 주세요.');
    const option = await this.prisma.gathering_place_options.findUnique({ where: { id: BigInt(optionId) } });
    if (!option || option.gathering_id !== g.id) throw AppError.status(404, '장소 후보를 찾을 수 없습니다.');
    const v = await this.prisma.gathering_place_votes.findFirst({ where: { gathering_id: g.id, member_id: BigInt(memberId) } });
    if (!v) await this.prisma.gathering_place_votes.create({ data: { gathering_id: g.id, member_id: BigInt(memberId), option_id: option.id, voted_at: now() } });
    else if (v.option_id !== option.id) await this.prisma.gathering_place_votes.update({ where: { id: v.id }, data: { option_id: option.id, voted_at: now() } });
    return this.getPoll(gatheringId, memberId);
  }

  /** 모집 마감 시 — 바꿀 값(location·spot_id)을 돌려준다. 알림은 여기서 보낸다 */
  async applyWinner(g: gatherings): Promise<{ location: string; spot_id?: bigint } | null> {
    const options = await this.prisma.gathering_place_options.findMany({ where: { gathering_id: g.id }, orderBy: { id: 'asc' } });
    if (!options.length) return null;
    const w = this.winner(options, await this.counts(g.id));
    if (!w) return null;
    this.log.log(`[GATHERING] 장소 확정: gatheringId=${g.id}, optionId=${w.id}`);
    const message = `'${g.title}' 장소가 '${w.label}'(으)로 정해졌어요.`;
    for (const st of ['PARTICIPATING', 'WAITING']) {
      const ps = await this.prisma.gathering_participants.findMany({ where: { gathering_id: g.id, status: st }, orderBy: { id: 'asc' } });
      for (const p of ps) await this.notifications.notifySafe(p.member_id, g.id, 'PLACE_DECIDED', message.length > 300 ? message.slice(0, 300) : message);
    }
    return w.spot_id != null ? { location: w.label, spot_id: w.spot_id } : { location: w.label };
  }

  async deleteForGathering(gatheringId: bigint) {
    await this.prisma.gathering_place_votes.deleteMany({ where: { gathering_id: gatheringId } });
    await this.prisma.gathering_place_options.deleteMany({ where: { gathering_id: gatheringId } });
  }
}
