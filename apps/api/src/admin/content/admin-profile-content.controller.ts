import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { isBlank } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { AdminActivityRecorder } from '../common/activity-recorder.js';
import { IllegalArgument } from '../common/admin-errors.js';
import { intParam, longParam, optLongParam, pageRequest, pageResponse, strParam } from '../common/admin-params.js';

const TYPE_LABELS: Record<string, string> = { testimonials: '후기', pricing: '가격 패키지', press: '언론 보도', achievements: '수상·전시', brands: '클라이언트 브랜드' };

function requireType(type: string | null): string {
  // Spring은 Map.of 순서(JVM마다 다름)로 이어 붙인다 — 여기서는 선언 순서
  if (type === null || !(type in TYPE_LABELS)) throw new IllegalArgument(`type은 ${Object.keys(TYPE_LABELS).join('/')} 중 하나여야 합니다.`);
  return type;
}

const join = (...parts: Array<string | null>) => parts.filter((s): s is string => s !== null && !isBlank(s)).join(' · ');

interface Dto { id: number; type: string; memberId: number; memberName: string | null; title: string | null; subtitle: string | null; body: string | null; linkUrl: string | null; imageUrl: string | null; tags: string[]; createdAt: string | null }

const base = (type: string, id: bigint, memberId: bigint, at: Date): Dto =>
  ({ id: Number(id), type, memberId: Number(memberId), memberName: null, title: null, subtitle: null, body: null, linkUrl: null, imageUrl: null, tags: [], createdAt: localDateTime(at) });

/** String.format("%,d원") */
const won = (n: number) => `${n.toLocaleString('en-US')}원`;

type Row = Record<string, any>;
const MAPPERS: Record<string, (r: Row) => Dto> = {
  testimonials: (t) => ({ ...base('testimonials', t.id, t.member_id, t.created_at), title: t.client_name, subtitle: join(t.client_role, t.shoot_date), body: t.content,
    tags: [...(t.featured ? ['대표 후기'] : []), ...(t.series_id !== null && t.series_id !== undefined ? [`작업 #${t.series_id}`] : [])] }),
  pricing: (p) => ({ ...base('pricing', p.id, p.member_id, p.created_at), title: p.name, subtitle: p.price !== null ? won(p.price) : p.price_label, body: p.description,
    tags: [...(p.featured ? ['추천'] : []), ...(!p.active ? ['비활성'] : [])] }),
  press: (p) => ({ ...base('press', p.id, p.member_id, p.created_at), title: p.title !== null ? p.title : p.publication, subtitle: join(p.publication, p.published_date),
    linkUrl: p.url, imageUrl: p.logo_url, tags: [] }),
  achievements: (a) => ({ ...base('achievements', a.id, a.member_id, a.created_at), title: a.title, subtitle: join(a.organizer, a.location, a.year_month), linkUrl: a.url,
    tags: [({ AWARD: '수상', EXHIBITION: '전시', PUBLICATION: '출판' } as Record<string, string>)[a.type] ?? a.type] }),
  brands: (b) => ({ ...base('brands', b.id, b.member_id, b.created_at), title: b.name, imageUrl: b.logo_url, tags: [] }),
};

const TABLES: Record<string, string> = { testimonials: 'testimonials', pricing: 'pricing_packages', press: 'press_features', achievements: 'achievements', brands: 'client_brands' };

/** Spring 어드민 AdminProfileContentController — 작가 프로필 콘텐츠(후기·가격·언론·수상·브랜드) 모더레이션 */
@Controller('api/admin/profile-content')
export class AdminProfileContentController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly activity: AdminActivityRecorder,
  ) {}

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const type = strParam(q.type);
    const memberId = optLongParam(q.memberId);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const t = requireType(type);
    const table = TABLES[t];
    const [rows, total] = await Promise.all([
      this.prisma.$queryRawUnsafe<Row[]>(`SELECT * FROM ${table} WHERE ($1::bigint IS NULL OR member_id = $1::bigint) ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`, memberId, p.take, p.skip),
      this.prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*) AS c FROM ${table} WHERE ($1::bigint IS NULL OR member_id = $1::bigint)`, memberId),
    ]);
    const items = rows.map(MAPPERS[t]);
    const ids = [...new Set(items.map((i) => BigInt(i.memberId)))];
    if (ids.length) {
      const names = new Map((await this.prisma.members.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((m) => [Number(m.id), m.name]));
      for (const i of items) i.memberName = names.get(i.memberId) ?? null;
    }
    return pageResponse(items, page, size, Number(total[0].c));
  }

  @Get('counts')
  async counts() {
    const out: Record<string, number> = {};
    for (const [k, table] of Object.entries(TABLES)) out[k] = Number((await this.prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*) AS c FROM ${table}`))[0].c);
    return out;
  }

  @Delete(':type/:id')
  async delete(@CurrentAdmin() admin: AdminPrincipal, @Param('type') type: string, @Param('id') id: string) {
    const cid = longParam(id);
    const t = requireType(type);
    const rows = await this.prisma.$queryRawUnsafe<Row[]>(`SELECT * FROM ${TABLES[t]} WHERE id = $1`, cid);
    if (!rows.length) throw new IllegalArgument('콘텐츠를 찾을 수 없습니다.');
    const target = MAPPERS[t](rows[0]);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM ${TABLES[t]} WHERE id = $1`, cid);
      await this.activity.record(admin, 'PROFILE_CONTENT_DELETE', type.toUpperCase(), cid, `${TYPE_LABELS[type]} · 작가 #${target.memberId} · ${target.title}`, tx);
    });
    return { message: '삭제되었습니다.' };
  }
}
