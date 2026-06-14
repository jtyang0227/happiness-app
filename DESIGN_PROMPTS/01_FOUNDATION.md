# 01 — 공통 컴포넌트 기반 (Button · Input · EmptyState · Skeleton)

> P0: EmptyState / P1: Button · Input · Skeleton
> 이 파일의 컴포넌트가 완성되어야 나머지 파일 작업을 진행한다.

---

## 저장 경로

```
frontend/src/components/common/
  Button.jsx
  Input.jsx          (+ Textarea.jsx)
  EmptyState.jsx
  Skeleton.jsx       (+ SkeletonCard variants)
```

---

## [1] Button 컴포넌트

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff'
      bg '#f5f5fa' surface '#fff' border '#e2e2ee'
      text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0'
      danger '#e53e3e' success '#22c55e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

Button 컴포넌트를 만들어주세요.

Props:
- variant: 'primary'|'secondary'|'ghost'|'danger'|'icon' (기본 'primary')
- size: 'sm'|'md'|'lg' (기본 'md')
- loading: boolean
- disabled: boolean
- fullWidth: boolean
- children, 나머지 button 속성 전달

variant 스타일:
  primary:   bg '#5b6ef5' color '#fff'  hover bg '#4458e0'
  secondary: bg '#fff' border '1.5px solid #e2e2ee' color '#1a1a2e'  hover border-color '#5b6ef5' bg '#f5f5fa'
  ghost:     bg transparent color '#5b6ef5'  hover bg '#eef0ff'
  danger:    bg '#e53e3e' color '#fff'  hover bg '#c53030'
  icon:      bg transparent border none padding 8px border-radius 50%  hover bg '#eef0ff'

size (height / padding / fontSize / borderRadius):
  sm: 32px / 0 12px / 13px / 6px
  md: 40px / 0 20px / 14px / 8px
  lg: 48px / 0 28px / 15px / 10px

공통: font-weight 500, display inline-flex align-items center justify-content center gap 6px,
      transition all 0.15s, cursor pointer
      disabled: opacity 0.45 pointer-events none
      loading: children 앞에 회전 스피너(border 원형 CSS) 표시, pointer-events none

모든 variant × size 조합 표, loading/disabled/fullWidth/icon 버튼 데모 보여주세요.
다크 배경 #0a0a18 위에서 secondary/ghost가 어떻게 보이는지도 포함.
```

### 통합 위치

`LoginPage`, `SignUpPage`, `PhotoFormPage`, `PhotoDetailPage`, `ProfilePage`의 모든 인라인 버튼 스타일을 이 컴포넌트로 교체.

---

## [2] Input / Textarea 컴포넌트

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' bg '#f5f5fa' surface '#fff' border '#e2e2ee'
      text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0'
      danger '#e53e3e'
      darkBg '#0a0a18' darkSurface '#12122a' darkBorder '#2a2a50' darkText '#eeeeff'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

Input 컴포넌트를 만들어주세요.

Props:
- label: string (선택, 상단 레이블)
- type: string (기본 'text', 'password' 지원)
- error: string (에러 메시지)
- hint: string (하단 힌트)
- theme: 'light'|'dark' (기본 'light')
- prefix: string (입력 앞 고정 텍스트, 예: '@')
- disabled: boolean
- 나머지 input 속성 전달

스타일:
  light 기본: height 42px, padding 0 14px, border '1.5px solid #e2e2ee', borderRadius 8, bg '#fff', fontSize 14px
  light 포커스: border-color '#5b6ef5', box-shadow '0 0 0 3px rgba(91,110,245,0.15)'
  light 에러: border-color '#e53e3e', bg '#fff0f0', 포커스 시 shadow rgba(229,62,62,0.15)
  dark: bg 'rgba(255,255,255,0.06)' color '#eeeeff' border '1.5px solid #2a2a50'
  dark 포커스: border-color '#5b6ef5' shadow '0 0 0 3px rgba(91,110,245,0.25)'
  disabled: opacity 0.5 cursor not-allowed
  레이블: 12px 500 textSecondary (dark: '#8888cc') display block margin-bottom 6px
  에러 메시지: '#e53e3e' 12px margin-top 4px

type='password': 우측 보이기/숨기기 토글 자동 추가 (👁 텍스트 "보기"/"숨기기")
prefix: 좌측 패딩 안에 textMuted 고정 텍스트

Textarea도 같은 Props (rows: number 기본 4 추가, resize: vertical only).

데모:
- 로그인 폼(dark): 이메일, 비밀번호(보기/숨기기)
- 회원가입 폼(dark): 이름, @인스타그램(prefix)
- 등록 폼(light): 제목, 설명(Textarea), 에러 상태
```

