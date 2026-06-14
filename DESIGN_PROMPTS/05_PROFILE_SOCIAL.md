# 05 — 프로필 & 소셜 (ProfilePage 4탭 · 댓글 · 팔로우모달 · PortfolioPage)

> P0: 댓글 컴포넌트 분리 / P1: 아바타·커버 업로드 + 4탭 완성 / P2: PortfolioPage 개선

---

## 저장 경로

```
frontend/src/
  components/photo/CommentsSection.jsx   (신규)
  components/common/AvatarUploader.jsx   (신규)
  components/common/FollowListModal.jsx  (신규)
  pages/ProfilePage.jsx                  (수정 — 4탭 완성)
  pages/PortfolioPage.jsx                (수정 — 팔로우/시리즈탭 개선)
```

---

## [1] 댓글 섹션 컴포넌트 분리

### 현재 문제

댓글 기능이 `PhotoModal.jsx` 내부에만 있어 `PhotoDetailPage`에서 댓글 조회 불가.
`CommentsSection.jsx`를 분리해 두 곳에서 공용 사용.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' bg '#f7f7fb' surface '#fff'
      border '#e5e5ed' text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb'
      danger '#e53e3e' darkBorder 'rgba(255,255,255,0.08)' darkText '#e8e8f0'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

CommentsSection 컴포넌트를 만들어주세요.

Props:
- photoId: number
- currentUser: { id, name, profileName } | null
- theme: 'dark'|'light' (기본 'light')

기능:
  댓글 목록: 이니셜 아바타(32px 원, primary bg) + 이름(13px 600) + 내용(14px lh 1.5) + 시간(12px textMuted)
  내 댓글: 우측 × 삭제 버튼
  대댓글 지원: 댓글 우측 [↩ 답글] 버튼, 들여쓰기 32px
  빈 상태: "아직 댓글이 없습니다. 첫 댓글을 남겨보세요!" textMuted 중앙
  입력 영역: 이니셜 아바타 + textarea(min-height 60px, radius 8px)
              Enter 제출, Shift+Enter 줄바꿈
              우측 [등록] primary 버튼 height 36px
  섹션 타이틀: "댓글 N개" 13px 500 textSecondary

  API 없이 useState 목 데이터 사용 (댓글 3개 초기값, 대댓글 1개 포함, 등록/삭제 동작)

dark theme:
  border: darkBorder, textarea bg 'rgba(255,255,255,0.06)' color '#e8e8f0'
  border-color 'rgba(255,255,255,0.12)'

데모: dark / light 두 테마 나란히 표시
```

### 통합 방법

```jsx
// PhotoModal.jsx: 기존 댓글 인라인 코드 제거 후
<CommentsSection photoId={photo.id} currentUser={user} theme="dark" />

// PhotoDetailPage.jsx: 이미지/정보 섹션 아래 추가
<CommentsSection photoId={photo.id} currentUser={user} theme="light" />
```

---

## [2] 아바타 이미지 업로드

### 현재 문제

`ProfilePage` 아바타가 hover overlay 클릭 시 파일 선택 → 즉시 미리보기 → 저장 흐름이
코드에 있으나 에러 처리와 UX 피드백이 부족함.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' bg '#f7f7fb' surface '#fff'
      border '#e5e5ed' text '#0f0f1a' textMuted '#8888bb'
      danger '#e53e3e' success '#22c55e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

AvatarUploader 컴포넌트를 만들어주세요.

Props:
- user: { name, avatarUrl }
- onUpload: (file: File) => Promise<void>
- size: number (기본 88)
- editable: boolean (기본 true)

표시:
  avatarUrl 있으면 원형 이미지 / 없으면 이니셜(name 첫 글자 대문자) primary bg white text
  테두리: '3px solid #fff' + box-shadow '0 2px 8px rgba(91,110,245,0.08)'
  크기: size × size px, border-radius 50%

editable=true:
  hover 시 반투명 검은 오버레이(rgba(0,0,0,0.5)) + "📷 변경" (11px white 중앙)
  cursor pointer, transition opacity 0.2s
  클릭 → 숨겨진 input[type=file] 트리거 (accept="image/jpeg,image/png,image/webp")
  파일 선택 → URL.createObjectURL 즉시 미리보기
  미리보기 후 하단에 [저장] primary sm / [취소] ghost sm 표시
  저장 클릭 → onUpload(file) → 로딩 스피너 오버레이
  완료 → ✓ 1.5초 표시 후 사라짐
  취소 → 미리보기 롤백

파일 제한:
  5MB 초과 시 에러 메시지 "5MB 이하의 이미지를 선택해주세요" (danger 색상)
  MIME 타입 제한 (jpeg/png/webp)

데모 5가지:
1. 아바타 없음 (이니셜 "K")
2. 아바타 있음 (picsum.photos 더미)
3. 미리보기 상태 (저장/취소 버튼 표시)
4. 업로드 중 (스피너)
5. editable=false (다른 사용자 프로필 뷰)
```

