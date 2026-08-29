# DESIGN_PROMPT — 웹 Cosmos 화이트 테마 2차 완성
> Feature: Web Cosmos Completion | 2026-08-23 | AKIRA Neo-Tokyo × Cosmos Light

연관 문서:
- `DESIGN_PROMPT_cosmos-light-theme.md` — 1차 완성 (Gallery/Explore/PhotoCard/Header)
- `DESIGN_PROMPT_akira-neo-tokyo-concept.md` — 컬러 토큰 정의
- `PLANNING_multiplatform-uiux-improvement.md` — 기획 기반

---

## 시스템 컨텍스트

```
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (AKIRA Neo-Tokyo 액센트):
  primary:       '#E8121A'
  primaryDark:   '#A80D14'
  primaryLight:  '#ffe9e7'
  accent:        '#22D3EE'
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  borderLight:   '#ededf5'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'
  textHint:      '#b8b8d0'
  danger:        '#e53e3e'
  galleryBg:     '#0e0e0e'   ← 이미지 뷰어 전용 예외값

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- glass.js / GLASS / GLASS_KEYFRAMES / SPRING 상수 사용 금지 (폐기된 모듈)
- 한국어 UI 텍스트
```

---

## 적용 대상 3개 화면

| 화면 | 파일 | 문제 | 우선순위 |
|------|------|------|---------|
| FeedPage | `frontend/src/pages/FeedPage.jsx` | glass.js 의존, 인디고 그라디언트 배경 | P0 |
| PhotoDetailPage | `frontend/src/pages/PhotoDetailPage.jsx` | 데스크탑 래퍼 bg `#0e0e0e` — 화이트 앱에서 전면 다크 페이지 | P0 (기획서 P1에서 상향) |
| PortfolioPage FollowListModal | `frontend/src/pages/PortfolioPage.jsx` | 6개 하드코딩 다크 hex | P0 |

> **디자이너 우선순위 이견**: 기획서는 PhotoDetailPage를 P1로 분류했지만, 데스크탑에서 화이트 GalleryPage→PhotoDetailPage 이동 시 전체 뷰포트가 `#0e0e0e`로 전환되는 충격이 크다. Cosmos Light 전환의 "1차 완료" 이미지가 훼손되므로 P0로 상향을 권장한다. 단, 이미지 섹션 자체는 다크를 유지하는 것이 감상 UX상 옳다(Unsplash/500px 동일 패턴).

---

## 1. FeedPage — Cosmos 피드 카드 전환

### 1-1 와이어프레임

```
[데스크탑 1280px]
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (PC 상단 네비)                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ bg: COLORS.bg (#f5f5fa)                                                     │
│                                                                              │
│  ┌─ maxWidth: 680px, margin: 0 auto, padding: 16px ─────────────────────┐   │
│  │                                                                       │   │
│  │  "팔로우 피드"  fontSize:22 fontWeight:800 color:COLORS.text         │   │
│  │  "팔로잉하는 작가의 새 작품"  fontSize:14 color:textSecondary        │   │
│  │                                                                       │   │
│  │  ┌── FeedCard ──────────────────────────────────────────────────┐    │   │
│  │  │ bg: COLORS.surface (#ffffff)                                  │    │   │
│  │  │ border: 1px solid COLORS.border (#e2e2ee)                     │    │   │
│  │  │ border-radius: 16px                                           │    │   │
│  │  │ overflow: hidden                                              │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌ 작가 헤더 (padding: 12px 16px) ─────────────────────────┐ │    │   │
│  │  │  │ [AV 40px] 작가이름 14px 700 text                        │ │    │   │
│  │  │  │           @profileName 12px textMuted          N분 전    │ │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘ │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌ 이미지 (width:100%, aspectRatio:4/3) ───────────────────┐ │    │   │
│  │  │  │                                                          │ │    │   │
│  │  │  │              [사진]                                       │ │    │   │
│  │  │  │                                                          │ │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘ │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌ 카드 하단 (padding: 12px 16px) ──────────────────────────┐ │    │   │
│  │  │  │ 제목 14px 600 text          ♥ 좋아요수  🔖 저장수         │ │    │   │
│  │  │  │ [무드 배지] [장르 배지]                                   │ │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘ │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  ┌── FeedCard ──────────────────────────────────────────────────┐    │   │
│  │  │  (반복 — 단일 컬럼 피드)                                      │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  [더 보기] 버튼 (secondary variant, 전체 너비)                        │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘

[모바일 < 768px]
단일 컬럼, 전체 너비 카드, padding: 0 12px
```

