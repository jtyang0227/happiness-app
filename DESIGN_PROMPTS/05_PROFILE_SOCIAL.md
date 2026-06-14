# 05 — 프로필 & 소셜 (댓글 · 아바타 업로드 · 작가 페이지)

> P0: 댓글 컴포넌트 분리 / P1: 아바타 업로드 / P2: 작가 공개 프로필

---

## 저장 경로

```
frontend/src/
  components/photo/CommentsSection.jsx   (신규)
  components/common/AvatarUploader.jsx   (신규)
  pages/AuthorPage.jsx                   (신규)
  App.jsx                                (라우트 추가)
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
컬러: primary '#5b6ef5' primaryLight '#eef0ff' bg '#f5f5fa' surface '#fff'
      border '#e2e2ee' text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0'
      danger '#e53e3e'
      darkBorder 'rgba(255,255,255,0.08)' darkText '#eeeeff'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

CommentsSection 컴포넌트를 만들어주세요.

Props:
- photoId: number
- currentUser: { id, name, profileName } | null
- theme: 'dark'|'light' (기본 'light')

기능:
  댓글 목록: 이니셜 아바타(32px 원, primary bg) + 이름(13px 600) + 내용(14px lh 1.5) + 시간(12px textMuted)
  내 댓글: 우측 × 삭제 버튼
  빈 상태: "아직 댓글이 없습니다. 첫 댓글을 남겨보세요!" textMuted 중앙
  입력 영역: 이니셜 아바타 + textarea(min-height 60px, radius 8px)
              Enter 제출, Shift+Enter 줄바꿈
              우측 [등록] primary 버튼 height 36px
  섹션 타이틀: "댓글 N개" 13px 500 textSecondary

  API 없이 useState 목 데이터 사용 (댓글 3개 초기값, 등록/삭제 동작)

dark theme:
  border: darkBorder, textarea bg 'rgba(255,255,255,0.06)' color '#eeeeff'
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

`ProfilePage` 아바타가 이니셜 텍스트로만 표시됨. 이미지 업로드 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' bg '#f5f5fa' surface '#fff'
      border '#e2e2ee' text '#1a1a2e' textMuted '#9090b0'
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
  테두리: '3px solid #fff' + box-shadow sm
  크기: size × size px, border-radius 50%

editable=true:
  hover 시 반투명 검은 오버레이(rgba(0,0,0,0.5)) + "📷 사진 변경" (12px white 중앙)
  cursor pointer, transition opacity 0.2s
  클릭 → 숨겨진 input[type=file] 트리거 (accept="image/jpeg,image/png,image/webp")
  파일 선택 → URL.createObjectURL 즉시 미리보기
  미리보기 후 우측 or 하단에 [저장] primary sm / [취소] ghost sm 표시
  저장 클릭 → onUpload(file) → 로딩 스피너 오버레이
  완료 → ✓ 잠깐 표시 후 사라짐
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
import AvatarUploader from '../components/common/AvatarUploader'

const handleAvatarUpload = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const { url } = await authApi.uploadFile(formData)
  await updateProfile({ ...user, avatarUrl: url })
  showToast('프로필 사진이 변경되었습니다', 'success')
}

// 기존 이니셜 아바타 div 교체
<AvatarUploader user={user} onUpload={handleAvatarUpload} size={88} />
```

---

## [3] 작가 공개 프로필 페이지 (P2)

### 새 라우트

```
/u/:profileName → AuthorPage (비로그인도 접근 가능)
```

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff'
      bg '#f5f5fa' surface '#fff' border '#e2e2ee'
      text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, react+react-router-dom만 허용, 한국어 UI

AuthorPage 컴포넌트를 만들어주세요. 더미 데이터 사용.

Props: useParams로 profileName, currentUserId(null이면 비로그인)

1. 커버 섹션 (height 200px, position relative, overflow hidden)
   작가 첫 번째 사진을 블러 배경으로 (filter blur(40px) scale(1.1) opacity(0.4))
   위에 dark overlay rgba(0,0,0,0.5)

2. 프로필 카드 (margin-top -60px, bg surface, radius 16px, padding 24px, max-width 900px, margin-x auto)
   flex row:
   좌: AvatarUploader와 동일 스타일 아바타 88px (editable=false)
   중(flex 1 padding-left 20px):
     이름 22px 700 / @profileName 14px textMuted
     🔗 포트폴리오 URL (있을 때, primary 색 링크 새 탭)
     📷 @인스타그램 (있을 때, 클릭 시 instagram.com/username 새 탭)
     통계 행 (margin-top 12px): 사진 N개 · 좋아요 N개 · 저장 N개
       각 항목: 숫자 16px 700 + 라벨 12px textMuted
   우:
     본인(currentUserId===author.id): [프로필 편집] secondary → /profile 이동
     타인: [팔로우] primary disabled (텍스트 "팔로우 (준비 중)")
     비로그인: [로그인하여 팔로우] ghost

3. 사진 탭 (border-bottom, "사진 {n}개" 활성 / "저장됨" disabled)

4. 마소닉 그리드 (PC 3컬럼, 모바일 2컬럼, columns CSS)
   목 사진 9개 카드 (이미지 placeholder + 분위기 배지 + 제목)
   클릭 → /photo/:id 이동

5. 빈 상태: "아직 등록된 사진이 없습니다" textMuted 중앙
6. 에러(존재하지 않는 profileName): "🤔 존재하지 않는 프로필입니다" + [갤러리로] 버튼

데모: 본인 / 타인 / 비로그인 / 에러 4가지 탭으로 전환
```

### 통합 방법

```jsx
// App.jsx 라우트 추가
import AuthorPage from './pages/AuthorPage'
<Route path="/u/:profileName" element={<AuthorPage />} />

// PhotoCard.jsx 작가명에 링크 추가
<span onClick={e => { e.stopPropagation(); navigate(`/u/${photo.memberProfileName}`) }}
  style={{ cursor:'pointer', color: colors.textSecondary }}>
  {photo.memberName}
</span>

// authApi.js 새 메서드 (백엔드 지원 필요)
// GET /api/members/{profileName}/public
getPublicProfile: (profileName) => apiClient.get(`/members/${profileName}/public`)
```

---

## 완료 체크리스트

- [ ] CommentsSection.jsx 생성
- [ ] PhotoModal 기존 댓글 코드 → CommentsSection 교체
- [ ] PhotoDetailPage 하단에 CommentsSection 추가
- [ ] dark/light 두 테마 확인
- [ ] AvatarUploader.jsx 생성
- [ ] 파일 선택 → 즉시 미리보기 확인
- [ ] 5MB 초과 에러 메시지 확인
- [ ] ProfilePage 기존 아바타 → AvatarUploader 교체
- [ ] AuthorPage.jsx 생성 (P2)
- [ ] App.jsx 라우트 `/u/:profileName` 추가 (P2)
- [ ] PhotoCard 작가명 클릭 → /u/:profileName 이동 (P2)
- [ ] 본인/타인/비로그인 버튼 분기 확인 (P2)
