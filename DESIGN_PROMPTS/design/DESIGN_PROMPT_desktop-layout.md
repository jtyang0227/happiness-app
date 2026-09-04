# DESIGN_PROMPT — 데스크탑 페이지 maxWidth + 2컬럼 레이아웃
> Feature 38-A4 | 2026-09-04 | Toss 디자인 시스템

기획 원문: `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` — 섹션 A-4

---

## 시스템 컨텍스트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'
  darkBg:        '#111417'
  darkSurface:   '#1A1E22'
  galleryBg:     '#111417'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용
```

---

## 배경 및 목적

1440px 데스크탑에서 `FeedPage`, `MeetsPage`, `BookingDashboard`, `InquiryInboxPage` 등
주요 페이지들이 단일 컬럼으로 너무 넓게 늘어난다(텍스트 행 길이 75자 초과, 카드 과도 확장).
maxWidth 제한과 2컬럼 레이아웃으로 데스크탑 가독성과 공간 활용을 개선한다.

---

## 1. FeedPage — 단일 컬럼 maxWidth 680px

### 와이어프레임

```
모바일 (<768px)
┌─────────────────────┐
│ [피드 카드]          │  100% 너비
│ [피드 카드]          │
│ [피드 카드]          │
└─────────────────────┘

데스크탑 (≥1024px)
┌─────────────────────────────────────────────────┐  앱 배경 #F2F4F6
│          │ ←──── 680px ────→ │                  │
│          │ [피드 카드]         │                  │
│          │ [피드 카드]         │                  │
│          │ [피드 카드]         │                  │
│          └────────────────────┘                  │
│               auto margin 좌우                   │
└──────────────────────────────────────────────────┘

태블릿 (768~1023px) — C-3에서 별도 처리: 2컬럼 그리드
```

### 컨테이너 스펙

| 속성                 | 값                              |
|----------------------|---------------------------------|
| maxWidth             | 680px                           |
| margin               | `0 auto`                        |
| padding              | `0 16px` (좌우 여백 일관성)      |
| width                | `100%` (maxWidth 이하 화면 대응) |

### 피드 카드 스펙

```
┌────────────────────────────────────────────────────┐
│ [아바타 32px] 작가명                      12.03.15 │  ← 카드 헤더, padding 12px 16px
├────────────────────────────────────────────────────┤
│                                                    │
│              사진 이미지 영역                       │  ← 16:9 또는 원본 비율, max-height 480px
│           (aspect-ratio: auto)                     │
│                                                    │
├────────────────────────────────────────────────────┤
│ ♡ 24  💬 8  🔖                           ···      │  ← 액션 바, padding 10px 16px
├────────────────────────────────────────────────────┤
│ 제목 텍스트                                        │  ← fontSize 15px, fontWeight 600
│ 설명 1~2줄 (line-clamp 2)                          │  ← fontSize 14px, color #4E5968
└────────────────────────────────────────────────────┘
```

| 속성              | 값                                    |
|-------------------|---------------------------------------|
| 카드 bg           | `#ffffff`                             |
| 카드 border       | `1px solid #E5E8EB`                   |
| 카드 borderRadius | 12px                                  |
| 카드 marginBottom | 16px                                  |
| 카드 hover        | `translateY(-2px)`, `box-shadow: 0 4px 16px rgba(0,0,0,0.08)` |
| hover transition  | `transform 0.15s ease, box-shadow 0.15s ease` |
| 아바타            | 32px × 32px, borderRadius 50%, bg `#E5E8EB` |
| 작가명 fontSize   | 14px, fontWeight 600, color `#191F28`  |
| 날짜 fontSize     | 12px, color `#8B95A1`                 |
| 액션 아이콘 color | `#8B95A1`, hover `#3182F6`            |

---

## 2. MeetsPage — 2컬럼 레이아웃 (데스크탑 ≥1024px)

### 와이어프레임

```
모바일 (<768px)
┌─────────────────────┐
│ ── 탭 필터 ──        │
│ [약속 카드]          │
│ [약속 카드]          │
└─────────────────────┘

데스크탑 (≥1024px)
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──── 320px ────┐  │  ┌──── flex-1 ─────────────────────┐  │
│  │ ── 탭 필터 ── │  │  │  미리보기 패널                   │  │
│  ├───────────────┤  │  │                                  │  │
│  │ [카드] 상대   │  │  │  [선택된 약속 상세]              │  │
│  │ 날짜 · 상태   │  │  │                                  │  │
│  ├───────────────┤  │  │  상대방 정보                     │  │
│  │ [카드] 상대   │  │  │  확정 날짜/장소                   │  │
│  │ 날짜 · 상태   │  │  │  최근 메시지 2줄                 │  │
│  │               │  │  │                                  │  │
│  │ ...           │  │  │  [상세 보기 →] 버튼              │  │
│  └───────────────┘  │  └──────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
  좌 320px 고정       구분선 1px border    우 flex-1
```

