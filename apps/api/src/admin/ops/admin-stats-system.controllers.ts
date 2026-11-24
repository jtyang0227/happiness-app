import { Body, Controller, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { jsonBool } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { invalidRequest } from '../common/admin-errors.js';
import { intParam, optLongParam, optStrParam, pageRequest, pageResponse, strParam } from '../common/admin-params.js';
import { jsonField, objectBody, stringMap } from '../common/admin-request.js';
import { RawBodyError } from '../../common/raw-body-error.js';

function todayUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);

@Controller('api/admin/stats')
export class AdminStatsController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get('summary')
  async summary() {
    const today = todayUtc();
    const tomorrow = new Date(today.getTime() + 86400000);
    return {
      totalMembers: await this.prisma.members.count(),
      totalPhotos: await this.prisma.photos.count(),
      todayInquiries: await this.prisma.inquiries.count({ where: { created_at: { gte: today, lt: tomorrow } } }),
      unreadInquiries: await this.prisma.inquiries.count({ where: { is_read: false } }),
      todayBookings: await this.prisma.bookings.count({ where: { shoot_date: today, status: 'CONFIRMED' } }),
      pendingBookings: await this.prisma.bookings.count({ where: { status: 'REQUESTED' } }),
      pendingPortfolios: await this.prisma.portfolios.count({ where: { status: 'PENDING' } }),
    };
  }

  private async daily(table: string, since: Date) {
    const rows = await this.prisma.$queryRawUnsafe<{ d: Date; c: bigint }[]>(`SELECT CAST(created_at AS date) AS d, COUNT(*) AS c FROM ${table} WHERE created_at >= $1 GROUP BY CAST(created_at AS date)`, since);
    return new Map(rows.map((r) => [ymd(r.d), Number(r.c)]));
  }

  @Get('daily')
  async getDaily(@Query() q: Record<string, unknown>) {
    const days = intParam(q.days, 7);
    const since = new Date(Date.now() - days * 86400000);
    const [photos, signups, inquiries] = await Promise.all([this.daily('photos', since), this.daily('members', since), this.daily('inquiries', since)]);
    const today = todayUtc();
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = ymd(new Date(today.getTime() - i * 86400000));
      out.push({ day, photos: photos.get(day) ?? 0, signups: signups.get(day) ?? 0, inquiries: inquiries.get(day) ?? 0 });
    }
    return out;
  }

  @Get('top-photos')
  async topPhotos(@Query() q: Record<string, unknown>) {
    const sortBy = strParam(q.sortBy, 'likes');
    const col = sortBy === 'saves' ? 'saves_count' : sortBy === 'shares' ? 'shares_count' : 'likes_count';
    const rows = await this.prisma.photos.findMany({ orderBy: { [col]: 'desc' }, take: 10, include: { members: true } });
    return rows.map((p) => ({ id: Number(p.id), title: p.title, thumbnailUrl: p.thumbnail_url, authorName: p.members.name, likesCount: p.likes_count, savesCount: p.saves_count, sharesCount: p.shares_count }));
  }

  @Get('mood-dist')
  async moodDist() {
    const rows = await this.prisma.$queryRaw<{ l: string; c: bigint }[]>`SELECT color_mood AS l, COUNT(*) AS c FROM photos WHERE color_mood IS NOT NULL GROUP BY color_mood ORDER BY COUNT(*) DESC`;
    return rows.map((r) => ({ label: r.l, count: Number(r.c) }));
  }

  @Get('shoot-type-dist')
  async shootTypeDist() {
    const rows = await this.prisma.$queryRaw<{ l: string; c: bigint }[]>`SELECT shoot_type AS l, COUNT(*) AS c FROM inquiries WHERE shoot_type IS NOT NULL GROUP BY shoot_type ORDER BY COUNT(*) DESC`;
    return rows.map((r) => ({ label: r.l, count: Number(r.c) }));
  }

  @Get('photographers')
  async photographers(@Query() q: Record<string, unknown>) {
    const limit = intParam(q.limit, 10);
    const p = pageRequest(0, limit);
    const rows = await this.prisma.$queryRaw<{ id: bigint; name: string; profile_name: string | null; c: bigint; likes: bigint; saves: bigint }[]>`
      SELECT m.id, m.name, m.profile_name, COUNT(p.id) AS c, COALESCE(SUM(p.likes_count), 0) AS likes, COALESCE(SUM(p.saves_count), 0) AS saves
      FROM members m JOIN photos p ON p.member_id = m.id GROUP BY m.id, m.name, m.profile_name ORDER BY COUNT(p.id) DESC LIMIT ${p.take}`;
    // inquiryCount는 Spring에서도 채우지 않아 항상 0
    return rows.map((r) => ({ memberId: Number(r.id), name: r.name, profileName: r.profile_name, photoCount: Number(r.c), totalLikes: Number(r.likes), totalSaves: Number(r.saves), inquiryCount: 0 }));
  }
}

const GEMINI_MODEL = () => process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
const geminiConfigured = () => !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';

