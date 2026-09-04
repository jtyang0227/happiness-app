# DESIGN_PROMPT — 사진 모임(Photo Gathering) 화면
> Feature 37 | 2026-09-03 | Toss 디자인 시스템

## 시스템 컨텍스트
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템):
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'

규칙:
- export default 함수형 컴포넌트, inline style
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용

---

## 화면 목록

### 1. GatheringsPage `/gatherings`

```
┌─────────────────────────────────────────────────────────────────┐
│ 사진 모임          (로그인 시) [+ 모임 만들기]                       │
│ 사진작가·모델이 함께하는 촬영 모임                                    │
├─────────────────────────────────────────────────────────────────┤
│ 모집중인 모임                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐              │
│  │ [썸네일 이미지]        │  │ [썸네일 이미지]        │              │
│  │ 타이틀                │  │ 타이틀                │              │
│  │ 📅 2026.09.20 18:00  │  │ 📅 2026.09.25 14:00  │              │
│  │ 📍 서울 홍대           │  │ 📍 부산 해운대         │              │
│  │ 👥 5/8명 참여중        │  │ 👥 2/10명 참여중       │              │
│  │ [모집중] [참여하기→]   │  │ [모집중] [참여하기→]   │              │
│  └──────────────────────┘  └──────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│ 내 모임 (로그인 시)                                                 │
│  ┌─────────────────────────────────────────────────────┐         │
│  │ ● 타이틀                     [RECRUITING] 2026.09.20 │         │
│  └─────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. GatheringFormPage `/gatherings/new` and `/gatherings/:id/edit`

```
┌─────────────────────────────────────────────────┐
│ ← 뒤로   새 모임 만들기 / 모임 수정                │
├─────────────────────────────────────────────────┤
│ 기본 정보 ─────────────────────────────────────── │
│ 모임 제목 *          [                         ]  │
│ 모임 소개            [                         ]  │
│ 촬영 테마            [                         ]  │
│ 장소 *               [                         ]  │
│ 장소 소개            [                         ]  │
│                                                  │
│ 일정 ────────────────────────────────────────── │
│ 시작 일시 *          [   datetime-local        ]  │
│ 종료 일시 *          [   datetime-local        ]  │
│ 모집 마감 일시 *     [   datetime-local        ]  │
│                                                  │
│ 참여 정보 ──────────────────────────────────────  │
│ 최대 참여 인원 *     [  8  ]                      │
│ 참가비               [     ]                      │
│ 준비 안내            [                         ]  │
│                                                  │
│ 참고 이미지 URL      [                         ]  │
│ 썸네일 URL           [                         ]  │
│ 해시태그             [  #서울촬영 #인물사진      ]  │
│                                                  │
│                      [저장하기]                   │
└─────────────────────────────────────────────────┘
```

### 3. GatheringDetailPage `/gatherings/:id`

```
┌─────────────────────────────────────────────────┐
│ ← 뒤로                         [수정] (생성자만)  │
├─────────────────────────────────────────────────┤
│ [썸네일 이미지 — 전폭]                            │
│                                                  │
│ RECRUITING 상태:                                 │
│  ┌───────────────────────────────────────────┐   │
│  │ 타이틀                                     │   │
│  │ 📅 2026.09.20 (일) 18:00 ~ 20:00          │   │
│  │ 📍 서울 홍대 어딘가                         │   │
│  │ 👥 5 / 8명                                 │   │
│  │ ⏰ 모집 마감: 2026.09.18                    │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  소개글 텍스트 영역                               │
│                                                  │
│  [✓ 참여하기]  [✗ 미참여]           (일반 유저)   │
│  [참여자 관리] [모집 마감]           (생성자)      │
│                                                  │
│  RECRUITMENT_CLOSED / SCHEDULED:                 │
│  ⚠ 모집이 마감되었습니다.                         │
│                                                  │
│  ONGOING / ENDED:                                │
│  모임 피드는 다음 업데이트에서 제공됩니다.          │
└─────────────────────────────────────────────────┘
```

### 4. GatheringManagePage `/gatherings/:id/manage`

```
┌─────────────────────────────────────────────────┐
│ ← 뒤로   참여자 관리                              │
├─────────────────────────────────────────────────┤
│ 5 / 8명 참여중  (대기 2명)  [모집 마감] (마감시 숨김) │
├─────────────────────────────────────────────────┤
│ 참여자 (5명) ────────────────────────────────── │
│  ● 멤버 ID 12345   참여중    2026.09.01         │
│  ● 멤버 ID 12346   참여중    2026.09.02         │
│                                                  │
│ 대기자 (2명) ────────────────────────────────── │
│  ○ 멤버 ID 12349   대기중    2026.09.03         │
│                                                  │
│ 미참여 (1명) ────────────────────────────────── │
│  ✗ 멤버 ID 12350   일정이 맞지 않음              │
└─────────────────────────────────────────────────┘
```

---

## 컴포넌트 스펙

### GatheringCard
- background: COLORS.surface
- border: `1px solid ${COLORS.border}`
- borderRadius: 16
- overflow: hidden
- 썸네일: aspect-ratio 4/3, objectFit cover
- hover: translateY(-2px), boxShadow: `0 4px 20px rgba(0,0,0,0.08)`
- transition: 0.15s ease

### 상태 배지
- RECRUITING: { bg: '#E8F3FF', color: '#3182F6' } (주요 CTA 있음)
- RECRUITMENT_CLOSED: { bg: '#F5F6F8', color: '#8B95A1' }
- SCHEDULED: { bg: '#E5F9F0', color: '#00C471' }
- ONGOING: { bg: '#FFF6E5', color: '#B45309' }
- ENDED: { bg: '#F5F6F8', color: '#8B95A1' }

### 인터랙션
- 참여하기 버튼: primary 블루 (#3182F6), hover: #1B64DA
- 미참여 버튼: border `1px solid ${COLORS.border}`, hover: COLORS.surfaceDim
- 모집 마감 버튼: danger red, 2단계 확인
- 모든 클릭 요소: onMouseEnter/Leave로 호버 상태 변경

### 타이포
- 페이지 제목: 22px, fontWeight 700
- 카드 제목: 15px, fontWeight 700
- 날짜/장소 메타: 12px, fontWeight 500, color textSecondary
- 참여 인원: 13px, fontWeight 600

### 스켈레톤 로딩
- shimmerStyle: `linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)`
- 카드 3개 표시

### 빈 상태
- DotEmptyState 컴포넌트 재사용 (theme='light')

---

## 반응형

- 모바일 (<768px): 1컬럼 카드 그리드
- 태블릿 (768~1023px): 2컬럼 카드 그리드
- 데스크탑 (>=1024px): 3컬럼 카드 그리드

---

## 클로드 구현 프롬프트

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary: '#3182F6', primaryDark: '#1B64DA', primaryLight: '#E8F3FF'
  bg: '#F2F4F6', surface: '#ffffff', border: '#E5E8EB'
  text: '#191F28', textSecondary: '#4E5968', textMuted: '#8B95A1'
  danger: '#F04452', dangerTonal: '#FFEEEF', success: '#00C471'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용

사진 모임(Photo Gathering) 목록·상세·폼·관리 4개 화면을 구현해주세요:
1. GatheringsPage - 모집중인 모임 카드 그리드 + 내 모임 목록 (로그인 시)
2. GatheringFormPage - 모임 생성/수정 폼 (필수 필드 검증 포함)
3. GatheringDetailPage - 상태별 렌더링 (RECRUITING: 참여/미참여 버튼, CLOSED/SCHEDULED: 마감 공지, ONGOING/ENDED: GatheringFeed 피드)
4. GatheringManagePage - 생성자 전용 참여자/대기자/미참여자 관리

---

## 피드 & 앨범 슬라이스 (2026-09-03 추가)

### 5. GatheringFeed 컴포넌트 `/src/components/gathering/GatheringFeed.jsx`

```
┌─────────────────────────────────────────────────┐
│ 📸 모임 피드              [진행 중 / 종료됨]      │
├─────────────────────────────────────────────────┤
│ (ONGOING + 참여자만)                              │
│  [📷 사진 올리기]  [✏️ 글 작성]                  │
├─────────────────────────────────────────────────┤
│ PostCard:                                        │
│  [Avatar] 홍길동                    2시간 전 [···] │
│  게시글 내용 텍스트                               │
│  #해시태그 #촬영                                  │
│  ┌──────────────────────────────────┐            │
│  │ 사진 1장: 전폭 이미지             │            │
│  └──────────────────────────────────┘            │
│  또는 → 가로 스크롤 멀티 사진 스트립               │
│  ♡ 5   💬 2                                       │
│  ─────────────────────────────────────────────   │
│  댓글 목록 (showComments 토글)                    │
│  [입력창] [게시] (참여자만)                       │
├─────────────────────────────────────────────────┤
│           [더 보기]                              │
└─────────────────────────────────────────────────┘
```

**컴포넌트 스펙:**
- `gatheringId`, `status`, `isParticipating`, `currentUser` props
- Spring Page 페이지네이션 (page/size=10)
- 좋아요 optimistic toggle (참여자 게이트)
- 댓글 Enter 전송 지원
- 삭제: 본인 포스트만 visible, 2단계 확인(취소/삭제 버튼 인라인)
- 빈상태: DotEmptyState(theme='light', icon='📸')
- 스켈레톤: 3개 SkeletonPost (shimmer 애니메이션)

### 6. GatheringPostComposerModal `/src/components/gathering/GatheringPostComposerModal.jsx`

```
┌─────────────────────────────────────────────────┐ ← 하단 시트
│ 📸 사진 올리기                              [✕]  │
├─────────────────────────────────────────────────┤
│ [textarea: 모임에서의 순간을 나눠보세요...]        │
│ [input: #해시태그]                               │
│ ┌──────┐ ┌──────┐ ┌──────┐                      │
│ │ 사진1 │ │ 사진2 │ │ 사진3 │  (3열 그리드)         │
│ │ [✕]  │ │ [✕]  │ │ [✕]  │                      │
│ │캡션  │ │ 캡션  │ │ 캡션  │  (각 11px 입력)       │
│ └──────┘ └──────┘ └──────┘                      │
│ [- - - 📷 사진 추가 (n/10) - - -]               │
│ [         게시하기          ]                    │
└─────────────────────────────────────────────────┘
```

**컴포넌트 스펙:**
- 배경 클릭 시 닫힘 (stopPropagation)
- 최대 10장, uploadImage(file, 'gatherings', onProgress) per 파일
- 업로드 진행 중: 오버레이 퍼센티지 표시
- 유효성: content OR 사진 ≥1장
- 제출 중 비활성 상태 처리

### 7. GatheringAlbumPage `/gatherings/:id/album` (공개)

```
┌─────────────────────────────────────────────────┐
│ ← 모임 피드   모임 목록                           │
├─────────────────────────────────────────────────┤
│ 모임 앨범                            [종료됨]    │
│ 이번 모임 제목                                   │
│ 📷 사진 20장   📝 게시물 5개   👥 참여자 8명       │
├─────────────────────────────────────────────────┤
│ 총 20장          피드에서 자세히 보기 →           │
│ ┌────┐ ┌────┐ ┌────┐                            │
│ │사진│ │사진│ │사진│    (3열 CSS grid, 1:1 비율)  │
│ └────┘ └────┘ └────┘                            │
│ ┌────┐ ┌────┐ ┌────┐                            │
│ │사진│ │사진│ │사진│    hover: 캡션 오버레이       │
│ └────┘ └────┘ └────┘                            │
└─────────────────────────────────────────────────┘
```

**컴포넌트 스펙:**
- public route, 인증 불필요
- ENDED 아니면 400 에러 메시지 처리
- 스켈레톤 헤더 + 9칸 그리드 shimmer
- hover: translateY(-2px), 캡션 오버레이, 날짜 배지
- 반응형: ≥1024px 3컬럼, <1024px 2컬럼, <768px 2컬럼(gap 6px)
- 빈상태: DotEmptyState(theme='light')

**API:**
- `GET /api/gatherings/{id}/album` → `{gatheringId, title, photoCount, postCount, participantCount, photos: [{imageUrl, caption, postId, createdAt}]}`

**라우트:** `<Route path="/gatherings/:id/album" element={<GatheringAlbumPage />} />`

**컬러 토큰:**
```
surface, border, borderLight, bg, surfaceDim
primary, primaryLight, primaryTonal
text, textSecondary, textMuted, textHint
danger, dangerTonal
```

---

## 7. GatheringNotificationsPage `/gatherings/notifications`
> 2026-09-04 | 슬라이스 4 — 알림 벨

### 와이어프레임

```
┌─────────────────────────────────────────────────────┐
│ 모임 알림                          [✓ 모두 읽음]      │
│ 사진 모임 관련 알림을 확인하세요                       │
├─────────────────────────────────────────────────────┤
│ ┃ 👥 [BOLD] 홍길동 님이 참여 확정되었습니다  ● (dot) │
│ ┃    참여 확정  방금 전                              │
│─────────────────────────────────────────────────────│
│   📸 가을 감성 촬영 — 새 게시물이 올라왔습니다         │
│      새 게시물  3시간 전                             │
│─────────────────────────────────────────────────────│
│   🏁 모임이 종료되었습니다. 앨범을 확인하세요          │
│      모임 종료  2일 전                              │
│─────────────────────────────────────────────────────│
│              [더 보기]                               │
└─────────────────────────────────────────────────────┘
```

- 미읽음 행: `borderLeft 3px solid primary`, 배경 `primaryLight`, 메시지 `fontWeight 700`, 우측 파란 dot(8px)
- 읽은 행: 투명 왼쪽 보더, 배경 `surface`, `fontWeight 400`
- hover: `surfaceDim` 배경

### 알림 타입 아이콘

| type | icon | label |
|------|------|-------|
| PARTICIPATION_CONFIRMED | 👥 | 참여 확정 |
| RECRUITMENT_CLOSED | 🔒 | 모집 마감 |
| GATHERING_STARTED | 🎬 | 모임 시작 |
| NEW_POST | 📸 | 새 게시물 |
| NEW_COMMENT | 💬 | 새 댓글 |
| NEW_LIKE | ♥ | 좋아요 |
| GATHERING_ENDED | 🏁 | 모임 종료 |

### Header 배지 연동

- `NAV_ITEMS`의 모임 항목에 `badge: 'gatherings'` 추가
- `gatheringApi.getUnreadCount()` → `{count: N}` — 로그인 시 inquiryApi, meetApi와 동일한 한 번 폴링
- `badgeCount` 계산 ternary에 `badge === 'gatherings' ? gatheringNotifCount : ...` 연장
- 배지 스타일: 기존 빨간 숫자 배지와 동일(`COLORS.danger` 배경, 9px bold, borderRadius 99)

### 상태 정의

- 로딩: shimmer 스켈레톤 5행 (아이콘 원 + 텍스트 2줄)
- 빈 상태: DotEmptyState — 🔔 "새 알림이 없습니다"
- 더 보기: 페이지네이션 버튼 (totalPages 초과 시만 표시)

### 상호작용

- 행 클릭 → 낙관적 읽음 처리(`markNotificationRead`) → `navigate('/gatherings/{gatheringId}')`
- 모두 읽음 버튼 → 낙관적 전체 읽음 → `markAllNotificationsRead()` (미읽음 행이 있을 때만 표시)

### 반응형

- 최대 너비 680px, 중앙 정렬
- 모바일: 전체 너비, padding 20px
