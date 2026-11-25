import { Body, Controller, Get, HttpCode, Logger, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { jsonString } from '../common/json-body.js';
import { localDateTime, now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Body_ = Record<string, unknown> | undefined;

export interface AiPlace { name: string; area: string; reason: string; bestTime: string; shootingPoints: string[]; concept: string; rainAlternative: string }
export interface AiResult {
  summary: string; season: string; places: AiPlace[]; foods: { name: string; note: string }[];
  restaurantTip: string; transport: string; parking: string; weatherNote: string; cautions: string[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim().slice(0, max) : '');
const strs = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

/** 모델 응답(JSON)을 화면이 믿고 그릴 수 있는 모양으로 — 모르는 키는 버리고 길이를 자른다 */
export function normalizeAiResult(raw: unknown): AiResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const places = (Array.isArray(r.places) ? r.places : []).slice(0, 5).map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    return {
      name: str(o.name, 60), area: str(o.area, 60), reason: str(o.reason, 400), bestTime: str(o.bestTime, 80),
      shootingPoints: strs(o.shootingPoints, 5, 80), concept: str(o.concept, 120), rainAlternative: str(o.rainAlternative, 200),
    };
  }).filter((p) => p.name);
  const foods = (Array.isArray(r.foods) ? r.foods : []).slice(0, 6).map((f) => {
    const o = (f ?? {}) as Record<string, unknown>;
    return { name: str(o.name, 40), note: str(o.note, 150) };
  }).filter((f) => f.name);
  return {
    summary: str(r.summary, 600), season: str(r.season, 20), places, foods, restaurantTip: str(r.restaurantTip, 300),
    transport: str(r.transport, 300), parking: str(r.parking, 300), weatherNote: str(r.weatherNote, 300), cautions: strs(r.cautions, 5, 200),
  };
}

export function seasonOf(month: number) {
  return month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울';
}

/** 키가 없을 때의 개발용 결과 — 실제 장소가 아님을 이름에 드러낸다(화면은 SAMPLE 배지) */
export function sampleResult(month: number, region: string): AiResult {
  const season = seasonOf(month);
  const theme = { 봄: ['꽃길 산책로', '강변 공원'], 여름: ['계곡·숲길', '해 질 녘 바닷가'], 가을: ['단풍 숲길', '억새 언덕'], 겨울: ['설경 공원', '야경 전망대'] }[season]!;
  return {
    summary: `[샘플] ${region || '지역 미정'} ${month}월(${season}) 출사를 가정한 개발용 예시입니다. AI 키(GEMINI_API_KEY)가 설정되면 실제 추천으로 바뀝니다.`,
    season,
    places: theme.map((t, i) => ({
      name: `(예시) ${t}`, area: region || '지역 미정', reason: `${season}에 흔히 추천되는 유형의 장소 예시입니다. 실제 장소가 아닙니다.`,
      bestTime: i === 0 ? '오전 9~11시(부드러운 빛)' : '일몰 1시간 전', shootingPoints: ['역광 인물', '넓은 화각 풍경'],
      concept: `${season} 감성 스냅`, rainAlternative: '(예시) 실내 전시관·카페',
    })),
    foods: [{ name: '(예시) 지역 제철 음식', note: '샘플 데이터 — 실제 추천이 아닙니다.' }],
    restaurantTip: '샘플 데이터입니다. 실제 맛집 정보가 아닙니다.',
    transport: '샘플 데이터입니다.', parking: '샘플 데이터입니다.',
    weatherNote: '날씨·개화 정보는 연동되어 있지 않습니다(예상 정보도 아님).',
    cautions: ['개발용 샘플 결과입니다.'],
  };
}

const SYSTEM = `너는 한국 사진 출사 코디네이터다. 주어진 출사 날짜·지역·계절·참여자 촬영 취향으로 출사 장소를 추천한다.
반드시 아래 JSON 하나만 출력한다(설명 문장·코드 블록 금지):
{"summary":"","season":"봄|여름|가을|겨울","places":[{"name":"","area":"","reason":"","bestTime":"","shootingPoints":[""],"concept":"","rainAlternative":""}],"foods":[{"name":"","note":""}],"restaurantTip":"","transport":"","parking":"","weatherNote":"","cautions":[""]}
규칙:
- places는 2~4곳, 그 지역에서 널리 알려진 장소 이름만. 모르는 지역이면 장소 유형으로 쓰고 이름에 "(유형)"을 붙인다.
- 주소, 영업시간, 전화번호, 가격, 입장료를 절대 쓰지 않는다.
- 개화·단풍·날씨는 "예년 기준 예상"으로만 쓰고 확정적으로 말하지 않는다. 실시간 정보가 없다는 것을 weatherNote에 밝힌다.
- 맛집은 상호를 지어내지 말고 restaurantTip에 찾는 방법(지역 시장·제철 음식 키워드 등)만 쓴다. foods는 그 지역·계절에 일반적으로 알려진 음식.
- transport·parking은 일반적인 안내만(대중교통 이용 권장 등), 확인되지 않은 구체 정보 금지.
- 한국어로, 각 문장은 짧게.`;

