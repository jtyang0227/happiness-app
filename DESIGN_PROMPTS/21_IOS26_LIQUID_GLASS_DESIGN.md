# ~~21 — iOS 26 Liquid Glass 디자인 시스템 — 전체 앱 적용~~

> ⚠️ **DEPRECATED (2026-06-23)**: 이 기획서는 폐기됩니다.  
> 대체 문서: **`31_COSMOS_PINTEREST_DESIGN_SYSTEM.md`**  
> 이유: iOS 컨셉 제거, Cosmos × Pinterest 다크 에디토리얼 방향으로 전환  
> 단, `constants/glass.js`는 어드민 패널·인증 페이지에서 계속 사용됩니다.

---

> ~~작성일: 2026-06-19~~  
> ~~영감: Apple iOS 26 "Liquid Glass" (WWDC 2025) + Instagram iOS 26 리디자인~~  
> ~~적용 범위: Happiness 앱 전체 페이지 — 라이트/다크 양쪽 테마~~

---

## 1. iOS 26 Liquid Glass 개념

### 핵심 철학

iOS 26에서 Apple이 도입한 새 디자인 언어. 유리 소재가 빛과 배경을 통과시키며  
환경에 반응한다는 "살아있는 소재(Living Material)" 컨셉.

| 원칙 | 설명 |
|------|------|
| **투명성** | UI 요소 뒤의 콘텐츠가 흐릿하게 비침 |
| **굴절** | 유리 가장자리에 미세한 빛 굴절 효과 |
| **유동성** | 애니메이션이 물처럼 부드럽게 흐름 |
| **계층감** | 글래스 레이어들이 쌓이며 깊이감 형성 |
| **적응성** | 라이트/다크 배경 모두에서 자연스럽게 작동 |

### Instagram iOS 26 디자인 포인트
- 네비게이션 바 → 완전 투명 글래스
- Stories 버블 → 유리 테두리 + 내부 빛 반사
- 피드 카드 → 아주 얇은 글래스 구분선
- 액션 버튼 → 글래스 소재 + 진동감 있는 햅틱 연동 (모바일)
- 검색바 → 플로팅 글래스 pill 형태

---

## 2. Happiness 앱 글래스 토큰 설계

### 2-1. 글래스 레이어 3종

```javascript
// constants/glass.js  (신규)
export const GLASS = {
  // ── 라이트 모드 ──
  light: {
    surface:  'rgba(255, 255, 255, 0.72)',  // 메인 패널
    elevated: 'rgba(255, 255, 255, 0.88)',  // 카드, 입력창
    overlay:  'rgba(255, 255, 255, 0.45)',  // 오버레이
    border:   'rgba(255, 255, 255, 0.60)',  // 글래스 테두리
    shadow:   '0 8px 32px rgba(91, 110, 245, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
    blur:     'blur(20px) saturate(180%)',
  },
  // ── 다크 모드 ──
  dark: {
    surface:  'rgba(12, 12, 30, 0.75)',    // 메인 패널
    elevated: 'rgba(20, 20, 45, 0.85)',    // 카드
    overlay:  'rgba(10, 10, 25, 0.55)',    // 오버레이
    border:   'rgba(255, 255, 255, 0.10)', // 글래스 테두리
    shadow:   '0 8px 32px rgba(0,0,0,0.4)',
    blur:     'blur(24px) saturate(160%)',
  },
  // ── 컬러 글래스 (강조용) ──
  primary: {
    surface:  'rgba(91, 110, 245, 0.12)',
    elevated: 'rgba(91, 110, 245, 0.20)',
    border:   'rgba(91, 110, 245, 0.30)',
    blur:     'blur(16px)',
  },
};

// 공통 글래스 스타일 헬퍼
export function glassStyle(type = 'light', extra = {}) {
  const g = GLASS[type];
  return {
    background: g.surface,
    backdropFilter: g.blur,
    WebkitBackdropFilter: g.blur,
    border: `1px solid ${g.border}`,
    boxShadow: g.shadow,
    ...extra,
  };
}
```

### 2-2. 글래스 버튼 스타일

```javascript
// 기본 글래스 버튼
const glassBtn = {
  background: GLASS.light.elevated,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.5)',
  borderRadius: 12,
  color: COLORS.text,
  padding: '10px 20px',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// Primary 글래스 버튼 (CTA)
const primaryGlassBtn = {
  background: 'linear-gradient(135deg, rgba(91,110,245,0.9), rgba(167,139,250,0.9))',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(167,139,250,0.5)',
  borderRadius: 14,
  color: '#fff',
  boxShadow: '0 4px 20px rgba(91,110,245,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
};
```