### 1-2 컴포넌트 스펙

#### 페이지 레이아웃
```javascript
// 페이지 루트
{
  minHeight: '100vh',
  background: COLORS.bg,          // '#f5f5fa' — 인디고 그라디언트 제거
  paddingBottom: 80,              // 모바일 BottomNav 여백
}

// 피드 컨테이너
{
  maxWidth: 680,
  margin: '0 auto',
  padding: isMobile ? '16px 12px' : '24px 16px',
}

// 섹션 헤더
{
  marginBottom: 24,
}
// 제목
{ fontSize: 22, fontWeight: 800, color: COLORS.text, margin: 0 }
// 부제
{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }
```

#### FeedCard (glass.js 완전 제거)
```javascript
// 카드 컨테이너 — glass() 대신 plain surface
{
  background: COLORS.surface,                    // '#ffffff'
  border: `1px solid ${COLORS.border}`,          // '#e2e2ee'
  borderRadius: 16,
  overflow: 'hidden',
  marginBottom: 16,
  // glass의 backdrop-filter/box-shadow 완전 제거
  // SPRING 상수 사용 금지
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  cursor: 'pointer',
}

// hover 상태 (onMouseEnter)
{
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 20px rgba(26,26,46,0.10)',  // 라이트 그림자
}

// 작가 헤더
{
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  borderBottom: `1px solid ${COLORS.borderLight}`,
}

// 아바타
{
  width: 40, height: 40,
  borderRadius: '50%',
  flexShrink: 0,
  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
  // primary avatar 그라디언트: AKIRA 레드+시안 유지
}

// 이미지 영역
{
  width: '100%',
  aspectRatio: '4/3',         // glass 시절 고정 높이 제거, 비율 기반으로
  objectFit: 'cover',
  display: 'block',
}

// 카드 하단
{
  padding: '12px 16px',
}

// 제목
{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }

// 액션 영역 (좋아요/저장)
{
  display: 'flex',
  alignItems: 'center',
  gap: 16,
}

// 액션 버튼 텍스트
{ fontSize: 13, color: COLORS.textSecondary }
// 활성 좋아요
{ color: COLORS.primary }   // AKIRA 레드
// 활성 저장
{ color: COLORS.accent }    // 네온 시안
```

#### 빈 상태 (팔로잉 없을 때)
```javascript
// glass.js DotEmptyState 그대로 사용 가능하되, wrapper 배경만 COLORS.bg
{
  textAlign: 'center',
  padding: '80px 20px',
}
// 아이콘: '📷' fontSize: 56, marginBottom: 16
// 제목: "아직 팔로우한 작가가 없어요" fontSize:18 fontWeight:700 color:COLORS.text
// 부제: "탐색에서 마음에 드는 작가를 팔로우해보세요" fontSize:14 color:COLORS.textSecondary marginTop:8
// CTA 버튼: background:COLORS.primary color:'#fff' borderRadius:12 padding:'10px 24px'
```

#### 스켈레톤 로딩
```javascript
// SkeletonFeedCard: glass.js 사용 없이 plain surface로
{
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  overflow: 'hidden',
  marginBottom: 16,
}
// 내부 shimmer 블록: background: COLORS.surfaceDim (#ededf4)
// shimmer 애니메이션: opacity 0.5→1→0.5, 1.5s infinite
```

### 1-3 제거 목록 (glass.js 의존 코드)
```javascript
// 제거할 import
import { glass, GLASS, GLASS_KEYFRAMES, SPRING } from '../constants/glass';

// 제거할 사용처
- glass('light')                      → background: COLORS.surface
- GLASS.light.shadow                  → '0 2px 12px rgba(26,26,46,0.08)'
- GLASS.light.shadowStrong            → '0 4px 20px rgba(26,26,46,0.12)'
- GLASS.light.surface                 → COLORS.surface
- GLASS.light.border                  → COLORS.border
- GLASS.light.blur (backdrop-filter)  → 제거 (flat card)
- SPRING (cubic-bezier)               → 'ease'
- animation: glassIn keyframe         → 제거
- 페이지 배경 linear-gradient          → COLORS.bg
```

