import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import type { achievements, client_brands, press_features, pricing_packages, testimonials } from '../generated/prisma/client.js';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { isBlank, javaIntValue, javaToString } from '../common/json-body.js';
import { localDateTime, now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * 포트폴리오 신뢰 신호 4종 — Spring Testimonial/Press/Pricing/ClientBrand 컨트롤러.
 * 공개 GET `/member/{id}`, 나머지 인증(로그인 회원 기준). 래퍼 없는 JSON. 삭제는 남의 것·없는 것도 조용히 204.
 */
type Body_ = Record<string, unknown> | undefined;
const str = (b: Record<string, unknown>, k: string) => (b[k] == null ? null : javaToString(b[k]));
const num = (b: Record<string, unknown>, k: string) => (b[k] == null ? 0 : javaIntValue(b[k]));
const has = (b: Record<string, unknown>, k: string) => k in b;
const isTrue = (v: unknown) => v === true;

/** Spring은 NOT NULL 컬럼에 null을 저장하면 처리하지 않은 예외(500) */
function required(v: string | null, column: string): string {
  if (v == null) throw new Error(`not-null property references a null value: ${column}`);
  return v;
}

// ── 추천사 ────────────────────────────────────────────────────────────────

const testimonialBody = (t: testimonials) => ({
  id: Number(t.id), clientName: t.client_name, clientRole: t.client_role, content: t.content, shootDate: t.shoot_date,
  featured: t.featured, displayOrder: t.display_order, seriesId: t.series_id == null ? null : Number(t.series_id), createdAt: localDateTime(t.created_at),
});

@Controller('api/testimonials')
export class TestimonialController {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveSeriesId(b: Record<string, unknown>, memberId: number): Promise<bigint | null> {
    const v = b.seriesId;
    if (v == null || isBlank(javaToString(v))) return null;
    let id: number;
    if (typeof v === 'number') id = Math.trunc(v);
    else {
      if (!/^[+-]?\d+$/.test(javaToString(v))) throw AppError.status(400, '잘못된 작업입니다.');
      id = Number(javaToString(v));
    }
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) }, select: { member_id: true } });
    if (Number(s?.member_id) !== memberId) throw AppError.status(400, '본인 작업만 연결할 수 있습니다.');
    return BigInt(id);
  }

  @Public()
  @Get('member/:memberId')
  async list(@Param('memberId', ParseIntPipe) memberId: number) {
    const rows = await this.prisma.testimonials.findMany({ where: { member_id: BigInt(memberId) }, orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }, { id: 'desc' }] });
    return rows.map(testimonialBody);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const data = {
      member_id: BigInt(user.id), client_name: str(b, 'clientName'), client_role: str(b, 'clientRole'), content: str(b, 'content'),
      shoot_date: str(b, 'shootDate'), featured: isTrue(b.featured), display_order: num(b, 'displayOrder'),
      series_id: await this.resolveSeriesId(b, user.id), created_at: now(),
    };
    return testimonialBody(await this.prisma.testimonials.create({ data: { ...data, client_name: required(data.client_name, 'clientName'), content: required(data.content, 'content') } }));
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const t = await this.prisma.testimonials.findUnique({ where: { id: BigInt(id) } });
    if (!t || Number(t.member_id) !== user.id) throw AppError.status(404, '추천사를 찾을 수 없습니다.');
    const d: Partial<testimonials> = {};
    if (has(b, 'clientName')) d.client_name = required(str(b, 'clientName'), 'clientName');
    if (has(b, 'clientRole')) d.client_role = str(b, 'clientRole');
    if (has(b, 'content')) d.content = required(str(b, 'content'), 'content');
    if (has(b, 'shootDate')) d.shoot_date = str(b, 'shootDate');
    if (has(b, 'featured')) d.featured = isTrue(b.featured);
    if (has(b, 'displayOrder')) d.display_order = num(b, 'displayOrder');
    if (has(b, 'seriesId')) d.series_id = await this.resolveSeriesId(b, user.id);
    return testimonialBody(Object.keys(d).length ? await this.prisma.testimonials.update({ where: { id: t.id }, data: d }) : t);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prisma.testimonials.deleteMany({ where: { id: BigInt(id), member_id: BigInt(user.id) } });
  }
}

// ── 언론·수상 ──────────────────────────────────────────────────────────────

const pressBody = (p: press_features) => ({
  id: Number(p.id), publication: p.publication, title: p.title, url: p.url, publishedDate: p.published_date, logoUrl: p.logo_url, displayOrder: p.display_order,
});
const achievementBody = (a: achievements) => ({
  id: Number(a.id), type: a.type, title: a.title, organizer: a.organizer, location: a.location, yearMonth: a.year_month, url: a.url, displayOrder: a.display_order,
});

