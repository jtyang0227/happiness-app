# 29 — 어드민 카테고리·장르 관리 시스템

> 참조: `26_GENRE_CLASSIFICATION.md` (장르 12종 정의)  
> 연계: `13_ADMIN_PANEL.md` / `16_ADMIN_PANEL_COMPLETE.md` (기존 어드민)  
> 최초 작성: 2026-06-21  
> 상태: 기획 완료 (구현 대기)

---

## 1. 기획 배경

### 1-1. 현재 어드민 한계

26번 기획서로 장르 분류 시스템(12종)이 추가될 예정이지만,  
운영자가 이를 **관리·큐레이션·품질 제어**할 수 있는 어드민 기능이 없다.

| 운영 시나리오 | 현재 가능 여부 |
|-------------|-------------|
| "인물 사진이 몇 장인지 한눈에 확인" | ❌ |
| "장르 미지정 사진에 장르 일괄 부여" | ❌ |
| "웨딩 카테고리를 탐색 홈에 피처링" | ❌ |
| "이 태그를 저 태그로 병합하기" | ❌ |
| "어떤 장르가 인기 있는지 트렌드 보기" | ❌ |
| "사진 품질 이슈 신고 내역 처리" | ❌ |
| "특정 장르 TOP 작가 확인" | ❌ |

### 1-2. 추가할 것들

이 기획서는 두 가지 축으로 구성된다:

```
A. 기존 어드민 페이지 강화
   ├── AdminDashboardPage  — 장르 통계 + 트렌드 카드 추가
   ├── AdminPhotosPage     — 장르 컬럼 + 벌크 장르 지정 + 미분류 필터
   └── AdminMembersPage    — 전문 장르 표시 + 장르별 작가 필터

B. 신규 어드민 페이지 3종
   ├── /admin/categories   — 장르·카테고리 관리 (★ 핵심)
   ├── /admin/tags         — 태그 병합·삭제·정리
   └── /admin/moderation   — 콘텐츠 품질 관리·신고 처리
```

---

## 2. 어드민 사이드바 메뉴 확장

```
현재:
  📊 대시보드
  🖼️ 갤러리 순서
  👥 회원 관리
  📷 사진 관리
  ─────────
  🚪 로그아웃

변경 후:
  📊 대시보드
  ──── 콘텐츠 ─────
  🖼️ 갤러리 순서
  📷 사진 관리
  🏷️ 카테고리 관리  ← 신규
  🔖 태그 관리      ← 신규
  🚨 콘텐츠 모더레이션 ← 신규 (미읽음 배지)
  ──── 회원 ──────
  👥 회원 관리
  ──── 시스템 ─────
  📈 분석·통계      ← 신규 (대시보드 고도화)
  ─────────────────
  🚪 로그아웃
```

---

## 3. 기존 페이지 강화

### 3-1. AdminDashboardPage — 장르 통계 추가

#### 현재 (통계 카드 3개)
```
📷 전체 사진   👥 전체 회원   ✉ 미읽음 문의
```

#### 변경 후 (통계 카드 6개 + 섹션 추가)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 대시보드                          Happiness 운영 현황      │
├──────────┬───────────┬──────────┬──────────┬──────┬─────────┤
│📷 전체   │ 👥 전체   │ ✉ 미읽음  │ 🏷️ 미분류  │📈 오늘 │ ⭐ 이번달 │
│ 사진     │  회원     │  문의     │  사진     │  등록 │  좋아요 │
│  214장   │  38명     │  5건      │  12장     │  +3   │ +289   │
└──────────┴───────────┴──────────┴──────────┴──────┴─────────┘

─────────────────────────────────────────────────────────────
장르 분포                               [→ 카테고리 관리]
─────────────────────────────────────────────────────────────
[도넛 차트]          👤 인물      ████████░░  82장 (38%)
     전체            💍 웨딩      █████░░░░░  51장 (24%)
    214장            🏔 풍경      ███░░░░░░░  29장 (13%)
                     🌿 자연      ██░░░░░░░░  18장 (8%)
                     🎨 파인아트  █░░░░░░░░░  12장 (6%)
                     나머지       ██░░░░░░░░  22장 (11%)

─────────────────────────────────────────────────────────────
미분류 사진 알림                          [지금 분류하기 →]
─────────────────────────────────────────────────────────────
⚠️ 장르가 지정되지 않은 사진이 12장 있습니다.
   탐색 페이지에서 노출되지 않을 수 있습니다.

