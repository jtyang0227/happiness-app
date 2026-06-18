# 13 — Admin Panel MVP

> 구현 완료일: 2026-06-18  
> 관련 파일: `AdminLayout.jsx`, `AdminDashboardPage.jsx`, `AdminGalleryOrderPage.jsx`, `AdminMembersPage.jsx`, `AdminPhotosPage.jsx`  
> 접근 경로: `/admin/**` (ADMIN 권한, `ProtectedRoute requiredRoles=['ADMIN']`)

---

## 배경 및 목적

사진 표시 순서 관리를 일반 사용자 앱에서 제거하고 어드민 전용으로 이관한다.  
회원 관리·콘텐츠 강제 삭제 등 운영 기능을 한 곳에서 처리한다.

**핵심 원칙:**
- 불가역적 작업(삭제·권한 변경)은 반드시 `window.confirm` 이중 확인
- 위험 버튼은 빨간색 border + red tint bg
- 어드민 전용 레이아웃 — 앱 Header 표시 안 함 (isStandalone 처리)

---

## 레이아웃 구조

```
┌────────────────────────────────────────────────────────┐
│  상단바 (56px, sticky)                                  │
│  ☰ 햄버거(모바일) | 페이지명 | 어드민 이메일             │
├──────────────┬─────────────────────────────────────────┤
│  사이드바    │  콘텐츠 영역 (padding 24px)              │
│  220px 고정  │                                         │
│  (모바일 숨김)│                                         │
│              │                                         │
│ 🛠️ Admin    │                                         │
│              │                                         │
│ 📊 대시보드  │                                         │
│ 🖼️ 갤러리   │                                         │
│ 👥 회원관리  │                                         │
│ 📷 사진관리  │                                         │
│              │                                         │
│ 🚪 로그아웃  │                                         │
└──────────────┴─────────────────────────────────────────┘
```

---

## AdminLayout 컴포넌트

```
Props: { children, currentPageTitle }

사이드바 (220px, position fixed):
  - 로고: "🛠️ Happiness Admin" (primary color)
  - NavLink 메뉴: 활성 시 primaryLight bg + primary 색 + 좌 3px 보더
  - 로그아웃: danger 색상 버튼

상단바 (56px, sticky top:0):
  - 페이지 제목 (h2, 16px bold)
  - 우측: user.email (12px, textMuted)
  - 모바일: 햄버거 버튼 (☰) → 사이드바 오버레이 토글

반응형:
  - 768px 이상: 사이드바 고정, 콘텐츠 margin-left 220px
  - 768px 미만: 사이드바 숨김, 오버레이 방식으로 열기

배경: #f7f7fb (콘텐츠 영역)
```

---

## AdminDashboardPage

```
URL: /admin

통계 카드 (3개, auto-fill grid):
  📷 전체 사진 — GET /api/photos 결과
  👥 전체 회원 — GET /api/auth/members 결과
  ✉ 미읽음 문의 — inquiryApi.getUnreadCount
  카드 크기: minmax(220px, 1fr)
  로딩: shimmer 애니메이션

빠른 접근 링크 (flex wrap):
  갤러리 순서 / 회원 관리 / 사진 관리
  hover: primaryLight bg + primary 텍스트
```

---

## AdminGalleryOrderPage

```
URL: /admin/gallery-order

데이터 흐름:
  GET /api/auth/members → 회원 드롭다운
  GET /api/photos?memberId=X&sortBy=displayOrder → 해당 사진 목록
  PUT /api/photos/reorder [{id, displayOrder}] → 순서 저장

UI:
  헤더: 제목 + 설명 텍스트
  
  컨트롤 바 (흰색 카드):
    - <select> 멤버 드롭다운 (flex 1)
    - 사진 N장 카운트 표시
    - [되돌리기] (dirty 시에만)
    - [순서 저장] → saved 시 녹색

  Dirty 배너: ⚠️ 저장하지 않은 변경사항이 있습니다

  사진 그리드 (auto-fill minmax 140px):
    - 드래그 가능 (HTML5 DnD)
    - 드래그 진입 시 border-color: primary + box-shadow
    - 순서 배지 (좌상단 원형 20px, primary bg)
    - 핸들 아이콘 ⠿ (우상단)
    - 드래그 중 opacity 0.4

  상태별 표시:
    - 멤버 미선택: 안내 텍스트 (dashed border)
    - 사진 없음: 안내 텍스트
    - 로딩 중: "불러오는 중..."
```

---

## AdminMembersPage

```
URL: /admin/members

데이터: GET /api/auth/members → [{id, name, email, role, avatarUrl, createdAt}]

UI:
  검색 input (실시간 필터, 이름+이메일)
  
  테이블 (흰색 카드):
    컬럼: ID | 이름(아바타+텍스트) | 이메일 | 권한 배지 | 가입일 | 관리버튼
    
    권한 배지:
      ADMIN → primaryLight bg + primary 텍스트
      USER  → #f7f7fb bg + textMuted
    
    관리 버튼:
      [→ USER / → ADMIN]: 권한 토글
        - window.confirm("권한을 X로 변경하시겠습니까?")
        - PUT /api/auth/member/:id/role {role}
      [삭제]: danger 색상
        - window.confirm("⚠️ 삭제... 되돌릴 수 없습니다.")
        - DELETE /api/auth/member/:id

  빈 상태: "결과 없음" 텍스트
```

---

## AdminPhotosPage

```
URL: /admin/photos

데이터: photoApi.getAll({sortBy:'createdAt', order:'desc'})

UI:
  검색 input (제목+작가명 실시간 필터)
  
  목록 (흰색 카드, 리스트 뷰):
    각 행: 썸네일(56×56) | 제목+작가·날짜·무드 | 좋아요 수 | [보기] [삭제]
    
    [보기]: 새 탭 /photo/:id
    [삭제]: danger 색상
      - window.confirm("⚠️ 삭제... 되돌릴 수 없습니다.")
      - photoApi.remove(id)
      - 로컬 state에서 제거
      - 버튼 disabled + "..." 표시 중

  로딩: "불러오는 중..." 텍스트
  빈 상태: "결과 없음"
```

---

[시스템 컨텍스트]
앱 이름: Happiness Admin — 포트폴리오 갤러리 어드민  
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)  
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5', primaryLight: '#eef0ff'
  bg: '#f7f7fb', surface: '#ffffff', border: '#e5e5ed'
  text: '#1a1a2e', textSecondary: '#5c5c7a', textMuted: '#9090b0'
  danger: '#e53e3e'

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- 불가역 작업은 반드시 window.confirm 이중 확인
- 위험 버튼: border '1.5px solid #fecaca', background '#fff5f5', color '#e53e3e'
