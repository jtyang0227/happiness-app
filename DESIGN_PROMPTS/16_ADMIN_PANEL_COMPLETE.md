# 16 — Admin Panel 완성 구현 (대시보드 · 갤러리 순서 · 회원 관리 · 사진 관리)

> 구현 완료일: 2026-06-19  
> 접근 경로: `/admin/**` (ADMIN 권한, `ProtectedRoute requiredRoles=['ADMIN']`)  
> Authority 매핑: WM → ADMIN, SA → ADMIN, US → USER

---

## 관련 파일

```
frontend/src/
  components/layout/AdminLayout.jsx        — 사이드바 + 상단바 셸
  pages/admin/AdminDashboardPage.jsx       — 대시보드 (/admin)
  pages/admin/AdminGalleryOrderPage.jsx    — 갤러리 순서 관리 (/admin/gallery-order)
  pages/admin/AdminMembersPage.jsx         — 회원 관리 (/admin/members)
  pages/admin/AdminPhotosPage.jsx          — 사진 관리 (/admin/photos)

backend/
  AuthController: GET /api/auth/members, PUT /api/auth/member/{id}/role
  MemberService:  getAllMembers(), changeMemberRole(id, role)
  MemberResponse: role 필드 (WM/SA → "ADMIN", US → "USER")
```

---

## 레이아웃 구조 (AdminLayout)

```
┌────────────────────────────────────────────────────────┐
│  상단바 (56px, sticky, background: #fff, border-bottom) │
│  ☰(모바일) | Happiness Admin | 현재 페이지명 | 이메일   │
├──────────────┬─────────────────────────────────────────┤
│  사이드바    │  콘텐츠 영역 (padding: 24px)             │
│  220px 고정  │                                         │
│  background: │                                         │
│  #f7f7fb     │                                         │
│              │                                         │
│  ■ 대시보드  │                                         │
│  ■ 갤러리 순서│                                         │
│  ■ 회원 관리 │                                         │
│  ■ 사진 관리 │                                         │
│              │                                         │
│  [로그아웃]  │                                         │
└──────────────┴─────────────────────────────────────────┘
모바일: 사이드바 hidden → ☰ 클릭 시 슬라이드 오버레이
```

---

## 각 페이지 구현 현황

### AdminDashboardPage (`/admin`)

| 요소 | 구현 상태 |
|------|----------|
| 통계 카드 3개 | ✅ 전체 사진 / 전체 회원 / 미읽음 문의 |
| shimmer 로딩 | ✅ 숫자 자리에 pulse 애니메이션 |
| 빠른 접근 링크 | ✅ 갤러리 순서 관리 / 회원 관리 / 사진 관리 |

API: `GET /photos`, `GET /auth/members`, `GET /inquiry/unread-count`

### AdminGalleryOrderPage (`/admin/gallery-order`)

| 요소 | 구현 상태 |
|------|----------|
| 멤버 선택 드롭다운 | ✅ 전체 회원 목록 |
| 사진 드래그 & 드롭 | ✅ HTML5 drag events |
| Dirty 상태 배너 | ✅ "저장하지 않은 변경사항" 경고 |
| 이탈 경고 | ✅ `beforeunload` 이벤트 |
| 되돌리기 버튼 | ✅ 원래 순서로 재로드 |
| 저장 버튼 상태 | ✅ 비활성(회색) / 활성(파랑) / 저장됨(초록) |

API: `GET /auth/members`, `GET /photos?memberId=&sortBy=displayOrder`, `PUT /photos/reorder`

### AdminMembersPage (`/admin/members`)

| 요소 | 구현 상태 |
|------|----------|
| 회원 테이블 | ✅ ID / 이름(아바타) / 이메일 / 권한 / 가입일 / 관리 |
| 검색 필터 | ✅ 이름 또는 이메일 |
| 권한 토글 | ✅ USER ↔ ADMIN (confirm 이중 확인) |
| 권한 뱃지 | ✅ ADMIN = 파랑, USER = 회색 |
| 회원 삭제 | ✅ confirm 이중 확인 + 빨간 버튼 |

API: `GET /auth/members`, `PUT /auth/member/{id}/role`, `DELETE /auth/member/{id}`

### AdminPhotosPage (`/admin/photos`)