─────────────────────────────────────────────────────────────
이번 주 인기 장르 TOP 3
─────────────────────────────────────────────────────────────
🥇 인물 — 좋아요 142개 (+23%)
🥈 웨딩 — 좋아요 89개 (+11%)
🥉 풍경 — 좋아요 61개 (-4%)
```

**신규 API 연동:**
- `GET /api/photos/genres/stats` — 장르별 사진 수
- `GET /api/photos?genre=null&size=1` — 미분류 사진 수 (count만)
- `GET /api/photos/genres/trending?period=week` — 주간 인기 장르

**도넛 차트 구현 (Canvas API, 외부 라이브러리 없음):**

```jsx
function DonutChart({ data, total }) {
  const canvasRef = useRef(null);
  const GENRE_COLORS = { PORTRAIT:'#8B5CF6', WEDDING:'#EC4899', LANDSCAPE:'#3B82F6',
    NATURE:'#10B981', STREET:'#6B7280', ARCHITECTURE:'#F59E0B',
    FOOD:'#EF4444', TRAVEL:'#06B6D4', FASHION:'#A855F7',
    LIFESTYLE:'#F97316', COMMERCIAL:'#64748B', FINE_ART:'#84CC16' };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2, cy = canvas.height / 2, r = 70, inner = 42;
    let startAngle = -Math.PI / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    data.forEach(({ genre, count }) => {
      const slice = (count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.fillStyle = GENRE_COLORS[genre] || '#ccc';
      ctx.fill();
      startAngle += slice;
    });
    // 도넛 가운데 구멍
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    // 가운데 텍스트
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 6);
  }, [data, total]);

  return <canvas ref={canvasRef} width={160} height={160} />;
}
```

---

### 3-2. AdminPhotosPage — 장르 관리 강화

#### 현재 기능
- 사진 목록 (썸네일·제목·작가·날짜·무드)
- 검색 (제목+작가명)
- [보기] [삭제] 버튼

#### 추가 기능

**① 필터 바 추가**

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [검색창]  [장르 ▾ 전체]  [상태 ▾ 전체]  [정렬 ▾ 최신순] │
│                                                         │
│ 장르 드롭다운:                                           │
│   ● 전체  ○ 미분류만  ○ 👤 인물  ○ 💍 웨딩  ○ 🏔 풍경 ... │
└─────────────────────────────────────────────────────────┘
```

**② 테이블 장르 컬럼 추가**

```
ID | 썸네일 | 제목+작가 | 장르        | 무드    | 좋아요 | 날짜   | 관리
─────────────────────────────────────────────────────────────────
1  | [img] | 봄날 / 서진 | 👤 인물    | WARM   | 24    | 06-20 | [편집] [삭제]
2  | [img] | 노을 / 민준 | 🏔 풍경    | WARM   | 18    | 06-19 | [편집] [삭제]
3  | [img] | 카페 /이나  | ─ 미분류   | MUTED  | 5     | 06-18 | [편집] [삭제]
                          ↑ 클릭 시 장르 선택 팝오버
```

**③ 인라인 장르 편집 팝오버**

```
장르 칩 클릭 →
┌─────────────────────────────────────────┐
│  장르 선택 (클릭 즉시 저장)               │
│                                         │
│  [👤 인물 ✓] [💍 웨딩] [🏔 풍경]        │
│  [🌿 자연]  [🚶 스트리트] [🏛 건축]      │
│  [🍽 음식]  [✈️ 여행]  [👗 패션]         │
│  [☀️ 라이프] [📦 상업]  [🎨 파인아트]   │
│                                         │
│  [미분류로 초기화]              [닫기]   │
└─────────────────────────────────────────┘

동작: 클릭 → PUT /api/photos/:id {genre} → 칩 즉시 업데이트
```

**④ 벌크(일괄) 작업**

```
┌─────────────────────────────────────────────────────────┐
│ ☐ (전체선택)   3개 선택됨   [장르 일괄 지정 ▾] [삭제]   │
└─────────────────────────────────────────────────────────┘

각 행 좌측에 체크박스 추가
일괄 장르 지정 드롭다운 → 선택한 모든 사진에 PUT /api/photos/bulk-genre
```

**⑤ 미분류 사진 퀵 접근**

```
사이드바 미분류 카운트 배지: 🏷️ 카테고리 관리 [12]
대시보드 경고 → 클릭 → AdminPhotosPage?genre=NONE
```

---

### 3-3. AdminMembersPage — 전문 장르 표시

