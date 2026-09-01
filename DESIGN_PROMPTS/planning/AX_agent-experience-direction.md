# AX(Agent Experience) — AI 에이전트 매개 시나리오 방향 탐색
> 전략 탐색 문서 | 2026-09-01 | PM: jtyang0227@gmail.com
>
> UX가 사람 사용자를 위한 설계라면,
> AX는 AI 에이전트(Claude, ChatGPT, Perplexity 등)가 매개자가 되는 시나리오를 위한 설계다.

---

## 배경: 왜 지금 이 고민인가

이 세션에서 `mcp-server/`(happiness-mcp-server)가 완성됐다. Claude Desktop 등 MCP 클라이언트가 Happiness 플랫폼의 공개 데이터를 인증 없이 읽어갈 수 있는 읽기 전용 서버다.

도구 5종: `happiness_search_photos`, `happiness_get_photo`, `happiness_get_portfolio`, `happiness_get_portfolio_config`, `happiness_list_series`

이것이 의미하는 바: **사람이 포트폴리오를 직접 방문하는 것 외에, AI 에이전트가 "이 작가는 어떤 사람인가"를 판단하고 사람에게 추천하는 경로가 생겼다.** 이 경로에서 무엇이 읽히고 무엇이 읽히지 않는지가 이제 중요한 설계 결정이 됐다.

---

## 1. 지금 MCP 도구가 무엇을 반환하는가 — 코드 기반 현황 분석

### `happiness_get_portfolio` 실제 반환 필드 (`mcp-server/src/tools/portfolio.ts` 기준)

```json
{
  "member": {
    "member_id": number,
    "name": string,
    "profile_name": string,
    "bio": string | null,
    "location": string | null,
    "specialties": string | null,
    "website_url": string | null,
    "joined_at": string
  },
  "photo_count": number,
  "follower_count": number,
  "following_count": number,
  "total_likes": number,
  "photos": [{ id, title, genre, color_mood, likes, image_url }],
  "series": [{ id, title, description, photo_count }]
}
```

### `happiness_search_photos` 실제 반환 필드 (`mcp-server/src/tools/photos.ts` 기준)

```json
{
  "id": number,
  "title": string,
  "author": string,
  "author_member_id": number,
  "author_profile_name": string,
  "genre": string,
  "color_mood": string,
  "likes": number,
  "image_url": string,
  "created_at": string
}
```

### 에이전트가 판단할 수 없는 것 (현재 Gap)

AI 에이전트가 "이 작가가 신뢰할만한가"를 판단하려면 어떤 데이터가 필요한가:

| 필요한 신뢰 신호 | 데이터 존재 여부 | MCP 노출 여부 | 비고 |
|-----------------|-----------------|----------------|------|
| 완료된 촬영 건수 | 있음 (`Booking.CONFIRMED`) | **없음** | 가장 강력한 신뢰 신호 |
| 클라이언트 승인 납품 건수 | 있음 (`DeliverySet.APPROVED`) | **없음** | |
| 고객 추천사 | 있음 (`Testimonial`) | **없음** | |
| 별점 평균 | 없음 (하드코딩 5점) | **없음** | |
| 언론 소개 / 수상 | 있음 (`PressFeature`, `Achievement`) | **없음** | |
| 함께한 브랜드 | 있음 (`ClientBrand`) | **없음** | |
| 팔로워 수 | 있음 | **있음** | |
| 좋아요 총수 | 있음 | **있음** | |
| Verified 배지 | 없음 | 없음 | 기능 자체 미구현 |
| 응답률/평균 응답 시간 | 없음 | 없음 | |
| 신고 이력 없음 | 있음 (`Report`) | **없음** | |

**핵심 문제**: 현재 에이전트가 읽을 수 있는 신뢰 신호는 `follower_count`와 `total_likes`뿐이다. 이 둘은 조작 가능성이 있는 허영 지표에 가깝다. 에이전트가 "이 작가는 신뢰할 만합니다"라고 말하기 위한 구조화된 근거가 없다.

---

## 2. 핵심 문제의식: Machine-Legible Trust Signals

