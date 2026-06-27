# 32 — 세계 수준 포트폴리오: 글로벌 레퍼런스 분석 & 고도화 기획서

> 작성일: 2026-06-26  
> 목표: 글로벌 최고 수준 사진작가 포트폴리오 플랫폼이 제공하는 기능/UX 전면 분석 →  
> Happiness 포트폴리오 페이지를 세계 수준으로 끌어올리는 구체적 구현 계획  
> 선행 기획: 11번(포트폴리오 재설계) · 15번(슬라이드쇼) · 19번(SEO) · 28번(템플릿 시스템)

---

## 1. 글로벌 레퍼런스 분석

### 1-1. Format.com (포토그래퍼 전용 포트폴리오 빌더)

**핵심 철학**: "Professional photographer's home on the internet"

| 기능 | 세부 내용 |
|------|---------|
| **15+ 템플릿** | 각 템플릿이 분위기/스타일이 완전히 다름 (Minimal, Bold, Journal, Slideshow…) |
| **Client Galleries** | 비밀번호 보호, 다운로드 허가제, 무제한 사진 |
| **Print Shop 연동** | WHCC, Bay Photo, Miller's 등 미국 인쇄소 API 연결 → 방문자가 바로 구매 |
| **E-Commerce** | 디지털 다운로드 판매, 가격 설정, 쿠폰 |
| **Blog / Journal** | SEO 포스팅 → 검색 유입 |
| **Pricing Page** | 촬영 패키지 가격 공개 → 문의 전 필터링 |
| **Custom Domain** | `yourname.com` 연결 |
| **Mobile App** | iOS/Android에서 바로 업로드 |

**배울 점**:
- 포트폴리오가 비즈니스 도구여야 함 → **수익 창출 연결고리**가 핵심
- Pricing 섹션이 있으면 문의 질이 높아짐 (예산 맞는 클라이언트만 연락)
- Client Gallery ≠ Delivery Portal → 더 정교한 승인 워크플로우 필요

---

### 1-2. Adobe Portfolio (+ Behance 연동)

**핵심 철학**: "Make a beautiful portfolio in minutes"

| 기능 | 세부 내용 |
|------|---------|
| **Lightroom 동기화** | Lightroom의 앨범 → 포트폴리오 자동 업데이트 |
| **Behance 배지** | "Adobe Verified" 크리에이터 표시 |
| **비밀번호 보호 페이지** | 페이지 단위 잠금 |
| **Adobe Fonts 통합** | 400+ 폰트 무제한 사용 |
| **커스텀 HTML/CSS** | 고급 사용자 자유도 |
| **커버 스토리** | 선택된 작품이 Behance 메인에 노출 |

**배울 점**:
- 포트폴리오와 커뮤니티(SNS)가 통합되면 노출이 증폭됨
- **폰트 선택권** → 작가 브랜딩에 핵심적 역할
- 페이지 단위 비밀번호 → 우리의 시리즈 단위 보호와 연계 가능

---

### 1-3. SmugMug (상업적 사진작가용 플랫폼)

**핵심 철학**: "Sell your photos the way you want"

| 기능 | 세부 내용 |
|------|---------|
| **Print Store** | 25+ 인쇄 파트너, 25-85% 마진 설정 |
| **Watermarking** | 자동 워터마크 (다운로드 방지) |
| **Client Proofing** | 클라이언트가 사진에 ♥ 표시 → 작가에게 최종 선택 리스트 전달 |
| **가격 리스트** | 사진 크기별/파일 형식별 가격 설정 |
| **쿠폰 코드** | 할인 쿠폰 발급 |
| **Statistics** | 방문자/다운로드/판매 통계 |
| **갤러리 폴더 트리** | 중첩 폴더 구조 |

**배울 점**:
- **프린트 판매**는 사진작가의 중요한 수익원 → 현재 Happiness에 없음
- Client Proofing은 우리의 Delivery Portal에서 이미 부분 구현됨 → 더 고도화 필요
- 워터마크 → 지적 재산권 보호 기능 필요

---

### 1-4. Pixpa (인도산, 글로벌 사진작가 포트폴리오)

**핵심 철학**: "All-in-one website builder for photographers and creatives"

| 기능 | 세부 내용 |
|------|---------|
| **갤러리 5종** | Thumbnail Grid / Slideshow / Mosaic / Justified / Left-thumbnail |
| **예약 통합** | Calendly 연동 또는 내장 예약 |
| **포트폴리오 + 블로그** | 둘을 한 사이트에서 관리 |
| **SEO 도구** | 페이지별 meta title/description 직접 입력 |
| **팝업 기능** | 뉴스레터 수집, 쿠폰 안내 |
| **Press Logos** | "As seen in" 섹션 기본 제공 |

**배울 점**:
- **Press/Publications 섹션**이 사진작가에게 필수적인 신뢰 요소
- **뉴스레터 수집** → 재방문 유도 채널
- 갤러리 타입 5종 선택 → 28번 템플릿 시스템과 직접 연계

---

### 1-5. Nick Brandt Photography (nickbrandt.com) — 예술적 포트폴리오

**핵심 철학**: 사진이 메시지를 전달하는 예술적 선언문

| 요소 | 분석 |
|------|------|
| **Hero** | 순수 흑백 풀블리드 이미지, 텍스트 거의 없음 |
| **내러티브 텍스트** | 사진 섹션 사이에 작가 에세이 삽입 |
| **Print 구매** | 각 사진마다 "Available as Print" → 인쇄소 연결 |
| **Exhibition Archive** | 전시회 이력 (날짜/장소/제목) |
| **Press Section** | The Guardian, National Geographic 등 언론 기사 링크 |
| **Foundation** | 비영리 활동 별도 섹션 |
| **Newsletter** | 단순 이메일 입력 폼 (Mailchimp 연동) |

**배울 점**:
- **전시 이력/수상 경력** → 작가의 공식적 실력 증명
- **언론 기사 링크** → 외부 신뢰도 레버리지
- 에세이/텍스트 섹션 → 단순 사진 나열을 넘는 **스토리텔링**

---

### 1-6. Rankin Photography (rankinphotography.co.uk) — 에디토리얼/패션

**핵심 철학**: 카테고리별 전문성, 에이전트 중심 비즈니스

| 요소 | 분석 |
|------|------|
| **카테고리 네비게이션** | Fashion / Advertising / Portraiture / Film / Personal |
| **에이전시 연락처** | "For commercial enquiries contact [에이전시명]" → 중간자 모델 |
| **블랙 배경** | 사진이 돋보이는 미술관 느낌 |
| **그리드 밀도** | 화면에 최대한 많은 사진 → 포트폴리오 볼륨 과시 |
| **Exhibition** | 전시 섹션 (장소/날짜) |
| **모바일 최적화** | 하단 탭바 없음, 한 컬럼 스크롤 |

