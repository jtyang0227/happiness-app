# 29 — 방문자 분석 대시보드 (Visitor Analytics)

> 작성일: 2026-06-20  
> 상태: 기획 완료 (구현 대기)  
> 관련 기능: ProfilePage, PortfolioPage, 백엔드 신규 `analytics/` 모듈

---

## 1. 배경 및 목적

### 문제 정의

현재 작가는 자신의 포트폴리오가 얼마나 보여지는지, 어떤 사진이 인기 있는지 **전혀 알 수 없다**.

```
"내 포트폴리오를 몇 명이나 봤지?"  → 알 수 없음
"어떤 사진이 클라이언트 눈에 들었지?" → 알 수 없음
"문의는 어떤 경로로 들어왔지?"  → 알 수 없음
```

프로 사진작가에게 **데이터 기반 포트폴리오 운영**은 경쟁력이다.  
Squarespace·Format.com이 제공하는 방문자 분석을 앱 내에 내장한다.

### 수집할 데이터 (Privacy-first)

```
수집 O:
  - 포트폴리오 페이지뷰 (날짜·시간대별)
  - 사진별 노출 수 / 클릭(상세) 수
  - 좋아요·저장·공유 수 (기존 데이터 활용)
  - 납품 포털 열람 수 (Feature 28)
  - 문의 수신 수 (기존 inquiryApi)

수집 X (개인정보 최소화):
  - IP 주소 저장 안 함
  - 쿠키·핑거프린팅 없음
  - 방문자 식별자 없음
```

---

## 2. 대시보드 구성 5개 섹션

### 섹션 1 — 핵심 지표 카드 (KPI)

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 포트폴리오│ │   총 좋  │ │  총 저장  │ │  문의 수  │
│  방문 수  │ │  아요 수  │ │    수     │ │           │
│           │ │           │ │           │ │           │
│  1,247   │ │    342    │ │    89     │ │    12     │
│ ↑ 23% ▲  │ │  ↑ 8%   │ │  ↓ 2%   │ │  ↑ 50%   │
│ 이번 주   │ │  이번 달  │ │  이번 달  │ │  이번 달  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

각 카드 스타일:
```
background: surface (#ffffff)
border: 1px solid border (#e5e5ed)
border-radius: 16px
padding: 20px 24px
box-shadow: 0 2px 8px rgba(91,110,245,0.06)

숫자: 28px, font-weight 800, color: text
증감: 13px, ↑ = success (#22c55e), ↓ = danger (#e53e3e)
기간 레이블: 11px, textMuted
```

### 섹션 2 — 방문자 추이 차트

기간 선택: [7일] [30일] [90일] [1년]

```
Canvas API 기반 라인 차트 (외부 라이브러리 없음):

  Y축: 방문자 수 (0 ~ max, 4단계)
  X축: 날짜 (7일: 요일, 30일: 날짜, 90일: 주, 1년: 월)

  라인: 2px solid primary (#5b6ef5)
  Fill: gradient(primary 20%, transparent)
  포인트: 4px 원, hover 시 6px + 툴팁

툴팁:
  background: text (#0f0f1a), color: #fff
  border-radius: 8px, padding: 6px 10px
  "6월 15일  방문 142명"
```

### 섹션 3 — 인기 사진 TOP 5

```
┌─────────────────────────────────────────────────┐
│  인기 사진  [좋아요 기준 ▾]                       │
├─────────────────────────────────────────────────┤
│  1  [썸네일 48px]  봄 산책         ♥ 48  💾 12  │
│  2  [썸네일 48px]  여름 바다       ♥ 32  💾 8   │
│  3  [썸네일 48px]  가을 단풍       ♥ 28  💾 6   │
│  4  [썸네일 48px]  겨울 설경       ♥ 21  💾 5   │
│  5  [썸네일 48px]  도시의 밤       ♥ 18  💾 3   │
└─────────────────────────────────────────────────┘

정렬 기준 드롭다운: [좋아요 기준] [저장 기준] [공유 기준] [조회 기준]

각 행:
  순위 (15px, 700, textMuted)
  썸네일 (48×48px, border-radius 8px, object-fit cover)
  제목 (14px, 600)
  수치 (13px, textSecondary)
  클릭 시 → /photo/:id
```

### 섹션 4 — 장르별 분포 (도넛 차트)

Canvas API로 도넛 차트 구현:

```
반지름: outer 80px, inner 50px (도넛 형태)
색상: GENRE_META의 color 속성 사용
hover: 섹터 0.1 확대 (scale 애니메이션)
중앙 텍스트: 총 사진 수 / "장"

우측 범례:
  ● 인물  42장 (38%)
  ● 웨딩  28장 (25%)
  ● 풍경  18장 (16%)
  ● 기타   ...

차트 + 범례 flex 레이아웃 (gap: 32px)
```

### 섹션 5 — 문의 전환율 퍼널