UX에서 "신뢰 배지"가 사람의 시각적 판단을 돕는 것처럼, AX에서는 에이전트가 구조화된 JSON 필드로 신뢰를 **읽고 추론**할 수 있어야 한다.

현재 `TestimonialsSection.jsx`의 별점은 사람 눈에는 보이지만 에이전트에게는 없는 것이나 마찬가지다. HTML을 스크레이핑하지 않는 한 에이전트가 "이 작가의 고객 평점은 4.7점입니다"라고 말할 수 없다.

### 에이전트가 "이 작가를 추천합니다"라고 말할 수 있으려면

에이전트의 추천 판단은 도구가 반환하는 JSON 데이터에만 의존한다. 따라서 신뢰 신호가 구조화된 필드로 노출되지 않으면, 에이전트는 좋아요 수와 팔로워 수로만 추천 판단을 한다. 이는 허영 지표 기반 추천이다.

**도달해야 할 상태**: `happiness_get_portfolio` 응답에 아래 필드가 추가될 때 에이전트는 더 근거 있는 추천을 할 수 있다:

```json
{
  "trust_signals": {
    "completed_bookings": 23,
    "approved_deliveries": 18,
    "average_rating": 4.8,
    "review_count": 15,
    "verified_reviews": 12,
    "press_features_count": 3,
    "achievements_count": 2
  }
}
```

이 설계는 `PLANNING_photographer-credibility-platform.md`의 방향 A/B와 직접 연결된다. 사람 UI에서 신뢰 신호를 구축하면서 동시에 에이전트가 읽을 수 있는 구조로 설계해야 한다.

---

## 3. AX 최적화 — SEO처럼 설계가 필요하다

검색 엔진은 키워드와 링크 구조를 파싱한다. AI 에이전트는 구조화된 데이터와 명확한 텍스트를 파싱한다.

### 3.1 현재 AX 약점 — 텍스트 신호 모호성

`member.specialties`가 쉼표 구분 문자열(`"웨딩,포트레이트,상업광고"`)로 반환된다. 에이전트가 "웨딩 사진을 잘 찍는 작가 추천해줘"라는 요청에 응답할 때, specialties 파싱은 가능하지만 이 작가가 실제로 웨딩에 특화됐다는 **구조화된 확신**을 줄 수 없다.

**개선 방향**:
- `specialties`를 배열(`["웨딩", "포트레이트"]`)로 반환하거나 MCP 도구에서 파싱해서 배열로 제공
- `genre`와 `specialties`를 연결: 작가 전문분야와 실제 업로드 사진의 장르 분포가 일치하는지 에이전트가 확인할 수 있으면 신뢰도 올라감

### 3.2 "에이전트가 인용하기 좋은 한 줄" 설계

현재 `bio`는 자유 형식 텍스트다. 에이전트가 작가를 소개할 때 bio 전체를 그대로 인용하거나 임의로 요약한다. 임의 요약은 의미 왜곡 위험이 있다.

**가설**: `tagline`이라는 짧은 필드(50자 이하)를 `member` 응답에 추가하면, 에이전트가 "이 작가는 [tagline]입니다"라고 정확하게 인용할 수 있다. 실제로 `Member` 엔티티에 `portfolioTaglines TEXT` 컬럼이 이미 있다(`CLAUDE.md` 확인). 이것을 MCP 응답에 포함시키는 것이 첫 번째 AX 최적화 액션이 될 수 있다.

### 3.3 schema.org 구조화 데이터 — AX와 SEO 동시 효과

현재 `PortfolioPage.jsx`에 SEO 메타태그가 동적으로 주입된다(라인 127-167). `og:title`, `og:description`, `og:image` 등. 그러나 `schema.org/Person`이나 `schema.org/CreativeWork` 마크업은 없다.

**가설**: PortfolioPage에 `<script type="application/ld+json">` 블록으로 schema.org/Person 마크업을 추가하면:
- 검색 엔진이 구조화된 방식으로 작가를 인덱싱
- LLM이 웹 검색을 통해 이 플랫폼의 작가를 인용할 때 더 정확한 정보 제공
- Perplexity, Bing AI 같은 에이전트에서도 포트폴리오 데이터를 올바르게 파싱