@Controller('api/press')
export class PressController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('member/:memberId')
  async list(@Param('memberId', ParseIntPipe) memberId: number) {
    const id = BigInt(memberId);
    const [press, achievements] = await Promise.all([
      this.prisma.press_features.findMany({ where: { member_id: id }, orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }, { id: 'desc' }] }),
      // PostgreSQL ORDER BY … DESC는 NULL이 먼저
      this.prisma.achievements.findMany({ where: { member_id: id }, orderBy: [{ year_month: { sort: 'desc', nulls: 'first' } }, { display_order: 'asc' }, { id: 'asc' }] }),
    ]);
    return { press: press.map(pressBody), achievements: achievements.map(achievementBody) };
  }

  @Post()
  @HttpCode(201)
  async createPress(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const data = {
      member_id: BigInt(user.id), publication: str(b, 'publication'), title: str(b, 'title'), url: str(b, 'url'),
      published_date: str(b, 'publishedDate'), logo_url: str(b, 'logoUrl'), display_order: num(b, 'displayOrder'), created_at: now(),
    };
    return pressBody(await this.prisma.press_features.create({ data: { ...data, publication: required(data.publication, 'publication') } }));
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePress(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prisma.press_features.deleteMany({ where: { id: BigInt(id), member_id: BigInt(user.id) } });
  }

  @Post('achievements')
  @HttpCode(201)
  async createAchievement(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const data = {
      member_id: BigInt(user.id), type: str(b, 'type'), title: str(b, 'title'), organizer: str(b, 'organizer'), location: str(b, 'location'),
      year_month: str(b, 'yearMonth'), url: str(b, 'url'), display_order: num(b, 'displayOrder'), created_at: now(),
    };
    return achievementBody(await this.prisma.achievements.create({ data: { ...data, type: required(data.type, 'type'), title: required(data.title, 'title') } }));
  }

  @Delete('achievements/:id')
  @HttpCode(204)
  async deleteAchievement(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prisma.achievements.deleteMany({ where: { id: BigInt(id), member_id: BigInt(user.id) } });
  }
}

// ── 촬영 패키지 ────────────────────────────────────────────────────────────

const pricingBody = (p: pricing_packages) => ({
  id: Number(p.id), name: p.name, price: p.price, priceLabel: p.price_label, description: p.description, features: p.features,
  featured: p.featured, displayOrder: p.display_order, active: p.active,
});

@Controller('api/pricing')
export class PricingController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('member/:memberId')
  async list(@Param('memberId', ParseIntPipe) memberId: number) {
    return (await this.prisma.pricing_packages.findMany({ where: { member_id: BigInt(memberId), active: true }, orderBy: [{ display_order: 'asc' }, { id: 'asc' }] })).map(pricingBody);
  }

  @Get('my')
  async mine(@CurrentUser() user: AuthUser) {
    return (await this.prisma.pricing_packages.findMany({ where: { member_id: BigInt(user.id) }, orderBy: [{ display_order: 'asc' }, { id: 'asc' }] })).map(pricingBody);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const data = {
      member_id: BigInt(user.id), name: str(b, 'name'), price: b.price != null ? num(b, 'price') : null, price_label: str(b, 'priceLabel'),
      description: str(b, 'description'), features: str(b, 'features'), featured: isTrue(b.featured), display_order: num(b, 'displayOrder'),
      active: b.active == null || isTrue(b.active), created_at: now(),
    };
    return pricingBody(await this.prisma.pricing_packages.create({ data: { ...data, name: required(data.name, 'name') } }));
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const p = await this.prisma.pricing_packages.findUnique({ where: { id: BigInt(id) } });
    // Spring: new RuntimeException("not found") → 500
    if (!p || Number(p.member_id) !== user.id) throw new Error('not found');
    const d: Partial<pricing_packages> = {};
    if (has(b, 'name')) d.name = required(str(b, 'name'), 'name');
    if (has(b, 'price')) d.price = b.price != null ? num(b, 'price') : null;
    if (has(b, 'priceLabel')) d.price_label = str(b, 'priceLabel');
    if (has(b, 'description')) d.description = str(b, 'description');
    if (has(b, 'features')) d.features = str(b, 'features');
    if (has(b, 'featured')) d.featured = isTrue(b.featured);
    if (has(b, 'displayOrder')) d.display_order = num(b, 'displayOrder');
    if (has(b, 'active')) d.active = isTrue(b.active);
    return pricingBody(Object.keys(d).length ? await this.prisma.pricing_packages.update({ where: { id: p.id }, data: d }) : p);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prisma.pricing_packages.deleteMany({ where: { id: BigInt(id), member_id: BigInt(user.id) } });
  }
}

// ── 클라이언트 브랜드 ──────────────────────────────────────────────────────

const brandBody = (b: client_brands) => ({ id: Number(b.id), name: b.name, logoUrl: b.logo_url, displayOrder: b.display_order });

@Controller('api/brands')
export class ClientBrandController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('member/:memberId')
  async list(@Param('memberId', ParseIntPipe) memberId: number) {
    return (await this.prisma.client_brands.findMany({ where: { member_id: BigInt(memberId) }, orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }, { id: 'asc' }] })).map(brandBody);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const name = required(str(b, 'name'), 'name');
    return brandBody(await this.prisma.client_brands.create({ data: { member_id: BigInt(user.id), name, logo_url: str(b, 'logoUrl'), display_order: num(b, 'displayOrder'), created_at: now() } }));
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const x = await this.prisma.client_brands.findUnique({ where: { id: BigInt(id) } });
    if (!x || Number(x.member_id) !== user.id) throw new Error('not found');
    const d: Partial<client_brands> = {};
    if (has(b, 'name')) d.name = required(str(b, 'name'), 'name');
    if (has(b, 'logoUrl')) d.logo_url = str(b, 'logoUrl');
    if (has(b, 'displayOrder')) d.display_order = num(b, 'displayOrder');
    return brandBody(Object.keys(d).length ? await this.prisma.client_brands.update({ where: { id: x.id }, data: d }) : x);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prisma.client_brands.deleteMany({ where: { id: BigInt(id), member_id: BigInt(user.id) } });
  }
}