### 레이아웃 컨테이너 스펙

```javascript
// 데스크탑 레이아웃 컨테이너
const desktopLayoutStyle = {
  display: 'flex',
  flexDirection: 'row',
  height: 'calc(100vh - 60px)',  // 헤더 60px 제외
  gap: 0,
};

// 좌 패널 (목록)
const leftPanelStyle = {
  width: 320,
  flexShrink: 0,
  borderRight: '1px solid #E5E8EB',
  overflowY: 'auto',
  background: '#ffffff',
};

// 우 패널 (미리보기)
const rightPanelStyle = {
  flex: 1,
  padding: '32px 40px',
  overflowY: 'auto',
  background: '#F2F4F6',
};
```

### 약속 목록 카드 스펙 (좌 패널)

```
┌───────────────────────────────┐
│ [아바타 40px]  상대방 이름     │  ← padding 14px 16px
│               @프로필명       │
│               ● CONFIRMED     │  ← 상태 배지 (색상은 아래 표)
│               12.10 14:00    │  ← fontSize 12px, color #8B95A1
└───────────────────────────────┘
```

| 상태          | 배지 bg       | 배지 color   |
|---------------|--------------|-------------|
| PENDING       | `#FFF3E0`    | `#F59E0B`   |
| NEGOTIATING   | `#E8F3FF`    | `#3182F6`   |
| CONFIRMED     | `#E5F9F0`    | `#00C471`   |
| COMPLETED     | `#F2F4F6`    | `#8B95A1`   |
| CANCELLED     | `#FFEEEF`    | `#F04452`   |

| 속성                  | 값                                             |
|-----------------------|------------------------------------------------|
| 카드 선택 상태 bg      | `#E8F3FF`                                      |
| 카드 선택 상태 border  | `2px solid #3182F6` (좌측 accent bar 방식)      |
| 카드 hover bg          | `#F5F6F8` (surfaceDim)                         |
| 카드 transition        | `background 0.1s ease`                         |
| 배지 borderRadius      | 4px                                            |
| 배지 padding           | `2px 8px`                                      |
| 배지 fontSize          | 11px, fontWeight 600                           |

### 미리보기 패널 상태

```
선택된 약속이 없을 때:
  ┌──────────────────────────────────┐
  │                                  │
  │          🤝                      │  ← 이모지 48px
  │    약속을 선택하세요              │  ← fontSize 16px, color #8B95A1
  │                                  │
  └──────────────────────────────────┘

선택 후:
  상대방 아바타(64px) + 이름 + 상태배지
  ──────────────────── 구분선 ────────────────────
  확정 날짜: 12월 10일 14:00
  장소: 서울 마포구 홍대입구역 근처
  ──────────────────── 구분선 ────────────────────
  최근 메시지 2줄 (color #4E5968)
  [채팅으로 이동 →] 버튼 (secondary variant)
```

---

## 3. InquiryInboxPage — maxWidth 800px

### 와이어프레임

```
데스크탑 (≥1024px)
┌───────────────────────────────────────────────────────────┐
│         ┌── maxWidth 800px ──────────────────────────┐    │
│         │                                            │    │
│         │  받은 문의함                               │    │
│         │  ─────────────────────────────────────     │    │
│         │  [문의 카드] 홍길동 / 웨딩 / 12.01          │    │
│         │  [문의 카드] 이영희 / 인물 / 11.28          │    │
│         │  [문의 카드] 박철수 / 풍경 / 11.25          │    │
│         │                                            │    │
│         └────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

### 문의 카드 스펙

```
┌──────────────────────────────────────────────────────────────┐
│  [미읽음 점 ●]  홍길동         웨딩 / 2026.12.01            │
│                 "12월 둘째 주 웨딩 촬영 문의드립니다..."      │  ← line-clamp 2
│                 예산: 50~100만원 / 날짜: 12월 8일            │
└──────────────────────────────────────────────────────────────┘
```

| 속성                | 값                                              |
|---------------------|-------------------------------------------------|
| 카드 padding        | 16px 20px                                       |
| 카드 bg             | `#ffffff`                                       |
| 카드 borderRadius   | 10px                                            |
| 카드 marginBottom   | 8px                                             |
| 미읽음 점           | width 8px, height 8px, borderRadius 50%, bg `#3182F6`, marginRight 10px |
| 발신자명 fontSize   | 15px, fontWeight 600, color `#191F28`           |
| 촬영 유형 badge     | bg `#E8F3FF`, color `#3182F6`, fontSize 11px, borderRadius 4px, padding `2px 8px` |
| 날짜 fontSize       | 12px, color `#8B95A1`                           |
| 미리보기 텍스트     | fontSize 13px, color `#4E5968`, lineClamp 2     |
| 카드 hover          | `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, `translateY(-1px)` |
| hover transition    | `all 0.15s ease`                                |

---

## 4. BookingDashboard — 2컬럼 레이아웃 (데스크탑 ≥1024px)

### 와이어프레임

```
모바일 (<768px)
┌─────────────────────┐
│ [탭: 전체/대기/확정] │
│ [예약 카드]          │
│ [예약 카드]          │
└─────────────────────┘

