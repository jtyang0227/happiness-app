import { Body, Controller, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { clientIp } from '../common/client-ip.js';
import { isBlank, jsonString } from '../common/json-body.js';
import { RawBodyError } from '../common/raw-body-error.js';

const MAX_HISTORY_TURNS = 20;
const MAX_MESSAGE_LENGTH = 2000;
const FALLBACK_REPLY = '죄송해요, 지금은 답변을 드리기 어려워요. 다시 한번 말씀해주시겠어요?';
const FAILED = 'AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';

const PORTFOLIO_SYSTEM_PROMPT = `당신은 사진작가 포트폴리오 갤러리 서비스 'Happiness'의 방문객 응대 도우미입니다.
방문객이 포트폴리오를 둘러보다가 촬영 문의, 예약 절차, 서비스 이용 방법 등을
물어보면 친절하고 간결하게 한국어로 답변하세요.

지켜야 할 것:
- 특정 작가의 실제 사진, 가격, 예약 가능 일정 등 구체적인 데이터는 알지 못합니다.
  그런 질문에는 "정확한 정보는 포트폴리오 페이지의 문의하기 또는 예약 버튼을
  이용해 작가에게 직접 문의해주세요"라고 안내하세요.
- 답변은 3~4문장 이내로 간결하게 작성하세요.
- 서비스와 무관한 질문(코딩, 시사, 개인정보 등)에는 정중히 답변을 거절하세요.
`;

const WORKSPACE_SYSTEM_PROMPT = `당신은 사진작가 포트폴리오 갤러리 서비스 'Happiness'의 사용법을 안내하는
도우미입니다. 로그인한 작가 회원이 사진 등록, 시리즈 관리, 촬영 예약, 납품,
약속(미팅) 기능 등 앱 사용법을 물어보면 친절하고 간결하게 한국어로 답변하세요.

지켜야 할 것:
- 로그인한 사용자의 실제 사진, 통계, 예약 데이터는 알지 못합니다. 구체적인
  본인 데이터에 대한 질문에는 "프로필 페이지의 해당 메뉴에서 확인하실 수
  있어요"처럼 안내하세요.
- 답변은 3~4문장 이내로 간결하게 작성하세요.
- 서비스와 무관한 질문에는 정중히 답변을 거절하세요.
`;

/** 사용자에게 보여도 되는 사유 — 503 {error} */
class AssistantError extends Error {}

/**
 * Spring AssistantController + GeminiClient — 대화는 저장하지 않는다(요청마다 history를 받음).
 * 키는 x-goog-api-key 헤더(GEMINI_API_KEY), 모델 GEMINI_MODEL(기본 gemini-2.0-flash).
 */
@Controller('api/assistant')
export class AssistantController {
  private readonly log = new Logger('GeminiClient');
  private readonly ipRate = new Map<string, { count: number; start: number }>();
  private readonly memberRate = new Map<number, { count: number; start: number }>();

  private allow<K>(map: Map<K, { count: number; start: number }>, key: K, limit: number) {
    const t = Date.now();
    const s = map.get(key);
    const st = !s || t - s.start > 60_000 ? { count: 1, start: t } : { count: s.count + 1, start: s.start };
    map.set(key, st);
    return st.count <= limit;
  }

  @Public()
  @Post('chat')
  @HttpCode(200)
  chatPublic(@Body() body: Record<string, unknown> | undefined, @Req() req: Request) {
    if (!this.allow(this.ipRate, clientIp(req), 10)) throw new RawBodyError(429, { error: '잠시 후 다시 시도해주세요.' });
    return this.reply(PORTFOLIO_SYSTEM_PROMPT, body ?? {});
  }

  @Post('chat/workspace')
  @HttpCode(200)
  chatWorkspace(@Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    if (!this.allow(this.memberRate, user.id, 20)) throw new RawBodyError(429, { error: '잠시 후 다시 시도해주세요.' });
    return this.reply(WORKSPACE_SYSTEM_PROMPT, body ?? {});
  }

  private async reply(systemPrompt: string, b: Record<string, unknown>) {
    const message = jsonString(b.message, 'message');
    if (b.history != null && !Array.isArray(b.history)) throw new Error('Cannot deserialize history');
    const history = ((b.history ?? []) as unknown[]).map((h) => {
      const o = (h ?? {}) as Record<string, unknown>;
      return { role: jsonString(o.role, 'role'), content: jsonString(o.content, 'content') };
    });
    try {
      return { reply: await this.generate(systemPrompt, history, message) };
    } catch (e) {
      if (e instanceof AssistantError) throw new RawBodyError(503, { error: e.message });
      throw e;
    }
  }

  private async generate(systemPrompt: string, history: { role: string | null; content: string | null }[], message: string | null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isBlank(apiKey)) throw new AssistantError('AI 어시스턴트가 아직 설정되지 않았습니다. 관리자에게 문의해주세요.');
    if (message == null || isBlank(message)) throw new AssistantError('메시지를 입력해주세요.');
    if (message.length > MAX_MESSAGE_LENGTH) throw new AssistantError(`메시지가 너무 깁니다. ${MAX_MESSAGE_LENGTH}자 이내로 입력해주세요.`);
    const turn = (role: string, text: string) => ({ role, parts: [{ text }] });
    const contents = history.slice(-MAX_HISTORY_TURNS)
      .filter((h) => h.content != null && !isBlank(h.content))
      .map((h) => turn(h.role === 'model' ? 'model' : 'user', h.content!));
    contents.push(turn('user', message));
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    let res: globalThis.Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] } }),
      });
    } catch (e) {
      this.log.error(`Gemini API 호출 실패: ${(e as Error).message}`);
      throw new AssistantError(FAILED);
    }
    if (!res.ok) {
      this.log.error(`Gemini API 오류 응답: ${await res.text().catch(() => '')}`);
      throw new AssistantError(FAILED);
    }
    try {
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text != null ? String(text) : FALLBACK_REPLY;
    } catch (e) {
      this.log.error(`Gemini 응답 파싱 실패: ${(e as Error).message}`);
      return FALLBACK_REPLY;
    }
  }
}