/** SNAPDAY AI 출사 추천 — Gemini(GEMINI_API_KEY), 키가 없으면 SAMPLE. 새 API에만 있는 경로. */
@Controller('api/gatherings')
export class GatheringAiController {
  private readonly log = new Logger('GatheringAi');
  private readonly hits = new Map<number, number[]>();
  constructor(private readonly prisma: PrismaService) {}

  private body(r: { id: bigint; source: string; model: string | null; question: string | null; result_json: string; created_at: Date; member_id: bigint }) {
    let result: AiResult;
    try { result = normalizeAiResult(JSON.parse(r.result_json)); } catch { result = normalizeAiResult({}); }
    return { id: Number(r.id), source: r.source, model: r.model, question: r.question, memberId: Number(r.member_id), result, createdAt: localDateTime(r.created_at) };
  }

  @Public()
  @Get(':id/ai-recommendations')
  async list(@Param('id', ParseIntPipe) id: number) {
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(id) }, select: { id: true } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    const rows = await this.prisma.gathering_ai_recommendations.findMany({ where: { gathering_id: g.id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 20 });
    return rows.map((r) => this.body(r));
  }

  @Post(':id/ai-recommendations')
  @HttpCode(201)
  async create(@Param('id', ParseIntPipe) id: number, @Body() b: Body_, @CurrentUser() user: AuthUser) {
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(id) } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    const mine = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: g.id, member_id: BigInt(user.id) }, select: { status: true } });
    if (Number(g.created_by) !== user.id && !isAdmin(user) && !['PARTICIPATING', 'WAITING'].includes(mine?.status ?? '')) {
      throw AppError.status(403, '출사를 만든 사람이나 참가 신청한 회원만 추천을 받을 수 있습니다.');
    }
    const t = Date.now();
    const recent = (this.hits.get(user.id) ?? []).filter((x) => t - x < 10 * 60_000);
    if (recent.length >= 5) throw AppError.status(429, 'AI 추천은 10분에 5번까지 받을 수 있어요. 잠시 후 다시 시도해 주세요.');
    this.hits.set(user.id, [...recent, t]);

    const question = str(jsonString((b ?? {}).question, 'question'), 300) || null;
    const start = g.start_date_time;
    const month = start.getUTCMonth() + 1;
    const [spot, poll, specs] = await Promise.all([
      g.spot_id ? this.prisma.spots.findUnique({ where: { id: g.spot_id }, select: { name: true, region: true } }) : null,
      this.prisma.outing_polls.findFirst({ where: { gathering_id: g.id }, select: { region: true } }),
      this.prisma.gathering_participants.findMany({ where: { gathering_id: g.id, status: 'PARTICIPATING' }, select: { member_id: true } })
        .then((ps) => (ps.length ? this.prisma.members.findMany({ where: { id: { in: ps.map((p) => p.member_id) } }, select: { specialties: true } }) : [])),
    ]);
    const region = [poll?.region, spot?.region, g.location].filter(Boolean).join(' / ');
    const tally = new Map<string, number>();
    for (const m of specs) for (const s of (m.specialties ?? '').split(',').map((x) => x.trim()).filter(Boolean)) tally.set(s, (tally.get(s) ?? 0) + 1);
    const tastes = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}명`).join(', ') || '정보 없음';

    const key = process.env.GEMINI_API_KEY?.trim();
    let source = 'SAMPLE';
    let model: string | null = null;
    let result: AiResult;
    if (!key) {
      result = sampleResult(month, region);
    } else {
      model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const wd = ['일', '월', '화', '수', '목', '금', '토'][start.getUTCDay()];
      const prompt = `출사 날짜: ${start.getUTCFullYear()}년 ${month}월 ${start.getUTCDate()}일(${wd}) ${seasonOf(month)}\n지역/장소: ${region || '미정'}${spot ? ` (출사 스팟: ${spot.name})` : ''}\n출사 제목: ${g.title}\n참여자 촬영 취향: ${tastes}${question ? `\n추가 질문: ${question}` : ''}`;
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: SYSTEM }] },
            generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] };
        const text = String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
        result = normalizeAiResult(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')));
        if (result.places.length === 0) throw new Error('추천 장소가 비어 있음');
        source = 'AI';
      } catch (e) {
        this.log.error(`[AI] Gemini 추천 실패: gathering=${g.id}: ${(e as Error).message}`);
        throw AppError.status(503, 'AI 추천을 받지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    }
    const row = await this.prisma.gathering_ai_recommendations.create({ data: {
      gathering_id: g.id, member_id: BigInt(user.id), source, model, question, result_json: JSON.stringify(result), created_at: now(),
    } });
    this.log.log(`[AI] 추천 저장: gathering=${g.id}, source=${source}, by=${user.id}`);
    return this.body(row);
  }
}