데스크탑 (≥1024px)
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌──── 360px ────────────┐  │  ┌──── flex-1 ──────────────────┐  │
│  │ [탭: 전체/대기/확정]   │  │  │  예약 상세 패널              │  │
│  ├───────────────────────┤  │  │                              │  │
│  │ [예약 카드]            │  │  │  촬영 유형: 웨딩             │  │
│  │  홍길동 / 12.10 / 웨딩 │  │  │  날짜: 2026.12.10 14:00     │  │
│  │  ● REQUESTED          │  │  │  고객: 홍길동 010-1234-5678  │  │
│  ├───────────────────────┤  │  │  메모: 야외 웨딩 촬영...     │  │
│  │ [예약 카드]            │  │  │                              │  │
│  │  이영희 / 12.15 / 인물 │  │  │  ──── 액션 ────             │  │
│  │  ● CONFIRMED          │  │  │  [확정] [거절] 버튼           │  │
│  │                       │  │  │                              │  │
│  └───────────────────────┘  │  └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
  좌 360px 고정              구분선                 우 flex-1
```

### 레이아웃 컨테이너 스펙

```javascript
// 데스크탑 컨테이너
const bookingLayoutStyle = {
  display: 'flex',
  flexDirection: 'row',
  height: 'calc(100vh - 60px)',
  gap: 0,
};

// 좌 패널 (예약 목록)
const bookingListPanelStyle = {
  width: 360,
  flexShrink: 0,
  borderRight: '1px solid #E5E8EB',
  overflowY: 'auto',
  background: '#ffffff',
};

// 우 패널 (상세)
const bookingDetailPanelStyle = {
  flex: 1,
  padding: '32px 40px',
  overflowY: 'auto',
  background: '#F2F4F6',
};
```

### 예약 목록 카드 스펙

| 속성                 | 값                                              |
|----------------------|-------------------------------------------------|
| 카드 padding         | 14px 16px                                       |
| 촬영 유형 fontSize   | 14px, fontWeight 600, color `#191F28`           |
| 고객명 fontSize      | 13px, color `#4E5968`                           |
| 날짜 fontSize        | 12px, color `#8B95A1`                           |
| 상태 배지 border     | REQUESTED: `#FFB800` (warning), CONFIRMED: `#00C471` (success) |
| 선택 상태 accent bar | `borderLeft: 3px solid #3182F6`, bg `#E8F3FF`  |

### 상세 패널 상태

```
선택 없을 때 (empty state):
  📅
  예약을 선택하면 상세 내용을 확인할 수 있습니다

REQUESTED 상태:
  [확정] primary 버튼  [거절] danger ghost 버튼
  → 거절 클릭 시 거절 사유 textarea (inline 확장)

CONFIRMED 상태:
  확정 안내 배너 (bg #E5F9F0, color #00C471)
  [취소 요청] danger ghost 버튼 (우하단)
```

---

## 반응형 브레이크포인트 요약

| 페이지             | <768px      | 768~1023px                   | ≥1024px                        |
|--------------------|-------------|------------------------------|-------------------------------|
| FeedPage           | 단일 컬럼   | 2컬럼 그리드 (C-3 별도 스펙)  | maxWidth 680px 중앙정렬        |
| MeetsPage          | 단일 컬럼   | 단일 컬럼 (maxWidth 없음)     | 좌 320px + 우 flex-1           |
| InquiryInboxPage   | 단일 컬럼   | maxWidth 800px 중앙정렬       | maxWidth 800px 중앙정렬        |
| BookingDashboard   | 단일 컬럼   | 단일 컬럼                     | 좌 360px + 우 flex-1           |

구현 시 `mq.tabletUp`(`min-width:768px`)와 `mq.desktop`(`min-width:1024px`) 토큰 사용.
BP 직접 숫자 비교(`window.innerWidth < 1024`) 대신 CSS `<style>` 태그 주입 방식 사용.