### 통합 방법

```jsx
// ProfilePage.jsx
const handleAvatarUpload = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const { url } = await authApi.uploadFile(formData)
  await updateProfile({ ...user, avatarUrl: url })
  showToast('프로필 사진이 변경되었습니다', 'success')
}
<AvatarUploader user={user} onUpload={handleAvatarUpload} size={88} />
```

---

## [3] ProfilePage 4탭 완성 (누락 항목)

### 현재 문제

`ProfilePage`는 코드상 4탭(내 작품·저장함·시리즈·설정)이 구현되어 있지만
디자인 문서에 반영되지 않았음. 설정 탭의 확장 폼, 커버 업로드, 통계, 계정삭제가
문서에서 모두 누락되어 있음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff' accent '#a78bfa'
      bg '#f7f7fb' surface '#fff' surfaceDim '#ededf4' border '#e5e5ed'
      text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb'
      danger '#e53e3e' success '#22c55e' darkBg '#0a0a18' darkSurface '#12122a'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, react+react-router-dom만 허용, 한국어 UI

ProfilePage 컴포넌트를 만들어주세요. 더미 데이터 사용.

== 상단 커버 + 프로필 영역 ==

1. 커버 이미지 영역 (height 180px, position relative, bg '#1a1a2e'):
   coverUrl 있으면 img object-fit cover, 없으면 dark gradient bg
   hover 시 "📷 커버 사진 변경" 오버레이 버튼 (position absolute 하단 중앙, bg rgba(0,0,0,0.5))
   클릭 → input[type=file] accept="image/*" → coverUrl 즉시 업데이트

2. 프로필 카드 (margin-top -44px, bg surface, radius 16px, padding 20px 24px, max-width 960px, margin-x auto):
   flex row gap 20px:
   좌: AvatarUploader 88px
   중(flex 1):
     이름 20px 700 + "@profileName" 13px textMuted
     bio (있을 때, 14px textSecondary, margin-top 4px)
     location (있을 때, 📍 13px textMuted)
   우: [프로필 편집] ghost 버튼 → 설정 탭 이동

3. 통계 바 (border-top margin-top 16px padding-top 16px):
   flex row gap 24px:
   6종 통계 (숫자 18px 700 + 라벨 11px textMuted):
   사진 수 · 좋아요 · 저장 · 공유 · 문의 · 미읽음 문의
   미읽음 문의 > 0: 숫자 danger색

== 4탭 구조 ==

탭 바 (border-bottom, margin-top 16px):
  "내 작품" · "저장함" · "시리즈" · "설정"
  활성: primary색 border-bottom 2px, 14px 600
  비활성: textMuted 14px 500

== 탭 1: 내 작품 ==
  갤러리 정렬 드롭다운 (우측, "최신순▾")
  마소닉 그리드 (columns CSS, PC 3~4컬럼, 모바일 2컬럼)
  목 사진 6개
  빈 상태: "아직 등록된 사진이 없습니다" + [+ 사진 등록하기] 버튼

== 탭 2: 저장함 ==
  저장한 사진 목 3개, 동일 마소닉 그리드
  빈 상태: "저장한 사진이 없습니다"

== 탭 3: 시리즈 ==
  SeriesCard 목 2개 (커버 이미지 + 제목 + 사진 수 + 설명)
  각 카드 클릭 → /series 이동
  빈 상태: "아직 시리즈가 없습니다"

== 탭 4: 설정 ==

  4-1. 기본 정보 폼 (surface card, border-radius 12px, padding 24px):
    "기본 정보" 섹션 헤더
    이름(name) · 아이디(@profileName) input
    bio textarea (3줄, placeholder '나를 소개해주세요')
    websiteUrl input (🔗 prefix, placeholder 'https://...')
    location input (📍 prefix)

  4-2. 전문 분야 선택 (specialties):
    "전문 분야" 섹션 헤더 (13px 600)
    10개 체크박스 칩: 웨딩/인물/풍경/제품/음식/건축/스포츠/야생동물/패션/이벤트
    각 칩: 선택 시 bg primaryLight border primary color primary, 12px
    최대 선택 제한 없음

  4-3. 알림 설정:
    "알림 설정" 섹션 헤더
    "새 문의 이메일 알림" 토글 + "이메일로 새 촬영 문의를 받습니다" 12px textMuted

  4-4. 공개 설정:
    "공개 설정" 섹션 헤더
    "공개 포트폴리오" 토글 + "포트폴리오를 누구나 볼 수 있습니다" 12px textMuted

  4-5. 비밀번호 변경 (카카오 OAuth 유저는 숨김):
    현재 비밀번호 · 새 비밀번호 · 확인 입력 (type=password, 👁 토글)
    [비밀번호 변경] secondary 버튼

  4-6. 계정 삭제 (danger zone, border danger, radius 12px, padding 24px):
    "⚠️ 위험 구역" 섹션 헤더 danger색
    "계정을 삭제하면 모든 사진, 댓글, 시리즈가 영구 삭제됩니다" 13px
    [계정 삭제] danger 버튼 → 확인 모달

  계정 삭제 확인 모달:
    "정말로 계정을 삭제하시겠습니까?" 제목
    "이메일을 입력하여 확인해주세요: user@example.com" 안내
    이메일 input + 실제 이메일과 일치 여부 실시간 검증
    일치할 때만 [계정 삭제] danger 버튼 활성
    [취소] ghost 버튼

  모든 설정 변경 후 [저장하기] primary 버튼 sticky bottom (또는 각 섹션 하단)

