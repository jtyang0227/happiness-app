# 07 — 피드 & 정렬 (FeedPage · PhotoSortPage)

> P1: PhotoSortPage 드래그 UX 개선 / P2: FeedPage 디자인 개선

---

## 저장 경로

```
frontend/src/
  pages/FeedPage.jsx       (수정)
  pages/PhotoSortPage.jsx  (수정)
  components/feed/FeedCard.jsx  (신규)
```

---

## [1] FeedPage 디자인 개선

### 현재 문제

`FeedPage`에 팔로우 유저의 최신 사진을 보여주는 기능이 있지만
`FeedCard` 컴포넌트 없이 단순 리스트로 표시되며 빈 피드 안내 UX가 부족함.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff' accent '#a78bfa'
      bg '#f7f7fb' surface '#fff' surfaceDim '#ededf4' border '#e5e5ed'
      text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb' danger '#e53e3e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, react+react-router-dom만 허용, 한국어 UI

두 가지를 만들어주세요.

1. FeedCard (components/feed/FeedCard.jsx)

Props:
- photo: { id, title, imageUrl, colorMood, likeCount, saveCount, memberName, memberProfileName,
           memberAvatarUrl, createdAt }
- currentUser: { id } | null
- isLiked: boolean
- isSaved: boolean
- onLike: (photoId) => void
- onSave: (photoId) => void
- onNavigateToPhoto: (photoId) => void
- onNavigateToProfile: (profileName) => void

카드 디자인 (max-width 560px, margin auto, surface bg, radius 16px, shadow sm, overflow hidden):

  작가 헤더 (padding 14px 16px, flex align-items center gap 12px):
    아바타 38px 원형 (avatarUrl 없으면 이니셜 primary bg)
    중:
      memberName 14px 600 (클릭 → onNavigateToProfile)
      colorMood 배지 (11px, 해당 무드 색상)
    우: 시간 상대값 12px textMuted

  이미지 (aspect-ratio 4/3, object-fit cover, cursor pointer, 클릭 → onNavigateToPhoto):
    hover: scale(1.02) 0.3s

  하단 액션 바 (padding 12px 16px, flex align-items center):
    ♡/♥ 좋아요 버튼 (isLiked: primary색 / 비활성: textMuted)
      aria-label={isLiked?'좋아요 취소':'좋아요'} aria-pressed={isLiked}
    좋아요 수 13px textSecondary margin-left 6px
    🔖 저장 버튼 (isSaved: accent색 / 비활성: textMuted) margin-left 16px
    저장 수 13px textSecondary margin-left 6px
    제목 (flex 1, text-align right, 13px textMuted, 1줄 ellipsis)

2. FeedPage 전체 레이아웃

max-width 600px, margin auto, padding 24px 16px

헤더:
  "📰 피드" 22px 700 + "팔로우한 작가의 최신 사진" 13px textMuted
  우측: [탐색하기] ghost sm → /explore (팔로우가 없을 때 표시)

로딩: FeedCard 스켈레톤 3개 (아바타 38px + 이미지 4:3 + 하단 바)

FeedCard 목록 (flex column gap 20px):
  목 데이터: 팔로우 유저 사진 6개 (다양한 작가, 무드, 시간)

페이지네이션 (하단):
  [더 보기] secondary 버튼 (page+1 로드)
  로딩 중: 버튼 내 스피너
  더 이상 없을 때: "모든 게시물을 확인했습니다 ✓" textMuted

빈 피드 상태 (팔로우 0명):
  중앙 배치, 큰 아이콘 📸
  "피드가 비어 있습니다" 18px 600
  "마음에 드는 작가를 팔로우하면 여기에 최신 사진이 나타납니다" 14px textMuted
  [작가 탐색하기] primary 버튼 → /explore

빈 피드 상태 (팔로우 있지만 사진 없음):
  "팔로우한 작가의 새 사진이 없습니다" + [탐색] ghost

데모: 피드 카드 6개, 더 보기, 빈 피드(팔로우 없음), 빈 피드(사진 없음) 4가지 상태
```

### 통합 방법

```jsx
// FeedPage.jsx
const [page, setPage] = useState(0)
const [photos, setPhotos] = useState([])
const [hasMore, setHasMore] = useState(true)