### 2-3. 배경 설계

```
라이트 페이지 배경: linear-gradient(160deg, #eef0ff 0%, #f5f0ff 50%, #f0f5ff 100%)
다크 페이지 배경: linear-gradient(160deg, #0a0a18 0%, #0f0a1e 50%, #0a1018 100%)
```

---

## 3. 전체 앱 페이지별 적용 설계

### 3-1. Header / BottomNav

**Before (현재)**:
- Header: `background: darkSurface #12122a` 고체 배경

**After (iOS 26)**:
```javascript
// Header — 라이트 모드 (앱 일반 페이지)
headerStyle = {
  position: 'sticky', top: 0, zIndex: 100,
  background: 'rgba(255,255,255,0.80)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderBottom: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
}

// BottomNav — 다크 모바일
bottomNavStyle = {
  position: 'fixed', bottom: 0,
  background: 'rgba(10,10,24,0.85)',
  backdropFilter: 'blur(24px) saturate(160%)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  // iOS safe-area 대응
  paddingBottom: 'env(safe-area-inset-bottom)',
}
```

**미읽음 배지**: 빨간 글래스 pill → `rgba(229,62,62,0.85)` + `blur(8px)` + 흰 텍스트

### 3-2. GalleryPage (다크 글래스)

```
배경: galleryBg #0e0e0e (유지)

툴바: 다크 글래스 floating 바
  background: rgba(14,14,14,0.80)
  backdropFilter: blur(24px)
  border-bottom: 1px solid rgba(255,255,255,0.06)
  position: sticky

정렬 chip:
  선택: rgba(91,110,245,0.25) + border: rgba(91,110,245,0.5) + backdrop-blur
  미선택: rgba(255,255,255,0.06) + border: rgba(255,255,255,0.08)

사진 카드 hover 오버레이:
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent)
  사진 제목: 흰 텍스트 + text-shadow
```

### 3-3. ExplorePage (탐색 — 라이트 글래스)

```
배경: linear-gradient(160deg, #eef0ff, #f0f5ff)

검색바: 플로팅 글래스 pill
  background: rgba(255,255,255,0.80)
  backdropFilter: blur(20px)
  border: 1px solid rgba(255,255,255,0.6)
  borderRadius: 28px (pill)
  boxShadow: 0 4px 20px rgba(91,110,245,0.10)
  position: sticky, top: 80px

필터 chip:
  무드 선택: 글래스 + 해당 무드 색 틴트 배경
  비율 선택: 글래스 pill

검색 결과 카드:
  background: rgba(255,255,255,0.70)
  backdropFilter: blur(16px)
  border: 1px solid rgba(255,255,255,0.5)
  borderRadius: 16px
```

### 3-4. PhotoFormPage (등록 — 라이트 글래스 스튜디오)

```
배경: linear-gradient(160deg, #eef0ff, #f5f0ff)

좌측 이미지 패널:
  background: rgba(255,255,255,0.65)
  backdropFilter: blur(24px)
  borderRadius: 24px
  border: 1px solid rgba(255,255,255,0.6)
  boxShadow: 0 16px 48px rgba(91,110,245,0.12)

우측 메타데이터 패널:
  background: rgba(255,255,255,0.72)
  backdropFilter: blur(20px)
  borderRadius: 24px

입력 필드:
  background: rgba(255,255,255,0.60)
  backdropFilter: blur(8px)
  border: 1px solid rgba(91,110,245,0.15)
  borderRadius: 12px

등록 버튼:
  background: linear-gradient(135deg, rgba(91,110,245,0.9), rgba(167,139,250,0.9))
  backdropFilter: blur(10px)
  border: 1px solid rgba(167,139,250,0.4)
  boxShadow: 0 4px 20px rgba(91,110,245,0.35), inset 0 1px 0 rgba(255,255,255,0.25)
  borderRadius: 14px
```

### 3-5. PhotoDetailPage (상세 — 하이브리드)

