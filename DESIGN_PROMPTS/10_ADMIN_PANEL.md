# 10. Admin Panel — 갤러리 순서 관리 중심 어드민

검증일: 2026-06-18

---

## 배경 및 목적

기존 `/gallery/sort` (PhotoSortPage) 는 일반 사용자 앱에서 **제거**했다.  
사진 표시 순서(displayOrder) 관리는 **어드민 전용 기능**으로 이관한다.

어드민 패널은 별도 앱(`happiness-admin`) 또는 현재 프론트엔드의 `/admin/*` 보호 라우트 중 하나로 구현한다.  
본 기획서는 **두 방식 공통**으로 사용 가능한 UI/UX 프롬프트를 제공한다.

---

## 구현 범위 (MVP)

| 화면 | 기능 |
|------|------|
| AdminLayout | 사이드바 + 상단바 셸, ADMIN 권한 체크 |
| GalleryOrderPage | 사진 드래그 정렬, 멤버 선택, 순서 일괄 저장 |
| MemberListPage | 회원 목록 + 검색, 권한 변경(ADMIN/USER) |
| PhotoListPage | 전체 사진 목록, 강제 삭제 |
| DashboardPage | 주요 통계 카드 (회원 수, 사진 수, 문의 수) |

---

## 프롬프트 1 — AdminLayout (셸 컴포넌트)

```
[시스템 컨텍스트]
앱 이름: Happiness Admin — 포트폴리오 갤러리 어드민
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryDark:   '#4458e0'
  primaryLight:  '#eef0ff'
  bg:            '#f7f7fb'
  surface:       '#ffffff'
  border:        '#e5e5ed'
  text:          '#0f0f1a'
  textSecondary: '#5555aa'
  textMuted:     '#8888bb'
  danger:        '#e53e3e'
  bg:        '#090909'
  surface:   '#0f0f0f'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

---

AdminLayout 컴포넌트를 만들어줘. 요구사항:

1. 전체 레이아웃: 왼쪽 사이드바(220px 고정) + 오른쪽 콘텐츠 영역 (flex row)
2. 사이드바:
   - 상단: "🛠️ Happiness Admin" 로고 (primary 색상)
   - 네비게이션 메뉴 (NavLink 사용):
     • 📊 대시보드      /admin
     • 🖼️ 갤러리 순서   /admin/gallery-order
     • 👥 회원 관리     /admin/members
     • 📷 사진 관리     /admin/photos
   - 활성 메뉴: primaryLight 배경 + primary 텍스트 + 좌측 3px 프라이머리 보더
   - 비활성 메뉴: hover 시 surfaceDim(#ededf4) 배경
   - 하단: 로그아웃 버튼 (danger 색상)
3. 상단바:
   - 흰색 배경, 하단 border
   - 현재 페이지명 (h2)
   - 우측: 로그인한 어드민 이메일 표시
4. 콘텐츠 영역: bg('#f7f7fb'), padding 24px, 최소 높이 100vh
5. props: children (콘텐츠), adminEmail (문자열), currentPageTitle (문자열)
6. 모바일(768px 미만): 사이드바 숨김, 상단바에 햄버거 메뉴 버튼 추가 (토글)
```

---

## 프롬프트 2 — GalleryOrderPage (핵심: 갤러리 순서 관리)

