import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank, jsonLocalDateTime, jsonLong, jsonPrimitiveBool, jsonString } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { IllegalArgument, invalidRequest } from '../common/admin-errors.js';
import { intParam, longParam, optStrParam, pageRequest, pageResponse, strParam } from '../common/admin-params.js';
import { jsonField, objectBody } from '../common/admin-request.js';
import { requireSafeImage, requireSafeLink } from './url-safety.js';

/** Lombok boolean isXxx 필드는 JSON 키가 xxx이고(필드명과 달라 Jackson이 맨 뒤에 둔다) — 프론트가 보내는 isActive·isPinned는 무시되고 false가 된다(Spring 그대로, README 발견 사항) */
const str = (b: Record<string, unknown>, k: string) => jsonField(() => jsonString(b[k], k));
const bool = (b: Record<string, unknown>, k: string) => jsonField(() => jsonPrimitiveBool(b[k], k));
const ldt = (b: Record<string, unknown>, k: string) => jsonField(() => jsonLocalDateTime(b[k], k));
function longList(b: Record<string, unknown>, k: string): Array<number | null> | null {
  const v = b[k];
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) throw invalidRequest();
  return v.map((x) => jsonField(() => jsonLong(x, k)));
}

/** DB 제약(NOT NULL) 위반 — Spring은 DataIntegrityViolationException → 500 */
function notNull<T>(v: T | null, col: string): T {
  if (v === null) throw new Error(`null value in column "${col}" violates not-null constraint`);
  return v;
}

type Banner = Prisma.bannersGetPayload<object>;
type Popup = Prisma.popupsGetPayload<object>;
type Notice = Prisma.noticesGetPayload<object>;

const bannerDto = (b: Banner) => ({
  id: Number(b.id), title: b.title, imageUrl: b.image_url, linkUrl: b.link_url, displayOrder: b.display_order,
  startsAt: localDateTime(b.starts_at), endsAt: localDateTime(b.ends_at), createdAt: localDateTime(b.created_at), active: b.is_active,
});

export const popupDto = (p: Popup) => ({
  id: Number(p.id), title: p.title, content: p.content, imageUrl: p.image_url, linkUrl: p.link_url, targetScreen: p.target_screen,
  showOnce: p.show_once, displayOrder: p.display_order, startsAt: localDateTime(p.starts_at), endsAt: localDateTime(p.ends_at),
  createdAt: localDateTime(p.created_at), updatedAt: localDateTime(p.updated_at), active: p.is_active,
});

const noticeDto = (n: Notice) => ({
  id: Number(n.id), type: n.type, title: n.title, content: n.content, status: n.status,
  publishedAt: localDateTime(n.published_at), expiresAt: localDateTime(n.expires_at), createdAt: localDateTime(n.created_at), updatedAt: localDateTime(n.updated_at), pinned: n.is_pinned,
});

