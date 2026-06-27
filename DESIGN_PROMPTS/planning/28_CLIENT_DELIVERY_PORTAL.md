# 28 — 클라이언트 납품 포털 (Client Delivery Portal)

> 작성일: 2026-06-20  
> 상태: 기획 완료 (구현 대기)  
> 관련 기능: 신규 `/proof/:token` 라우트, SeriesPage, PhotoFormPage, 백엔드 신규 `delivery/` 모듈

---

## 1. 배경 및 목적

### 문제 정의

현재 작가가 클라이언트에게 사진을 납품하는 방법:
```
방법 A: 카카오톡/이메일로 구글드라이브 링크 공유 → 관리 불가
방법 B: 클라이언트에게 앱 계정 만들어달라 요청 → 마찰 큼
방법 C: USB/CD에 담아 전달 → 시대착오적
```

**모든 방법이 앱 외부**에서 이뤄지며, 작가는 클라이언트가 사진을 봤는지, 승인했는지 알 수 없다.

### 솔루션: 납품 전용 비공개 URL

```
/proof/:token  (예: /proof/a7k3m9...)
```

- 로그인 없이 **비밀 링크**로 접근
- 클라이언트는 앱 계정 없이도 납품 사진 열람·승인·피드백
- 작가는 클라이언트의 열람·승인 여부를 실시간으로 확인

### 기대 효과

| 현재 | 도입 후 |
|------|--------|
| "링크 드렸어요" (관리 불가) | 대시보드에서 열람 여부 확인 |
| 클라이언트 피드백 = 문자/카톡 | 앱 내 선택·댓글로 구조화 |
| 승인 여부 불명확 | 클라이언트 "최종 승인" 버튼 |
| 다운로드 링크 만료 불명 | 포털 만료일 직접 설정 |

---

## 2. 핵심 개념

### 2-1. 납품 세트 (DeliverySet)

작가가 시리즈 또는 선택한 사진들을 묶어 만드는 비공개 패키지.

```
DeliverySet:
  token      — URL 토큰 (UUID, 추측 불가)
  title      — 납품명 ("2026.05 홍길동 웨딩 사진")
  photos[]   — 납품 사진 목록
  expiresAt  — 링크 만료일 (기본 30일, 최대 90일)
  password   — 선택적 비밀번호 (bcrypt 해시)
  clientName — 클라이언트 이름 (표시용)
  status     — PENDING / REVIEWED / APPROVED / REJECTED
  createdAt  — 생성일
```

### 2-2. 상태 흐름

```
작가 생성          클라이언트 열람       클라이언트 응답
   ↓                    ↓                    ↓
PENDING ──────────→ REVIEWED ──────→ APPROVED (or REJECTED)
                                         ↓
                                    작가에게 알림 (inquiryApi 패턴 활용)
```

---

## 3. UX 흐름

### 3-1. 작가 흐름 — 납품 세트 생성

```
SeriesPage / GalleryPage
  ↓
[납품 세트 만들기] 버튼 클릭
  ↓
DeliveryCreateModal 오픈:
  1) 납품명 입력 ("2026.05 홍길동 스드메")
  2) 납품할 사진 선택 (체크박스 그리드)
  3) 만료일 설정 (30일 기본, 슬라이더)
  4) 비밀번호 설정 (선택, ON/OFF 토글)
  5) 클라이언트 이름 입력
  ↓
[납품 링크 생성] 클릭
  ↓
생성된 링크 표시 + 복사 버튼
  https://app.example.com/proof/a7k3m9qx2pf...
```

### 3-2. 작가 흐름 — 납품 관리 대시보드

**위치**: ProfilePage 설정 탭 내 "납품 관리" 섹션 또는 별도 `/deliveries` 페이지