```
[시스템 컨텍스트]
앱 이름: Happiness Admin
기술 스택: React 18 SPA, React Router v6, inline style
아이콘: 이모지/유니코드
컬러: primary '#5b6ef5', bg '#f7f7fb', surface '#ffffff', border '#e5e5ed',
      text '#0f0f1a', textSecondary '#5555aa', danger '#e53e3e', success '#22c55e'
radius: sm:8, md:12, lg:16
shadow.md: '0 4px 16px rgba(91,110,245,0.12)'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- inline style만 사용
- react, react-router-dom만 import 허용
- 한국어 UI

---

GalleryOrderPage 컴포넌트를 만들어줘.
이 페이지는 어드민이 특정 멤버의 사진 표시 순서를 드래그&드롭으로 변경·저장하는 화면이다.

### 데이터 흐름
- GET  /api/auth/members              → 전체 회원 목록 [{id, name, email, avatarUrl}]
- GET  /api/photos?memberId=X&sortBy=displayOrder&order=asc  → 해당 멤버 사진 목록
- PUT  /api/photos/reorder            → Body: [{id, displayOrder}] 배열

### UI 요구사항

**헤더 영역**
- 제목: "🖼️ 갤러리 표시 순서 관리"
- 설명 텍스트: "드래그로 순서를 변경한 뒤 저장 버튼을 누르세요."

**멤버 선택 셀렉트**
- <select> 드롭다운, 스타일링: border '#e5e5ed', radius 8px, padding 8px 12px
- "멤버를 선택하세요" 기본 옵션
- 선택 시 해당 멤버 사진 로드

**사진 그리드 (드래그 정렬)**
- 4컬럼 그리드 (모바일 2컬럼)
- 각 사진 카드:
  • 이미지 썸네일 (aspect-ratio 1, object-fit cover)
  • 좌상단: 현재 순서 번호 뱃지 (primary 배경, 흰색 텍스트, 원형)
  • 하단: 사진 제목 (한 줄, overflow hidden)
  • 드래그 핸들 아이콘 (⠿ 또는 ≡) — 우상단 표시
  • 드래그 중 카드: opacity 0.5, scale(1.02), shadow 강조
  • 드래그 오버 타겟: primary 색 2px dashed border

**드래그 구현 (HTML5 Drag & Drop API)**
- onDragStart: 드래그 시작 인덱스 저장
- onDragOver: preventDefault()
- onDrop: photos 배열에서 두 항목 위치 교환
- 순서 변경 시 즉시 뱃지 번호 업데이트

**저장 버튼**
- 우측 하단 고정 (position fixed, bottom 32px, right 32px)
- "💾 순서 저장" — primary 배경, 흰색, 패딩 12px 24px, radius 24px, shadow.md
- 로딩 스피너 (저장 중)
- 저장 성공: "✅ 저장되었습니다" 2초 토스트
- 저장 실패: "❌ 저장 실패" 토스트

**초기화 버튼**
- 저장 버튼 왼쪽
- "↺ 초기화" — surface 배경, border, 텍스트 secondary
- 클릭 시 원래 로드된 순서로 되돌림 (confirm 확인)

**빈 상태**
- 멤버 미선택: "← 왼쪽에서 멤버를 선택하세요" 안내
- 사진 없음: "📷 등록된 사진이 없습니다"

**변경 감지**
- 순서가 변경된 경우 저장 버튼에 "● 미저장" 인디케이터 표시
- 저장 전 페이지 이탈 시 브라우저 beforeunload 경고
```

---

## 프롬프트 3 — DashboardPage (통계 대시보드)

```
[시스템 컨텍스트]
앱 이름: Happiness Admin
기술 스택: React 18 SPA, inline style, 외부 라이브러리 없음
컬러: primary '#5b6ef5', primaryLight '#eef0ff', bg '#f7f7fb', surface '#ffffff',
      border '#e5e5ed', text '#0f0f1a', textSecondary '#5555aa',
      success '#22c55e', danger '#e53e3e', accent '#a78bfa'
shadow.md: '0 4px 16px rgba(91,110,245,0.12)'

규칙: export default 함수형 컴포넌트, inline style, react만 import, 한국어 UI

---

DashboardPage 컴포넌트를 만들어줘.

### 데이터
- GET /api/auth/members/count  → { count: number }
- GET /api/photos/count        → { count: number }
- GET /api/inquiry/count       → { count: number, unread: number }
- 각 API 독립적으로 병렬 fetch (Promise.all)

### 통계 카드 (4개, 2×2 그리드 → 모바일 1컬럼)
1. 전체 회원 수   — 아이콘 👥, 색상 primary
2. 전체 사진 수   — 아이콘 📷, 색상 accent('#a78bfa')
3. 전체 문의 수   — 아이콘 💌, 색상 success
4. 미읽음 문의    — 아이콘 🔴, 색상 danger

카드 디자인:
- surface 배경, border, radius 16px, shadow.md
- 좌측: 아이콘 (48px 원형, 색상별 10% 투명도 배경)
- 중앙: 숫자 (32px bold, 색상), 라벨 (14px, textSecondary)
- 로딩: shimmer 스켈레톤 (gradient animation)

### 빠른 링크 섹션 (카드 하단)
- "🖼️ 갤러리 순서 변경하기" → /admin/gallery-order
- "👥 회원 목록 보기" → /admin/members
- "📷 사진 목록 보기" → /admin/photos
- 각 버튼: border 1px, radius 8px, hover primary 배경 전환
```

