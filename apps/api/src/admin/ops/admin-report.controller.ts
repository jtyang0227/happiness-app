import Anthropic from '@anthropic-ai/sdk';
import { Body, Controller, Get, HttpCode, Injectable, Logger, Param, Post, Query } from '@nestjs/common';
import { isBlank, jsonString } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { IllegalArgument } from '../common/admin-errors.js';
import { intParam, longParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';
import { jsonField, objectBody } from '../common/admin-request.js';
import { PrivacyMasker } from '../privacy/privacy-masker.js';

type ReportRow = { id: bigint; reporter_id: bigint | null; reporter_name: string | null; reporter_email: string | null; target_type: string; target_id: bigint;
  reason: string; details: string | null; status: string; process_memo: string | null; processed_at: Date | null; created_at: Date;
  ai_summary: string | null; ai_severity: string | null; ai_suggested_action: string | null; ai_analyzed_at: Date | null };

const reportDto = (r: ReportRow) => ({
  id: Number(r.id), reporterId: r.reporter_id === null ? null : Number(r.reporter_id), reporterName: r.reporter_name,
  reporterEmail: r.reporter_id !== null ? PrivacyMasker.email(r.reporter_email) : null, targetType: r.target_type, targetId: Number(r.target_id),
  reason: r.reason, details: r.details, status: r.status, processMemo: r.process_memo, processedAt: localDateTime(r.processed_at),
  createdAt: localDateTime(r.created_at), aiSummary: r.ai_summary, aiSeverity: r.ai_severity, aiSuggestedAction: r.ai_suggested_action,
  aiAnalyzedAt: localDateTime(r.ai_analyzed_at),
});

const ALLOWED_SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);
const ALLOWED_ACTIONS = new Set(['DISMISS', 'HIDE_CONTENT', 'DELETE_CONTENT', 'WARN_AUTHOR', 'SUSPEND_AUTHOR']);
const MAX_SUMMARY_LENGTH = 500;
const SYSTEM_PROMPT = `너는 사진 커뮤니티 플랫폼의 콘텐츠 신고를 1차 검토하는 보조 도구다.
신고 내용을 요약하고, 정책 위반 가능성을 평가해 관리자의 판단을 돕는다.
최종 결정(콘텐츠 삭제, 회원 정지 등 실제 조치)은 반드시 사람 관리자가 내린다 —
너는 판단을 돕는 요약과 제안만 제공하며 어떤 조치도 직접 실행하지 않는다.
반드시 아래 JSON 형식으로만 응답하라. 다른 설명, 마크다운, 코드펜스를 포함하지 마라.
{"summary": "2문장 이내 한국어 요약", "severity": "LOW 또는 MEDIUM 또는 HIGH", "suggestedAction": "DISMISS 또는 HIDE_CONTENT 또는 DELETE_CONTENT 또는 WARN_AUTHOR 또는 SUSPEND_AUTHOR 중 하나"}
`;

/**
 * Spring AdminReportAiTriageService — 신고 요약·심각도·참고용 조치 제안만(실제 조치는 관리자가 process로).
 * 요청은 Spring과 같다: claude-opus-5, max_tokens 500, thinking disabled, effort low. 키는 ANTHROPIC_API_KEY(호출 때 생성 — 없어도 서버는 뜬다).
 */
@Injectable()
export class ReportAiTriageService {
  private readonly log = new Logger('ReportAiTriage');
  private client: Anthropic | null = null;

  constructor(private readonly prisma: AdminPrismaService) {}

  private api() {
    return (this.client ??= new Anthropic());
  }

  private async describeTarget(type: string, id: bigint): Promise<string> {
    const dash = (v: string | null) => (v === null || isBlank(v) ? '-' : v);
    if (type === 'PHOTO') {
      const p = await this.prisma.photos.findUnique({ where: { id } });
      return p ? `사진 제목: ${p.title}\n설명: ${dash(p.description)}` : '(대상 사진을 찾을 수 없음 - 삭제되었을 수 있음)';
    }
    if (type === 'MEMBER') {
      const m = await this.prisma.members.findUnique({ where: { id } });
      return m ? `회원 이름: ${m.name}\n상태: ${m.status}` : '(대상 회원을 찾을 수 없음 - 탈퇴했을 수 있음)';
    }
    if (type === 'SERIES') {
      const s = await this.prisma.series.findUnique({ where: { id } });
      return s ? `시리즈 제목: ${s.title}\n설명: ${dash(s.description)}` : '(대상 시리즈를 찾을 수 없음 - 삭제되었을 수 있음)';
    }
    return '(알 수 없는 대상 유형)';
  }

  private parse(raw: string) {
    let json = raw.trim();
    if (json.startsWith('```')) json = json.replace(/^```(json)?/, '').replace(/```\s*$/, '').trim();
    let node: Record<string, unknown>;
    try {
      node = JSON.parse(json);
    } catch {
      throw new Error(`AI 응답 JSON 파싱 실패: ${raw}`);
    }
    const text = (v: unknown) => (v === undefined || v === null || typeof v === 'object' ? null : String(v));
    const summary = text(node?.summary);
    const severity = text(node?.severity);
    const action = text(node?.suggestedAction);
    if (summary === null || isBlank(summary) || summary.length > MAX_SUMMARY_LENGTH) throw new Error('AI 요약이 비었거나 허용 길이를 초과했습니다.');
    if (severity === null || !ALLOWED_SEVERITIES.has(severity)) throw new Error(`허용되지 않은 severity 값: ${severity}`);
    if (action === null || !ALLOWED_ACTIONS.has(action)) throw new Error(`허용되지 않은 suggestedAction 값: ${action}`);
    return { summary, severity, action };
  }