이것은 MCP 서버와는 별개 경로이며, MCP를 지원하지 않는 에이전트 생태계(GPT Actions, Gemini Extensions)에서도 동작한다.

---

## 4. 에이전트 신뢰 전이 문제

에이전트가 "이 작가를 추천합니다"라고 말할 때, **그 신뢰는 에이전트 자신의 신뢰에서 전이된다.**

사용자가 "Claude가 추천한 작가니까 믿을 수 있겠지"라고 생각한다면, Claude는 그 추천의 근거가 되는 데이터의 정확성에 암묵적으로 책임을 진다. 이것은 에이전트 생태계에서 데이터 품질이 특히 중요한 이유다.

### 4.1 조작 가능한 데이터가 에이전트를 오염시킨다

현재 구조에서 만약 `testimonials`가 MCP로 노출된다면: 에이전트가 "이 작가는 고객 추천사가 많습니다"라고 말할 수 있다. 그런데 그 추천사가 작가 본인이 작성한 미검증 텍스트라면, 에이전트가 가짜 신뢰를 증폭시키는 도구가 된다.

**원칙**: MCP로 노출하는 신뢰 신호는 `PLANNING_photographer-credibility-platform.md`의 "가짜 신뢰 방지 원칙"을 그대로 적용해야 한다. 즉, **에이전트가 읽는 신뢰 신호는 조작 불가능한 플랫폼 내부 데이터(완료된 예약, 승인된 납품, verified 후기)에만 기반**해야 한다.

미검증 추천사(`verified=false`)는 MCP 응답에서 카운트에 포함시키지 않거나 별도 표시한다.

### 4.2 에이전트가 요약·왜곡할 위험 줄이기

에이전트는 데이터를 자체적으로 해석하고 요약한다. "팔로워 수 1,200명, 좋아요 총수 8,000개"를 받으면 에이전트가 이것을 "인기 있는 작가"라고 프레이밍할 수 있다. 실제로는 그 수치가 무엇을 의미하는지 맥락이 다를 수 있다.

**설계 접근**: 에이전트가 임의 해석하기 어렵도록 수치에 맥락을 붙여 반환한다:
- 단순 `follower_count: 1200` 대신 → MCP 응답에 추가 가능: `"data_note": "follower/like counts reflect peer engagement on this platform, not independently verified"`
- 이는 에이전트가 "인기도" 해석 시 플랫폼의 맥락을 함께 인용하도록 유도

---

## 5. 읽기 전용 vs. 쓰기 권한 확장 전략 질문

현재 MCP 서버는 완전한 읽기 전용이다(`mcp-server/src/services/apiClient.ts`가 구조적으로 GET만 지원). 이것은 의도적 설계다.

### 5.1 쓰기 확장을 고려할 시나리오

미래 시나리오: 에이전트가 사용자를 대신해 작가에게 촬영 문의를 보내거나 예약 요청을 한다.

예: "Claude, 웨딩 사진 작가 찾아줘" → Claude가 작가를 검색하고 → "이 작가에게 문의 보낼까요?" → 사용자 확인 → Claude가 `POST /api/inquiry`를 호출

**잠재적 가치**:
- 사용자 마찰 극적 감소 (포트폴리오 방문 없이 문의 가능)
- AI 에이전트가 플랫폼의 트래픽 채널이 됨

### 5.2 쓰기 확장의 리스크

| 리스크 | 구체 시나리오 | 필요한 대응 |
|--------|--------------|------------|
| 스팸/오남용 | 에이전트가 대량 문의 자동 발송 | Rate limit (에이전트 토큰 기반), 작가당 문의 1일 1건 제한 |
| 사칭 | 에이전트가 다른 사람인 척 문의 | 에이전트 행동임을 명시하는 필드 (`agent_initiated: true`), JWT 인증 필수 |
| Human-in-the-loop 부재 | 사용자 확인 없이 예약 완료 | MCP 쓰기 도구는 반드시 "사용자 최종 확인" 단계를 포함해야 함 (MCP의 confirmation 패턴 활용) |
| 계약 책임 | 에이전트가 예약 확정 → 사용자가 "나는 허락 안 했다" | 쓰기 작업은 Draft 상태로만, 최종 확정은 사람이 직접 앱에서 |

