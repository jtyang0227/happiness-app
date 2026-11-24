import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { now } from '../common/time.js';
import { EmptyResponseError, RawBodyError } from '../common/raw-body-error.js';
import { toMemberResponse, withoutContact } from '../member/member.mapper.js';
import { toPhotoResponse } from '../photo/photo.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SeriesService } from '../series/series.service.js';
import { normalizeSections, normalizeStyle } from './portfolio-layout.validator.js';

const TEMPLATES = ['SCRL', 'EDITORIAL', 'FILM', 'SPLIT', 'MOSAIC', 'MAGAZINE', 'MINIMAL', 'DARK_ROOM', 'BLOCKS'];

/** Spring PortfolioController — GET은 공개(래퍼 없는 JSON), PUT template은 본인·관리자 */
@Controller('api/portfolio')
export class PortfolioController {
  constructor(private readonly prisma: PrismaService, private readonly series: SeriesService) {}

  private findMember(profileName: string) {
    return this.prisma.members.findFirst({ where: { profile_name: profileName } });
  }

  @Public()
  @Get(':profileName')
  async portfolio(@Param('profileName') profileName: string) {
    const m = await this.findMember(profileName);
    if (!m) throw new EmptyResponseError(404);
    if (!m.public_profile) throw new RawBodyError(403, { status: 'private', message: '비공개 포트폴리오입니다.' });

    const [photoRows, followerCount, followingCount, series, availability] = await Promise.all([
      this.prisma.photos.findMany({ where: { member_id: m.id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] }),
      this.prisma.follows.count({ where: { following_id: m.id } }),
      this.prisma.follows.count({ where: { follower_id: m.id } }),
      this.series.publicList(Number(m.id)),
      this.prisma.booking_availability.findFirst({ where: { member_id: m.id }, select: { is_active: true } }),
    ]);
    const photos = photoRows.map(toPhotoResponse);
    return {
      member: withoutContact(toMemberResponse(m)),
      photos,
      photoCount: photos.length,
      series,
      followerCount,
      followingCount,
      totalLikes: photos.reduce((sum, p) => sum + (p.likesCount ?? 0), 0),
      acceptingBookings: availability?.is_active === true,
    };
  }

  @Public()
  @Get(':profileName/config')
  async config(@Param('profileName') profileName: string) {
    const m = await this.findMember(profileName);
    if (!m) throw AppError.status(404, '포트폴리오를 찾을 수 없습니다.');
    return { template: m.portfolio_template ?? 'EDITORIAL', styleJson: m.portfolio_style_json, sectionsJson: m.portfolio_sections_json };
  }

  @Put(':profileName/template')
  async updateTemplate(@Param('profileName') profileName: string, @Body() body: Record<string, unknown> | undefined,
    @CurrentUser() user: AuthUser) {
    const req = body ?? {};
    const m = await this.findMember(profileName);
    if (!m) throw AppError.status(404, '포트폴리오를 찾을 수 없습니다.');
    if (!isAdmin(user) && Number(m.id) !== user.id) throw new RawBodyError(403, { message: '본인의 포트폴리오만 수정할 수 있습니다.' });

    const data: { portfolio_template?: string; portfolio_style_json?: string | null; portfolio_sections_json?: string | null } = {};
    const template = req.template;
    if (template != null) {
      // Spring은 (String) 캐스트 — 문자열이 아니면 ClassCastException(500)
      if (typeof template !== 'string') throw new Error('template is not a String');
      if (!TEMPLATES.includes(template)) throw new RawBodyError(400, { message: '유효하지 않은 템플릿입니다.' });
      data.portfolio_template = template;
    }
    if ('styleJson' in req) data.portfolio_style_json = normalizeStyle(asJsonText(req.styleJson));
    if ('sectionsJson' in req) data.portfolio_sections_json = normalizeSections(asJsonText(req.sectionsJson));

    // Hibernate @PreUpdate처럼 실제로 바뀐 값이 있을 때만 저장(updated_at 갱신)
    const changed = Object.entries(data).some(([k, v]) => (m as Record<string, unknown>)[k] !== v);
    const saved = changed ? await this.prisma.members.update({ where: { id: m.id }, data: { ...data, updated_at: now() } }) : m;
    return { status: 'success', template: saved.portfolio_template, sectionsJson: saved.portfolio_sections_json, styleJson: saved.portfolio_style_json };
  }
}

/** 문자열이면 그대로, 그 외(객체·배열·숫자)는 직렬화 — 형식 검사는 검증기가 한다 */
function asJsonText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}