/** 값이 바뀐 열만 남긴다 — Hibernate @PreUpdate는 바뀐 게 있을 때만 updated_at을 고친다 */
function changed<T extends Record<string, unknown>>(row: Record<string, unknown>, data: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(data)) {
    const cur = row[k];
    const same = cur instanceof Date && v instanceof Date ? cur.getTime() === v.getTime() : cur === v;
    if (!same) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

@Controller('api/admin/banners')
export class AdminBannerController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private fields(b: Record<string, unknown>) {
    const title = str(b, 'title');
    const imageUrl = str(b, 'imageUrl');
    const linkUrl = str(b, 'linkUrl');
    const active = bool(b, 'active');
    const startsAt = ldt(b, 'startsAt');
    const endsAt = ldt(b, 'endsAt');
    longList(b, 'orderedIds');
    return { title, imageUrl, linkUrl, active, startsAt, endsAt };
  }

  @Get()
  async list() {
    return (await this.prisma.banners.findMany({ orderBy: { display_order: 'asc' } })).map(bannerDto);
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: unknown) {
    const f = this.fields(objectBody(body));
    const max = (await this.prisma.banners.aggregate({ _max: { display_order: true } }))._max.display_order ?? 0;
    const image = requireSafeImage(f.imageUrl, '이미지');
    const link = requireSafeLink(f.linkUrl, '링크');
    const now = new Date();
    const b = await this.prisma.banners.create({
      data: { title: notNull(f.title, 'title'), image_url: notNull(image, 'image_url'), link_url: link, is_active: f.active, display_order: max + 1,
        starts_at: f.startsAt, ends_at: f.endsAt, created_at: now, updated_at: now },
    });
    return bannerDto(b);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const bid = longParam(id);
    const f = this.fields(objectBody(body));
    const cur = await this.prisma.banners.findUnique({ where: { id: BigInt(bid) } });
    if (!cur) throw new IllegalArgument('배너를 찾을 수 없습니다.');
    const data = changed(cur, { title: f.title, image_url: requireSafeImage(f.imageUrl, '이미지'), link_url: requireSafeLink(f.linkUrl, '링크'),
      is_active: f.active, starts_at: f.startsAt, ends_at: f.endsAt });
    if (!Object.keys(data).length) return bannerDto(cur);
    notNull(data.title === undefined ? cur.title : data.title, 'title');
    notNull(data.image_url === undefined ? cur.image_url : data.image_url, 'image_url');
    return bannerDto(await this.prisma.banners.update({ where: { id: cur.id }, data: { ...(data as object), updated_at: new Date() } }));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const bid = longParam(id);
    if (!(await this.prisma.banners.count({ where: { id: BigInt(bid) } }))) throw new IllegalArgument('배너를 찾을 수 없습니다.');
    await this.prisma.banners.delete({ where: { id: BigInt(bid) } });
    return { message: '배너가 삭제되었습니다.' };
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const bid = longParam(id);
    const cur = await this.prisma.banners.findUnique({ where: { id: BigInt(bid) } });
    if (!cur) throw new IllegalArgument('배너를 찾을 수 없습니다.');
    return bannerDto(await this.prisma.banners.update({ where: { id: cur.id }, data: { is_active: !cur.is_active, updated_at: new Date() } }));
  }

  @Patch('reorder')
  async reorder(@Body() body: unknown) {
    const b = objectBody(body);
    this.fields(b);
    const ids = longList(b, 'orderedIds');
    if (ids === null) throw new Error('orderedIds is null');
    await this.prisma.$transaction(async (tx) => {
      for (const bid of ids) {
        if (bid === null) throw new Error('The given id must not be null');
        const cur = await tx.banners.findUnique({ where: { id: BigInt(bid) } });
        // indexOf — 같은 id가 여러 번이면 첫 위치
        const order = ids.indexOf(bid) + 1;
        if (cur && cur.display_order !== order) await tx.banners.update({ where: { id: cur.id }, data: { display_order: order, updated_at: new Date() } });
      }
    });
    return { message: '순서가 저장되었습니다.' };
  }
}

@Controller('api/admin/popups')
export class AdminPopupController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private fields(b: Record<string, unknown>) {
    const title = str(b, 'title');
    const content = str(b, 'content');
    const imageUrl = str(b, 'imageUrl');
    const linkUrl = str(b, 'linkUrl');
    const targetScreen = str(b, 'targetScreen');
    const active = bool(b, 'active');
    const showOnce = bool(b, 'showOnce');
    const startsAt = ldt(b, 'startsAt');
    const endsAt = ldt(b, 'endsAt');
    longList(b, 'orderedIds');
    return { title, content, imageUrl, linkUrl, targetScreen: targetScreen ?? 'ALL', active, showOnce, startsAt, endsAt };
  }

  @Get()
  async list() {
    return (await this.prisma.popups.findMany({ orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }] })).map(popupDto);
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: unknown) {
    const f = this.fields(objectBody(body));
    const next = (await this.prisma.popups.count()) + 1;
    const image = requireSafeImage(f.imageUrl, '이미지');
    const link = requireSafeLink(f.linkUrl, '링크');
    const now = new Date();
    const p = await this.prisma.popups.create({
      data: { title: notNull(f.title, 'title'), content: notNull(f.content, 'content'), image_url: image, link_url: link, target_screen: f.targetScreen,
        is_active: f.active, show_once: f.showOnce, display_order: next, starts_at: f.startsAt, ends_at: f.endsAt, created_at: now, updated_at: now },
    });
    return popupDto(p);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const pid = longParam(id);
    const f = this.fields(objectBody(body));
    const cur = await this.prisma.popups.findUnique({ where: { id: BigInt(pid) } });
    if (!cur) throw new IllegalArgument('팝업을 찾을 수 없습니다.');
    const data = changed(cur, { title: f.title, content: f.content, image_url: requireSafeImage(f.imageUrl, '이미지'), link_url: requireSafeLink(f.linkUrl, '링크'),
      target_screen: f.targetScreen, is_active: f.active, show_once: f.showOnce, starts_at: f.startsAt, ends_at: f.endsAt });
    if (!Object.keys(data).length) return popupDto(cur);
    notNull(data.title === undefined ? cur.title : data.title, 'title');
    notNull(data.content === undefined ? cur.content : data.content, 'content');
    return popupDto(await this.prisma.popups.update({ where: { id: cur.id }, data: { ...(data as object), updated_at: new Date() } }));
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const pid = longParam(id);
    const cur = await this.prisma.popups.findUnique({ where: { id: BigInt(pid) } });
    if (!cur) throw new IllegalArgument('팝업을 찾을 수 없습니다.');
    return popupDto(await this.prisma.popups.update({ where: { id: cur.id }, data: { is_active: !cur.is_active, updated_at: new Date() } }));
  }

  @Patch('reorder')
  async reorder(@Body() body: unknown) {
    const b = objectBody(body);
    this.fields(b);
    const ids = longList(b, 'orderedIds');
    if (ids === null) throw new Error('orderedIds is null');
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] === null) throw new Error('The given id must not be null');
        const cur = await tx.popups.findUnique({ where: { id: BigInt(ids[i]!) } });
        if (cur && cur.display_order !== i + 1) await tx.popups.update({ where: { id: cur.id }, data: { display_order: i + 1, updated_at: new Date() } });
      }
    });
    return { message: '순서가 저장되었습니다.' };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const pid = longParam(id);
    if (!(await this.prisma.popups.count({ where: { id: BigInt(pid) } }))) throw new IllegalArgument('팝업을 찾을 수 없습니다.');
    await this.prisma.popups.delete({ where: { id: BigInt(pid) } });
    return { message: '팝업이 삭제되었습니다.' };
  }
}