| 요소 | 구현 상태 |
|------|----------|
| 사진 리스트 | ✅ 썸네일 / 제목 / 작가·날짜·무드 / 좋아요 수 |
| 검색 필터 | ✅ 제목 또는 작가명 |
| 상세 보기 | ✅ "보기" → `/photo/:id` 새 탭 |
| 강제 삭제 | ✅ confirm + 빨간 버튼 + 삭제 중 로딩 |

API: `GET /photos?sortBy=createdAt&order=desc`, `DELETE /photos/{id}`

---

## claude.ai 아티팩트 요청 프롬프트 — AdminDashboardPage

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryLight:  '#eef0ff'
  accent:        '#a78bfa'
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'
  danger:        '#e53e3e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

[컴포넌트 요청]
Happiness 어드민 패널의 대시보드 페이지를 만들어줘.

레이아웃:
- 전체 배경: #f7f7fb
- 좌측 사이드바(220px) + 콘텐츠 영역 분리
- 사이드바: 로고("Happiness Admin") + 메뉴 4개(대시보드·갤러리 순서·회원 관리·사진 관리) + 하단 로그아웃
- 현재 선택된 메뉴: primary 배경 + 흰 텍스트
- 상단바(56px): 페이지 타이틀 + 어드민 이메일

콘텐츠:
1. 통계 카드 3개 (grid, 1행):
   - "📷 전체 사진"  : 숫자 강조, primary(#5b6ef5) 아이콘 배경
   - "👥 전체 회원"  : accent(#a78bfa) 아이콘 배경
   - "✉ 미읽음 문의" : danger(#e53e3e) 아이콘 배경
   - 로딩 시: shimmer 효과 (pulse animation)

2. 빠른 접근 카드:
   - 갤러리 순서 관리 / 회원 관리 / 사진 관리 링크 버튼
   - hover 시 primary 색상으로 변환

모바일 대응:
- 사이드바: ☰ 버튼으로 슬라이드 오버레이
- 통계 카드: 1열로 스택
```

---

## claude.ai 아티팩트 요청 프롬프트 — AdminGalleryOrderPage (드래그 UI)

```
[시스템 컨텍스트]
(위와 동일)

[컴포넌트 요청]
갤러리 표시 순서 관리 페이지를 만들어줘.

상태 (mock 데이터 사용):
- members: [{ id: 1, name: '김하늘', email: 'kim@example.com' }, ...]
- selectedMemberId: '1'
- photos: 6장 (id, title, thumbnailUrl = null → 색상 placeholder)
- dirty: true (변경사항 있음)

UI:
1. 헤더: "🖼️ 갤러리 표시 순서 관리" + 설명 텍스트

2. 컨트롤 바 (white card):
   - 멤버 선택 <select> (flex: 1)
   - 사진 N장 텍스트
   - "되돌리기" 버튼 (dirty 시만 표시)
   - "순서 저장" 버튼: 비활성=회색, 활성=primary, 저장됨=초록

3. Dirty 배너: "⚠️ 저장하지 않은 변경사항이 있습니다" (primary 색 배경)

4. 사진 드래그 그리드 (3열, gap: 12px):
   - 각 카드: 썸네일(56px 정사각형, borderRadius 8px) + 제목 + ⣿ 드래그 핸들
   - 드래그 중인 카드: opacity 0.4
   - hover: border primary 색상
   - 카드 순서 번호 뱃지 (좌상단, 작은 원형)
```

---

## 보안 설계

- 어드민 접근: `ProtectedRoute requiredRoles={['ADMIN']}` — role 필드 기준 (`user?.role || user?.authority`)
- 백엔드 보호: `@PreAuthorize("hasAnyRole('WM', 'SA')")` on `/api/auth/members`, `/api/auth/member/{id}/role`
- 불가역적 작업(삭제·권한변경): 반드시 `window.confirm()` 이중 확인
- 위험 버튼: `border: '1.5px solid #fecaca', background: '#fff5f5', color: '#e53e3e'`

---

## UX 개선 아이디어 (다음 스프린트)

- 대시보드: 최근 7일 사진 등록 추이 그래프 (Canvas API)
- 대시보드: 신규 가입 회원 최근 5명 미니 리스트
- 회원 관리: 이메일 발송 버튼 (mailto: 링크)
- 갤러리 순서: 키보드(↑↓)로 순서 조작 지원
- 사진 관리: 복수 선택 후 일괄 삭제
- 어드민 활동 로그 페이지 (`/admin/logs`) — 백엔드 INFO 레벨 로그 조회