**배울 점**:
- **카테고리(장르) 기반 섹션 분리** → GENRE 필터보다 강한 구조
- 에이전시 연락처 모델 → 프리미엄 작가는 직접 연락 대신 에이전시 경유

---

### 1-7. Brandon Woelfel (brandonwoelfel.com) — 개인 브랜드 강조

**핵심 철학**: 미적 일관성이 최고의 셀프 브랜딩

| 요소 | 분석 |
|------|------|
| **네온/야간 미학** | 모든 사진이 동일한 무드 → 강력한 브랜드 아이덴티티 |
| **"Work" 섹션** | Client Work vs. Personal Work 분리 |
| **Instagram 피드** | 하단에 실시간 Instagram 피드 삽입 |
| **Location 정보** | "Based in NYC, Available Worldwide" |
| **언론 기사** | GQ, Vogue 등 커버 이미지 |
| **커스텀 커서** | 마우스 커서 → 작은 빛나는 점 |

**배울 점**:
- **커스텀 커서** → 포트폴리오에서 몰입감 극대화
- **Personal vs. Commercial 분리** → 사용자 유형별 콘텐츠 제공
- **Instagram 피드** → 최신 활동 자동 업데이트

---

### 1-8. VSCO (vsco.co) — 커뮤니티형 미니멀 포트폴리오

**핵심 철학**: "Create and discover"

| 요소 | 분석 |
|------|------|
| **단순 그리드** | 3컬럼 정방형 그리드, 아무 설명 없음 |
| **Journal** | 블로그 형식의 스토리텔링 포스팅 |
| **프리셋 판매** | 작가의 시그니처 필터 판매 → 부가 수익 |
| **커뮤니티 기능** | 팔로우, 재게시 |
| **VSCO Film** | 아날로그 필름 에뮬레이션 프리셋 |

**배울 점**:
- **프리셋/LUT 판매** → 작가의 보정 스타일 자체가 상품이 될 수 있음
- Journal 형식 → 블로그 없이도 깊은 스토리 전달 가능

---

## 2. 현재 Happiness 포트폴리오 Gap 분석

### 2-1. 기능 Gap

| 카테고리 | 기능 | 글로벌 표준 | Happiness 현재 | 우선순위 |
|---------|------|-----------|--------------|---------|
| **비즈니스** | 촬영 패키지 가격 표시 | ✅ Format, Pixpa | ❌ 없음 | P1 |
| **비즈니스** | 프린트 판매 | ✅ SmugMug, Nick Brandt | ❌ 없음 | P2 |
| **신뢰 구축** | Press/언론 기사 섹션 | ✅ 모든 상위 사이트 | ❌ 없음 | P1 |
| **신뢰 구축** | 클라이언트 추천사(Testimonial) | ✅ Format, Pixpa | ❌ 없음 | P1 |
| **신뢰 구축** | 클라이언트 로고 월 | ✅ Pixpa, Rankin | ❌ 없음 | P1 |
| **신뢰 구축** | 수상/전시 이력 | ✅ Nick Brandt, Rankin | ❌ 없음 | P1 |
| **스토리텔링** | 에세이/텍스트 섹션 | ✅ Nick Brandt, SCRL | ❌ 없음 | P1 |
| **스토리텔링** | 블로그/저널 | ✅ Format, Pixpa, VSCO | ❌ 없음 | P2 |
| **참여/전환** | 뉴스레터 구독 폼 | ✅ Format, Nick Brandt | ❌ 없음 | P1 |
| **참여/전환** | 소셜 공유 버튼 | ✅ 대부분 | ⚠️ 단일 사진만 | P1 |
| **참여/전환** | Instagram 피드 | ✅ Brandon Woelfel | ❌ 없음 | P2 |
| **참여/전환** | QR 코드 생성 | - | ❌ 없음 | P1 |
| **UX/인터랙션** | 커스텀 커서 | ✅ Brandon Woelfel, Cargo | ❌ 없음 | P2 |
| **UX/인터랙션** | 스크롤 진행 바 | ✅ 다수 | ❌ 없음 | P2 |
| **UX/인터랙션** | 이미지 블러업 로딩 | ✅ Format, Adobe | ❌ 없음 | P1 |
| **UX/인터랙션** | 사진 내 텍스트 오버레이 | ✅ Nick Brandt, Split | ❌ 없음 | P1 |
| **접근성** | 키보드 갤러리 내비 | ✅ 상위 사이트 | ⚠️ 슬라이드쇼만 | P1 |
| **SEO/공유** | OG 태그 동적 설정 | ✅ 필수 | ⚠️ 정적만 | P0 |
| **SEO/공유** | 포트폴리오 QR 코드 | - | ❌ 없음 | P1 |
| **SEO/공유** | Schema.org JSON-LD | ✅ 고급 사이트 | ❌ 없음 | P2 |
| **콘텐츠 보호** | 워터마크 | ✅ SmugMug | ❌ 없음 | P2 |
| **콘텐츠 보호** | 우클릭/드래그 방지 | ✅ 상위 사이트 | ❌ 없음 | P2 |
| **커스터마이즈** | 폰트 선택 (3종+) | ✅ Adobe, Format | ❌ 없음 | P2 |
| **커스터마이즈** | 배경색 커스텀 | ✅ Format, Pixpa | ❌ 없음 | P1 |
| **커스터마이즈** | 악센트 컬러 | ✅ Format | ❌ 없음 | P2 |

### 2-2. 콘텐츠 구조 Gap

현재 Happiness PortfolioPage의 섹션 구조:
```
Hero (80vh) → Bio → 무드 필터 → Masonry 갤러리 → 시리즈 → Footer CTA
```

글로벌 상위 사이트의 평균 구조:
```
Hero (100vh) → Stats → Bio/Story → [선택적: 텍스트 섹션] 
→ 카테고리 필터 + 갤러리 → 클라이언트 로고 월 → 추천사 
→ Press/Awards → 가격/패키지 → 예약 CTA → 뉴스레터 → Footer
```

**핵심 차이**: 신뢰 구축(로고·추천사·언론) + 전환 최적화(가격·예약·뉴스레터) 섹션이 부재

---

## 3. 기능 기획 — P0/P1/P2 분류

### 3-0. P0 — 즉시 수정 (현재 포트폴리오 사용에 블로커)

#### ① 동적 OG/Twitter 메타 태그 (19번 기획 기반)

```
현재: 모든 포트폴리오 URL이 동일한 메타 태그 → SNS 공유 시 개인화 없음
목표: /portfolio/kim 공유 → 카카오톡에 "김작가 웨딩사진" 썸네일 표시
```

구현: `hooks/usePortfolioMeta.js` → PortfolioPage에서 `useEffect`로 document.head 업데이트

---

### 3-1. P1 — 신규 섹션 추가 (1~2주 내)