```
┌──────────────────────────────────────────────────────────────┐
│  납품 관리          [+ 새 납품 세트]                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ● 홍길동 웨딩 스드메                          APPROVED ✓    │
│    42장 · 만료 D-18 · 최종 열람 2시간 전                     │
│    [링크 복사] [상세]                                        │
│                                                              │
│  ● 김민지 가족사진                             REVIEWED 👁   │
│    18장 · 만료 D-5 · 최종 열람 1일 전                        │
│    [링크 복사] [상세] [만료 연장]                             │
│                                                              │
│  ● 이준혁 프로필                               PENDING ○    │
│    12장 · 만료 D-29 · 아직 미열람                            │
│    [링크 복사] [상세] [삭제]                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3-3. 클라이언트 흐름 — `/proof/:token`

로그인 불필요, 공유 링크로 직접 접근:

```
① 비밀번호 입력 화면 (설정된 경우):
┌──────────────────────────────────┐
│  🔒 납품 사진 확인                │
│  홍길동 님의 웨딩 사진 납품입니다  │
│  ┌────────────────────────────┐  │
│  │  비밀번호 입력              │  │
│  └────────────────────────────┘  │
│  [확인]                          │
└──────────────────────────────────┘

② 사진 열람 화면:
┌──────────────────────────────────────────────────┐
│  ✦ Happiness  │  홍길동 웨딩 스드메          [KO▾]│
├──────────────────────────────────────────────────┤
│                                                  │
│  안녕하세요, 홍길동님.                             │
│  2026.05 웨딩 사진 총 42장을 납품드립니다.          │
│  마음에 드시는 사진에 ♥ 표시해 주세요.             │
│                                                  │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐           │
│  │    ││    ││    ││    ││    ││    │           │
│  │ ♥  ││    ││ ♥  ││    ││    ││ ♥  │           │  ← 사진 그리드
│  └────┘└────┘└────┘└────┘└────┘└────┘           │
│                                                  │
│  ♥ 선택한 사진: 3장                               │
│                                                  │
│  피드백 (선택):                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  사진 전체적으로 너무 마음에 들어요. 3번     │  │
│  │  사진이 특히 좋습니다!                      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [↓ 전체 다운로드]           [✓ 최종 승인하기]   │
└──────────────────────────────────────────────────┘
```

---

## 4. 레이아웃 상세 명세

### 4-1. 클라이언트 포털 헤더

```
height: 56px
background: rgba(255,255,255,0.92) + backdrop-filter: blur(20px)
border-bottom: 1px solid rgba(226,226,238,0.6)