```
좌측 이미지 영역: 다크 (galleryBg #0e0e0e)
우측 정보 패널: 라이트 글래스

정보 패널 배경:
  background: linear-gradient(160deg, rgba(240,242,255,0.95), rgba(248,246,255,0.95))
  (반투명 — 이미지 배경색이 살짝 비치게)

작가 카드, EXIF 카드, 보정 레시피 카드:
  background: rgba(255,255,255,0.70)
  backdropFilter: blur(16px)
  border: 1px solid rgba(255,255,255,0.5)
  borderRadius: 16px
  padding: 16px

액션 바 (이미지 하단 floating):
  position: absolute, bottom: 16px, left: 50%, transform: translateX(-50%)
  background: rgba(14,14,14,0.75)
  backdropFilter: blur(20px)
  border: 1px solid rgba(255,255,255,0.12)
  borderRadius: 28px
  padding: 8px 20px
  display: flex, gap: 16px (♡ 🔖 ↗ ⬇ ⊠)
```

### 3-6. ProfilePage (다크 글래스 + 라이트 카드 혼합)

```
Hero (커버 이미지 영역):
  높이: 280px, 커버 이미지 꽉 채움
  하단 그라디언트: linear-gradient(to top, rgba(10,10,24,0.9), transparent)

통계 바 (Hero 위 floating):
  position: absolute, bottom: -28px, left: 50%, transform: translateX(-50%)
  background: rgba(255,255,255,0.75)
  backdropFilter: blur(24px)
  borderRadius: 20px
  border: 1px solid rgba(255,255,255,0.6)
  boxShadow: 0 8px 32px rgba(91,110,245,0.12)
  padding: 14px 32px

탭 네비:
  background: rgba(255,255,255,0.65)
  backdropFilter: blur(16px)
  position: sticky, top: 56px (header 아래)
  border-bottom: 1px solid rgba(91,110,245,0.08)

활성 탭 인디케이터:
  bottom border: 2px solid primary
  color: primary
```

### 3-7. PortfolioPage (다크 글래스 전문 포트폴리오)

```
Hero 섹션 (80vh 풀블리드):
  배경: 커버 이미지 or linear-gradient(to bottom, #0a0a18, #1a1a2e)
  오버레이: rgba(0,0,0,0.30)
  작가 이름: 흰 텍스트, font-size: 52px, font-weight: 200 (아주 얇게)
  CTA 버튼: 글래스 pill
    background: rgba(255,255,255,0.15)
    backdropFilter: blur(12px)
    border: 1px solid rgba(255,255,255,0.35)
    borderRadius: 28px

Stats Bar (Hero 하단):
  background: rgba(255,255,255,0.08)
  backdropFilter: blur(20px)
  border-top: 1px solid rgba(255,255,255,0.10)
  border-bottom: 1px solid rgba(255,255,255,0.10)

무드 필터 (Sticky):
  background: rgba(10,10,24,0.80)
  backdropFilter: blur(20px)
  chip: rgba(255,255,255,0.08) + border rgba(255,255,255,0.12)
  active chip: rgba(91,110,245,0.25) + border rgba(91,110,245,0.5)

사진 카드 hover:
  글래스 오버레이 + 제목 텍스트 fade in
  scale: 1.02 (transform)
```

### 3-8. PortfolioSlideshowPage (다크 풀스크린 글래스)

```
배경: 완전 검정 #000

컨트롤 바 (상단, hover 시 표시):
  background: rgba(0,0,0,0.0) → hover 시 rgba(0,0,0,0.7)
  transition: background 0.3s
  buttons: 글래스 pill
    background: rgba(255,255,255,0.12)
    backdropFilter: blur(12px)
    border: 1px solid rgba(255,255,255,0.20)
    borderRadius: 10px

도트 인디케이터:
  background: rgba(255,255,255,0.25) → 선택: rgba(255,255,255,0.90)
  transition: all 0.3s

← → 화살표:
  background: rgba(255,255,255,0.10)
  backdropFilter: blur(16px)
  border: 1px solid rgba(255,255,255,0.20)
  borderRadius: 50%
  width: 48px, height: 48px
```

### 3-9. LoginPage / SignUpPage (라이트 글래스)

```
배경: linear-gradient(160deg, #0a0a18 0%, #1a1040 50%, #0a1018 100%)
  + 배경에 대형 blur 원 (보케 효과):
  position: absolute, width: 400px, height: 400px, borderRadius: 50%
  background: rgba(91,110,245,0.15), filter: blur(60px)

카드:
  background: rgba(255,255,255,0.08)
  backdropFilter: blur(32px) saturate(180%)
  border: 1px solid rgba(255,255,255,0.15)
  borderRadius: 28px
  padding: 40px
  boxShadow: 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)

입력 필드:
  background: rgba(255,255,255,0.06)
  backdropFilter: blur(8px)
  border: 1px solid rgba(255,255,255,0.12)
  color: #fff
  borderRadius: 12px

로그인 버튼:
  background: linear-gradient(135deg, rgba(91,110,245,0.95), rgba(167,139,250,0.95))
  border: 1px solid rgba(167,139,250,0.5)
  boxShadow: 0 4px 20px rgba(91,110,245,0.4), inset 0 1px 0 rgba(255,255,255,0.25)
  borderRadius: 14px

소셜 로그인 버튼:
  background: rgba(255,255,255,0.08)
  backdropFilter: blur(12px)
  border: 1px solid rgba(255,255,255,0.15)
```