#### ① 추천사(Testimonials) 섹션

**사용자 스토리**: 방문자가 작가의 실력과 작업 방식을 신뢰하고 싶다.

```
┌─────────────────────────────────────────────┐
│   💬  클라이언트 후기                          │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │                 │  │                 │   │
│  │ "결혼식 날의 모든  │  │ "상업 광고 촬영을  │   │
│  │  감동을 완벽하게   │  │  진행했는데 제품이  │   │
│  │  담아주셨어요."   │  │  훨씬 돋보였어요." │   │
│  │                 │  │                 │   │
│  │  — 김○○, 웨딩    │  │  — ○○브랜드 담당  │   │
│  │    2025.03      │  │    2025.01      │   │
│  └─────────────────┘  └─────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**데이터 모델**:
```sql
CREATE TABLE IF NOT EXISTS testimonials (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL,
  client_name  VARCHAR(100) NOT NULL,
  client_role  VARCHAR(100),           -- "웨딩 클라이언트", "브랜드 담당자"
  content      TEXT NOT NULL,
  shoot_date   VARCHAR(20),            -- "2025.03"
  is_featured  BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**API**:
- `GET /api/portfolio/:profileName/testimonials` — 공개 (정렬: is_featured DESC, display_order ASC)
- `POST /api/testimonials` — 작가 본인만 (직접 입력)
- `PUT /api/testimonials/:id` — 수정
- `DELETE /api/testimonials/:id` — 삭제

---

#### ② Press / 언론 기사 섹션

**사용자 스토리**: 방문자가 "이 작가가 어느 매체에 실렸는지" 보고 신뢰도를 판단한다.

```
┌─────────────────────────────────────────────┐
│   📰  언론 & 출판                             │
│                                             │
│  [Vogue Korea 로고]  [GQ Logo]  [Dazed Logo] │
│  [서울경제 로고]     [The Korea Herald Logo]  │
│                                             │
│  ────────────────────────────────────────   │
│                                             │
│  • Vogue Korea — "2025 패션 사진작가 10인"   │
│    vogue.co.kr → [링크 아이콘]               │
│                                             │
│  • GQ Korea — "도시의 빛을 담다"             │
│    gq.co.kr → [링크 아이콘]                  │
│                                             │
└─────────────────────────────────────────────┘
```

**데이터 모델**:
```sql
CREATE TABLE IF NOT EXISTS press_features (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  publication   VARCHAR(100) NOT NULL,  -- "Vogue Korea"
  title         VARCHAR(200),           -- 기사 제목
  url           VARCHAR(500),           -- 기사 URL
  published_date VARCHAR(20),           -- "2025.03"
  logo_url      VARCHAR(500),           -- 매체 로고 이미지 URL
  display_order  INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

#### ③ 수상/전시 이력 섹션 (Awards & Exhibitions)

```
┌─────────────────────────────────────────────┐
│   🏆  수상 & 전시                             │
│                                             │
│  수상                                        │
│  • 2025  한국사진협회 신인상 — 은상            │
│  • 2024  Nikon Photo Contest — 입선          │
│                                             │
│  전시                                        │
│  • 2025.05  Solo Exhibition "빛의 결"         │
│             갤러리 현대, 서울                   │
│  • 2024.11  Group Show "Urban Silence"      │
│             Artsy Gallery, New York         │
└─────────────────────────────────────────────┘
```

**데이터 모델**:
```sql
CREATE TABLE IF NOT EXISTS achievements (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL,
  type         VARCHAR(20) NOT NULL,   -- 'AWARD' | 'EXHIBITION' | 'PUBLICATION'
  title        VARCHAR(200) NOT NULL,
  organizer    VARCHAR(100),           -- 수여 기관 / 갤러리명
  location     VARCHAR(100),
  year_month   VARCHAR(7),             -- "2025.05" (YYYY.MM)
  url          VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

#### ④ 촬영 패키지 가격 표시 (Pricing Section)

**사용자 스토리**: 클라이언트가 문의 전에 예산이 맞는지 확인하고 싶다.

```
┌────────────────────────────────────────────────────┐
│   촬영 패키지                                         │
│                                                    │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ BASIC      │  │  STANDARD ✦  │  │ PREMIUM    │  │
│  │            │  │   인기        │  │            │  │
│  │ ₩350,000   │  │  ₩650,000    │  │ ₩1,200,000 │  │
│  │            │  │              │  │            │  │
│  │ • 2시간    │  │  • 4시간      │  │ • 전일 촬영  │  │
│  │ • 30장 보정 │  │  • 80장 보정  │  │ • 200장 보정 │  │
│  │ • 온라인   │  │  • USB 납품   │  │ • 앨범 제작  │  │
│  │   납품     │  │  • 1회 수정   │  │ • 2회 수정  │  │
│  │            │  │              │  │            │  │
│  │ [문의하기]  │  │  [문의하기]   │  │ [문의하기]  │  │
│  └────────────┘  └──────────────┘  └────────────┘  │
│                                                    │
│  * 최종 가격은 촬영 조건에 따라 조율될 수 있습니다.       │
└────────────────────────────────────────────────────┘
```

**데이터 모델**:
```sql
CREATE TABLE IF NOT EXISTS pricing_packages (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL,
  name         VARCHAR(100) NOT NULL,   -- "BASIC", "STANDARD", "PREMIUM"
  price        INTEGER,                  -- 원 단위 (0 = 가격 협의)
  price_label  VARCHAR(50),             -- "₩350,000" 또는 "가격 협의"
  description  TEXT,
  features     TEXT,                    -- JSON 배열: ["2시간", "30장 보정"]
  is_featured  BOOLEAN DEFAULT FALSE,   -- 인기 패키지 강조
  display_order INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

#### ⑤ 뉴스레터 구독 섹션 (Email Capture)

**사용자 스토리**: 방문자가 작가의 신작/전시 소식을 이메일로 받고 싶다.

```
┌─────────────────────────────────────────────┐
│                                             │
│    📮  새 작품 & 전시 소식 받기                │
│                                             │
│    "새 작품이 올라올 때마다 가장 먼저 받아보세요."  │
│                                             │
│    [이메일 입력              ] [구독하기]    │
│                                             │
│    주 1회 이하 발송 · 언제든 구독 취소 가능    │
│                                             │
└─────────────────────────────────────────────┘
```

**데이터 모델**:
```sql
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL,         -- 어느 작가를 구독하는가
  email        VARCHAR(255) NOT NULL,
  subscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,
  token        VARCHAR(64) UNIQUE NOT NULL,  -- 수신거부 링크용
  UNIQUE (member_id, email)
);
```

**API**:
- `POST /api/portfolio/:profileName/subscribe` — 공개 (rate limit: IP 기준 5req/min)
- `GET /api/unsubscribe?token=xxx` — 공개 (수신거부)
- `GET /api/portfolio/:profileName/subscribers` — 본인만 (구독자 목록)
- `POST /api/portfolio/:profileName/notify` — 본인만 (뉴스레터 발송)

---

#### ⑥ 포트폴리오 QR 코드

**사용자 스토리**: 작가가 오프라인 명함/전시에서 포트폴리오를 빠르게 공유하고 싶다.

```
PortfolioPage 상단 우측에 [QR 코드] 버튼 추가
클릭 → QR 코드 모달 (포트폴리오 URL을 QR로 표시)
다운로드 버튼 → PNG로 저장
```

**구현**: `qrcode` 외부 라이브러리 없이 → 백엔드에서 QR API 호출

```java
// QR 코드 생성 (외부 라이브러리 없이 SVG path 직접 생성 or Google Charts API URL 활용)
// GET /api/portfolio/:profileName/qr?size=300
// Returns: SVG or PNG 이미지
```

또는 프론트엔드에서 `https://api.qrserver.com/v1/create-qr-code/` 활용 (무료 API, 로고 추가 불가)

---

### 3-2. P2 — 중기 기능 (1개월)

#### ① 커스텀 커서 (Custom Cursor)

```jsx
// CustomCursor.jsx
// 포트폴리오 페이지에만 적용 (다크 테마)
// 기본: 12px 흰 원 (opacity 0.7)
// 이미지 위: 확대 아이콘 + "미리보기" 텍스트
// 링크/버튼 위: 더 큰 원 (24px)
// 부드러운 마우스 추적: requestAnimationFrame + LERP
```

```jsx
function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hovered, setHovered] = useState(false);
  const animRef = useRef();
  const targetRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const move = (e) => { targetRef.current = { x: e.clientX, y: e.clientY }; };
    document.addEventListener('mousemove', move);

    const lerp = (a, b, t) => a + (b - a) * t;
    const animate = () => {
      setPos(prev => ({
        x: lerp(prev.x, targetRef.current.x, 0.14),
        y: lerp(prev.y, targetRef.current.y, 0.14),
      }));
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', move);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', pointerEvents: 'none', zIndex: 9999,
      width: hovered ? 40 : 14, height: hovered ? 40 : 14,
      borderRadius: '50%',
      background: hovered ? 'transparent' : 'rgba(255,255,255,0.85)',
      border: hovered ? '1.5px solid rgba(255,255,255,0.7)' : 'none',
      transform: `translate(${pos.x - (hovered ? 20 : 7)}px, ${pos.y - (hovered ? 20 : 7)}px)`,
      transition: 'width 0.2s, height 0.2s, background 0.2s',
      mixBlendMode: 'difference',
    }} />
  );
}
```

---

#### ② 스크롤 진행 표시바 (Scroll Progress)

```jsx
// PortfolioPage 상단 고정
// 0~100% 스크롤에 따라 가로로 채워지는 1px 바
// color: primary (#5b6ef5) 또는 사진 추출 색상

function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setPct(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: `${pct}%`, height: 2,
      background: '#5b6ef5', zIndex: 200, transition: 'width 0.05s linear' }} />
  );
}
```

---

#### ③ 이미지 Blur-Up 로딩 (Base64 플레이스홀더)

```
현재: 이미지 로딩 중 → 빈 영역
목표: 이미지 로딩 중 → 블러된 낮은 해상도 이미지 표시 → 선명한 이미지로 전환

구현:
1. 백엔드: 업로드 시 20×15px 썸네일 Base64 생성 → DB 저장
2. 프론트: img 태그의 src를 Base64(즉시)로 설정 → 로드 완료 시 원본으로 교체
```

```java
// ImageProcessingUtil.java — 추가
public String generateBlurHash(BufferedImage image) {
    // 20×15로 축소 → Base64 DataURL 반환
    BufferedImage tiny = resizeImage(image, 20, 15);
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    ImageIO.write(tiny, "jpeg", baos);
    return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
}
```

```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS blur_hash VARCHAR(500);
```

---

#### ④ 사진 보호 (우클릭/드래그 방지)

```jsx
// 포트폴리오 페이지 이미지에 적용
// 드래그 시작, 우클릭 방지 → contextmenu: 'none', userSelect: 'none'
// ※ 결정: 100% 막을 수는 없음, 악의적 사용자 억제 목적
// 더 강한 보호: 이미지 위에 투명 div 레이어

const protectedImgStyle = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  pointerEvents: 'none',  // ← 실제 클릭도 막히므로 별도 오버레이 레이어 필요
};
```

---

#### ⑤ 폰트 테마 선택 (Font Theme)

작가가 포트폴리오의 폰트 스타일을 선택할 수 있다.

| 테마 | 제목 폰트 | 본문 폰트 | 분위기 |
|------|---------|---------|------|
| `modern` (기본) | 시스템 sans-serif | 시스템 sans-serif | 클린/현대적 |
| `editorial` | Georgia, serif | 시스템 sans-serif | 잡지/에디토리얼 |
| `minimal` | 'Courier New', monospace | 'Courier New' | 실험적/미니멀 |
| `elegant` | 'Palatino', serif | 'Palatino' | 우아/클래식 |

구현: `portfolioStyleJson`에 `font: 'editorial'` 저장 → PortfolioPage CSS class 분기

---

## 4. UX 패턴 — 포트폴리오 페이지 개선

### 4-1. 섹션 레이아웃 (글로벌 표준 채택)

```
현재 섹션 순서:
  Hero → Bio → 무드 필터 → Masonry 갤러리 → 시리즈 → Footer CTA

개선 섹션 순서 (전환 최적화):
  ┌──────────────────────────────────────────────┐
  │  HERO (100vh)                               │
  │  커버 이미지 + 작가명 + 전문분야               │
  │  [팔로우] [문의하기] [슬라이드쇼▶] [QR코드]   │
  ├──────────────────────────────────────────────┤
  │  STATS BAR (backdrop-blur)                  │
  │  작품 N장 · 팔로워 N · 좋아요 N              │
  ├──────────────────────────────────────────────┤
  │  BIO / STORY  (작가 철학, italic 인용)        │
  │  Location · Since · 언어                     │
  ├──────────────────────────────────────────────┤
  │  CLIENT LOGO WALL (신뢰 구축)                │
  │  로고 가로 스크롤 or 고정 3~5개               │
  ├──────────────────────────────────────────────┤
  │  GALLERY (Sticky 장르 필터)                  │
  │  CSS columns Masonry (4→3→2컬럼)             │
  ├──────────────────────────────────────────────┤
  │  SERIES SCROLL (가로 스크롤)                  │
  ├──────────────────────────────────────────────┤
  │  TESTIMONIALS (추천사 카드)                   │
  ├──────────────────────────────────────────────┤
  │  PRESS / AWARDS (언론·수상)                  │
  ├──────────────────────────────────────────────┤
  │  PRICING (선택적 — 작가가 켜고 끄는 섹션)      │
  ├──────────────────────────────────────────────┤
  │  BOOKING CTA (예약 직행 버튼)                 │
  ├──────────────────────────────────────────────┤
  │  NEWSLETTER (이메일 구독 폼)                  │
  ├──────────────────────────────────────────────┤
  │  FOOTER (SNS 링크 · 저작권)                  │
  └──────────────────────────────────────────────┘
```

---

### 4-2. Hero 섹션 강화

```
현재: 80vh, 이미지 or 다크 그라디언트, 작가명 + 전문분야 + 버튼 2개

개선:
- 높이: 100vh (첫 화면 전체)
- 영상 지원: coverVideoUrl 있으면 <video autoplay muted loop> (최대 10MB)
- 필름 그레인 텍스처: ::before pseudo (noise SVG, opacity 0.04)
  → 아날로그 사진관 느낌
- 작가명: 최대 64px, letter-spacing -0.03em
- 서브타이틀 타이핑 애니메이션:
  "웨딩 사진작가" → "포트레이트" → "상업 사진" (직군 순환)
- 하단 스크롤 힌트: 애니메이션 화살표 (↓ bounce)
```

**데이터 추가**:
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS cover_video_url VARCHAR(500);
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_taglines TEXT;
-- JSON: ["웨딩 사진작가", "포트레이트", "상업 사진"] (타이핑 순환용)
```

---

### 4-3. 갤러리 — Justified Grid 옵션 추가

Format.com/Pixpa의 "Justified Layout" — 모든 행의 높이가 같고 너비가 다름

```
현재: CSS columns masonry (세로 순서)
신규: Justified Grid (각 행이 완전히 채워짐, 사진 aspect-ratio 유지)

알고리즘:
  행 target 높이: 220px
  각 사진의 표시 너비 = (target높이 / 사진높이) × 사진너비
  하나의 행에 들어가는 사진 묶음: 누적 너비가 컨테이너 너비에 가장 근접할 때 줄 바꿈
  각 행 내 사진들: flex-grow로 행 너비 딱 맞게 늘림 (scale 없음)

장점: 같은 높이로 정렬 → 타임라인처럼 읽기 쉬움
단점: 세로가 긴 사진은 좁게 표시될 수 있음

포트폴리오 템플릿에서 "Justified" 옵션 추가
```

---

### 4-4. 모바일 UX 강화 — 터치 제스처

```
현재: 갤러리에서 탭 → 상세 이동
신규:
  - 사진 탭 → 라이트박스(PhotoModal) 즉시 열기  
  - 라이트박스 내에서 좌우 스와이프 → 이전/다음 사진
  - 위로 스와이프 → 사진 정보 패널 펼치기
  - 두 손가락 핀치 → 확대/축소 (transform scale)
  - 더블 탭 → 2배 확대
```

---

## 5. 섹션 관리 UI (포트폴리오 에디터 연계)

28번 템플릿 시스템과 연계해서, 각 섹션을 켜고 끌 수 있는 토글 UI

```
ProfilePage → 포트폴리오 설정 탭

섹션 표시/숨김:
  ☑ 추천사(Testimonials)
  ☑ 언론/수상(Press & Awards)
  ☐ 가격 패키지(Pricing)
  ☑ 뉴스레터 구독
  ☐ Instagram 피드
  ☑ Footer CTA
```

```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_sections_enabled TEXT;
-- JSON: { "testimonials": true, "press": true, "pricing": false, "newsletter": true }
```

---

## 6. 포트폴리오 공유 강화

### 6-1. 공유 목적별 버튼

```
현재: 포트폴리오 URL 복사 1개

개선:
  [🔗 링크 복사]  [📱 QR 코드]  [📤 카카오 공유]  [🐦 X(Twitter)]

각 버튼 동작:
  링크 복사: navigator.clipboard.writeText(portfolioUrl)
  QR 코드: QRModal 열기 (PNG 다운로드 포함)
  카카오: Kakao.Share.sendDefault (title/description/image 포함) — Kakao JS SDK 활용
  Twitter: window.open('https://twitter.com/intent/tweet?url=...')
```

### 6-2. QR 코드 모달

```
┌─────────────────────────────────┐
│  📱 포트폴리오 QR 코드            │         [✕]
│                                 │
│     ┌───────────────────┐       │
│     │                   │       │
│     │   [QR 코드 이미지]   │       │
│     │   300×300         │       │
│     │                   │       │
│     └───────────────────┘       │
│                                 │
│  happiness.kr/portfolio/kim     │
│                                 │
│  [PNG 다운로드]  [SVG 다운로드]  │
│                                 │
│  💡 명함, 전시 안내물에 사용하세요  │
└─────────────────────────────────┘
```

**구현**: `https://api.qrserver.com/v1/create-qr-code/?data={url}&size=300x300&format=png`  
(무료 외부 API, 네트워크 의존성 있음 — 또는 백엔드에서 QR 라이브러리 사용)

---

## 7. Claude.ai 아티팩트 프롬프트

### 7-1. TestimonialsSection 컴포넌트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style, 외부 라이브러리 없음
컬러 시스템 (다크 테마 — 포트폴리오 전용):
  bg: '#090909'  surface: '#0f0f0f'  elevated: '#161616'
  border: 'rgba(255,255,255,0.07)'
  text: '#e8e8f0'  textSub: '#8080b0'  textMuted: '#5a5a7a'
  primary: '#5b6ef5'  accent: '#a78bfa'
규칙: export default 함수형 컴포넌트, inline style, 한국어 UI

TestimonialsSection 컴포넌트를 만들어주세요.
포트폴리오 페이지 하단에 삽입되는 추천사 섹션.

Props:
  testimonials: { id, clientName, clientRole, content, shootDate }[]

레이아웃:
  섹션 전체: padding 80px 24px, background '#090909'
  
  헤더:
    "클라이언트 후기" — 11px 600 #5b6ef5 letter-spacing 0.12em 대문자
    큰 제목: "함께한 분들의 이야기" — 32px 700 #e8e8f0 margin-top 8px

  카드 그리드: display grid, grid-template-columns repeat(auto-fill, minmax(300px, 1fr)), gap 20px

  카드 디자인:
    background: 'rgba(255,255,255,0.03)'
    border: '1px solid rgba(255,255,255,0.07)'
    border-radius: 16px
    padding: 28px

    따옴표 아이콘: 큰 "❝" 문자, color rgba(91,110,245,0.4), font-size 48px, line-height 1
    본문: font-size 15px, color #c0c0d8, line-height 1.75, margin-top 8px
    
    구분선: margin-top 20px, border-top 1px solid rgba(255,255,255,0.06)
    
    하단 프로필:
      display flex, align-items center, gap 12px, margin-top 16px
      이니셜 아바타: 40px circle, background rgba(91,110,245,0.2), color #a78bfa, font-weight 700
      이름: 14px 600 #e8e8f0
      역할: 12px #5a5a7a, margin-top 2px
      날짜: 11px #5a5a7a, margin-left auto

  빈 상태: 부모가 testimonials=[] 전달 시 섹션 자체 null 반환

  hover 효과:
    카드 hover: border rgba(91,110,245,0.2), translateY(-2px) 0.2s
```

---

### 7-2. PressAwardsSection 컴포넌트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러 (다크 포트폴리오):
  bg: '#090909'  surface: '#0f0f0f'  border: 'rgba(255,255,255,0.07)'
  text: '#e8e8f0'  textMuted: '#5a5a7a'  primary: '#5b6ef5'
규칙: export default 함수형 컴포넌트, inline style, 한국어 UI

PressAwardsSection 컴포넌트를 만들어주세요.
포트폴리오 페이지에 삽입되는 언론/수상 섹션.

Props:
  press: { id, publication, title, url, publishedDate }[]
  awards: { id, title, organizer, yearMonth, type }[]
    (type: 'AWARD' | 'EXHIBITION')

레이아웃:
  섹션: padding 60px 24px, background '#090909'
  
  헤더: "언론 & 수상" 레이블 + "작업의 흔적들" 큰 제목

  2열 레이아웃 (≥768px): 왼쪽 "언론 & 출판" / 오른쪽 "수상 & 전시"
  모바일: 1열 적층

  언론 열:
    각 항목: display flex, gap 12px, padding 14px 0, border-bottom rgba(255,255,255,0.05)
    왼쪽: 📰 아이콘 in 36px circle (rgba(255,255,255,0.05) bg)
    오른쪽:
      publication: 11px 600 #5b6ef5 대문자 letter-spacing 0.08em
      title: 14px #c0c0d8, margin-top 3px
      날짜: 11px #5a5a7a, margin-top 4px
      외부 링크 아이콘: url 있으면 "↗" 표시 (오른쪽), hover color primary

  수상/전시 열:
    타임라인 형태: 왼쪽 연도 + 점(●) + 내용
    AWARD: 🏆 아이콘  EXHIBITION: 🎨 아이콘
    연도/월: 12px #5b6ef5 600
    제목: 14px #e8e8f0
    기관/장소: 12px #5a5a7a

  빈 상태: press와 awards 둘 다 empty면 null 반환
```

---

### 7-3. PricingSection 컴포넌트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러 (다크 포트폴리오):
  bg: '#090909'  surface: '#0f0f0f'  elevated: '#161616'
  border: 'rgba(255,255,255,0.07)'
  text: '#e8e8f0'  textSub: '#8080b0'  primary: '#5b6ef5'  accent: '#a78bfa'
규칙: export default 함수형 컴포넌트, inline style, 한국어 UI

PricingSection 컴포넌트를 만들어주세요.
포트폴리오 페이지 하단부에 선택적으로 표시되는 가격 섹션.

Props:
  packages: {
    id, name, priceLabel, description,
    features: string[],
    isFeatured: boolean
  }[]
  onInquiry: (packageName: string) => void   // 문의하기 클릭 → 해당 패키지 이름으로 InquiryForm 열기

레이아웃:
  섹션: padding 80px 24px, background '#090909'
  
  헤더:
    "촬영 패키지" 레이블 (11px 대문자 primary)
    "함께 만들 이야기, 그 시작" 큰 제목 (28px)
    "최종 금액은 촬영 조건에 따라 조율됩니다." (13px textMuted)

  카드 컨테이너:
    display grid, grid-template-columns repeat(auto-fill, minmax(260px, 1fr)), gap 16px

  기본 카드:
    background '#0f0f0f'
    border '1px solid rgba(255,255,255,0.07)'
    border-radius 20px, padding 28px

  추천(isFeatured) 카드 (더 강조):
    background 'linear-gradient(160deg, #0d0d1f 0%, #0f0f0f 100%)'
    border '1px solid rgba(91,110,245,0.4)'
    transform scale(1.03) (데스크탑)
    상단 배지: "✦ 인기" — primary bg, 흰색 텍스트, 절대 위치 상단 중앙

  카드 내부:
    패키지명: 12px 700 대문자 #a78bfa letter-spacing 0.1em
    가격: 36px 800 #e8e8f0, margin-top 10px
    설명: 13px #5a5a7a, margin-top 6px, line-height 1.6
    구분선: margin 20px 0, border-top rgba(255,255,255,0.06)
    feature 목록:
      각 항목: display flex gap 8px, font-size 13px color #c0c0d8, padding 5px 0
      체크 아이콘: "✓" primary color
    [문의하기] 버튼:
      margin-top 24px, width 100%, height 44px, border-radius 12px
      isFeatured: primary bg #fff text / 일반: surface bg #c0c0d8 text, border 1px rgba(255,255,255,0.1)
      hover: scale(1.02) 0.15s
```

---

### 7-4. NewsletterSection 컴포넌트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러 (다크 포트폴리오):
  bg: '#090909'  primary: '#5b6ef5'  text: '#e8e8f0'
  textMuted: '#5a5a7a'  border: 'rgba(255,255,255,0.07)'
규칙: export default 함수형 컴포넌트, inline style, 한국어 UI

NewsletterSection 컴포넌트를 만들어주세요.
포트폴리오 Footer 바로 위에 삽입되는 이메일 구독 섹션.

Props:
  profileName: string
  onSubscribe: (email: string) => Promise<void>

상태:
  email: string (입력값)
  status: 'idle' | 'loading' | 'success' | 'error'

레이아웃:
  섹션: padding 60px 24px, max-width 540px, margin 0 auto, text-align center

  상단 이모지: "✉️" — 36px
  제목: "새 작품이 나오면 가장 먼저 알려드릴게요" — 22px 700 #e8e8f0, margin-top 12px
  설명: "전시 소식, 작업 스케치, 새 시리즈 공개를 이메일로 받아보세요." — 14px #5a5a7a, margin-top 8px, line-height 1.7

  폼 (status !== 'success'):
    display flex, gap 8px, margin-top 24px, max-width 440px, margin-left auto, margin-right auto
    input:
      flex 1, height 48px, padding 0 16px, border-radius 12px
      background rgba(255,255,255,0.05), border 1px solid rgba(255,255,255,0.1)
      color #e8e8f0, placeholder color #5a5a7a
      focus: border primary, outline none
      type="email", placeholder "이메일 주소"
    버튼:
      height 48px, padding 0 20px, border-radius 12px
      background primary, color #fff, border none, font-weight 700
      disabled/loading: opacity 0.6
      "구독하기" / 로딩 시 "..."

  성공 상태 (status === 'success'):
    "✅ 구독해 주셨어요!" — 18px 700 #e8e8f0
    "소식이 생기면 연락드리겠습니다." — 14px #5a5a7a, margin-top 8px

  오류 상태: 입력 아래 "이미 구독 중인 이메일입니다." / "이메일을 확인해주세요." 12px #e53e3e

  하단 안내: "주 1회 이하 발송 · 언제든 수신거부 가능" — 11px #5a5a7a, margin-top 16px

  onSubmit:
    이메일 기본 유효성 검사 (@, . 포함) → 통과 시 onSubscribe 호출
```

---

### 7-5. ClientLogoWall 컴포넌트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러 (다크 포트폴리오):
  bg: '#090909'  border: 'rgba(255,255,255,0.07)'
  text: '#e8e8f0'  textMuted: '#5a5a7a'
규칙: export default 함수형 컴포넌트, inline style, 한국어 UI

ClientLogoWall 컴포넌트를 만들어주세요.
포트폴리오 BIO 섹션 아래에 표시되는 클라이언트 로고 영역.

Props:
  clients: { id, name, logoUrl }[]
  maxDisplay?: number  (기본 8)

레이아웃 (clients.length > 0일 때만 렌더링):
  섹션: padding 40px 24px, border-top '1px solid rgba(255,255,255,0.05)'
  헤더: "함께한 브랜드" — 11px 600 대문자 #5a5a7a letter-spacing 0.1em, text-align center, margin-bottom 24px

  로고 컨테이너:
    display flex, flex-wrap wrap, justify-content center, align-items center, gap 24px 32px

  로고 아이템:
    logoUrl 있음: <img> height 28px, max-width 100px, object-fit contain
                  filter: grayscale(100%) brightness(1.4)  (← 흑백 처리로 통일감)
                  hover: filter none (컬러 복원), transition 0.2s
    logoUrl 없음: 텍스트만 — 13px 600 #5a5a7a, hover #c0c0d8

  로고 수 > maxDisplay: 나머지는 숨기고 "+{N}개 더" 텍스트 표시

  빈 상태: null 반환
```

---

### 7-6. PortfolioFooter 컴포넌트 (강화)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style
컬러 (다크 포트폴리오):
  bg: '#090909'  surface: '#0c0c0c'  border: 'rgba(255,255,255,0.07)'
  text: '#e8e8f0'  textMuted: '#5a5a7a'  primary: '#5b6ef5'  accent: '#a78bfa'
규칙: export default 함수형 컴포넌트, inline style, 한국어 UI

PortfolioFooter 컴포넌트를 만들어주세요.

Props:
  member: { name, profileName, bio, websiteUrl, location, instagramId }
  onInquiry: () => void
  onBooking: () => void

레이아웃:
  배경: 'linear-gradient(to bottom, #090909, #050505)'
  padding: 80px 24px 48px

  CTA 섹션 (중앙 정렬):
    제목: "함께 작업하고 싶으신가요?" — 28px 700 #e8e8f0
    설명: member.location 있으면 "서울 기반 · 전국 이동 가능" 13px #5a5a7a
    버튼 2개 (gap 12px):
      [촬영 문의하기] — primary bg, 44px height, border-radius 12px, padding 0 28px
      [예약하기] — surface bg, border 1px rgba(255,255,255,0.1), 동일 높이

  구분선: margin 60px 0, border-top rgba(255,255,255,0.06)

  하단 3열 (max-width 800px, margin auto):
    왼쪽:
      작가명 (16px 700 #e8e8f0)
      "✦ Happiness 포트폴리오" (12px #5a5a7a)
    
    중앙 (SNS 링크):
      소셜 아이콘 버튼 (이모지 기반):
        Instagram: "📸" → https://instagram.com/instagramId
        웹사이트: "🔗" → member.websiteUrl
      각 버튼: 36px circle, rgba(255,255,255,0.06) bg, hover rgba(255,255,255,0.12)

    오른쪽:
      "© 2026 {name}" (12px #5a5a7a)
      "All rights reserved." (11px #3a3a5a)

  반응형 (≤600px): 3열 → 1열 적층, 중앙 정렬
```

---

## 8. 백엔드 구현 계획

### 8-1. 새 엔티티 & 마이그레이션 SQL

```sql
-- 추천사
CREATE TABLE IF NOT EXISTS testimonials (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  client_name   VARCHAR(100) NOT NULL,
  client_role   VARCHAR(100),
  content       TEXT NOT NULL,
  shoot_date    VARCHAR(20),
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_member_id ON testimonials(member_id);

-- 언론/수상
CREATE TABLE IF NOT EXISTS press_features (
  id             BIGSERIAL PRIMARY KEY,
  member_id      BIGINT NOT NULL,
  publication    VARCHAR(100) NOT NULL,
  title          VARCHAR(200),
  url            VARCHAR(500),
  published_date VARCHAR(20),
  logo_url       VARCHAR(500),
  display_order  INTEGER DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  type          VARCHAR(20) NOT NULL,   -- AWARD | EXHIBITION | PUBLICATION
  title         VARCHAR(200) NOT NULL,
  organizer     VARCHAR(100),
  location      VARCHAR(100),
  year_month    VARCHAR(7),             -- "2025.05"
  url           VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 가격 패키지
CREATE TABLE IF NOT EXISTS pricing_packages (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  price         INTEGER,
  price_label   VARCHAR(50),
  description   TEXT,
  features      TEXT,           -- JSON 배열
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 클라이언트 브랜드
CREATE TABLE IF NOT EXISTS client_brands (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  logo_url      VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 뉴스레터 구독
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id               BIGSERIAL PRIMARY KEY,
  member_id        BIGINT NOT NULL,
  email            VARCHAR(255) NOT NULL,
  token            VARCHAR(64) UNIQUE NOT NULL,
  subscribed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  unsubscribed_at  TIMESTAMP,
  UNIQUE (member_id, email)
);

-- Member 테이블 추가 컬럼
ALTER TABLE members ADD COLUMN IF NOT EXISTS cover_video_url VARCHAR(500);
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_taglines TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_sections_enabled TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS blur_hash VARCHAR(500);
```

### 8-2. API 엔드포인트 목록

```
포트폴리오 공개 API (인증 불필요):
  GET  /api/portfolio/:profileName/testimonials  → 추천사 목록
  GET  /api/portfolio/:profileName/press         → 언론/수상 목록
  GET  /api/portfolio/:profileName/achievements  → 수상/전시 목록
  GET  /api/portfolio/:profileName/pricing       → 가격 패키지 목록
  GET  /api/portfolio/:profileName/brands        → 클라이언트 로고 목록
  POST /api/portfolio/:profileName/subscribe     → 뉴스레터 구독 (rate limit 5/min)
  GET  /api/unsubscribe?token=xxx               → 수신거부

관리 API (본인만):
  POST /api/testimonials
  PUT  /api/testimonials/:id
  DELETE /api/testimonials/:id
  POST /api/press
  PUT  /api/press/:id
  DELETE /api/press/:id
  POST /api/achievements
  PUT  /api/achievements/:id
  DELETE /api/achievements/:id
  POST /api/pricing
  PUT  /api/pricing/:id
  DELETE /api/pricing/:id
  POST /api/brands
  DELETE /api/brands/:id
  GET  /api/portfolio/:profileName/subscribers   → 구독자 수 & 목록
```

---

## 9. 프론트엔드 파일 구조

```
frontend/src/
├── pages/
│   ├── PortfolioPage.jsx              (수정 — 신규 섹션 통합)
│   └── PortfolioManagePage.jsx        (신규 — 추천사/언론/가격 통합 관리)
│
├── components/portfolio/
│   ├── TestimonialsSection.jsx        (신규)
│   ├── PressAwardsSection.jsx         (신규)
│   ├── PricingSection.jsx             (신규)
│   ├── ClientLogoWall.jsx             (신규)
│   ├── NewsletterSection.jsx          (신규)
│   ├── PortfolioFooter.jsx            (신규 — 기존 FooterCTA 대체)
│   ├── QRCodeModal.jsx                (신규)
│   ├── ScrollProgress.jsx             (신규 — 상단 진행 바)
│   ├── CustomCursor.jsx               (신규 — 포트폴리오 전용)
│   ├── PortfolioShareBar.jsx          (신규 — 공유 버튼 모음)
│   └── JustifiedGrid.jsx             (신규 — justified layout 갤러리)
│
├── hooks/
│   ├── usePortfolioMeta.js            (신규 — SEO 동적 head)
│   └── useBlurUp.js                   (신규 — blur-up 이미지 로딩)
│
├── services/
│   └── portfolioEnhancedApi.js        (신규 — 추천사/언론/가격/구독 API)
```

### 라우트 추가

```jsx
// App.jsx 추가
<Route path="/portfolio/:profileName/manage" element={
  <ProtectedRoute>
    <PortfolioManagePage />
  </ProtectedRoute>
} />
```

---

## 10. 구현 스프린트 계획

### Sprint A — 신뢰 구축 섹션 (1주, 가장 비즈니스 임팩트 큼)

1. 백엔드: `testimonials` · `press_features` · `achievements` · `client_brands` 테이블 + API
2. `TestimonialsSection.jsx` 구현
3. `PressAwardsSection.jsx` 구현
4. `ClientLogoWall.jsx` 구현
5. `PortfolioManagePage.jsx` — 추천사/언론/브랜드 CRUD UI
6. `PortfolioPage.jsx` — 신규 섹션 통합 (섹션 enabled 설정 반영)

### Sprint B — 전환 최적화 (1주)

7. 백엔드: `pricing_packages` · `newsletter_subscribers` 테이블 + API
8. `PricingSection.jsx` 구현
9. `NewsletterSection.jsx` 구현
10. `PortfolioFooter.jsx` 강화 (CTA + 소셜 링크)
11. `PortfolioShareBar.jsx` — QR, 카카오, 트위터 공유
12. `QRCodeModal.jsx` 구현
13. `usePortfolioMeta.js` — SEO 동적 head 업데이트

### Sprint C — UX 고도화 (1주)

14. `ScrollProgress.jsx` — 상단 스크롤 진행바
15. `CustomCursor.jsx` — 포트폴리오 전용 커스텀 커서
16. `JustifiedGrid.jsx` — 균형 잡힌 행 레이아웃 옵션
17. `useBlurUp.js` + 백엔드 blur_hash 생성
18. 이미지 보호 (우클릭/드래그 방지 레이어)
19. 모바일 핀치줌/더블탭 확대

### Sprint D — 컨텐츠 강화 (2주)

20. Member 테이블 — `cover_video_url`, `portfolio_taglines` 컬럼
21. Hero 섹션 — 비디오 배경 + 타이핑 애니메이션
22. 폰트 테마 선택 (modern/editorial/minimal/elegant)
23. 포트폴리오 섹션 켜기/끄기 UI
24. PortfolioManagePage 가격 패키지 CRUD

---

## 11. 트레이드오프 분석

| 기능 | 구현 복잡도 | 비즈니스 가치 | 채택 여부 |
|------|-----------|------------|---------|
| 추천사 섹션 | ⭐ (단순 CRUD) | ⭐⭐⭐⭐⭐ | ✅ Sprint A |
| 언론/수상 섹션 | ⭐ | ⭐⭐⭐⭐ | ✅ Sprint A |
| 가격 패키지 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Sprint B |
| 뉴스레터 구독 | ⭐⭐ | ⭐⭐⭐⭐ | ✅ Sprint B |
| QR 코드 | ⭐ (외부 API) | ⭐⭐⭐ | ✅ Sprint B |
| 커스텀 커서 | ⭐⭐ | ⭐⭐ | ✅ Sprint C |
| Blur-up 로딩 | ⭐⭐⭐ (백엔드 이미지 처리) | ⭐⭐⭐ | ✅ Sprint C |
| Justified Grid | ⭐⭐⭐ (레이아웃 알고리즘) | ⭐⭐⭐ | ✅ Sprint C |
| 비디오 배경 Hero | ⭐⭐ | ⭐⭐⭐ | ✅ Sprint D |
| 프린트 판매 | ⭐⭐⭐⭐⭐ (결제 연동) | ⭐⭐⭐ | ❌ 범위 외 (추후 검토) |
| Instagram 피드 | ⭐⭐⭐ (OAuth 필요) | ⭐⭐ | ❌ 추후 검토 |
| 블로그/저널 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ 추후 검토 |

---

## 12. 관련 기획서 연계

| 파일 | 연계 내용 |
|------|---------|
| `11_PORTFOLIO_REDESIGN.md` | 기본 레이아웃 구조 → 본 문서에서 섹션 확장 |
| `19_PORTFOLIO_META_SEO.md` | `usePortfolioMeta` 훅 Sprint B에서 구현 |
| `28_PORTFOLIO_TEMPLATE_SCRL.md` | 템플릿 시스템에 신규 섹션들 통합 |
| `30_SHOOT_BOOKING_CALENDAR.md` | PricingSection의 [예약하기] 버튼 → BookingPage 연결 |
| `06_SERIES_INQUIRY.md` | 문의하기 버튼 → InquiryFormPage 연결 |
| `29_VISITOR_ANALYTICS.md` | 포트폴리오 방문자 → AnalyticsEvent 기록 |

---

*다음 작업: CLAUDE.md 운영 DB 마이그레이션 섹션에 SQL 추가 후 Sprint A 착수*