---

## 2. PhotoDetailPage — 데스크탑 래퍼 배경 수정

### 2-1 와이어프레임

```
[데스크탑 > 768px]
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header                                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ bg: COLORS.bg (#f5f5fa)  ← 변경 지점: 현재 #0e0e0e → COLORS.bg            │
│                                                                              │
│  ← [뒤로가기] 버튼 (좌상단, bg:rgba(0,0,0,0) → 화이트 테마에서는 text 버튼으로)│
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ display:flex, 가로 2분할                                                │  │
│  │                                                                        │  │
│  │  ┌── 이미지 섹션 (flex:0 0 58%) ─────────────────────────────────┐    │  │
│  │  │ bg: COLORS.galleryBg (#0e0e0e)  ← 다크 유지 (사진 감상 영역)  │    │  │
│  │  │ minHeight: 100vh                                               │    │  │
│  │  │                                                                │    │  │
│  │  │  ← → 네비게이션 화살표 (다크 배경 위 흰 버튼)                   │    │  │
│  │  │                                                                │    │  │
│  │  │         [사진]  objectFit:contain                              │    │  │
│  │  │                                                                │    │  │
│  │  │  ⛶ 전체화면 버튼 (우하단 오버레이)                              │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                        │  │
│  │  ┌── 정보 패널 (flex:1) ─────────────────────────────────────────┐    │  │
│  │  │ bg: COLORS.surface (#ffffff)  ← 이미 화이트, 변경 없음         │    │  │
│  │  │ overflow-y: auto                                               │    │  │
│  │  │                                                                │    │  │
│  │  │  제목, 작가, 장르 배지                                          │    │  │
│  │  │  무드 칩, 좋아요/저장/공유                                      │    │  │
│  │  │  EXIF 정보 섹션                                                │    │  │
│  │  │  댓글 섹션                                                     │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

[모바일 < 768px]
세로 스택: 이미지(16:9 비율, bg:#0e0e0e) + 정보 패널(bg:COLORS.bg) — 변경 없음
```

### 2-2 컴포넌트 스펙

#### 핵심 변경: 데스크탑 래퍼
```javascript
// 변경 전
{
  minHeight: '100vh',
  background: isMobile ? COLORS.bg : '#0e0e0e',  // ← 문제
}

// 변경 후
{
  minHeight: '100vh',
  background: COLORS.bg,                          // 항상 라이트 배경
}
// 이미지 섹션 내부에서 별도로 galleryBg 적용
```

#### 이미지 섹션 (다크 유지)
```javascript
// 이미지 섹션 — 변경 없음, 명시적으로 다크 유지
{
  flex: '0 0 58%',
  background: COLORS.galleryBg,   // '#0e0e0e' — 의도적 예외
  minHeight: '100vh',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
```

#### 뒤로가기 버튼 처리
```javascript
// 변경 전: 다크 배경 위 반투명 검정 버튼
{
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  borderRadius: 8,
}

// 변경 후: 이미지 섹션 내부에 위치하므로 동일 스타일 유지
// (뒤로가기 버튼이 이미지 섹션 위에 absolute 포지셔닝되어 있다면 다크 오버레이 유지)
// 만약 이미지 섹션 외부(화이트 bg 위)에 있다면:
{
  background: 'none',
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: '6px 12px',
}
```

#### 정보 패널 (기존 유지)
```javascript
// 이미 COLORS.surface (#ffffff) — 변경 불필요
// 경계선 명확화:
{
  flex: 1,
  background: COLORS.surface,
  borderLeft: `1px solid ${COLORS.border}`,   // 이미지-정보 패널 경계
  overflowY: 'auto',
  padding: '24px',
}
```

### 2-3 디자이너 노트