**현재 권고**: 쓰기 확장은 P2 이후. 지금은 읽기 전용을 유지하고 신뢰 데이터 품질을 먼저 올리는 것이 우선. 에이전트가 잘못된 데이터로 잘못된 추천을 하는 것이 쓰기 권한 오남용보다 먼저 해결해야 할 문제다.

---

## 6. 다른 에이전트 생태계 고려

현재 MCP는 Claude Desktop 등 MCP 프로토콜을 지원하는 클라이언트 전용이다. 그러나 AI 에이전트 생태계는 MCP만이 아니다.

| 생태계 | 프로토콜/방식 | 대응 전략 |
|--------|-------------|----------|
| Claude Desktop/Code | MCP (현재 구현됨) | happiness-mcp-server |
| OpenAI GPT Actions | OpenAPI spec + HTTPS 엔드포인트 | 백엔드 공개 API가 이미 REST이므로 OpenAPI spec 생성만으로 대응 가능 |
| Google Gemini Extensions | 유사한 tool-calling 방식 | OpenAPI spec 재사용 가능 |
| Perplexity/Bing AI | 웹 검색 기반 | schema.org 마크업 (3.3절 참조) |
| LangChain/AutoGen 등 | REST API 직접 호출 | 현재 공개 API로 이미 접근 가능 |

**권고**: 단일 OpenAPI spec 파일(`openapi.yaml` 또는 Springdoc 자동 생성)을 관리하면 MCP 도구 정의와 GPT Actions 스키마를 공통 소스에서 관리할 수 있다. 현재 백엔드에 Springdoc 설정이 있다면 즉시 `/v3/api-docs` 엔드포인트가 이를 커버한다.

**핵심 원칙**: 에이전트 생태계마다 어댑터를 별도로 만들지 않는다. 공개 REST API + 명확한 스키마를 잘 설계하면 어느 생태계든 대응 가능하다.

---

## 7. 구체적 액션 아이템 (다음 라운드 시작 시 검토)

아래는 "지금 당장 구현을 시작한다면" 가장 먼저 검토할 항목들이다. 확정 로드맵이 아닌 우선순위 가설이다.

### 액션 1 — trust_signals 필드를 MCP 응답에 추가 (P0)
`PLANNING_photographer-credibility-platform.md` 방향 A(completedBookings, approvedDeliveries 공개)와 동시에 진행.
- `PortfolioController`에 completedBookings/approvedDeliveries 추가
- `mcp-server/src/tools/portfolio.ts`의 `happiness_get_portfolio` 도구 응답에 `trust_signals` 객체 추가
- 변경 파일: `mcp-server/src/tools/portfolio.ts`, `mcp-server/src/types.ts`

**why first**: 현재 에이전트가 신뢰 판단에 사용할 수 있는 조작 불가능한 데이터가 전혀 없다. 이것이 AX에서 가장 큰 공백이다.

### 액션 2 — member.specialties 배열 파싱 (P0, 30분 작업)
`mcp-server/src/tools/portfolio.ts`의 `happiness_get_portfolio` 도구에서 `specialties` 쉼표 문자열을 배열로 변환:
```typescript
specialties: data.member.specialties
  ? data.member.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
  : []
```
에이전트가 "웨딩 전문 작가"를 정확하게 필터링할 수 있게 된다.