```
현재 테이블: ID | 이름 | 이메일 | 권한 | 가입일 | 관리

추가: 전문 장르 컬럼 (작가 사진에서 가장 많은 장르 자동 집계)
  ID | 이름 | 이메일 | 전문 장르        | 사진 | 권한 | 관리
  1  | 서진  | ...  | 👤 인물 · 💍 웨딩  | 42장 | USER | [→ADMIN][삭제]
  2  | 민준  | ...  | 🏔 풍경            | 18장 | USER | [→ADMIN][삭제]

전문 장르 = 해당 작가의 사진 중 가장 많은 genre Top 2
  → API: GET /api/photos/genres/stats?memberId=X

장르별 작가 필터:
  [전체 작가] [인물 전문] [웨딩 전문] [풍경 전문] ...
```

---

## 4. 신규 페이지 A — AdminCategoryPage (★ 핵심)

### URL: `/admin/categories`

### 4-1. 전체 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ 🏷️ 카테고리 관리                 Happiness Admin                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ── 장르 현황 ─────────────────────────────────── [AI 일괄 분류] │
│                                                                  │
│ ┌──────┬──────────┬──────┬──────────┬───────────┬─────────────┐ │
│ │ 장르  │  사진 수  │ 좋아요 │ 이번 달↑  │  피처링   │   관리     │ │
│ ├──────┼──────────┼──────┼──────────┼───────────┼─────────────┤ │
│ │👤 인물│  82장    │ 1240 │ +12 (+17%)│ [★ ON]   │ [편집][이동] │ │
│ │💍 웨딩│  51장    │  890 │  +8 (+19%)│ [☆ OFF]  │ [편집][이동] │ │
│ │🏔 풍경│  29장    │  402 │  +2 (+7%) │ [☆ OFF]  │ [편집][이동] │ │
│ │🌿 자연│  18장    │  234 │  +5 (+38%)│ [☆ OFF]  │ [편집][이동] │ │
│ │...   │   ...    │  ... │    ...    │   ...    │     ...      │ │
│ │─ 미분류 ─────────────────────────────────────────────────────│ │
│ │ 없음  │  12장    │   —  │    —     │    —      │ [AI 분류]   │ │
│ └──────┴──────────┴──────┴──────────┴───────────┴─────────────┘ │
│                                                                  │
│ ── 피처링 장르 설정 ────────────────────────────────────────────│
│  탐색 페이지 상단에 강조 표시할 장르 최대 3개 선택               │
│  현재: [👤 인물] [──] [──]     [저장]                           │
│                                                                  │
│ ── 사용자 정의 카테고리 ────────────────────────────────────────│
│  [+ 커스텀 카테고리 추가]                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4-2. 피처링(Featured) 장르 시스템

운영자가 탐색 페이지 최상단에 특정 장르를 강조 표시할 수 있다.