이미지 영역 다크(#0e0e0e) + 정보 패널 라이트(#ffffff) 혼재 패턴은 Cosmos 앱의 PhotoDetail과도 동일하며 500px, Behance, Unsplash에서도 채택된 표준 패턴이다. "혼재"가 아니라 "의도된 분할"이므로 유지한다.

단 이를 위해 전체 래퍼(`minHeight:100vh`)에서 `#0e0e0e`를 제거하지 않으면, 화이트 앱에서 이 페이지만 전체가 검은 배경이 되어 GalleryPage로 돌아갈 때 눈에 충격적인 전환이 일어난다. 래퍼는 `COLORS.bg`로, 섹션 내부에서 `COLORS.galleryBg`를 적용하는 것이 올바른 구조다.

---

## 3. PortfolioPage FollowListModal — 토큰 교체

### 3-1 와이어프레임

```
[오버레이 모달]
┌──────────────────────────────────────────────────────────────────────────────┐
│  dim: rgba(0,0,0,0.4)                                                       │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │ bg: COLORS.surface (#ffffff)                                        │    │
│   │ border: 1px solid COLORS.border                                     │    │
│   │ border-radius: 16px                                                 │    │
│   │ maxWidth: 420px,  maxHeight: 70vh, overflow-y: auto                 │    │
│   │                                                                    │    │
│   │  ┌── 모달 헤더 (sticky, bg:COLORS.surface) ─────────────────────┐  │    │
│   │  │  [팔로워] [팔로잉]  탭                                        │  │    │
│   │  │  활성 탭: color:COLORS.text, 700, borderBottom:2px solid primary│  │    │
│   │  │  비활성: color:COLORS.textMuted, 400                          │  │    │
│   │  │                                        ✕ fontSize:18         │  │    │
│   │  └────────────────────────────────────────────────────────────────┘  │    │
│   │                                                                    │    │
│   │  ┌── 멤버 행 (padding: 12px 16px) ──────────────────────────────┐  │    │
│   │  │ [AV 40px] 작가이름    fontSize:14 fontWeight:600 COLORS.text │  │    │
│   │  │           @프로필명   fontSize:12 COLORS.textMuted           │  │    │
│   │  │                                  [팔로우] 버튼 (primary)     │  │    │
│   │  ├────────────────────────────────────────────────────────────────┤  │    │
│   │  │ (반복)                                                        │  │    │
│   │  └────────────────────────────────────────────────────────────────┘  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3-2 토큰 교체 매핑 (정확한 1:1 치환)

```javascript
// FollowListModal 내부 스타일 교체 목록

// 모달 컨테이너 배경
'#12122a'   →  COLORS.surface           // '#ffffff'

// 모달 테두리
'#1e1e3a'   →  COLORS.border            // '#e2e2ee'
  (또는 `1px solid ${COLORS.border}`)

// 주요 텍스트
'#eeeeff'   →  COLORS.text              // '#1a1a2e'
'#d0d0f0'   →  COLORS.text              // '#1a1a2e' (제목/이름 강조에 사용되었다면)

// 보조 텍스트
'#9090cc'   →  COLORS.textSecondary     // '#5c5c7a'

// 힌트/비활성 텍스트
'#6060a0'   →  COLORS.textMuted         // '#9090b0'

// TemplateComingSoon '#0e0e0e' 처리:
//   → 이 컴포넌트는 미완성 템플릿 플레이스홀더로 낮은 우선순위
//   → COLORS.galleryBg('#0e0e0e')는 동일값이므로 토큰 교체만 수행
'#0e0e0e'   →  COLORS.galleryBg         // (값은 같음, 하드코딩 제거가 목적)
```

### 3-3 팔로우 버튼 스펙
```javascript
// 팔로우 버튼
{
  background: isFollowing ? 'none' : COLORS.primary,
  color: isFollowing ? COLORS.textSecondary : '#fff',
  border: isFollowing ? `1px solid ${COLORS.border}` : 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}
```

---

## 4. 공통 인터랙션 스펙

### 모든 카드/버튼에 적용
```javascript
// 클릭 가능 요소 hover
transition: 'all 0.15s ease'

// 카드 hover (FeedCard)
transform: 'translateY(-2px)'
boxShadow: '0 4px 20px rgba(26,26,46,0.10)'  // 라이트 그림자 (다크의 rgba(0,0,0,0.x) 대신)

// 버튼 primary hover
background: COLORS.primaryDark   // '#A80D14'
```

### 포커스 링 (접근성)
```javascript
outline: `2px solid ${COLORS.primary}`
outlineOffset: 2
```

---

## 5. 반응형 기준

| 구간 | 레이아웃 |
|------|---------|
| < 768px (모바일) | FeedCard 단일 컬럼 전체 너비, PhotoDetail 세로 스택 |
| 768~1023px (태블릿) | FeedCard 단일 컬럼 maxWidth:680px 중앙 정렬, PhotoDetail 가로 2분할 |
| >= 1024px (데스크탑) | 동일 |

> FeedPage는 소셜 피드 성격상 태블릿에서도 단일 컬럼 maxWidth:680px를 유지하는 것이 가독성에 유리하다. 2컬럼 그리드는 쇼핑몰/갤러리 패턴이며 피드에서는 정보 밀도를 낮추는 것이 UX적으로 올바르다.

---

## 6. 상태 정의

### FeedPage 상태
| 상태 | UI |
|------|----|
| 로딩 | SkeletonFeedCard × 3 (shimmer, COLORS.surface 배경) |
| 팔로잉 없음 | EmptyState: 📷 + "아직 팔로우한 작가가 없어요" + [탐색하기] 버튼 |
| 에러 | "피드를 불러오지 못했어요" + [다시 시도] 버튼 (danger 컬러) |
| 정상 | FeedCard 목록 + 더 보기 버튼 |

### FollowListModal 상태
| 상태 | UI |
|------|----|
| 로딩 | shimmer skeleton rows × 5 |
| 빈 목록 | "아직 팔로워가 없어요" (textMuted, 중앙 정렬) |
| 정상 | 멤버 행 목록 |

---

## 7. Claude.ai 아티팩트 요청 프롬프트

아래 프롬프트를 claude.ai에서 아티팩트로 요청할 때 사용한다.

### FeedPage 카드 컴포넌트 (glass 제거 버전)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지/유니코드 기호만 사용

현재 컬러 시스템 (AKIRA Neo-Tokyo):
  primary:'#E8121A', accent:'#22D3EE', bg:'#f5f5fa', surface:'#ffffff',
  border:'#e2e2ee', borderLight:'#ededf5', text:'#1a1a2e',
  textSecondary:'#5c5c7a', textMuted:'#9090b0'

다음 컴포넌트를 작성해줘:

FeedPage — 팔로우 피드 화면 (glass.js 없이 Cosmos 화이트 스타일)
- 페이지 배경: COLORS.bg (#f5f5fa)
- FeedCard: 배경 #ffffff, border 1px solid #e2e2ee, borderRadius 16px
  - 작가 헤더: 아바타(40px 원형) + 이름 + 시간 (12px textMuted)
  - 이미지: width 100%, aspectRatio 4/3, objectFit:cover
  - 하단: 제목(14px 600) + 좋아요(♥ AKIRA 레드) + 저장(🔖 네온 시안)
  - hover: translateY(-2px) + box-shadow 0 4px 20px rgba(26,26,46,0.10)
  - transition: 0.15s ease (SPRING 상수 없이)
- 단일 컬럼 maxWidth:680px margin:0 auto
- 스켈레톤: background:#ededf4 shimmer 1.5s opacity 애니메이션
- 빈 상태: 📷 아이콘 + 텍스트 + 탐색하기 CTA 버튼
- 더 보기 버튼: border 1px solid #e2e2ee, background:#ffffff, 전체 너비
- 외부 라이브러리 import 없음, 한국어 텍스트
```

---

## 수용 기준 (AC)

- [ ] FeedPage에서 `glass`, `GLASS`, `GLASS_KEYFRAMES`, `SPRING` import 완전 제거
- [ ] FeedPage 페이지 배경이 `COLORS.bg` (#f5f5fa) 단색
- [ ] FeedCard가 `background: COLORS.surface`, `border: 1px solid COLORS.border` 적용
- [ ] PhotoDetailPage 데스크탑 래퍼 배경이 `COLORS.bg` — 이미지 섹션은 `COLORS.galleryBg` (#0e0e0e)
- [ ] PortfolioPage FollowListModal 하드코딩 hex 6개 → COLORS 토큰
- [ ] 화이트 배경에 흰 텍스트 잔존 없음 (invisible text 없음)
- [ ] `npm run build` 성공