/** happiness-app이 JWT 없이 부르는 공개 팝업 — 활성·기간 안·대상 화면(ALL 포함) */
@Controller('api/popups')
export class PopupApiController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get('active')
  async active(@Query() q: Record<string, unknown>) {
    const screen = strParam(q.screen, 'HOME');
    const target = !isBlank(screen) ? screen : 'HOME';
    const now = new Date();
    const rows = await this.prisma.popups.findMany({
      where: { is_active: true, OR: [{ starts_at: null }, { starts_at: { lte: now } }], AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }, { OR: [{ target_screen: 'ALL' }, { target_screen: target }] }] },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    });
    return rows.map(popupDto);
  }
}

@Controller('api/admin/notices')
export class AdminNoticeController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private fields(b: Record<string, unknown>) {
    return { type: str(b, 'type'), title: str(b, 'title'), content: str(b, 'content'), status: str(b, 'status'), pinned: bool(b, 'pinned'), expiresAt: ldt(b, 'expiresAt') };
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const status = optStrParam(q.status);
    const type = optStrParam(q.type);
    const search = optStrParam(q.search);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const st = status !== null && !isBlank(status) ? status : null;
    const ty = type !== null && !isBlank(type) ? type : null;
    const se = search !== null && !isBlank(search) ? search : null;
    const where = Prisma.sql`(${st}::text IS NULL OR status = ${st}::text) AND (${ty}::text IS NULL OR type = ${ty}::text)
      AND (${se}::text IS NULL OR LOWER(title) LIKE '%' || LOWER(${se}::text) || '%')`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<Notice[]>`SELECT * FROM notices WHERE ${where} ORDER BY is_pinned DESC, created_at DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM notices WHERE ${where}`,
    ]);
    return pageResponse(rows.map(noticeDto), page, size, Number(total[0].c));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const n = await this.prisma.notices.findUnique({ where: { id: BigInt(longParam(id)) } });
    if (!n) throw new IllegalArgument('공지사항을 찾을 수 없습니다.');
    return noticeDto(n);
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: unknown) {
    const f = this.fields(objectBody(body));
    const now = new Date();
    const n = await this.prisma.notices.create({
      data: { type: notNull(f.type, 'type'), title: notNull(f.title, 'title'), content: notNull(f.content, 'content'), status: notNull(f.status, 'status'),
        is_pinned: f.pinned, expires_at: f.expiresAt, published_at: f.status === 'PUBLISHED' ? now : null, created_at: now, updated_at: now },
    });
    return noticeDto(n);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const nid = longParam(id);
    const f = this.fields(objectBody(body));
    const cur = await this.prisma.notices.findUnique({ where: { id: BigInt(nid) } });
    if (!cur) throw new IllegalArgument('공지사항을 찾을 수 없습니다.');
    const publish = f.status === 'PUBLISHED' && cur.status !== 'PUBLISHED' ? { published_at: new Date() } : {};
    const data = changed(cur, { type: f.type, title: f.title, content: f.content, is_pinned: f.pinned, expires_at: f.expiresAt, status: f.status, ...publish });
    if (!Object.keys(data).length) return noticeDto(cur);
    for (const col of ['type', 'title', 'content', 'status'] as const) notNull(data[col] === undefined ? cur[col] : data[col], col);
    return noticeDto(await this.prisma.notices.update({ where: { id: cur.id }, data: { ...(data as object), updated_at: new Date() } }));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const nid = longParam(id);
    if (!(await this.prisma.notices.count({ where: { id: BigInt(nid) } }))) throw new IllegalArgument('공지사항을 찾을 수 없습니다.');
    await this.prisma.notices.delete({ where: { id: BigInt(nid) } });
    return { message: '공지사항이 삭제되었습니다.' };
  }
}