```
포트폴리오 방문  1,247명  (100%)
        ↓
사진 상세 클릭     623명  (50%)
        ↓
포트폴리오 체류    312명  (25%)  /* 30초 이상 */
        ↓
문의하기 클릭       45명  (3.6%)
        ↓
문의 완료           12명  (0.9%)

각 단계: 수평 바 (너비 = 비율%)
전환율 레이블: 오른쪽 정렬, textMuted
```

---

## 3. 대시보드 위치 및 진입점

### 옵션 A (권장) — ProfilePage 새 탭
```
ProfilePage 탭 구조 변경:
  [내 작품] [저장함] [시리즈] [분석] [설정]
                               ↑ 새 탭
```

### 옵션 B — 독립 페이지
```
/analytics  (ProtectedRoute)
Header 네비게이션에 추가
```

권장: **옵션 A** (프로필 내 통합 — 탐색 깊이 최소화)

---

## 4. 데이터 수집 설계

### 4-1. 이벤트 테이블

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  event_type  VARCHAR(30) NOT NULL,
  target_type VARCHAR(20),          -- 'PHOTO' | 'PORTFOLIO' | 'DELIVERY'
  target_id   BIGINT,
  member_id   BIGINT NOT NULL,      -- 콘텐츠 소유 작가 (방문자 아님)
  visitor_token VARCHAR(32),        -- 세션 내 임시 토큰 (IP 저장 안 함)
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_member_type ON analytics_events(member_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ae_created ON analytics_events(created_at);
```

이벤트 타입:
```
PORTFOLIO_VIEW    — 포트폴리오 페이지 방문
PHOTO_CLICK       — 사진 상세 클릭
PHOTO_LIKE        — 좋아요 (기존 PhotoLike와 중복 방지)
PHOTO_SAVE        — 저장 (기존 PhotoSave)
PHOTO_SHARE       — 공유
INQUIRY_START     — 문의하기 버튼 클릭
INQUIRY_COMPLETE  — 문의 전송 완료
DELIVERY_VIEW     — 납품 포털 열람
```

### 4-2. 프론트엔드 이벤트 수집

```javascript
// hooks/useAnalytics.js
export function useAnalytics() {
  const trackEvent = useCallback(async (type, targetType, targetId) => {
    try {
      await analyticsApi.track({ eventType: type, targetType, targetId });
    } catch {} // 분석 실패는 조용히 무시
  }, []);
  return { trackEvent };
}

// 사용 예시 (PortfolioPage.jsx):
const { trackEvent } = useAnalytics();
useEffect(() => {
  trackEvent('PORTFOLIO_VIEW', 'PORTFOLIO', member.id);
}, [member.id]);
```

### 4-3. 집계 뷰 (성능 최적화)

```sql
-- 일별 집계 (배치 또는 실시간 GROUP BY)
CREATE OR REPLACE VIEW v_daily_portfolio_views AS
SELECT
  member_id,
  DATE(created_at) AS day,
  COUNT(*) AS view_count
FROM analytics_events
WHERE event_type = 'PORTFOLIO_VIEW'
GROUP BY member_id, DATE(created_at);
```

### 4-4. API 엔드포인트

```
GET /api/analytics/summary?memberId=&period=7d
  → { portfolioViews, totalLikes, totalSaves, inquiryCount, changes }

GET /api/analytics/daily?memberId=&period=30d
  → [{ date, views }, ...]

GET /api/analytics/top-photos?memberId=&metric=likes&limit=5
  → [{ photo, likeCount, saveCount, shareCount }, ...]

GET /api/analytics/genre-distribution?memberId=
  → [{ genre, count, percentage }, ...]

GET /api/analytics/funnel?memberId=
  → { portfolioViews, photoClicks, dwellTime30s, inquiryStarts, inquiryCompletes }

POST /api/analytics/track (인증 불필요, rate-limited)
  Body: { eventType, targetType, targetId }
  → 204 No Content
```

---

## 5. Canvas 차트 구현 (외부 라이브러리 없음)

### 라인 차트 컴포넌트

```jsx
function LineChart({ data, width = 600, height = 200, color = '#5b6ef5' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');

    // 데이터 정규화
    const max = Math.max(...data.map(d => d.value));
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * (width - 40) + 20,
      y: height - 20 - ((d.value / max) * (height - 40)),
    }));

    // 그라디언트 fill
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}33`);
    gradient.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - 20);
    ctx.lineTo(points[0].x, height - 20);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 라인
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
```

### 도넛 차트 컴포넌트

```jsx
function DonutChart({ data, size = 160 }) {
  const canvasRef = useRef(null);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const outer = size * 0.4, inner = size * 0.25;
    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);
    data.forEach(({ color, count }) => {
      const slice = (count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, outer, startAngle, startAngle + slice);
      ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
      ctx.fillStyle = color;
      ctx.fill();
      startAngle += slice;
    });

    // 중앙 텍스트
    ctx.fillStyle = '#0f0f1a';
    ctx.font = `bold 20px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.font = `11px sans-serif`;
    ctx.fillStyle = '#8888bb';
    ctx.fillText('장', cx, cy + 18);
  }, [data]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