### 3-10. Admin Panel (라이트 글래스 + 보라 틴트)

```
배경: linear-gradient(160deg, #f0eeff, #eef0ff)

사이드바:
  background: rgba(255,255,255,0.75)
  backdropFilter: blur(20px)
  border-right: 1px solid rgba(91,110,245,0.10)

상단바:
  background: rgba(255,255,255,0.80)
  backdropFilter: blur(16px)
  border-bottom: 1px solid rgba(91,110,245,0.08)

콘텐츠 카드 (통계·테이블):
  background: rgba(255,255,255,0.70)
  backdropFilter: blur(12px)
  border: 1px solid rgba(255,255,255,0.5)
  borderRadius: 16px

StatCard (대시보드):
  배경: 글래스 + 아이콘 배경 primary 틴트
  boxShadow: 0 4px 16px rgba(91,110,245,0.08)
  숫자: 그라디언트 텍스트
    background: linear-gradient(135deg, #5b6ef5, #a78bfa)
    WebkitBackgroundClip: 'text'
    WebkitTextFillColor: 'transparent'

위험 버튼 (글래스):
  background: rgba(229,62,62,0.10)
  backdropFilter: blur(8px)
  border: 1px solid rgba(229,62,62,0.25)
  color: '#e53e3e'
```

### 3-11. FeedPage (라이트 글래스 피드)

```
배경: linear-gradient(160deg, #f5f5ff, #f0f0ff)

피드 카드:
  background: rgba(255,255,255,0.75)
  backdropFilter: blur(16px)
  border: 1px solid rgba(255,255,255,0.55)
  borderRadius: 20px
  overflow: hidden
  boxShadow: 0 4px 20px rgba(91,110,245,0.07)

작가 정보 (카드 상단):
  아바타 + 이름 + 팔로잉 배지

이미지 영역:
  width: 100%, aspect-ratio: auto (원본 비율 유지)
  max-height: 480px, object-fit: cover

액션 바 (카드 하단):
  background: rgba(255,255,255,0.60)
  backdropFilter: blur(8px)
  padding: 12px 16px
  [♡ 좋아요] [💬 댓글] [↗ 공유]
  버튼: 글래스 pill
```

### 3-12. SeriesPage (라이트 글래스 컬렉션)

```
배경: #f0f2ff (라이트)

시리즈 카드:
  background: rgba(255,255,255,0.75)
  backdropFilter: blur(16px)
  borderRadius: 20px
  overflow: hidden

커버 이미지 그리드 (2×2):
  4장 사진을 2×2 collage로 카드 상단 표시
  하단에 시리즈 이름 + 사진 수

빈 시리즈: 글래스 패널 + 추가 버튼 (+ 아이콘, 점선 테두리)
```

### 3-13. InquiryFormPage (다크 글래스 standalone)

```
배경: linear-gradient(160deg, #0a0a18, #1a1040)
  + 배경 보케 원 2개

카드:
  background: rgba(255,255,255,0.07)
  backdropFilter: blur(28px)
  border: 1px solid rgba(255,255,255,0.12)
  borderRadius: 28px

입력 필드 (다크):
  background: rgba(255,255,255,0.06)
  border: 1px solid rgba(255,255,255,0.10)
  color: #e8e8f0
  borderRadius: 12px
  ::placeholder color: rgba(255,255,255,0.30)

전송 버튼: primary 글래스 (라이트 버튼과 동일)
```

---

## 4. 공통 인터랙션 & 애니메이션

### 4-1. 버튼 spring 애니메이션

```javascript
const springTransition = 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

// 버튼 hover: scale + glow
onMouseEnter: e => {
  e.currentTarget.style.transform = 'scale(1.03)';
  e.currentTarget.style.boxShadow = '0 8px 32px rgba(91,110,245,0.25)';
}
onMouseLeave: e => {
  e.currentTarget.style.transform = 'scale(1.0)';
  e.currentTarget.style.boxShadow = originalShadow;
}
```