데모: 탭 클릭으로 4탭 전환, 설정 탭 전체 폼 표시, 계정 삭제 모달 열기/닫기
```

### 통합 방법

```jsx
// ProfilePage.jsx 기존 탭 구조를 위 디자인으로 교체
// authApi.getStats(user.id) → 통계 6종 로드
// authApi.updateProfile({ ...user, bio, websiteUrl, location, specialties, ... })
// authApi.changePassword(user.id, { currentPassword, newPassword })
// authApi.deleteAccount(user.id) → 성공 시 logout() + navigate('/login')
```

---

## [4] FollowListModal — PortfolioPage 팔로워/팔로잉 목록

### 현재 문제

`PortfolioPage`에 팔로워/팔로잉 수가 표시되지만 클릭 시 목록 모달이 없음.
`followApi.getFollowers/getFollowing` API가 있음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff'
      bg '#0a0a18' surface '#12122a' border 'rgba(42,42,80,1)'
      text '#e8e8f0' textSecondary '#8080b0' textMuted '#5555aa' danger '#e53e3e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

FollowListModal 컴포넌트를 만들어주세요 (다크 테마 — PortfolioPage 전용).

Props:
- isOpen: boolean
- onClose: () => void
- targetMemberId: number
- currentUserId: number | null
- initialTab: 'followers'|'following'

기능:
  isOpen=false → null 반환
  오버레이: position fixed inset 0 bg 'rgba(0,0,0,0.88)' z-index 2000
  모달 패널: position fixed top '50%' left '50%' transform 'translate(-50%,-50%)'
    width 360px, max-height 560px, bg '#12122a', border 'rgba(42,42,80,1)', radius 16px

  모달 헤더:
    "팔로워" · "팔로잉" 2탭
    활성: primary색 border-bottom 2px
    우측 × 닫기 버튼 (32px, color textSecondary)
    Escape 키 닫기

  목록 (overflow-y auto, max-height 480px):
    로딩: 3개 skeleton row (40px 원 + 2줄)
    각 row: 40px 원형 아바타 + 이름(14px 600) + @profileName(12px textMuted) + 우측 [팔로우/팔로잉] 버튼
    [팔로우] primary sm / [팔로잉] ghost sm (이미 팔로우 중)
    본인(currentUserId === item.id): 버튼 숨김
    빈 상태: "팔로워가 없습니다" / "팔로잉 없음" textMuted 중앙

  목 데이터: 팔로워 4명, 팔로잉 3명
  탭 전환 시 목록 즉시 교체

데모: 팔로워 탭 / 팔로잉 탭 / 로딩 상태 / 빈 상태 순서로 시연
```

### 통합 방법

```jsx
// PortfolioPage.jsx
const [followModal, setFollowModal] = useState({ open: false, tab: 'followers' })

// 팔로워/팔로잉 수 클릭 가능하게
<span onClick={() => setFollowModal({ open: true, tab: 'followers' })} style={{ cursor: 'pointer' }}>
  팔로워 {followerCount}명
</span>

<FollowListModal
  isOpen={followModal.open}
  onClose={() => setFollowModal(v => ({ ...v, open: false }))}
  initialTab={followModal.tab}
  targetMemberId={author.id}
  currentUserId={currentUser?.id ?? null}
/>
```

---

## [5] PortfolioPage 개선 (P2)

### 현재 문제

`/portfolio/:profileName` 라우트의 PortfolioPage에 팔로우 버튼이 있지만
시리즈 탭과 FollowListModal이 없음. 커버 이미지 섹션도 미약함.

> ⚠️ 기존 `05_PROFILE_SOCIAL.md`의 "AuthorPage" 설명은 잘못됨.
> 실제 공개 프로필 라우트는 `/portfolio/:profileName` (PortfolioPage).
> `/u/:profileName` 라우트는 현재 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: darkBg '#0a0a18' darkSurface '#12122a' darkBorder '#2a2a50'
      darkText '#e8e8f0' darkTextSub '#8080b0' primary '#5b6ef5' accent '#a78bfa'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, react+react-router-dom만 허용, 한국어 UI