```

---

## 6. 반응형 설계

| 구간 | KPI 카드 | 차트 | 인기 사진 |
|------|---------|------|---------|
| ≥1024px | 4열 가로 | 전체 너비 | 우측 사이드 패널 |
| 768~1023px | 2×2 그리드 | 전체 너비 | 아래 목록 |
| <768px | 2×2 (작게) | 전체 너비 스크롤 | 세로 목록 |

---

## 7. 스프린트 계획

### Sprint 1 — 이벤트 수집 (3일)
| 작업 | 파일 |
|------|------|
| analytics_events 테이블 + AnalyticsEvent 엔티티 | SQL, `AnalyticsEvent.java` |
| 이벤트 트래킹 API | `AnalyticsController.java` |
| useAnalytics 훅 | `hooks/useAnalytics.js` |
| PortfolioPage · PhotoDetailPage에 트래킹 삽입 | 각 페이지 |

### Sprint 2 — 집계 API + 차트 (1주)
| 작업 | 파일 |
|------|------|
| 집계 API 5종 | `AnalyticsController.java` |
| LineChart 컴포넌트 (Canvas) | `components/analytics/LineChart.jsx` |
| DonutChart 컴포넌트 (Canvas) | `components/analytics/DonutChart.jsx` |
| KPI 카드 컴포넌트 | `components/analytics/KpiCard.jsx` |

### Sprint 3 — 대시보드 통합 (3일)
| 작업 | 파일 |
|------|------|
| AnalyticsDashboard 페이지 | `pages/AnalyticsDashboard.jsx` |
| ProfilePage [분석] 탭 추가 | `ProfilePage.jsx` |
| 인기 사진 Top5 컴포넌트 | `components/analytics/TopPhotos.jsx` |
| 전환율 퍼널 컴포넌트 | `components/analytics/ConversionFunnel.jsx` |

---

## 8. 수용 기준 (Acceptance Criteria)

### AC-01. 데이터 수집
- [ ] 포트폴리오 방문 시 자동으로 PORTFOLIO_VIEW 이벤트가 기록된다
- [ ] IP 주소·쿠키가 저장되지 않는다
- [ ] track API 실패 시 UI에 영향 없다

### AC-02. KPI 카드
- [ ] 4가지 지표가 카드로 표시된다
- [ ] 이전 기간 대비 증감 %가 표시된다

### AC-03. 차트
- [ ] 방문자 추이 라인 차트가 7/30/90/365일 기준으로 표시된다
- [ ] 장르별 도넛 차트가 정확한 비율로 표시된다
- [ ] 외부 차트 라이브러리 없이 Canvas로 구현된다

### AC-04. 인기 사진
- [ ] 좋아요/저장/공유/조회 기준 정렬이 동작한다
- [ ] 클릭 시 해당 사진 상세 페이지로 이동한다

---

## 9. Claude.ai 아티팩트 프롬프트 (시각 목업용)

```
아래 스펙으로 "방문자 분석 대시보드" React 컴포넌트 목업을 만들어줘.

[요구사항]

1. KPI 카드 4개 (가로 배열)
   - 포트폴리오 방문: 1,247 / ↑ 23% 이번 주
   - 총 좋아요: 342 / ↑ 8% 이번 달
   - 총 저장: 89 / ↓ 2% 이번 달
   - 문의 수: 12 / ↑ 50% 이번 달
   카드 스타일: white, border, shadow, border-radius 16px

2. 방문자 추이 라인 차트 (Canvas API 직접 구현)
   - 최근 7일 더미 데이터로 라인+그라디언트 fill 그리기
   - X축: 요일 (월~일), Y축: 방문자 수
   - primary 색상 (#5b6ef5)
   - 기간 탭: [7일] [30일] [90일] [1년]

3. 인기 사진 TOP 5 목록
   - 순위 + 썸네일 (placeholder 색 박스) + 제목 + 좋아요/저장 수
   - hover 시 배경색 변경
   - 정렬 드롭다운: [좋아요] [저장] [공유]

4. 장르별 도넛 차트 (Canvas API)
   - 5개 장르 데이터로 도넛 그리기
   - 우측 범례 (●색상 + 장르명 + 수량 + %)
   - 중앙에 총 사진 수 표시

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5', primaryDark: '#4458e0', primaryLight: '#eef0ff'
  accent: '#a78bfa'
  bg: '#f7f7fb', surface: '#ffffff', surfaceDim: '#ededf4', border: '#e5e5ed'
  text: '#0f0f1a', textSecondary: '#5555aa', textMuted: '#8888bb'
  danger: '#e53e3e', success: '#22c55e'

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react만 허용)
- Canvas를 useRef + useEffect로 직접 구현 (차트 라이브러리 금지)
- useState로 기간 탭, 정렬 기준 상태 관리
- 한국어 UI 텍스트
```