```
탐색 페이지 상단 (피처링 설정 시):
┌─────────────────────────────────────────────────────────┐
│ ⭐ 이달의 추천                                            │
│  ┌─────────────────┐                                   │
│  │  👤 인물 포토    │  ← 피처링 장르 배너 카드          │
│  │  작가 42명의     │                                   │
│  │  82개 작품       │                                   │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

DB 설계:
```sql
CREATE TABLE IF NOT EXISTS featured_genres (
  id          BIGSERIAL PRIMARY KEY,
  genre       VARCHAR(20) NOT NULL UNIQUE,
  priority    INTEGER NOT NULL DEFAULT 0,  -- 낮을수록 앞 (0=1순위)
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

API:
```
GET  /api/genres/featured           — 공개 (탐색 페이지용)
PUT  /api/admin/genres/featured     — 어드민 전용 (ADMIN 권한)
  Body: { genres: ["PORTRAIT", "WEDDING"] }
```

### 4-3. AI 일괄 장르 분류 (Batch Auto-Classification)

```
[AI 일괄 분류] 버튼 클릭 →

┌─────────────────────────────────────────────────────┐
│  🤖 AI 장르 일괄 분류                                │
│                                                     │
│  ○ 미분류 사진만 (12장)  ← 기본 선택               │
│  ○ 전체 사진 재분류 (214장) — 기존 장르 덮어씌움   │
│                                                     │
│  방식:  AutoTagService.suggestGenre()               │
│         (제목+설명 키워드 기반 매핑)                │
│                                                     │
│  예상 결과 미리보기:                                │
│    👤 인물  예상 8장                               │
│    🏔 풍경  예상 2장                               │
│    기타/미확인 2장                                  │
│                                                     │
│  ⚠️ 분류 결과는 즉시 적용됩니다.                    │
│     수동으로 수정 가능합니다.                        │
│                                                     │
│  [취소]                    [일괄 분류 실행]          │
└─────────────────────────────────────────────────────┘

실행 후:
  POST /api/admin/photos/auto-classify
  → { classified: 10, failed: 2, results: [{photoId, genre}] }
  → 완료 토스트 + 통계 카드 갱신
```

### 4-4. 사용자 정의 카테고리

12개 기본 장르 외에 운영자가 커스텀 카테고리를 추가할 수 있다.

```
[+ 커스텀 카테고리 추가] →

┌────────────────────────────────────────────────┐
│  새 카테고리 추가                               │
│                                                │
│  이름 (한글)  [                    ]           │
│  이름 (영문)  [                    ]           │
│  이모지       [    ] (클릭 시 이모지 픽커)      │
│  코드         [    ] (영문 대문자, 예: DRONE)   │
│  색상         [#    ] ──────── (색상 미리보기) │
│                                                │
│  [취소]                         [추가]          │
└────────────────────────────────────────────────┘
```

DB 설계:
```sql
CREATE TABLE IF NOT EXISTS custom_genres (
  id         BIGSERIAL PRIMARY KEY,
  code       VARCHAR(30) NOT NULL UNIQUE,  -- 예: DRONE
  label_ko   VARCHAR(30) NOT NULL,
  label_en   VARCHAR(30) NOT NULL,
  emoji      VARCHAR(10),
  color      VARCHAR(7),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

커스텀 장르는 `photos.genre` 컬럼에 저장될 때 `CUSTOM_{code}` 형태로 저장하거나,  
`custom_genres.code` 를 직접 참조한다.

---

## 5. 신규 페이지 B — AdminTagsPage (태그 관리)

### URL: `/admin/tags`

### 5-1. 필요 배경

현재 태그는 작가가 자유 입력(`PhotoTag` 테이블)하므로  
중복/오타/유사 태그가 쌓인다:

```
"인물사진" "인물" "portrait" "인물촬영" → 사실상 같은 태그
"seoul" "서울" "서울시" → 같은 의미
```

### 5-2. 태그 관리 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔖 태그 관리                           Happiness Admin           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔍 [태그 검색]        [정렬 ▾ 사용 빈도순]  [+ 새 태그]         │
│                                                                 │
│  ── 많이 사용된 태그 (상위 20개) ──────────────────────────────  │
│                                                                 │
│  ┌─────────┬────────┬────────────────────────────┬───────────┐  │
│  │  태그    │ 사용 수 │        연결 사진           │    관리   │  │
│  ├─────────┼────────┼────────────────────────────┼───────────┤  │
│  │ 인물사진  │  38개  │ [img][img][img] +35       │ [병합][삭제]│  │
│  │ 인물     │  24개  │ [img][img][img] +21       │ [병합][삭제]│  │
│  │ portrait │  19개  │ [img][img][img] +16       │ [병합][삭제]│  │
│  │ 웨딩     │  15개  │ [img][img][img] +12       │ [병합][삭제]│  │
│  │ ...      │  ...   │  ...                      │    ...     │  │
│  └─────────┴────────┴────────────────────────────┴───────────┘  │
│                                                                 │
│  ── 유사 태그 그룹 (AI 추천 병합) ─────────────────────────────  │
│                                                                 │
│  그룹 1: 인물사진(38) · 인물(24) · portrait(19)                  │
│           → [인물] 로 병합 추천                [병합 실행]        │
│                                                                 │
│  그룹 2: seoul(12) · 서울(9) · 서울시(4)                        │
│           → [서울] 로 병합 추천                [병합 실행]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5-3. 태그 병합 모달

```
┌──────────────────────────────────────────────────────┐
│  태그 병합                                           │
│                                                      │
│  병합할 태그:                                        │
│    ☑ 인물사진 (38개 사진)                            │
│    ☑ 인물 (24개 사진)                               │
│    ☑ portrait (19개 사진)                           │
│    ─────────────────                                 │
│    총 81개 사진에 적용됨 (중복 제거 후)               │
│                                                      │
│  대표 태그 (병합 결과):                              │
│    [인물    ] ← 직접 입력 또는 위에서 선택            │
│                                                      │
│  ⚠️ 이 작업은 되돌릴 수 없습니다.                    │
│     선택한 태그들은 삭제되고 대표 태그로 통합됩니다.   │
│                                                      │
│  [취소]                         [병합 실행]           │
└──────────────────────────────────────────────────────┘
```

API:
```
GET  /api/admin/tags?sort=count&page=0&size=50   — 태그 목록+사용 수
POST /api/admin/tags/merge                       — 태그 병합
  Body: { sourceTags: ["인물사진","인물","portrait"], targetTag: "인물" }
DELETE /api/admin/tags/:tagName                  — 태그 삭제 (사진에서도 제거)
GET  /api/admin/tags/similar                     — 유사 태그 그룹 추천
```

유사 태그 감지 로직 (백엔드, Java):
```java
// Levenshtein 거리 2 이하이면 유사 태그 후보
// 추가: 한글↔영문 맵핑 테이블 (인물↔portrait, 웨딩↔wedding)
```

---

## 6. 신규 페이지 C — AdminModerationPage (콘텐츠 모더레이션)

### URL: `/admin/moderation`

### 6-1. 필요 배경

사진 공유 플랫폼으로 성장하면 부적절 콘텐츠·저작권 신고·스팸이 발생한다.  
운영자가 신고를 처리하는 전용 워크스페이스가 필요하다.

### 6-2. 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ 🚨 콘텐츠 모더레이션                     미처리 신고 5건          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [전체 5] [미처리 5] [처리완료 42] [기각 18]    [정렬 ▾ 최신순]   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [사진 썸네일]  제목: "봄날의 기억"                             │ │
│ │                작가: 서진 (@seongjin) · 06-21 14:23          │ │
│ │                신고 사유: 📋 저작권 침해                       │ │
│ │                신고자: user@email.com                        │ │
│ │                신고 내용: "이 사진은 제 작품을 무단 사용..."    │ │
│ │                                                              │ │
│ │ [사진 보기] [작가 프로필] [삭제] [경고 발송] [신고 기각]        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [사진 썸네일]  제목: "sunset"                                  │ │
│ │                신고 사유: 🔞 부적절 콘텐츠                     │ │
│ │ [사진 보기] [삭제] [경고 발송] [신고 기각]                     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6-3. 신고 데이터 모델

```sql
CREATE TABLE IF NOT EXISTS photo_reports (
  id              BIGSERIAL PRIMARY KEY,
  photo_id        BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  reporter_email  VARCHAR(255) NOT NULL,
  reason          VARCHAR(30) NOT NULL,  -- COPYRIGHT/INAPPROPRIATE/SPAM/OTHER
  detail          TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING/RESOLVED/DISMISSED
  resolved_by     BIGINT,                -- 처리한 어드민 member_id
  resolved_at     TIMESTAMP,
  admin_note      TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_reports_status ON photo_reports(status);
CREATE INDEX IF NOT EXISTS idx_photo_reports_photo_id ON photo_reports(photo_id);
```

### 6-4. 신고 버튼 (사용자 앱)

현재 PhotoDetailPage 에 없는 신고 기능을 추가:

```
공유 버튼 옆에 ··· 메뉴 →
  [🚩 이 사진 신고하기]
    → 신고 사유 선택 모달:
      ○ 저작권 침해
      ○ 부적절한 콘텐츠
      ○ 스팸·광고
      ○ 기타 [직접 입력]
    → [신고 접수] → POST /api/photos/:id/report
    → 토스트: "신고가 접수되었습니다. 검토 후 조치하겠습니다."
```

### 6-5. 어드민 처리 API

```
GET  /api/admin/reports?status=PENDING&page=0  — 신고 목록
PUT  /api/admin/reports/:id/resolve            — 처리 (사진 삭제 포함 여부)
PUT  /api/admin/reports/:id/dismiss            — 기각
POST /api/admin/members/:id/warn               — 경고 발송 (이메일 또는 알림)
```

---

## 7. 추가 아이디어 (미래 확장)

### 7-1. 장르 리더보드 (Genre Champions)

```
URL: /admin/categories → "장르별 TOP 작가" 탭

📊 장르별 TOP 작가
─────────────────────────────────────────────────────
👤 인물 장르
  🥇 서진     42장 · 좋아요 1,240개 · 팔로워 89명
  🥈 민준     28장 · 좋아요  892개 · 팔로워 54명
  🥉 이나     19장 · 좋아요  654개 · 팔로워 31명

💍 웨딩 장르
  🥇 하윤     31장 · 좋아요 980개  · 팔로워 72명
  ...
```

향후 공개 탐색 페이지에 "이 장르의 추천 작가" 섹션으로 노출 가능.

---

### 7-2. 운영 자동 알림 (Admin Alerts)

어드민이 앱을 항상 열어두지 않아도 중요 상황을 감지:

| 트리거 | 알림 내용 |
|--------|---------|
| 신고 5건 이상 누적 | 🚨 미처리 신고 5건 — 확인 필요 |
| 미분류 사진 20장 초과 | ⚠️ 미분류 사진 증가 — 분류 권장 |
| 신규 회원 50명 돌파 | 🎉 회원 50명 달성 |
| 특정 장르 급상승 (+50% 이번주) | 📈 인물 장르 이번주 급성장 |

어드민 상단바 🔔 벨 아이콘 + 배지로 표시:

```
상단바: ☰ | Happiness Admin | 대시보드 | admin@mail.com | 🔔(3)
                                                        ↓
                                            [🚨 신고 5건 미처리]
                                            [⚠️ 미분류 사진 22장]
                                            [📈 웨딩 장르 급성장]
```

---

### 7-3. 콘텐츠 큐레이션 (Editor's Pick)

운영자가 직접 사진을 선별해 탐색 페이지에 노출:

```
AdminCategoryPage → "에디터 픽" 탭

[+ 에디터 픽 추가]
  사진 ID or 검색: [       ] [선택]
  노출 기간: [2026-06-21] ~ [2026-06-28]
  설명 (선택): [                        ]

현재 에디터 픽 (3/5 슬롯):
  [img] "봄날의 서울" — 서진 · ~06-28 [제거]
  [img] "노을 시리즈" — 민준 · ~06-30 [제거]
  [img] "결혼식 순간" — 하윤 · ~06-25 [제거]
```

탐색 페이지 노출:
```
🌟 에디터 픽
  [봄날의 서울] [노을 시리즈] [결혼식 순간]
```

DB:
```sql
CREATE TABLE IF NOT EXISTS editors_picks (
  id           BIGSERIAL PRIMARY KEY,
  photo_id     BIGINT NOT NULL,
  description  TEXT,
  starts_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at      TIMESTAMP,
  created_by   BIGINT NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### 7-4. 장르별 SEO 랜딩 페이지 (공개)

```
URL: /genre/portrait  → "인물 사진 포트폴리오 갤러리"
URL: /genre/wedding   → "웨딩 사진 포트폴리오 갤러리"

각 장르별 공개 페이지:
  - SEO 메타: "인물 사진 포트폴리오 | Happiness 갤러리"
  - 해당 장르 사진 + 해당 장르 전문 작가 목록
  - OG 이미지: 장르별 대표 사진 자동 선택

어드민 연동:
  AdminCategoryPage → 각 장르 행 [랜딩 페이지 설정] 버튼
  → 랜딩 페이지 제목/설명 커스터마이즈 가능
```

---

### 7-5. 장르 매핑 룰 편집기

현재 `AutoTagService`의 키워드→장르 매핑은 Java 코드에 하드코딩되어 있다.  
어드민이 UI에서 매핑을 추가·편집·삭제할 수 있으면 배포 없이 확장 가능:

```
AdminCategoryPage → "자동 분류 규칙" 탭

키워드 매핑 규칙:
  키워드        →   장르         [삭제]
  "웨딩"        → 💍 웨딩         [×]
  "결혼"        → 💍 웨딩         [×]
  "신부"        → 💍 웨딩         [×]
  "드레스"      → 💍 웨딩 / 👗 패션 [×]

[+ 규칙 추가]
  키워드 [        ]  →  장르 [▾ 선택]  [추가]
```

DB:
```sql
CREATE TABLE IF NOT EXISTS auto_genre_rules (
  id       BIGSERIAL PRIMARY KEY,
  keyword  VARCHAR(50) NOT NULL,
  genre    VARCHAR(30) NOT NULL
);
```

백엔드 `AutoTagService.suggestGenre()` → 하드코딩 Map 대신 이 테이블 조회 (캐싱 필요).

---

## 8. 구현 스프린트 계획

### Sprint 1 — 기존 어드민 강화 (1주)

| 작업 | 파일 | 비고 |
|------|------|------|
| AdminDashboardPage 장르 통계 카드 추가 | `AdminDashboardPage.jsx` | 도넛 차트 Canvas |
| AdminDashboardPage 미분류 경고 배너 | `AdminDashboardPage.jsx` | genre=null count |
| AdminPhotosPage 장르 컬럼 + 인라인 편집 | `AdminPhotosPage.jsx` | 팝오버 |
| AdminPhotosPage 벌크 체크박스 + 일괄 장르 | `AdminPhotosPage.jsx` | PUT /bulk-genre |
| AdminMembersPage 전문 장르 컬럼 | `AdminMembersPage.jsx` | 집계 API 필요 |
| AdminLayout 사이드바 메뉴 확장 | `AdminLayout.jsx` | 카테고리/태그/신고 링크 |
| 벌크 장르 API | `PhotoController.java` | PUT /photos/bulk-genre |

### Sprint 2 — AdminCategoryPage (1주)

| 작업 | 파일 |
|------|------|
| AdminCategoryPage 장르 통계 테이블 | `AdminCategoryPage.jsx` |
| 피처링 장르 ON/OFF 토글 | `AdminCategoryPage.jsx` + API |
| AI 일괄 분류 모달 + API | `PhotoController.java` → `/auto-classify` |
| 커스텀 카테고리 CRUD | `AdminCategoryPage.jsx` + `custom_genres` 테이블 |
| featured_genres DB + API | `GenreController.java` |

### Sprint 3 — AdminTagsPage (1주)

| 작업 | 파일 |
|------|------|
| 태그 목록 + 사용 수 API | `PhotoTagRepository.java` |
| AdminTagsPage 태그 테이블 | `AdminTagsPage.jsx` |
| 태그 병합 모달 + API | `POST /admin/tags/merge` |
| 유사 태그 감지 (Levenshtein) | `TagSimilarityService.java` |

### Sprint 4 — AdminModerationPage (1주)

| 작업 | 파일 |
|------|------|
| photo_reports 테이블 생성 | SQL migration |
| 신고 API (사용자용) | `POST /photos/:id/report` |
| AdminModerationPage UI | `AdminModerationPage.jsx` |
| 신고 처리·기각 API | `PUT /admin/reports/:id/...` |
| PhotoDetailPage ··· 신고 버튼 | `PhotoDetailPage.jsx` |

### Sprint 5 — 고도화 아이디어 (선택)

| 작업 | 우선순위 |
|------|---------|
| 에디터 픽 큐레이션 | P2 |
| 어드민 알림 벨 | P2 |
| 장르 리더보드 | P3 |
| 장르 SEO 랜딩 | P3 |
| 자동 분류 룰 편집기 | P3 |

---

## 9. 운영 DB 마이그레이션 SQL

```sql
-- 26번: photos 장르 컬럼 (이미 있으면 Skip)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS genre VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sub_genres VARCHAR(60);
CREATE INDEX IF NOT EXISTS idx_photos_genre ON photos(genre);

-- 29번: 피처링 장르
CREATE TABLE IF NOT EXISTS featured_genres (
  id         BIGSERIAL PRIMARY KEY,
  genre      VARCHAR(20) NOT NULL UNIQUE,
  priority   INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 29번: 커스텀 카테고리
CREATE TABLE IF NOT EXISTS custom_genres (
  id         BIGSERIAL PRIMARY KEY,
  code       VARCHAR(30) NOT NULL UNIQUE,
  label_ko   VARCHAR(30) NOT NULL,
  label_en   VARCHAR(30) NOT NULL,
  emoji      VARCHAR(10),
  color      VARCHAR(7),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 29번: 콘텐츠 신고
CREATE TABLE IF NOT EXISTS photo_reports (
  id             BIGSERIAL PRIMARY KEY,
  photo_id       BIGINT NOT NULL,
  reporter_email VARCHAR(255) NOT NULL,
  reason         VARCHAR(30) NOT NULL,
  detail         TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  resolved_by    BIGINT,
  resolved_at    TIMESTAMP,
  admin_note     TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_photo_reports_status  ON photo_reports(status);
CREATE INDEX IF NOT EXISTS idx_photo_reports_photo   ON photo_reports(photo_id);

-- 29번: 자동 분류 규칙
CREATE TABLE IF NOT EXISTS auto_genre_rules (
  id       BIGSERIAL PRIMARY KEY,
  keyword  VARCHAR(50) NOT NULL,
  genre    VARCHAR(30) NOT NULL
);

-- 29번: 에디터 픽 (아이디어)
CREATE TABLE IF NOT EXISTS editors_picks (
  id          BIGSERIAL PRIMARY KEY,
  photo_id    BIGINT NOT NULL,
  description TEXT,
  starts_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at     TIMESTAMP,
  created_by  BIGINT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 10. 프론트엔드 파일 구조

```
frontend/src/
├── pages/admin/
│   ├── AdminDashboardPage.jsx    (수정 — 장르 통계 + 도넛 차트 + 미분류 알림)
│   ├── AdminPhotosPage.jsx       (수정 — 장르 컬럼 + 인라인 편집 + 벌크)
│   ├── AdminMembersPage.jsx      (수정 — 전문 장르 컬럼)
│   ├── AdminCategoryPage.jsx     ← 신규
│   ├── AdminTagsPage.jsx         ← 신규
│   └── AdminModerationPage.jsx   ← 신규
│
├── components/admin/
│   ├── DonutChart.jsx            ← 신규 (Canvas 도넛 차트)
│   ├── GenreStatsBar.jsx         ← 신규 (장르별 가로 바 차트)
│   ├── InlineGenreEditor.jsx     ← 신규 (팝오버 장르 선택)
│   ├── BulkActionBar.jsx         ← 신규 (체크박스 선택 + 일괄 작업)
│   ├── FeaturedGenreToggle.jsx   ← 신규
│   ├── TagMergeModal.jsx         ← 신규
│   └── ModerationCard.jsx        ← 신규 (신고 카드)
│
└── components/layout/AdminLayout.jsx  (수정 — 메뉴 확장 + 알림 벨)
```

---

## 11. 수용 기준 (Acceptance Criteria)

### AC-01. 기존 대시보드 강화
- [ ] 장르별 사진 수 통계 카드가 표시된다
- [ ] 도넛 차트로 장르 분포를 시각화한다 (Canvas, 외부 라이브러리 없음)
- [ ] 미분류 사진이 있을 때 경고 배너가 표시된다
- [ ] 배너 클릭 시 AdminPhotosPage?genre=NONE 으로 이동한다

### AC-02. 사진 관리 장르 기능
- [ ] 장르 필터 드롭다운으로 특정 장르 사진만 필터링된다
- [ ] 장르 칩 클릭 시 인라인 팝오버로 즉시 변경 가능하다
- [ ] 체크박스 선택 후 일괄 장르 지정이 동작한다
- [ ] 변경 즉시 PUT API 호출 + UI 갱신된다

### AC-03. AdminCategoryPage
- [ ] 12개 장르 통계(사진 수, 좋아요, 이번 달 변화량)가 표시된다
- [ ] 피처링 토글 ON/OFF 즉시 저장된다 (최대 3개 제한)
- [ ] AI 일괄 분류 실행 후 결과 요약이 표시된다
- [ ] 커스텀 카테고리 추가/삭제가 동작한다

### AC-04. AdminTagsPage
- [ ] 태그 사용 빈도 목록이 표시된다
- [ ] 유사 태그 그룹이 자동 감지·표시된다
- [ ] 병합 실행 시 선택된 태그들이 대표 태그로 통합된다
- [ ] 삭제 시 연결된 사진에서도 태그가 제거된다

### AC-05. AdminModerationPage
- [ ] 신고 목록이 상태별 탭으로 표시된다
- [ ] 사진 삭제·신고 기각·경고 발송이 각각 동작한다
- [ ] 어드민 사이드바에 미처리 신고 수 배지가 표시된다
- [ ] PhotoDetailPage에 신고 버튼이 추가된다

---

## 12. Claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness Admin — 포트폴리오 갤러리 어드민
기술 스택: React 18 SPA, React Router v6, inline style
아이콘: 이모지/유니코드 (외부 아이콘 라이브러리 없음)

컬러 시스템:
  primary: '#5b6ef5'  primaryDark: '#4458e0'  primaryLight: '#eef0ff'
  bg: '#f7f7fb'  surface: '#ffffff'  surfaceDim: '#ededf4'  border: '#e5e5ed'
  text: '#1a1a2e'  textSecondary: '#5c5c7a'  textMuted: '#9090b0'
  danger: '#e53e3e'  success: '#22c55e'  warning: '#f59e0b'

[작업 요청]
어드민 카테고리 관리 페이지(AdminCategoryPage)를 React 컴포넌트로 만들어줘.

구성:
1. 페이지 헤더: "🏷️ 카테고리 관리" + [AI 일괄 분류] 버튼
2. 장르 통계 테이블:
   - 컬럼: 장르(이모지+이름) | 사진 수 | 좋아요 | 이번 달 증감 | 피처링 토글 | 관리
   - 12개 장르 더미 데이터로 표시
   - 피처링 토글: ON(★ 노란색 배경)/OFF(☆ 회색)
   - 미분류 행: 별도 섹션 (경고색 배경)
3. 도넛 차트 (Canvas 사용, 외부 라이브러리 없음):
   - 160×160px canvas로 장르 분포 그리기
   - 각 장르별 arc, 가운데 총 사진 수
   - 차트 우측에 범례 목록 (색상 사각형 + 장르명 + 퍼센트)
4. 피처링 설정 섹션:
   - "탐색 페이지 강조 장르 (최대 3개)" 안내
   - 현재 피처링된 장르 칩 표시
5. AI 일괄 분류 모달:
   - state로 open/close 관리
   - 미분류만 / 전체 라디오 선택
   - 실행 버튼 (위험 스타일)

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object, 외부 라이브러리 없음
- useState로 상태 관리
- 한국어 UI
- 불가역 작업은 window.confirm
- AdminLayout은 import 없이 최상단 div로 대체
```

---

*다음 단계: `00_ROADMAP.md` 29번 등록 → Sprint 1 AdminDashboardPage 장르 통계 카드부터 구현*