좌: ✦ Happiness 로고 (링크 없음 — 앱 진입 차단)
중: 납품 세트 제목 (16px, font-weight 700)
우: 언어 전환 (LangSwitcher) + 만료일 표시
```

### 4-2. 인트로 배너

```
background: linear-gradient(135deg, #eef0ff, #f3f0ff)
border-radius: 16px
padding: 20px 24px
margin-bottom: 24px

내용:
  작가 아바타 (32px 원형) + 이름 (14px, 700)
  메인 메시지: "안녕하세요, {clientName}님. {photoCount}장을 납품드립니다."
  부가 메시지: "마음에 드시는 사진에 ♥ 표시 후 최종 승인을 눌러주세요."
  만료일: "이 링크는 {expiresAt}까지 유효합니다." (경고색 D-7 이하)
```

### 4-3. 사진 그리드

```
display: grid
grid-template-columns: repeat(3, 1fr)   /* 데스크탑 */
gap: 8px

@media max-width: 768px:
  grid-template-columns: repeat(2, 1fr)

각 사진 카드:
  position: relative
  aspect-ratio: 1/1 (또는 4/3)
  border-radius: 12px
  overflow: hidden
  cursor: pointer

  이미지: object-fit cover, 100%

  좋아요 오버레이 (항상 표시):
    position: absolute, bottom: 8px, right: 8px
    width: 32px, height: 32px
    border-radius: 50%
    background: rgba(0,0,0,0.4)
    color: white
    font-size: 16px
    transition: transform 0.2s
    ♥ 선택 시: background: danger (#e53e3e), transform: scale(1.2)

  선택 상태 테두리:
    border: 3px solid danger (선택 시)
    border: 3px solid transparent (미선택)
```

### 4-4. 액션 바 (하단 고정)

```
position: sticky, bottom: 0
background: rgba(255,255,255,0.95) + backdrop-filter: blur(16px)
border-top: 1px solid rgba(226,226,238,0.6)
padding: 12px 20px
display: flex, justify-content: space-between, align-items: center

좌측:
  ♥ 선택한 사진: {n}장  (fontSize: 14px, color: textSecondary)

우측 버튼들:
  [↓ 전체 다운로드]  (outline 버튼, border: primary, color: primary)
  [✓ 최종 승인하기]  (filled 버튼, background: primary, color: #fff)
    → 클릭 시 확인 모달 ("정말 승인하시겠습니까? 작가에게 알림이 전송됩니다.")
```

### 4-5. 피드백 텍스트 영역

```
margin: 20px 0
label: "피드백 남기기 (선택)"
textarea:
  min-height: 80px
  padding: 12px 16px
  border-radius: 12px
  border: 1.5px solid border (#e5e5ed)
  font-size: 14px, line-height: 1.6
  resize: vertical
  placeholder: "사진에 대한 의견이나 요청사항을 남겨주세요..."
```

---

## 5. 납품 생성 모달 명세 (DeliveryCreateModal)

```
width: 560px (모바일: full)
border-radius: 24px
padding: 28px
background: surface (#ffffff)
box-shadow: 0 20px 60px rgba(0,0,0,0.15)

헤더:
  제목: "납품 세트 만들기" (20px, 800)
  닫기: ✕ 버튼 (우상단)

섹션 1 — 기본 정보:
  납품명 input (placeholder: "2026.05 고객명 촬영 종류")
  클라이언트 이름 input (placeholder: "홍길동")

섹션 2 — 사진 선택:
  "납품할 사진 선택" 레이블 + "(전체 선택)" 체크박스
  썸네일 그리드 (4열, 60px)
  선택된 수 표시: "3 / 42장 선택됨"

섹션 3 — 링크 설정:
  만료일: 30일 (기본) | [30일] [60일] [90일] 탭 선택
  비밀번호:
    [  ] 비밀번호 설정  (토글)
    토글 ON 시: 비밀번호 input 노출 (type="password", show/hide 버튼)

버튼:
  [취소]           [납품 링크 생성 →]
```

---

## 6. 데이터 모델

### 6-1. DB 스키마

```sql
CREATE TABLE IF NOT EXISTS delivery_sets (
  id             BIGSERIAL PRIMARY KEY,
  member_id      BIGINT NOT NULL,
  token          VARCHAR(64) NOT NULL UNIQUE,
  title          VARCHAR(200) NOT NULL,
  client_name    VARCHAR(100),
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  password_hash  VARCHAR(255),
  expires_at     TIMESTAMP NOT NULL,
  feedback       TEXT,
  approved_at    TIMESTAMP,
  viewed_at      TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_set_photos (
  delivery_set_id BIGINT NOT NULL REFERENCES delivery_sets(id) ON DELETE CASCADE,
  photo_id        BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  liked           BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (delivery_set_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_token ON delivery_sets(token);
CREATE INDEX IF NOT EXISTS idx_delivery_member ON delivery_sets(member_id);
```

### 6-2. API 엔드포인트

```
POST /api/delivery
  Body: { title, clientName, photoIds, expiresInDays, password? }
  → DeliverySetResponse (token 포함)

GET /api/delivery  (작가 본인, 인증 필요)
  → List<DeliverySetSummary>

GET /api/delivery/:token  (클라이언트, 인증 불필요)
  Body (optional): { password }
  → DeliverySetDetail (사진 목록 포함)

PUT /api/delivery/:token/view  (클라이언트, 인증 불필요)
  → viewed_at 업데이트

PUT /api/delivery/:token/approve  (클라이언트)
  Body: { likedPhotoIds[], feedback? }
  → status=APPROVED, 작가 알림

PUT /api/delivery/:token/reject  (클라이언트)
  Body: { feedback }
  → status=REJECTED

DELETE /api/delivery/:id  (작가 본인, 인증 필요)

GET /api/delivery/:token/download  (클라이언트)
  → 사진 ZIP 다운로드 (S3/Supabase presigned URLs)
```

### 6-3. 백엔드 패키지

```
com.happiness.app/
└── delivery/
    ├── DeliverySet.java           (Entity)
    ├── DeliverySetPhoto.java      (Entity, 조인)
    ├── DeliverySetRepository.java
    ├── DeliverySetController.java (REST)
    ├── DeliverySetService.java
    └── dto/
        ├── DeliverySetResponse.java
        ├── DeliverySetSummary.java
        └── DeliverySetDetail.java
```

---

## 7. 보안 설계

```
토큰 생성:
  UUID.randomUUID() → 128비트 엔트로피 → Base64URL (22자)
  예) eyJ3...kx2 형태가 아닌 단순 랜덤 토큰

비밀번호:
  BCrypt(cost=12) 해시 저장
  클라이언트 입력값 BCrypt.matches()로 검증

만료 처리:
  @Scheduled(cron="0 0 * * * *") → 매 시간 만료된 토큰 soft-delete
  만료된 토큰 접근 시 410 Gone 반환

IDOR 방지:
  DELETE/PUT 작가 전용 API: @AuthenticationPrincipal로 member_id 검증
  클라이언트 API: token만으로 접근 (member_id 노출 없음)

Rate Limiting:
  /api/delivery/:token 접근: 동일 IP 분당 10회 제한
  비밀번호 오류: 5회 시 15분 잠금
```

---

## 8. 컴포넌트 목록

| 컴포넌트 | 파일 | 역할 |
|---------|------|------|
| `ClientDeliveryPage` | `pages/ClientDeliveryPage.jsx` | `/proof/:token` 진입점 (라우트) |
| `DeliveryPasswordGate` | `components/delivery/DeliveryPasswordGate.jsx` | 비밀번호 입력 화면 |
| `DeliveryPhotoGrid` | `components/delivery/DeliveryPhotoGrid.jsx` | 클라이언트 사진 그리드 (좋아요 인터랙션) |
| `DeliveryActionBar` | `components/delivery/DeliveryActionBar.jsx` | 하단 고정 액션 바 |
| `DeliveryApproveModal` | `components/delivery/DeliveryApproveModal.jsx` | 승인 확인 모달 |
| `DeliveryCreateModal` | `components/delivery/DeliveryCreateModal.jsx` | 작가용 납품 세트 생성 모달 |
| `DeliveryDashboard` | `components/delivery/DeliveryDashboard.jsx` | 작가용 납품 관리 목록 |

---

## 9. 라우트 추가

```jsx
// App.jsx에 추가
// 공개 (로그인 불필요, 헤더 없음)
<Route path="/proof/:token" element={<ClientDeliveryPage />} />

// 작가 보호 라우트
<Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
```

STANDALONE_PATHS에 `/proof/` 패턴 추가:
```js
|| location.pathname.startsWith('/proof/')
```

---

## 10. 스프린트 계획

### Sprint 1 — 백엔드 (1주)
| 작업 | 파일 |
|------|------|
| DB 스키마 + 엔티티 | `DeliverySet.java`, SQL |
| CRUD API | `DeliverySetController.java` |
| 비밀번호 해싱 + 토큰 생성 | `DeliverySetService.java` |
| 만료 스케줄러 | `@Scheduled` |

### Sprint 2 — 클라이언트 포털 (1주)
| 작업 | 파일 |
|------|------|
| ClientDeliveryPage | `pages/` |
| DeliveryPasswordGate | `components/delivery/` |
| DeliveryPhotoGrid (좋아요 인터랙션) | `components/delivery/` |
| DeliveryActionBar + 승인 모달 | `components/delivery/` |
| 다운로드 ZIP 연동 | API + 브라우저 다운로드 |

### Sprint 3 — 작가 대시보드 (3일)
| 작업 | 파일 |
|------|------|
| DeliveryDashboard 컴포넌트 | `components/delivery/` |
| DeliveryCreateModal | `components/delivery/` |
| DeliveriesPage 라우트 | `pages/` |
| ProfilePage에 "납품 관리" 탭 또는 링크 추가 | `ProfilePage.jsx` |

---

## 11. 수용 기준 (Acceptance Criteria)

### AC-01. 납품 생성 (작가)
- [ ] ProfilePage 또는 SeriesPage에서 "납품 세트 만들기" 버튼이 표시된다
- [ ] 사진 선택 + 만료일 + 비밀번호 설정 후 링크가 생성된다
- [ ] 생성된 링크가 클립보드에 복사된다
- [ ] DeliveriesPage에서 납품 세트 목록과 상태를 확인할 수 있다

### AC-02. 클라이언트 포털
- [ ] `/proof/:token`으로 로그인 없이 접근할 수 있다
- [ ] 비밀번호 설정 시 입력 화면이 표시되고 틀리면 오류 메시지가 나온다
- [ ] 사진에 ♥ 클릭으로 좋아요 표시가 된다
- [ ] 피드백 입력 + "최종 승인하기" 클릭이 동작한다
- [ ] 만료된 링크 접근 시 "링크가 만료되었습니다" 화면이 표시된다

### AC-03. 작가 알림
- [ ] 클라이언트가 승인/거절 시 작가 문의함에 알림이 생성된다

### AC-04. 보안
- [ ] 만료된 토큰 410 반환
- [ ] 비밀번호 5회 오류 시 15분 잠금
- [ ] 작가 본인만 DELETE 가능 (IDOR 방지)

---

## 12. Claude.ai 아티팩트 프롬프트 (시각 목업용)

```
아래 스펙으로 "클라이언트 납품 포털" React 컴포넌트 목업을 만들어줘.

[요구사항]

1. ClientDeliveryPage — 메인 클라이언트 화면
   상단: Happiness 로고(좌) + 납품 제목(중) + 만료일(우)
   인트로 배너: 그라디언트 bg + 작가명 + "42장을 납품드립니다" 메시지
   사진 그리드: 3열 (모바일 2열), 각 카드에 ♥ 버튼 오버레이
   ♥ 클릭 시: danger 색 배경 + scale(1.2) 애니메이션
   하단 고정 액션바: "♥ 3장 선택됨" + [↓ 다운로드] + [✓ 승인하기]

2. DeliveryPasswordGate — 비밀번호 입력
   카드 형태 (center 정렬)
   🔒 아이콘 + 제목 + 클라이언트명 표시
   비밀번호 input + show/hide 버튼
   [확인] 버튼 (primary)

3. DeliveryApproveModal — 승인 확인 모달
   "✓ 최종 승인하기" 제목
   선택 사진 수 표시 (♥ 3장)
   피드백 textarea
   [취소] [승인 완료] 버튼

4. DeliveryDashboard (작가용 목록)
   납품 세트 카드 3개:
     - APPROVED (✅ 초록 뱃지) - 열람됨, 승인일 표시
     - REVIEWED (👁 파란 뱃지) - 열람됨, 미승인
     - PENDING (○ 회색 뱃지) - 미열람
   각 카드: 링크 복사 버튼 + 상태

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5', primaryDark: '#4458e0', primaryLight: '#eef0ff'
  accent: '#a78bfa'
  bg: '#f7f7fb', surface: '#ffffff', surfaceDim: '#ededf4', border: '#e5e5ed'
  text: '#0f0f1a', textSecondary: '#5555aa', textMuted: '#8888bb'
  danger: '#e53e3e', success: '#22c55e'
  darkBg: '#0a0a18'

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react만 허용)
- useState로 좋아요 상태, 비밀번호 입력, 모달 관리
- 한국어 UI 텍스트
```