/** Spring GeminiClientService.generateText — 실패는 IllegalStateException(컨트롤러가 502로) */
async function geminiGenerate(prompt: string): Promise<string> {
  if (!geminiConfigured()) throw new GeminiError('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    throw new GeminiError(`Gemini API 호출 중 오류: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  if (res.status !== 200) throw new GeminiError(`Gemini API 호출 실패 (HTTP ${res.status}): ${text}`);
  let root: any;
  try {
    root = JSON.parse(text);
  } catch (e) {
    throw new GeminiError(`Gemini API 호출 중 오류: ${e instanceof Error ? e.message : String(e)}`);
  }
  const t = root?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (t === undefined) throw new GeminiError(`Gemini 응답에서 텍스트를 찾을 수 없습니다: ${text}`);
  return typeof t === 'string' ? t : JSON.stringify(t);
}

class GeminiError extends Error {}

@Controller('api/admin/system')
export class AdminSystemController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get('status')
  status() {
    const mailHost = process.env.MAIL_HOST ?? '';
    const mailUser = process.env.MAIL_USERNAME ?? '';
    // Spring은 활성 프로필로 DB 종류를 짐작했다(prod=PostgreSQL). Nest 어드민은 항상 PostgreSQL
    const activeProfile = (process.env.NODE_ENV ?? '') === 'production' ? 'prod' : 'default';
    return {
      mailConfigured: mailHost.trim() !== '', mailHost: mailHost.trim() === '' ? '미설정' : mailHost, mailUsername: mailUser.trim() === '' ? '미설정' : mailUser,
      rateLimitCapacity: '100', rateLimitRefillTokens: '10', rateLimitRefillSeconds: '1', dbType: 'PostgreSQL', activeProfile,
      geminiConfigured: geminiConfigured(), geminiModel: GEMINI_MODEL(),
    };
  }

  @Post('gemini-test')
  @HttpCode(200)
  async geminiTest(@Body() body: unknown) {
    const b = stringMap(body);
    const prompt = 'prompt' in b ? b.prompt : '안녕이라고 한국어로만 짧게 답해줘.';
    if (prompt === null) throw new Error('Map.of null value');
    try {
      return { prompt, response: await geminiGenerate(prompt) };
    } catch (e) {
      if (e instanceof GeminiError) throw new RawBodyError(502, { error: e.message });
      throw e;
    }
  }

  @Get('activity-logs')
  async activityLogs(@Query() q: Record<string, unknown>) {
    const adminId = optLongParam(q.adminId);
    const action = optStrParam(q.action);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const where = { ...(adminId !== null ? { admin_id: BigInt(adminId) } : {}), ...(action !== null ? { action } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.admin_activity_logs.findMany({ where, orderBy: { created_at: 'desc' }, skip: p.skip, take: p.take }),
      this.prisma.admin_activity_logs.count({ where }),
    ]);
    const content = rows.map((l) => ({ id: Number(l.id), adminId: l.admin_id === null ? null : Number(l.admin_id), adminName: l.admin_name, action: l.action,
      targetType: l.target_type, targetId: l.target_id === null ? null : Number(l.target_id), details: l.details, createdAt: localDateTime(l.created_at) }));
    return pageResponse(content, page, size, total);
  }

  @Get('activity-heatmap')
  async heatmap(@Query() q: Record<string, unknown>) {
    const days = intParam(q.weeks, 7) * 7;
    const today = todayUtc();
    const since = new Date(today.getTime() - (days - 1) * 86400000);
    const rows = await this.prisma.$queryRaw<{ d: Date; c: bigint }[]>`SELECT CAST(created_at AS date) AS d, COUNT(*) AS c FROM admin_activity_logs WHERE created_at >= ${since} GROUP BY CAST(created_at AS date)`;
    const byDay = new Map(rows.map((r) => [ymd(r.d), Number(r.c)]));
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = ymd(new Date(today.getTime() - i * 86400000));
      out.push({ day, count: byDay.get(day) ?? 0 });
    }
    return out;
  }
}

const POLICY_DEFAULTS: Record<string, string> = {
  'sort.default': 'composite',
  'sort.new_author_boost_days': '30',
  'sort.composite_likes_weight': '0.5',
  'sort.composite_inquiries_weight': '0.3',
  'sort.composite_views_weight': '0.2',
  'maintenance.enabled': 'false',
  'maintenance.message': '시스템 점검 중입니다. 잠시 후 다시 이용해 주세요.',
};

@Controller('api/admin/content-policy')
export class AdminContentPolicyController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private async policy() {
    const out: Record<string, string> = { ...POLICY_DEFAULTS };
    for (const c of await this.prisma.system_configs.findMany()) out[c.config_key] = c.config_value;
    return out;
  }

  private async update(updates: Record<string, string | null>) {
    await this.prisma.$transaction(async (tx) => {
      for (const [k, v] of Object.entries(updates)) {
        // config_value NOT NULL — null이면 Spring도 저장 실패(500)
        if (v === null) throw new Error('null value in column "config_value"');
        await tx.system_configs.upsert({ where: { config_key: k }, update: { config_value: v, updated_at: new Date() }, create: { config_key: k, config_value: v, updated_at: new Date() } });
      }
    });
  }

  @Get()
  get() {
    return this.policy();
  }

  @Patch()
  async patch(@Body() body: unknown) {
    await this.update(stringMap(body));
    return this.policy();
  }

  @Get('maintenance')
  async maintenance() {
    const c = await this.prisma.system_configs.findUnique({ where: { config_key: 'maintenance.enabled' } });
    return { enabled: c !== null && c.config_value.toLowerCase() === 'true' };
  }

  @Post('maintenance/toggle')
  @HttpCode(200)
  async toggle(@Body() body: unknown) {
    const b = objectBody(body);
    const values = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, jsonField(() => jsonBool(v, k))]));
    if (Object.values(b).some((v) => typeof v === 'object' && v !== null)) throw invalidRequest();
    const enabled = values.enabled === true;
    await this.update({ 'maintenance.enabled': String(enabled) });
    return { enabled, message: enabled ? '유지보수 모드가 활성화되었습니다.' : '유지보수 모드가 비활성화되었습니다.' };
  }
}