const loadMore = async () => {
  const data = await photoApi.getFeed(user.id, { page: page + 1, size: 10 })
  setPhotos(prev => [...prev, ...data.content])
  setHasMore(!data.last)
  setPage(p => p + 1)
}
```

---

## [2] PhotoSortPage — 드래그 정렬 UX 개선

### 현재 문제

`PhotoSortPage`에 `react-beautiful-dnd` 기반 드래그 정렬이 있지만
드래그 핸들 아이콘, dirty 상태 배너, 저장 확인 UX가 없어
사용자가 변경 저장 여부를 알기 어려움.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff'
      bg '#f7f7fb' surface '#fff' border '#e5e5ed'
      text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb'
      success '#22c55e' warning '#f59e0b'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

PhotoSortPage 개선 컴포넌트를 만들어주세요.
(실제 react-beautiful-dnd 사용하지 않고 목 인터랙션으로 구현)

== 레이아웃 ==

max-width 720px, margin auto, padding 24px

페이지 헤더:
  "🗂️ 갤러리 순서 정렬" 22px 700
  "드래그하여 사진 순서를 변경하세요" 13px textMuted

== Dirty 상태 배너 ==

순서가 변경되면 (isDirty=true) 페이지 상단 sticky 배너 표시:
  bg primaryLight, border-bottom '1px solid rgba(91,110,245,0.2)', padding 10px 24px
  flex justify-between align-items center:
  좌: "⚠️ 저장하지 않은 변경사항이 있습니다" 13px '#5b6ef5'
  우: [지금 저장] primary sm + [되돌리기] ghost sm

== 정렬 아이템 목록 ==

각 아이템 (surface bg, border '#e5e5ed', radius 12px, padding 12px, margin-bottom 8px):
  flex row align-items center gap 12px:

  드래그 핸들:
    ⋮⋮ (더블 vertical dots) 또는 ≡ 아이콘, 24px width
    color textMuted, cursor grab, active: cursor grabbing
    hover: color primary

  썸네일: 56px × 56px, border-radius 8px, object-fit cover

  정보 (flex 1):
    제목 14px 600, 1줄 ellipsis
    분위기 배지 (11px chip)

  순서 번호: 20px 원, bg surfaceDim, 12px 700 textSecondary, text-align center

드래그 중 아이템:
  box-shadow '0 8px 32px rgba(91,110,245,0.24)'
  border-color primary
  opacity 0.9
  scale(1.01)

드롭 영역 하이라이트:
  border '2px dashed primary' bg primaryLight (드래그 아이템 빠진 자리)

== 하단 저장 버튼 ==

sticky bottom 0 bg 'rgba(247,247,251,0.92)' backdropFilter blur(8px) border-top '#e5e5ed'
padding 16px 24px, flex justify-between align-items center:
  좌: "{n}개 사진" 13px textMuted
  우: [취소] secondary + [저장하기] primary (저장 중: 스피너 + "저장 중...")

저장 완료: 상단 배너 사라짐, 하단 "[✓ 저장됨]" success 텍스트 2초 표시

== 목 인터랙션 ==

아이템 6개, 클릭하여 위/아래 이동 버튼 (▲▼)으로 순서 변경 시뮬레이션
(실제 드래그 없이도 동작 확인 가능)
isDirty: 순서 한 번이라도 변경하면 true

데모: 기본 상태 / 변경 후 dirty 배너 / 저장 완료 순서로 시연
```

### 통합 방법

```jsx
// PhotoSortPage.jsx
const [isDirty, setIsDirty] = useState(false)
const [originalOrder, setOriginalOrder] = useState([])

const handleDragEnd = (result) => {
  if (!result.destination) return
  const reordered = Array.from(photos)
  const [moved] = reordered.splice(result.source.index, 1)
  reordered.splice(result.destination.index, 0, moved)
  setPhotos(reordered)
  setIsDirty(true)
}
const handleSave = async () => {
  const orders = photos.map((p, i) => ({ id: p.id, displayOrder: i + 1 }))
  await photoApi.reorder(orders)
  setIsDirty(false)
  showToast('순서가 저장되었습니다', 'success')
}
const handleRevert = () => {
  setPhotos([...originalOrder])
  setIsDirty(false)
}
```

---

## 완료 체크리스트

- [ ] FeedCard.jsx 생성 (작가 헤더 + 이미지 4:3 + 액션 바)
- [ ] FeedCard 좋아요/저장 버튼 aria-label 추가
- [ ] FeedPage 전체 레이아웃 개선 (max-width 600px 중앙)
- [ ] FeedPage [더 보기] 페이지네이션 버튼
- [ ] FeedPage 빈 피드 상태 (팔로우 없음)
- [ ] FeedPage 빈 피드 상태 (사진 없음)
- [ ] PhotoSortPage dirty 상태 배너 추가
- [ ] PhotoSortPage [되돌리기] 버튼 originalOrder 복원
- [ ] PhotoSortPage 드래그 핸들 아이콘 (⋮⋮) 추가
- [ ] PhotoSortPage 드래그 중 시각적 피드백 (scale + shadow)
- [ ] PhotoSortPage 하단 sticky 저장 바
- [ ] PhotoSortPage 저장 완료 success 피드백
- [ ] photoApi.reorder(orders) 연동 확인