PortfolioPage 개선 컴포넌트를 만들어주세요. 더미 데이터 사용.

비로그인/타인 모두 접근 가능한 다크 테마 공개 포트폴리오.

1. 히어로 커버 섹션 (height 240px, position relative):
   coverUrl 있으면 이미지(blur-down gradient 오버레이) / 없으면 dark gradient
   하단에서 위로 fade: 'linear-gradient(to top, #0a0a18 0%, transparent 60%)'

2. 프로필 카드 (margin-top -80px, max-width 900px, margin-x auto, padding 0 24px):
   flex row gap 24px align-items flex-end:
   좌: 아바타 96px (editable=false, 테두리 '3px solid #12122a')
   중(flex 1):
     이름 24px 700 darkText / @profileName 14px darkTextSub
     bio 14px darkTextSub margin-top 8px (있을 때)
     specialties 칩 (있을 때, accent bg, 11px, radius full, padding '3px 8px')
     통계 행 (margin-top 12px): 사진 N · 팔로워 N · 팔로잉 N (숫자 클릭 → FollowListModal)
       팔로워/팔로잉 숫자: cursor pointer, hover color accent
   우 (position absolute top 0 right 24px):
     본인: [편집] ghost small → /profile 이동
     타인+로그인: [팔로우] primary / [팔로잉 ✓] ghost (already following)
     비로그인: [로그인하여 팔로우] ghost
     [문의하기] accent 버튼 → /inquiry/:profileName

3. 탭 바 (border-bottom '#2a2a50', margin-top 24px):
   "사진 N" · "시리즈 M" · "저장됨" (disabled, textMuted)
   활성: primary 색 border-bottom 2px

4. 사진 탭:
   마소닉 그리드 (PC 3컬럼, 모바일 2컬럼)
   목 사진 9개 카드 (hover overlay: 좋아요수+저장수)
   클릭 → /photo/:id 이동

5. 시리즈 탭:
   2컬럼 그리드 (모바일 1컬럼)
   SeriesCard: 커버 이미지(160px, object-fit cover) + 제목 + 사진수 배지 + 설명 2줄
   카드 hover: translateY(-4px)

6. 빈 상태: 각 탭별 "아직 사진이 없습니다" / "아직 시리즈가 없습니다"

7. 에러(없는 profileName): "🤔 존재하지 않는 프로필입니다" + [홈으로] 버튼

데모: 본인 / 타인 / 비로그인 / 에러 4가지, 사진/시리즈 탭 전환
```

### 통합 방법

```jsx
// PortfolioPage.jsx 수정
// portfolioApi.getPublicProfile(profileName) → 작가 정보 + 사진 목록 + 시리즈 목록
// followApi.isFollowing(currentUserId, author.id) → 팔로우 상태 확인
// followApi.follow/unfollow(currentUserId, author.id) → 팔로우/언팔로우
// FollowListModal 연결 (팔로워/팔로잉 수 클릭 시)
```

---

## 완료 체크리스트

- [ ] CommentsSection.jsx 생성
- [ ] PhotoModal 기존 댓글 코드 → CommentsSection 교체
- [ ] PhotoDetailPage 하단에 CommentsSection 추가
- [ ] dark/light 두 테마 확인
- [ ] 대댓글(들여쓰기 32px) 렌더링 확인
- [ ] AvatarUploader.jsx 생성
- [ ] 파일 선택 → 즉시 미리보기 확인
- [ ] 5MB 초과 에러 메시지 확인
- [ ] ProfilePage 기존 아바타 → AvatarUploader 교체
- [ ] ProfilePage 커버 이미지 업로드 (hover overlay)
- [ ] ProfilePage 통계 6종 표시 (authApi.getStats)
- [ ] ProfilePage 4탭 (내 작품/저장함/시리즈/설정) 완성
- [ ] 설정 탭 — 기본 정보 폼 (bio/websiteUrl/location)
- [ ] 설정 탭 — 전문 분야 10개 체크박스 칩
- [ ] 설정 탭 — 알림/공개 설정 토글
- [ ] 설정 탭 — 비밀번호 변경 (카카오 유저 숨김)
- [ ] 설정 탭 — 계정 삭제 2단계 (이메일 확인 모달)
- [ ] FollowListModal.jsx 생성 (다크 테마)
- [ ] PortfolioPage 팔로워/팔로잉 수 클릭 → FollowListModal 연결
- [ ] PortfolioPage 시리즈 탭 추가
- [ ] PortfolioPage 팔로우/언팔로우 버튼 연결
- [ ] PortfolioPage 커버 섹션 개선 (blur-down gradient)
