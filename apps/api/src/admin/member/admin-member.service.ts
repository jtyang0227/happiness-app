import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { localDateTime } from '../../common/time.js';
import { isBlank } from '../../common/json-body.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { AdminActivityRecorder } from '../common/activity-recorder.js';
import { AdminServerError, IllegalArgument } from '../common/admin-errors.js';
import { pageRequest, pageResponse } from '../common/admin-params.js';
import { FieldEncryptor } from '../privacy/field-encryptor.js';
import { PrivacyAccessRecorder, requireReason } from '../privacy/privacy-access-recorder.js';
import { PrivacyMasker } from '../privacy/privacy-masker.js';

export const AUTHORITIES = ['WM', 'SA', 'US'] as const;
export const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'] as const;
const EXPORT_LIMIT = 5000;
/** 암호문이 suspend_reason varchar(500)에 들어가도록 하는 평문 상한 */
const SUSPEND_REASON_MAX = 100;

type MemberRow = Prisma.membersGetPayload<object>;

/** Enum.valueOf — 실패 메시지까지 Java와 같게(null은 NPE → 500) */
export function enumValueOf<T extends string>(cls: string, values: readonly T[], v: string | null): T {
  if (v === null) throw new AdminServerError('Name is null');
  if (!(values as readonly string[]).includes(v)) throw new IllegalArgument(`No enum constant com.happiness.admin.entity.${cls}.${v}`);
  return v as T;
}

const optEnum = <T extends string>(cls: string, values: readonly T[], v: string | null | undefined): T | null =>
  v != null && !isBlank(v) ? enumValueOf(cls, values, v) : null;

function maskSearch(search: string) {
  return search.includes('@') ? PrivacyMasker.email(search.trim())! : search.trim();
}

const n = (v: bigint | null) => (v === null ? null : Number(v));