### 액션 3 — schema.org/Person 마크업 추가 (P1)
`frontend/src/pages/PortfolioPage.jsx`의 SEO useEffect에 `<script type="application/ld+json">` 블록 추가:
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "{member.name}",
  "jobTitle": "사진작가",
  "description": "{member.bio}",
  "url": "https://app.example.com/portfolio/{profileName}",
  "image": "{member.avatarUrl}",
  "knowsAbout": ["{specialties 배열}"]
}
```
MCP를 지원하지 않는 에이전트(웹 검색 기반)가 정확한 정보를 인용할 수 있다.

### 액션 4 — MCP 도구 설명에 trust_signals 문서화 (P1)
`happiness_get_portfolio` 도구의 description 텍스트에 신뢰 신호 필드 설명 추가. 에이전트가 어떤 필드를 어떤 의미로 해석해야 하는지 명시적으로 안내해야 임의 해석을 줄일 수 있다.

### 액션 5 — OpenAPI spec 공개 엔드포인트 확인 (P1)
`backend/src/main/resources/application.yml`에서 Springdoc 설정 확인. `/v3/api-docs`가 이미 동작 중이면 GPT Actions 연동은 spec URL 하나만 제공하면 된다. 현재 상태 확인 후 공개 엔드포인트 문서화.

---

## 8. 열린 질문들 (이 문서가 탐색적인 이유)

1. **에이전트 매개 추천이 실제로 발생할 규모는 언제인가?** — MCP 사용자가 충분히 많지 않으면 AX 최적화의 ROI가 낮다. 그러나 일단 설계가 잘못되면 나중에 고치기 어렵다. 언제부터 선제적으로 투자해야 하는가?

2. **작가가 "에이전트에게 추천됐다"는 것을 어떻게 알 수 있는가?** — 현재 analytics는 PORTFOLIO_VIEW 이벤트를 추적하지만 에이전트가 API를 통해 조회한 것과 사람이 직접 방문한 것을 구분하지 못한다. `User-Agent` 기반 에이전트 트래픽 분리가 필요한가?

3. **신뢰 신호를 MCP로 노출하면 작가들이 이것을 "검색 최적화" 대상으로 인식하고 행동을 바꾸는가?** — "완료된 예약 수가 MCP에 노출된다"는 것을 알면 더 많은 예약을 확정하려 노력할 것이다. 이는 긍정적 인센티브인가, 아니면 지표 게임화 위험인가?

4. **에이전트가 잘못 추천했을 때 책임은 누구에게 있는가?** — 플랫폼은 데이터를 제공했고 에이전트는 그것을 해석했다. 사용자는 에이전트를 믿었다. 클레임 발생 시 책임 구조를 서비스 이용약관에 명시해야 하는가?

5. **"에이전트 접근"을 작가가 opt-out할 수 있어야 하는가?** — "내 포트폴리오를 AI 에이전트가 읽어가는 것을 원하지 않는다"는 요청이 올 수 있다. `robots.txt` 수준의 에이전트 접근 제어 정책이 필요한가? MCP 서버에서 `publicProfile=false` 작가를 이미 필터링하므로 일부 대응은 되어 있다.

---

## 참고: 현재 MCP 서버 구조 요약

```
mcp-server/
├── src/
│   ├── index.ts          — MCP 서버 진입점, 도구 등록
│   ├── constants.ts       — API URL 등 상수
│   ├── types.ts           — 백엔드 응답 타입 정의 (PhotoSummary, PortfolioResponse 등)
│   ├── services/
│   │   └── apiClient.ts   — GET 전용 axios 클라이언트
│   └── tools/
│       ├── photos.ts      — happiness_search_photos, happiness_get_photo
│       └── portfolio.ts   — happiness_get_portfolio, happiness_get_portfolio_config, happiness_list_series
├── eval/
│   ├── seed.mjs           — 평가용 시드 데이터 생성 스크립트
│   └── evaluation.xml     — mcp-builder 형식 QA 10쌍
└── README.md
```

**설계 원칙 (현재 구현 기준)**: 공개 GET 엔드포인트만 노출. JWT 불필요. 쓰기/삭제 엔드포인트는 구조적으로 접근 불가. `apiClient.ts`가 GET만 지원하도록 제한.

---

## 관련 문서

- `DESIGN_PROMPTS/planning/PLANNING_photographer-credibility-platform.md` — 신뢰 신호 전략 (이 문서의 사람 UX 쌍둥이)
- `DESIGN_PROMPTS/planning/19_PORTFOLIO_META_SEO.md` — SEO 메타태그 기존 기획
- `mcp-server/eval/evaluation.xml` — MCP 도구 QA 기준
- `mcp-server/README.md` — MCP 서버 사용법 및 Claude Desktop 연동 방법