  private async analyze(r: { reason: string; details: string | null; target_type: string; target_id: bigint }) {
    const userPrompt = `[신고 사유] ${r.reason}\n[신고 상세] ${r.details !== null ? r.details : '(없음)'}\n[신고 대상 유형] ${r.target_type}\n[신고 대상 정보]\n${await this.describeTarget(r.target_type, r.target_id)}\n`;
    const response = await this.api().messages.create({
      model: 'claude-opus-5',
      max_tokens: 500,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('AI 응답에 텍스트 블록이 없습니다.');
    return this.parse(block.text);
  }

  async runBatch(limit: number) {
    const p = pageRequest(0, limit);
    const targets = await this.prisma.reports.findMany({ where: { status: { in: ['PENDING', 'IN_REVIEW'] }, ai_analyzed_at: null }, orderBy: { created_at: 'asc' }, take: p.take });
    let succeeded = 0;
    let failed = 0;
    for (const r of targets) {
      try {
        const t = await this.analyze(r);
        await this.prisma.reports.updateMany({ where: { id: r.id }, data: { ai_summary: t.summary, ai_severity: t.severity, ai_suggested_action: t.action, ai_analyzed_at: new Date() } });
        succeeded++;
      } catch (e) {
        this.log.warn(`AI 신고 트리아지 실패 - reportId=${r.id}: ${e instanceof Error ? e.message : String(e)}`);
        failed++;
      }
    }
    return { requested: targets.length, succeeded, failed };
  }
}

const SELECT = `r.id, r.reporter_id, m.name AS reporter_name, m.email AS reporter_email, r.target_type, r.target_id, r.reason, r.details, r.status, r.process_memo,
  r.processed_at, r.created_at, r.ai_summary, r.ai_severity, r.ai_suggested_action, r.ai_analyzed_at FROM reports r LEFT JOIN members m ON m.id = r.reporter_id`;

/** Spring 어드민 AdminReportController — 어드민 스키마의 신고(앱 /api/admin/reports와 별도 서버) */
@Controller('api/admin/reports')
export class AdminReportController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly triage: ReportAiTriageService,
  ) {}

  private async one(id: number) {
    const r = await this.prisma.$queryRawUnsafe<ReportRow[]>(`SELECT ${SELECT} WHERE r.id = $1`, id);
    if (!r.length) throw new IllegalArgument('신고를 찾을 수 없습니다.');
    return r[0];
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const status = optStrParam(q.status);
    const targetType = optStrParam(q.targetType);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const st = status !== null && !isBlank(status) ? status : null;
    const tt = targetType !== null && !isBlank(targetType) ? targetType : null;
    const where = `($1::text IS NULL OR r.status = $1::text) AND ($2::text IS NULL OR r.target_type = $2::text)`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRawUnsafe<ReportRow[]>(`SELECT ${SELECT} WHERE ${where} ORDER BY r.created_at DESC LIMIT $3 OFFSET $4`, st, tt, p.take, p.skip),
      this.prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*) AS c FROM reports r WHERE ${where}`, st, tt),
    ]);
    return pageResponse(rows.map(reportDto), page, size, Number(total[0].c));
  }

  @Get('counts')
  async counts() {
    const out: Record<string, number> = {};
    for (const s of ['PENDING', 'IN_REVIEW', 'ACTION_TAKEN', 'DISMISSED']) out[s] = await this.prisma.reports.count({ where: { status: s } });
    return out;
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return reportDto(await this.one(longParam(id)));
  }

  @Post(':id/process')
  @HttpCode(200)
  async process(@Param('id') id: string, @Body() body: unknown) {
    const rid = longParam(id);
    const b = objectBody(body);
    const action = jsonField(() => jsonString(b.action, 'action'));
    const memo = jsonField(() => jsonString(b.memo, 'memo'));
    const r = await this.one(rid);
    // switch(null) — NPE(처리 안 됨 → 500)
    if (action === null) throw new Error('action is null');
    await this.prisma.$transaction(async (tx) => {
      if (action === 'DELETE_CONTENT' && r.target_type === 'PHOTO') {
        const photo = await tx.photos.findUnique({ where: { id: r.target_id } });
        if (photo) {
          await tx.series_photos.deleteMany({ where: { photo_id: photo.id } });
          await tx.photos.delete({ where: { id: photo.id } });
        }
      }
      await tx.reports.update({ where: { id: r.id }, data: { process_memo: memo, processed_at: new Date(), status: action === 'DISMISS' ? 'DISMISSED' : 'ACTION_TAKEN' } });
    });
    return reportDto(await this.one(rid));
  }

  @Post('ai-triage/run')
  @HttpCode(200)
  runAiTriage(@Query() q: Record<string, unknown>) {
    return this.triage.runBatch(intParam(q.limit, 20));
  }
}