@Injectable()
export class AdminMemberService {
  private readonly log = new Logger('AdminMember');

  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly activity: AdminActivityRecorder,
    private readonly privacy: PrivacyAccessRecorder,
    private readonly enc: FieldEncryptor,
  ) {}

  private where(search: string | null, authority: string | null, status: string | null) {
    // JPQL `LIKE %:search%` — 와일드카드 이스케이프 없이, 대소문자 구분
    return Prisma.sql`(${search}::text IS NULL OR name LIKE '%' || ${search}::text || '%' OR email LIKE '%' || ${search}::text || '%')
      AND (${authority}::text IS NULL OR authority = ${authority}::text) AND (${status}::text IS NULL OR status = ${status}::text)`;
  }

  private async search(search: string | null, authority: string | null, status: string | null, skip: number, take: number) {
    const w = this.where(search, authority, status);
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<MemberRow[]>`SELECT * FROM members WHERE ${w} ORDER BY created_at DESC LIMIT ${take} OFFSET ${skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM members WHERE ${w}`,
    ]);
    return { rows, total: Number(total[0].c) };
  }

  /** 회원별 개수(배치) — 표·열 이름은 상수만 넘긴다 */
  private async countBy(table: string, col: string, ids: bigint[]): Promise<Map<bigint, number>> {
    const rows = await this.prisma.$queryRawUnsafe<{ k: bigint; c: bigint }[]>(
      `SELECT ${col} AS k, COUNT(*) AS c FROM ${table} WHERE ${col} = ANY($1::bigint[]) GROUP BY ${col}`, ids);
    return new Map(rows.map((r) => [r.k, Number(r.c)]));
  }

  private async counts(ids: bigint[]) {
    if (!ids.length) return { photos: new Map<bigint, number>(), series: new Map<bigint, number>(), inquiries: new Map<bigint, number>(), portfolios: new Map<bigint, number>() };
    const [photos, series, inquiries, portfolios] = await Promise.all([
      this.countBy('photos', 'member_id', ids), this.countBy('series', 'member_id', ids),
      this.countBy('inquiries', 'sender_id', ids), this.countBy('portfolios', 'member_id', ids),
    ]);
    return { photos, series, inquiries, portfolios };
  }

  private dto(m: MemberRow, c: { photos: number; series: number; inquiries: number; portfolios: number }) {
    return {
      id: Number(m.id),
      name: m.name,
      email: PrivacyMasker.email(m.email),
      tel: PrivacyMasker.tel(m.tel),
      profileName: m.profile_name,
      authority: m.authority,
      status: m.status,
      suspendReason: this.enc.decrypt(m.suspend_reason),
      suspendUntil: localDateTime(m.suspend_until),
      suspendedAt: localDateTime(m.suspended_at),
      verified: m.is_verified,
      verifiedAt: localDateTime(m.verified_at),
      createdAt: localDateTime(m.created_at),
      photoCount: c.photos,
      seriesCount: c.series,
      inquiryCount: c.inquiries,
      portfolioCount: c.portfolios,
      provider: m.provider,
    };
  }

  async list(admin: AdminPrincipal, ip: string | null, search: string | null, authorityStr: string | null, statusStr: string | null, page: number, size: number) {
    const authority = optEnum('Authority', AUTHORITIES, authorityStr);
    const status = optEnum('MemberStatus', MEMBER_STATUSES, statusStr);
    const p = pageRequest(page, size);
    const s = search !== null && !isBlank(search) ? search : null;
    const { rows, total } = await this.search(s, authority, status, p.skip, p.take);
    const c = await this.counts(rows.map((r) => r.id));
    await this.privacy.record(admin, ip, 'LIST', null, rows.length, null,
      `회원 목록 p${page}${status ? ` 상태=${status}` : ''}${authority ? ` 역할=${authority}` : ''}${s ? ` 검색=${maskSearch(s)}` : ''}`);
    const content = rows.map((m) => this.dto(m, {
      photos: c.photos.get(m.id) ?? 0, series: c.series.get(m.id) ?? 0, inquiries: c.inquiries.get(m.id) ?? 0, portfolios: c.portfolios.get(m.id) ?? 0,
    }));
    return pageResponse(content, page, size, total);
  }

  async find(id: number): Promise<MemberRow> {
    const m = await this.prisma.members.findUnique({ where: { id: BigInt(id) } });
    if (!m) throw new IllegalArgument('회원을 찾을 수 없습니다.');
    return m;
  }

  private async toDto(m: MemberRow) {
    const [photos, series, inquiries, portfolios] = await Promise.all([
      this.prisma.photos.count({ where: { member_id: m.id } }),
      this.prisma.series.count({ where: { member_id: m.id } }),
      this.prisma.inquiries.count({ where: { sender_id: m.id } }),
      this.prisma.portfolios.count({ where: { member_id: m.id } }),
    ]);
    return this.dto(m, { photos, series, inquiries, portfolios });
  }

  async detail(admin: AdminPrincipal, ip: string | null, id: number) {
    const m = await this.find(id);
    await this.privacy.record(admin, ip, 'VIEW', id, 1, null, '회원 상세(마스킹)');
    return this.toDto(m);
  }

  async reveal(admin: AdminPrincipal, ip: string | null, id: number, reason: string | null) {
    const why = requireReason(reason);
    const m = await this.find(id);
    await this.privacy.record(admin, ip, 'REVEAL', id, 1, why, '이메일·전화번호 원문 열람');
    return { email: m.email, tel: m.tel };
  }

  async summary() {
    const now = Date.now();
    const out: Record<string, number> = { total: await this.prisma.members.count() };
    for (const st of MEMBER_STATUSES) out[st] = await this.prisma.members.count({ where: { status: st } });
    out.new7d = await this.prisma.members.count({ where: { created_at: { gte: new Date(now - 7 * 86400000) } } });
    out.suspensionsEnding3d = await this.prisma.members.count({
      where: { status: 'SUSPENDED', suspend_until: { not: null, lt: new Date(now + 3 * 86400000) } },
    });
    return out;
  }

  async export(admin: AdminPrincipal, ip: string | null, f: Record<string, string | null>) {
    const why = requireReason(f.reason);
    const authority = optEnum('Authority', AUTHORITIES, f.authority);
    const status = optEnum('MemberStatus', MEMBER_STATUSES, f.status);
    const search = f.search != null && !isBlank(f.search) ? f.search : null;
    const { rows } = await this.search(search, authority, status, 0, EXPORT_LIMIT);
    await this.activity.record(admin, 'MEMBER_EXPORT', 'MEMBER', null,
      `회원 ${rows.length}명 CSV 내보내기 (상태=${status ?? '전체'}, 역할=${authority ?? '전체'}${search ? `, 검색=${maskSearch(search)}` : ''})`);
    await this.privacy.record(admin, ip, 'EXPORT', null, rows.length, why, '회원 CSV (이메일 포함, 연락처 제외)');
    return rows.map((m) => ({
      id: Number(m.id), name: m.name, email: m.email, profileName: m.profile_name, authority: m.authority, status: m.status,
      verified: m.is_verified, createdAt: localDateTime(m.created_at),
    }));
  }

  async history(id: number) {
    await this.find(id);
    const logs = await this.prisma.admin_activity_logs.findMany({ where: { target_type: 'MEMBER', target_id: BigInt(id) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    return logs.map((l) => ({ id: Number(l.id), action: l.action, adminName: l.admin_name, details: l.details, createdAt: localDateTime(l.created_at) }));
  }

  private note(x: { id: bigint; member_id: bigint; admin_id: bigint | null; admin_name: string | null; content: string; created_at: Date }) {
    return { id: Number(x.id), memberId: Number(x.member_id), adminId: n(x.admin_id), adminName: x.admin_name, content: this.enc.decrypt(x.content), createdAt: localDateTime(x.created_at) };
  }

  async notes(id: number) {
    await this.find(id);
    const rows = await this.prisma.admin_member_notes.findMany({ where: { member_id: BigInt(id) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    return rows.map((r) => this.note(r));
  }

  async addNote(admin: AdminPrincipal, id: number, content: string | null) {
    await this.find(id);
    if (content === null || isBlank(content)) throw new IllegalArgument('메모 내용을 입력해 주세요.');
    if (content.length > 2000) throw new IllegalArgument('메모는 2,000자까지 쓸 수 있습니다.');
    const plain = content.trim();
    const saved = await this.prisma.admin_member_notes.create({
      data: { member_id: BigInt(id), admin_id: BigInt(admin.id), admin_name: admin.name, content: this.enc.encrypt(plain)!, created_at: new Date() },
    });
    return this.note({ ...saved, content: plain });
  }

  async deleteNote(admin: AdminPrincipal, memberId: number, noteId: number) {
    const note = await this.prisma.admin_member_notes.findUnique({ where: { id: BigInt(noteId) } });
    if (!note || Number(note.member_id) !== memberId) throw new IllegalArgument('메모를 찾을 수 없습니다.');
    if (admin.id !== n(note.admin_id) && admin.authority !== 'WM') throw new IllegalArgument('본인이 쓴 메모만 삭제할 수 있습니다.');
    await this.prisma.admin_member_notes.delete({ where: { id: note.id } });
  }

  async updateRole(admin: AdminPrincipal, id: number, authorityStr: string | null) {
    const m = await this.find(id);
    if (admin.id === id) throw new IllegalArgument('본인 계정의 역할은 변경할 수 없습니다.');
    const after = enumValueOf('Authority', AUTHORITIES, authorityStr);
    if (m.authority === after) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.members.update({ where: { id: m.id }, data: { authority: after, updated_at: new Date() } });
      await this.activity.record(admin, 'MEMBER_ROLE_CHANGE', 'MEMBER', id, `${m.name}: ${m.authority} → ${after}`, tx);
    });
  }

  async updateStatus(admin: AdminPrincipal, id: number, statusStr: string | null, reason: string | null, suspendDays: number | null) {
    if (statusStr === null || !(MEMBER_STATUSES as readonly string[]).includes(statusStr)) throw new IllegalArgument(`잘못된 상태 값입니다: ${statusStr}`);
    const next = statusStr;
    const m = await this.find(id);
    if (admin.id === id) throw new IllegalArgument('본인 계정의 상태는 변경할 수 없습니다.');
    const targetIsAdmin = m.authority === 'WM' || m.authority === 'SA';
    const restrictive = next === 'SUSPENDED' || next === 'DELETED';
    if (targetIsAdmin && restrictive && admin.authority !== 'WM') throw new IllegalArgument('관리자 계정의 정지·탈퇴는 웹관리자만 할 수 있습니다.');
    if (next === 'SUSPENDED' && (reason === null || isBlank(reason))) throw new IllegalArgument('정지 사유를 입력해 주세요.');
    if (reason !== null && reason.length > SUSPEND_REASON_MAX) throw new IllegalArgument(`정지 사유는 ${SUSPEND_REASON_MAX}자까지 쓸 수 있습니다.`);

    const before = m.status;
    const now = new Date();
    const data = next === 'SUSPENDED'
      ? { suspend_reason: this.enc.encrypt(reason), suspended_at: now, suspended_by_id: BigInt(admin.id),
          suspend_until: suspendDays !== null && suspendDays > 0 ? new Date(now.getTime() + suspendDays * 86400000) : null }
      : { suspend_reason: null, suspend_until: null, suspended_at: null, suspended_by_id: null };
    const action = next === 'SUSPENDED' ? 'MEMBER_SUSPEND' : next === 'DELETED' ? 'MEMBER_WITHDRAW'
      : next === 'ACTIVE' ? (before === 'DELETED' ? 'MEMBER_RESTORE' : before === 'SUSPENDED' ? 'MEMBER_UNSUSPEND' : 'MEMBER_STATUS_CHANGE')
      : 'MEMBER_STATUS_CHANGE';
    let detail = `${m.name}: ${before} → ${next}`;
    if (next === 'SUSPENDED') detail += ` · ${suspendDays !== null && suspendDays > 0 ? `${suspendDays}일` : '영구'} · 사유: ${reason}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.members.update({ where: { id: m.id }, data: { status: next, ...data, updated_at: now } });
      await this.activity.record(admin, action, 'MEMBER', id, detail, tx);
    });
  }

  /** 정지 기간이 지난 회원 자동 해제(앱은 SUSPENDED면 로그인을 막으므로) — MemberSuspensionScheduler */
  async releaseExpiredSuspensions(): Promise<number> {
    const expired = await this.prisma.members.findMany({ where: { status: 'SUSPENDED', suspend_until: { not: null, lt: new Date() } } });
    for (const m of expired) {
      const until = localDateTime(m.suspend_until)!.replace('T', ' ').slice(0, 16);
      await this.prisma.$transaction(async (tx) => {
        await tx.members.update({ where: { id: m.id }, data: { status: 'ACTIVE', suspend_reason: null, suspend_until: null, suspended_at: null, suspended_by_id: null, updated_at: new Date() } });
        await this.activity.recordSystem('MEMBER_SUSPEND_EXPIRED', 'MEMBER', Number(m.id), `${m.name}: 정지 기간 만료(${until})로 자동 해제`, tx);
      });
    }
    return expired.length;
  }

  /** 영구 삭제 — WM 전용(컨트롤러), 이미 탈퇴 처리(DELETED)된 회원만. 연관 데이터를 FK 순서대로 정리 */
  async deleteMember(admin: AdminPrincipal, id: number) {
    const m = await this.find(id);
    if (admin.id === id) throw new IllegalArgument('본인 계정은 삭제할 수 없습니다.');
    if (m.status !== 'DELETED') throw new IllegalArgument('먼저 탈퇴 처리한 회원만 영구 삭제할 수 있습니다.');
    const mid = m.id;
    await this.prisma.$transaction(async (tx) => {
      const photoIds = (await tx.photos.findMany({ where: { member_id: mid }, select: { id: true } })).map((p) => p.id);
      const seriesIds = (await tx.series.findMany({ where: { member_id: mid }, select: { id: true } })).map((s) => s.id);
      const portfolioIds = (await tx.portfolios.findMany({ where: { member_id: mid }, select: { id: true } })).map((p) => p.id);
      await tx.inquiries.deleteMany({ where: { OR: [{ sender_id: mid }, { receiver_id: mid }] } });
      await tx.bookings.deleteMany({ where: { OR: [{ photographer_id: mid }, { client_id: mid }] } });
      await tx.portfolio_items.deleteMany({ where: { portfolio_id: { in: portfolioIds } } });
      await tx.portfolios.deleteMany({ where: { id: { in: portfolioIds } } });
      await tx.portfolios.updateMany({ where: { reviewed_by: mid }, data: { reviewed_by: null } });
      if (photoIds.length) {
        await tx.portfolio_items.deleteMany({ where: { photo_id: { in: photoIds } } });
        await tx.featured_items.deleteMany({ where: { photo_id: { in: photoIds } } });
        await tx.series_photos.deleteMany({ where: { photo_id: { in: photoIds } } });
      }
      if (seriesIds.length) await tx.portfolio_items.deleteMany({ where: { series_id: { in: seriesIds } } });
      await tx.comments.deleteMany({ where: { OR: [{ member_id: mid }, { photo_id: { in: photoIds.length ? photoIds : [-1n] } }] } });
      await tx.photos.deleteMany({ where: { id: { in: photoIds } } });
      await tx.series_photos.deleteMany({ where: { series_id: { in: seriesIds } } });
      await tx.series.deleteMany({ where: { id: { in: seriesIds } } });
      await tx.verification_requests.deleteMany({ where: { member_id: mid } });
      await tx.reports.updateMany({ where: { reporter_id: mid }, data: { reporter_id: null } });
      await tx.testimonials.deleteMany({ where: { member_id: mid } });
      await tx.pricing_packages.deleteMany({ where: { member_id: mid } });
      await tx.press_features.deleteMany({ where: { member_id: mid } });
      await tx.achievements.deleteMany({ where: { member_id: mid } });
      await tx.client_brands.deleteMany({ where: { member_id: mid } });
      await tx.newsletter_subscribers.deleteMany({ where: { member_id: mid } });
      await tx.admin_member_notes.deleteMany({ where: { member_id: mid } });
      await tx.members.delete({ where: { id: mid } });
      await this.activity.record(admin, 'MEMBER_DELETE', 'MEMBER', id, `${m.name} (#${id}) 영구 삭제 · 사진 ${photoIds.length} · 시리즈 ${seriesIds.length}`, tx);
    });
  }
}
