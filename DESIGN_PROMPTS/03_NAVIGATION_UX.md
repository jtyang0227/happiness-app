# 03 — 내비게이션 & UX (Header · Modal · 접근성)

> P0: Modal UX · 접근성 / P1: Header 아바타 드롭다운

---

## 저장 경로

```
frontend/src/
  components/layout/Header.jsx     (수정)
  components/common/ModalOverlay.jsx (신규)
```

---

## [1] Header 재설계 — 아바타 드롭다운

### 현재 → 목표

```
현재: [✦ Happiness] [탐색][갤러리][목록][등록][프로필] [로그아웃]
목표: [✦ Happiness] [탐색][갤러리][목록]         [+ 등록] [아바타▾]
                                                         ├ 프로필 보기
                                                         ├ ────────
                                                         └ 로그아웃
```

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff'
      bg '#f5f5fa' surface '#fff' border '#e2e2ee'
      text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0' danger '#e53e3e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, react+react-router-dom만 허용, 한국어 UI

PC 전용 Header 컴포넌트를 만들어주세요 (768px 미만 display:none).

Props:
- user: { id, name, profileName, avatarUrl } | null
- currentPath: string
- onNavigate: (path) => void
- onLogout: () => void

레이아웃: position sticky top 0 z-index 100, height 56px,
          bg 'rgba(255,255,255,0.92)' backdropFilter 'blur(12px)'
          border-bottom '1px solid #e2e2ee' padding '0 24px'
          display flex align-items center

좌측 로고 (✦ Happiness):
  ✦ primary색, "Happiness" 16px 700, 클릭→onNavigate('/'), margin-right 24px

중앙 Nav (flex-grow 1, gap 4px):
  탐색(/explore) · 갤러리(/) · 목록(/list)
  비활성: 14px 500 textSecondary, hover color text
  활성: primary색 + primaryLight bg, padding '6px 12px' radius 6px

우측 (display flex align-items center gap 12px):

"+ 등록" 버튼:
  bg primary, color white, height 34px, padding '0 16px', radius 8px, 13px 600
  hover: primaryDark, 클릭→onNavigate('/photo/new')

아바타 드롭다운 (position relative):
  트리거 버튼: avatarUrl 있으면 32px 원형 이미지 / 없으면 이니셜 32px 원 primary bg white text
               우측 ▾ 10px textMuted, 클릭 시 드롭다운 토글
               열릴 때: box-shadow '0 0 0 2px #eef0ff'

  드롭다운 패널 (position absolute top '100%' right 0 margin-top 8px):
    bg white, border '1px solid #e2e2ee', radius 12px
    box-shadow '0 8px 32px rgba(91,110,245,0.16)', min-width 200px, padding '8px 0', z-index 200

    헤더(클릭 불가): padding '12px 16px' border-bottom '1px solid #e2e2ee'
      이름 14px 600 / @profileName 12px textMuted

    메뉴 항목 (padding '10px 16px' 14px hover: bg primaryLight color primary):
      "👤 프로필 보기" → onNavigate('/profile')
      구분선 (margin '4px 16px' border-top '#e2e2ee')
      "로그아웃" → danger색 hover: bg '#fff0f0' → onLogout()

  외부 클릭 닫기: useEffect + mousedown 이벤트 + useRef

데모:
- 활성 경로 3가지 (탐색/갤러리/목록)
- 드롭다운 열린 상태
- 아바타 없는 상태(이니셜) / 있는 상태(더미 URL)
```

### 통합 방법

```jsx
// Header.jsx 기존 "로그아웃" 텍스트 버튼 섹션 교체
// 아래 상태 추가:
const [dropdownOpen, setDropdownOpen] = useState(false)
const dropdownRef = useRef(null)
useEffect(() => {
  const handler = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target))
      setDropdownOpen(false)
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [])
```

---

## [2] Modal UX 개선 + 접근성

### 수정 항목

| 항목 | 현재 | 목표 |
|------|------|------|
| body 스크롤 잠금 | 없음 | 모달 열릴 때 overflow:hidden |
| 배경 클릭 닫기 | 미확인 | stopPropagation으로 확실히 구현 |
| 이미지 alt | 없거나 빈 문자열 | photo.title 사용 |
| 버튼 aria-label | 없음 | 좋아요/저장/닫기 모두 추가 |
| 키보드 Tab | 모달 밖으로 빠져나감 | 포커스 트랩 |

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' surface '#fff' border '#e2e2ee' danger '#e53e3e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

두 가지를 만들어주세요.

1. ModalOverlay 컴포넌트 (components/common/ModalOverlay.jsx)

Props: isOpen, onClose, children, maxWidth('900px')

기능:
- isOpen=false: null 반환
- 오버레이: position fixed inset 0 bg 'rgba(0,0,0,0.88)' z-index 1000
- 오버레이 클릭 → onClose
- 내부 컨텐츠 클릭 → stopPropagation
- Escape 키 → onClose (useEffect + keydown)
- body overflow hidden 토글 (열릴 때 hidden, 닫힐 때 '' 초기화, cleanup 필수)
- 포커스 트랩: 열릴 때 첫 번째 포커스 가능 요소에 focus()
  querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
- 닫기 × 버튼: position absolute top 16px right 16px, white, 32px 원형

2. 접근성이 완벽한 PhotoCard 예시 컴포넌트

photo: {id, title, imageUrl, colorMood, likeCount, memberName}
onClick, onLike, isLiked Props

접근성:
  카드 div: role="button" tabIndex=0 aria-label="{title} 사진 보기"
             Enter/Space 키 → onClick
             포커스 시 outline '2px solid #5b6ef5' (focus-visible)
  이미지: alt={title || '사진'} loading="lazy"
  좋아요 버튼: aria-label={isLiked?'좋아요 취소':'좋아요'} aria-pressed={isLiked}
  분위기 배지: aria-label="분위기: {colorMood}"

카드 디자인: radius 12px overflow hidden shadow sm
  이미지: aspect-ratio 4/3 object-fit cover
  hover: translateY(-3px) shadow md
  좋아요 버튼: 우하단 반투명 bg

4개 카드 데모.
```

### PhotoModal.jsx 수정 방법

```jsx
// useEffect 두 개 추가/수정
useEffect(() => {
  if (!photo) return
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [photo])

// 오버레이 구조
<div onClick={onClose} style={{ position:'fixed', inset:0, ... }}>
  <div onClick={e => e.stopPropagation()} style={{ ... }}>
    <button onClick={onClose} aria-label="닫기">×</button>
    <img src={photo.imageUrl} alt={photo.title || '사진'} />
    <button aria-label={isLiked?'좋아요 취소':'좋아요'} aria-pressed={isLiked}>
      {isLiked ? '♥' : '♡'}
    </button>
  </div>
</div>
```

---

## 완료 체크리스트

- [ ] Header 아바타 드롭다운 추가
- [ ] Header "등록" Primary 버튼 분리
- [ ] 드롭다운 외부 클릭 닫기
- [ ] 모바일 768px 미만 Header 숨김 확인
- [ ] ModalOverlay.jsx 생성 (body 스크롤 잠금)
- [ ] PhotoModal body overflow:hidden 적용
- [ ] PhotoModal 배경 클릭 닫기 확인
- [ ] Escape 키 닫기 확인
- [ ] 모든 img에 alt 텍스트 추가 (PhotoCard, PhotoModal, PhotoDetailPage)
- [ ] 좋아요/저장/닫기 버튼 aria-label 추가
- [ ] 키보드 Tab 포커스 모달 내부에서만 이동 확인