---

## 프롬프트 4 — MemberListPage (회원 관리)

```
[시스템 컨텍스트]
앱 이름: Happiness Admin
기술 스택: React 18 SPA, inline style, react + react-router-dom만 허용
컬러: primary '#5b6ef5', surface '#ffffff', border '#e5e5ed',
      text '#0f0f1a', textSecondary '#5555aa', danger '#e53e3e', success '#22c55e'

---

MemberListPage 컴포넌트를 만들어줘.

### 데이터
- GET /api/auth/members?keyword=&page=&size=20  → Page<MemberResponse>
  MemberResponse: { id, name, email, authority('USER'|'ADMIN'), createdAt, photoCount }

### UI

**검색바**
- 텍스트 input (이름/이메일 검색), 돋보기 버튼
- 실시간 debounce 300ms

**테이블 (PC) / 카드 (모바일)**
PC 컬럼: 번호 | 아바타+이름 | 이메일 | 권한 | 사진 수 | 가입일 | 액션
- 권한 뱃지: ADMIN=primary, USER=textMuted
- 액션: "권한 변경" 버튼 (ADMIN↔USER 토글, confirm 다이얼로그)

모바일 카드:
- 아바타 + 이름 + 이메일
- 권한 뱃지 + 사진 수

**페이지네이션**
- 이전/다음 버튼 + 현재 페이지 표시
- 페이지당 20명

**권한 변경 API**
- PUT /api/auth/members/:id/role  Body: { authority: 'ADMIN' | 'USER' }
- 성공 시 목록 갱신 + 토스트
```

---

## 프롬프트 5 — AdminGuard (라우트 보호)

```
[시스템 컨텍스트]
앱 이름: Happiness Admin
기술 스택: React 18 SPA, inline style, react + react-router-dom만 허용

---

AdminGuard 컴포넌트를 만들어줘.

- useAuth() 훅으로 현재 로그인 유저 가져옴
- member.authority === 'ADMIN' 이면 children 렌더링
- 비로그인이면 /login 리다이렉트
- 로그인했지만 ADMIN 아니면 /unauthorized 로 리다이렉트
- 인증 확인 중(loading): "권한 확인 중..." 스피너 표시
```

---

## 라우트 구조 (어드민)

```
/admin                   DashboardPage       ← AdminGuard + AdminLayout
/admin/gallery-order     GalleryOrderPage    ← 갤러리 순서 관리 (핵심)
/admin/members           MemberListPage      ← 회원 목록/권한
/admin/photos            PhotoListPage       ← 사진 강제 삭제
```

---

## 백엔드 추가 작업 (기존 미구현)

```sql
-- 회원 권한 변경 엔드포인트 (없는 경우 추가)
-- PUT /api/auth/members/:id/role
-- ADMIN 권한 체크 필요
```

```java
// AuthController 추가 엔드포인트
@PutMapping("/members/{id}/role")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<MemberResponse> changeRole(
    @PathVariable Long id,
    @RequestBody Map<String, String> body
) { ... }

// Member.authority 컬럼: 이미 존재 (ADMIN/USER enum)
```

---

## 구현 순서

1. **AdminGuard** — 권한 라우트 보호 (30분)
2. **AdminLayout** — 셸 컴포넌트 (1시간)
3. **GalleryOrderPage** — 핵심 기능, PhotoSortPage 코드 재활용 (2시간)
4. **DashboardPage** — 통계 카드 (1시간)
5. **MemberListPage** — 회원 관리 (2시간)
6. 백엔드: `/members/count`, `/photos/count`, `/members/:id/role` 엔드포인트 추가

---

## 운영 배포 시 고려사항

- 어드민 URL은 별도 서브도메인 권장: `admin.example.com`
- 어드민 페이지는 Cloudflare IP 접근 제한 설정 가능
- `ADMIN` 권한 계정은 DB에서 직접 설정 (최초 1회):
  ```sql
  UPDATE members SET authority = 'ADMIN' WHERE email = 'admin@example.com';
  ```