### 통합 위치

`LoginPage`, `SignUpPage`, `PhotoFormPage`, `ProfilePage` 모든 input 교체.

---

## [3] EmptyState 컴포넌트

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' bg '#f5f5fa' surface '#fff'
      text '#1a1a2e' textMuted '#9090b0'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

EmptyState 컴포넌트를 만들어주세요.

Props:
- icon: string (이모지, 기본 '🖼️')
- title: string
- description: string (선택)
- actionLabel: string (선택)
- onAction: function (선택)
- theme: 'light'|'dark' (기본 'light')

디자인:
  중앙 정렬, padding 80px 24px
  아이콘: 64px 원형 배경 (light: primaryLight, dark: rgba(91,110,245,0.15)), 이모지 28px
  title: 18px 600
  description: 14px textMuted, max-width 320px, line-height 1.6
  버튼(있을 때): primary bg, white, radius 8px, padding 10px 24px, margin-top 20px
               hover: primaryDark
  dark theme: title color '#eeeeff', description rgba(255,255,255,0.4)

데모 3가지 나란히:
1. 갤러리 빈 상태 (dark, icon='📷', title='아직 등록된 사진이 없어요', actionLabel='사진 등록하기')
2. 탐색 결과 없음 (light, icon='🔍', title='검색 결과가 없습니다', actionLabel='필터 초기화')
3. 내 사진 없음 (light, icon='🖼️', title='내 사진이 없습니다', actionLabel='첫 사진 등록')
```

### 통합 위치

```jsx
// GalleryPage: photos.length === 0 && !loading
<EmptyState icon="📷" title="아직 등록된 사진이 없어요"
  description="첫 작품을 갤러리에 올려보세요"
  actionLabel="사진 등록하기" onAction={() => navigate('/photo/new')} theme="dark" />

// ExplorePage: filtered.length === 0
<EmptyState icon="🔍" title="검색 결과가 없습니다"
  actionLabel="필터 초기화" onAction={() => { setSearch(''); setSelectedMood('') }} />
```

---

## [4] Skeleton 로딩 컴포넌트

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: bg '#f5f5fa' surface '#fff' galleryBg '#0e0e0e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

스켈레톤 로딩 시스템을 만들어주세요.

1. Skeleton 기본 (width, height, borderRadius, theme: 'light'|'dark')
   shimmer 애니메이션: 1.5s infinite, gradient 왼→오른쪽 광택
   light: bg '#e9e9f0' / dark: bg 'rgba(255,255,255,0.08)'

2. SkeletonGalleryCard (index: 0~11, theme: 'dark')
   높이 패턴 (index%6): 0→220 1→280 2→180 3→260 4→200 5→240
   break-inside: avoid, borderRadius 0

3. SkeletonExploreCard (theme: 'light')
   aspect-ratio 4/3 이미지 영역 + 하단 텍스트 줄 2개
   borderRadius: 12px overflow hidden

4. SkeletonListRow (theme: 'light')
   60×60 썸네일 + 우측 텍스트 줄 2개 + 배지 줄 1개
   행 높이 64px, 하단 border

데모: 갤러리(dark masonry 12개) / 탐색(light grid 9개) / 목록(light 8행) 탭으로 전환
```

### 통합 위치

```jsx
// GalleryPage: loading 조건 교체
{loading
  ? <div style={{ columns: `${columns} 200px` }}>
      {Array.from({ length: 12 }).map((_, i) => <SkeletonGalleryCard key={i} index={i} />)}
    </div>
  : /* 기존 그리드 */
}
```

---

## 완료 체크리스트

- [ ] Button.jsx — variant/size/loading/disabled
- [ ] Input.jsx — light/dark theme, password toggle, prefix
- [ ] Textarea.jsx
- [ ] EmptyState.jsx — light/dark theme
- [ ] Skeleton.jsx + SkeletonGalleryCard + SkeletonExploreCard + SkeletonListRow
- [ ] GalleryPage EmptyState + Skeleton 적용
- [ ] ExplorePage EmptyState + Skeleton 적용
- [ ] ProfilePage EmptyState 적용
- [ ] LoginPage/SignUpPage Button + Input 교체
- [ ] PhotoFormPage Button + Input + Textarea 교체