---

## Claude.ai 아티팩트 요청 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지/유니코드만 사용

컬러 토큰 (Toss 디자인 시스템):
  primary:      '#3182F6'
  primaryLight: '#E8F3FF'
  bg:           '#F2F4F6'
  surface:      '#ffffff'
  surfaceDim:   '#F5F6F8'
  border:       '#E5E8EB'
  text:         '#191F28'
  textSecondary:'#4E5968'
  textMuted:    '#8B95A1'
  danger:       '#F04452'
  success:      '#00C471'
  warning:      '#FFB800'

규칙: export default 컴포넌트 1개, inline style, 외부 라이브러리 없음, 한국어 UI,
blur/glassmorphism/그라디언트 오브 금지, 그림자는 rgba(0,0,0,0.04~0.12)만.

다음 4개 페이지의 데스크탑 레이아웃 데모를 하나의 컴포넌트로 보여줘.
탭 전환 UI로 각 페이지 간 이동 가능하게 구성해라.

1. FeedPage 데스크탑:
   - 전체 배경 #F2F4F6
   - 콘텐츠 컨테이너: maxWidth 680px, margin 0 auto, padding 0 16px
   - 피드 카드 3개 예시:
     * 카드: bg #fff, border 1px solid #E5E8EB, borderRadius 12px, marginBottom 16px
     * 헤더 영역 padding 12px 16px: 아바타(32px 원형, bg #E5E8EB) + 작가명(14px 600 #191F28) + 날짜(12px #8B95A1)
     * 이미지 placeholder: bg #F2F4F6, aspectRatio 4/3
     * 액션 바 padding 10px 16px: ♡ 24  💬 8  🔖 (fontSize 14px, color #8B95A1)
     * 텍스트 영역 padding 12px 16px: 제목(15px 600) + 설명 2줄(14px #4E5968)
     * hover: translateY(-2px) + box-shadow 0 4px 16px rgba(0,0,0,0.08)
     * transition: all 0.15s ease

2. MeetsPage 데스크탑 2컬럼:
   - 전체 배경 #F2F4F6
   - 좌 패널(320px): bg #fff, borderRight 1px solid #E5E8EB, height calc(100vh - 60px), overflowY auto
     * 탭 바(전체/대기중/조율중/확정/완료): padding 12px 16px, fontSize 13px, 활성탭 color #3182F6 borderBottom 2px solid #3182F6
     * 약속 카드 3개: padding 14px 16px, 선택된 카드는 borderLeft 3px solid #3182F6 bg #E8F3FF
     * 각 카드: 아바타(40px) + 이름(14px 600) + 상태배지 + 날짜(12px #8B95A1)
   - 구분선: borderRight 1px solid #E5E8EB
   - 우 패널(flex-1): bg #F2F4F6, padding 32px 40px
     * 선택된 약속 상세: 아바타 64px + 이름 + 상태배지
     * 구분선: borderBottom 1px solid #E5E8EB, margin 20px 0
     * 정보 행: 날짜/장소/메모 각 fontSize 14px
     * 액션 버튼: [채팅으로 이동 →] secondary 버튼

3. InquiryInboxPage maxWidth 800px:
   - 전체 배경 #F2F4F6
   - 컨테이너: maxWidth 800px, margin 0 auto, padding 24px 16px
   - 문의 카드 3개:
     * bg #fff, borderRadius 10px, padding 16px 20px, marginBottom 8px
     * 미읽음 점: 8px 원형 bg #3182F6
     * 발신자명(15px 600) + 촬영유형 배지(bg #E8F3FF color #3182F6, 11px, borderRadius 4px) + 날짜(12px #8B95A1)
     * 미리보기 텍스트 2줄: fontSize 13px, color #4E5968
     * hover: box-shadow 0 2px 8px rgba(0,0,0,0.06) + translateY(-1px)

4. BookingDashboard 데스크탑 2컬럼:
   - 좌 패널(360px): bg #fff, borderRight 1px solid #E5E8EB
     * 탭: 전체/대기중/확정/완료
     * 예약 카드 3개: 촬영유형(14px 600) + 고객명(13px #4E5968) + 날짜(12px #8B95A1) + 상태배지
     * 선택 카드: borderLeft 3px solid #3182F6, bg #E8F3FF
   - 우 패널(flex-1): bg #F2F4F6, padding 32px 40px
     * 확정 안내 or 액션 버튼 영역
     * 선택 없으면 EmptyState: 📅 이모지 + "예약을 선택하면 상세 내용을 확인할 수 있습니다"

React state로 탭 선택 및 카드 선택 상태 관리.
```