### 4-2. 카드 등장 애니메이션

```css
@keyframes glassIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}

/* 각 카드에 stagger delay */
animation: glassIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
animationDelay: `${index * 0.05}s`
```

### 4-3. 글래스 shimmer 로딩

```javascript
// 스켈레톤 shimmer — 글래스 소재감
function GlassSkeletonCard({ dark }) {
  return (
    <div style={{
      background: dark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(255,255,255,0.60)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)'}`,
      borderRadius: 16, overflow: 'hidden',
      position: 'relative',
    }}>
      {/* shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>
  );
}
```

### 4-4. Toast (글래스 소재)

```javascript
toastStyle = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  color: COLORS.text,
}
// success: 왼쪽 4px border rgba(34,197,94,0.8)
// error:   왼쪽 4px border rgba(229,62,62,0.8)
// info:    왼쪽 4px border rgba(91,110,245,0.8)
```

---

## 5. 전체 앱 claude.ai 아티팩트 프롬프트 — 로그인 페이지

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
아이콘: 이모지/유니코드만
규칙: export default 1개, inline style, 외부 라이브러리 없음, 한국어 UI

[디자인 컨셉] iOS 26 Liquid Glass
핵심 코드:
  배경: linear-gradient(160deg, #0a0a18 0%, #1a1040 50%, #0a1018 100%)
  카드: background rgba(255,255,255,0.08), backdropFilter blur(32px) saturate(180%),
        border 1px solid rgba(255,255,255,0.15), borderRadius 28px
  입력: background rgba(255,255,255,0.06), border 1px solid rgba(255,255,255,0.12)
  버튼: linear-gradient(135deg, rgba(91,110,245,0.95), rgba(167,139,250,0.95))
        border 1px solid rgba(167,139,250,0.5)
        boxShadow 0 4px 20px rgba(91,110,245,0.4), inset 0 1px 0 rgba(255,255,255,0.25)

[컴포넌트 요청]
Happiness 앱 로그인 페이지를 iOS 26 Liquid Glass 디자인으로 만들어줘.

배경 구성:
- 전체: 다크 그라디언트 (#0a0a18 → #1a1040)
- 배경 보케 효과: position absolute 원 2개
  · 좌상단: width 400px, borderRadius 50%, background rgba(91,110,245,0.15), filter blur(80px)
  · 우하단: width 300px, borderRadius 50%, background rgba(167,139,250,0.10), filter blur(60px)

카드 (중앙 정렬, max-width 400px):
- 글래스 소재 (위 핵심 코드 적용)
- 상단: 로고 "✦ Happiness" (primary 색 + 텍스트)
- 입력 필드 2개 (이메일·비밀번호) — 다크 글래스 인풋
- [로그인] — primary 글래스 버튼 (전체 너비)
- 구분선 "또는"
- 소셜 로그인 3개:
  · [🟡 카카오로 계속하기] — 카카오 노란색 배경
  · [🔍 구글로 계속하기] — 흰 글래스 배경
  · [🍎 Apple로 계속하기] — 검정 배경
- 하단: "계정이 없으신가요? 회원가입"

글래스 효과 주의: backdropFilter와 WebkitBackdropFilter 모두 설정
버튼 hover: transform scale(1.02), transition 0.2s cubic-bezier(0.34,1.56,0.64,1)
```

---

## 6. 전체 앱 claude.ai 아티팩트 프롬프트 — Header + BottomNav

```
[시스템 컨텍스트]
(위와 동일, 라이트 모드)

[컴포넌트 요청]
iOS 26 Liquid Glass 스타일의 Header와 모바일 BottomNav를 만들어줘.

Header (PC, 768px 이상):
  - position: sticky, top: 0, zIndex: 100
  - background: rgba(255,255,255,0.80), backdropFilter: blur(20px) saturate(180%)
  - border-bottom: 1px solid rgba(255,255,255,0.6)
  - boxShadow: 0 1px 0 rgba(91,110,245,0.06)
  - 높이: 56px, padding: 0 24px
  - 좌측: "✦ Happiness" 로고 (primary 색)
  - 중앙: 네비 링크 [탐색][갤러리][시리즈][목록][등록][문의함 🔴3][피드]
    · 현재 페이지: primary 색 + 하단 2px primary 인디케이터
    · hover: 글래스 pill 배경 (rgba(91,110,245,0.08))
  - 우측: 아바타 드롭다운
    · 아바타 36px 원형 (글래스 테두리)
    · 클릭 시 드롭다운: 글래스 패널
      [프로필 보기] [설정] [로그아웃]

BottomNav (모바일, 768px 미만):
  - position: fixed, bottom: 0, width: 100%
  - background: rgba(10,10,24,0.88), backdropFilter: blur(24px) saturate(160%)
  - border-top: 1px solid rgba(255,255,255,0.08)
  - paddingBottom: env(safe-area-inset-bottom)
  - 5개 탭: 탐색🔍 | 갤러리🖼️ | ➕(원형 강조) | 피드📰 | 프로필👤
  - 등록 탭 (중앙):
    · 원형 버튼 54px, background: linear-gradient(135deg, #5b6ef5, #a78bfa)
    · boxShadow: 0 4px 16px rgba(91,110,245,0.4)
    · marginTop: -16px (위로 올라옴)
  - 현재 탭: primary 색 아이콘 + 레이블 표시
  - 미선택 탭: rgba(255,255,255,0.35)
```

---

## 7. 전체 앱 claude.ai 아티팩트 프롬프트 — FeedPage

```
[시스템 컨텍스트]
(위와 동일)

[컴포넌트 요청]
팔로우 피드 페이지를 iOS 26 Liquid Glass 디자인으로 만들어줘.

배경: linear-gradient(160deg, #f5f5ff 0%, #f0f0ff 100%)

피드 카드 (max-width 600px, margin auto):
  - background: rgba(255,255,255,0.75)
  - backdropFilter: blur(16px) saturate(180%)
  - border: 1px solid rgba(255,255,255,0.55)
  - borderRadius: 20px
  - marginBottom: 16px
  - overflow: hidden
  - boxShadow: 0 4px 20px rgba(91,110,245,0.07)
  - animation: glassIn 0.4s both (stagger delay)

  카드 내부:
    1. 작가 헤더 (padding: 12px 16px):
       아바타 40px (글래스 테두리) + 이름 + "팔로잉" 배지 + 날짜 우측
       팔로잉 배지: rgba(91,110,245,0.12), border rgba(91,110,245,0.25), borderRadius pill
    2. 이미지 (width 100%, aspect-ratio 4/3, object-fit cover)
    3. 액션 바 (padding: 12px 16px):
       - background: rgba(255,255,255,0.60), backdropFilter blur(8px)
       - [♡ 42] [💬 3] [↗] 버튼들 — 각각 글래스 pill
       - 우측: [🔖 저장]
    4. 사진 제목 + 무드 뱃지 (padding: 0 16px 14px)

@keyframes glassIn {
  from: opacity 0, translateY(16px) scale(0.97)
  to: opacity 1, translateY(0) scale(1)
}

스켈레톤 로딩:
  글래스 카드 + shimmer sweep 애니메이션
  아바타 원형 shimmer + 텍스트 줄 shimmer + 이미지 영역 shimmer

빈 피드 EmptyState:
  글래스 카드 + "팔로우하는 작가의 사진이 여기 표시됩니다" + [탐색 페이지 가기] 버튼
```

---

## 8. 구현 가이드 — constants/glass.js 도입 순서

### Phase 1 — 토큰 파일 생성 (2시간)
```
frontend/src/constants/glass.js  신규
```
기존 COLORS 파일 변경 없이 glass.js를 추가 import하는 방식.

### Phase 2 — 우선순위 적용 순서
1. LoginPage / SignUpPage — 방문자 첫인상 (1일)
2. Header / BottomNav — 모든 페이지 공통 (1일)
3. GalleryPage 툴바 — 자주 보는 화면 (반나절)
4. FeedPage 카드 (반나절)
5. PhotoDetailPage 정보 패널 (1일)
6. PhotoFormPage 등록 UI (1일)
7. ProfilePage 통계 바·탭 (반나절)
8. AdminLayout + 카드 (반나절)
9. PortfolioPage Hero·필터 (1일)
10. Toast / EmptyState / Skeleton (반나절)

### Phase 3 — 성능 최적화
- `backdrop-filter`는 GPU 가속 → `will-change: transform` 추가
- Safari(-webkit-backdrop-filter) 반드시 병행 설정
- 저사양 기기 대비: `@media (prefers-reduced-motion)` → blur 효과 축소

### 주의사항
- `backdrop-filter`는 부모가 `overflow: hidden`이면 효과 깨짐 → 주의
- iOS Safari 15+ 지원 (프로젝트 타겟과 일치)
- `background: rgba(...)` 없으면 `backdrop-filter` 효과 미작동
