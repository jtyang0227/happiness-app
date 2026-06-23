# 30 — 촬영 예약 캘린더 (Shoot Booking Calendar)

> 작성일: 2026-06-20  
> 상태: 기획 완료 (구현 대기)  
> 관련 기능: 신규 `/booking/:profileName` 라우트, InquiryFormPage, PortfolioPage, ProfilePage

---

## 1. 배경 및 목적

### 문제 정의

현재 촬영 예약 흐름:
```
클라이언트: InquiryFormPage에서 "촬영 날짜: 7월 초"라고 텍스트 입력
작가: 수신 → 문자/카톡으로 날짜 조율 → 확정
       → 다시 앱 밖에서 관리
```

**날짜 조율이 앱 외부에서 일어나는 구조** → 불편하고 비전문적.  
캘린더 통합으로 클라이언트는 실시간 가용 날짜를 보고 예약, 작가는 승인/거절.

### 기대 효과

| 현재 | 도입 후 |
|------|--------|
| "7월 초 가능한가요?" 텍스트 협상 | 가용 날짜 달력 보고 직접 선택 |
| 날짜 확정까지 2~5회 왕복 | 1회 예약 요청 → 승인/거절 |
| 일정 관리 = 카카오·구글 캘린더 외부 | 앱 내 작가 일정 대시보드 |
| 예약 충돌 가능성 있음 | 예약된 날짜 자동 차단 |

---

## 2. 핵심 개념

### 2-1. 가용 시간 설정 (작가)

```
작가가 설정:
  1. 정기 가능 요일: 월화수목금 (토·일 OFF)
  2. 일별 타임슬롯: 오전 10:00 / 오후 14:00 / 오후 18:00
  3. 개별 차단일: 2026-07-15 (기존 예약), 2026-08-01~05 (휴가)
  4. 촬영 종류별 소요 시간: 웨딩 8h / 스냅 2h / 프로필 1h
```

### 2-2. 예약 상태 흐름

```
REQUESTED  →  CONFIRMED  →  COMPLETED
    ↓              ↓
 REJECTED      CANCELLED
```

### 2-3. 촬영 종류 (ShootType)

```
WEDDING      — 웨딩 (8시간)
SNAP         — 스냅 (2시간)
PROFILE      — 프로필 (1시간)
MATERNITY    — 만삭 (2시간)
NEWBORN      — 신생아 (3시간)
COMMERCIAL   — 상업 (4시간)
CUSTOM       — 협의
```

---

## 3. UX 흐름

### 3-1. 클라이언트 흐름 — 예약하기

```
PortfolioPage 하단 CTA 또는 Header 버튼:
  [📅 촬영 예약하기] 버튼 클릭
  ↓
/booking/:profileName 진입
  ↓
① 촬영 종류 선택:
   [💍 웨딩] [📷 스냅] [👤 프로필] [🌸 만삭] [👶 신생아] [📦 상업] [✏️ 협의]
  ↓
② 날짜 선택 (캘린더):
   가용 날짜: 흰색 (클릭 가능)
   예약 마감: 연회색 (클릭 불가)
   차단일: 사선 패턴 (클릭 불가)
   오늘: primary 점 표시
  ↓
③ 시간 슬롯 선택:
   [오전 10:00] [오후 14:00] [오후 18:00]
  ↓
④ 정보 입력:
   이름, 연락처, 메모
  ↓
⑤ 예약 완료:
   "예약 요청이 전송되었습니다"
   작가 승인 후 확정 안내
```

### 3-2. 작가 흐름 — 예약 관리

**위치**: ProfilePage [예약] 탭 또는 `/bookings` 독립 페이지

```
┌──────────────────────────────────────────────────────────────┐
│  예약 관리          [가용 시간 설정]  [캘린더 보기]           │
├──────────────────────────────────────────────────────────────┤
│  2026년 7월                                     [◀] [▶]    │
├──────────────────────────────────────────────────────────────┤
│  일  월  화  수  목  금  토                                    │
│       1   2   3   4   5                                      │
│  6    7   8   9  10  11  12                                  │
│  13  14  [●]16  17  18  19   ← ● = 예약 있는 날             │
│  20  21  22  23  24  25  26                                  │
│  27  28  29  30  31                                          │
├──────────────────────────────────────────────────────────────┤
│  대기 중 예약 (2건)                                           │
│                                                              │
│  ○ 홍길동님 · 웨딩 · 7월 15일 오전 10:00     [확인] [거절]  │
│  ○ 이민지님 · 스냅 · 7월 22일 오후 14:00     [확인] [거절]  │
│                                                              │
│  확정된 예약 (1건)                                            │
│  ✓ 박서준님 · 프로필 · 7월 8일 오후 18:00       [취소]      │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 레이아웃 상세 명세

### 4-1. 클라이언트 예약 페이지 (`/booking/:profileName`)

**전체 구조**: 3단계 위저드 (StepIndicator)

```
header: Happiness 로고 + "홍길동 작가 예약" (헤더 없음 — standalone)

┌─────────────────────────────────────────────────────────────┐
│  ● ━━━━━━━━━━ ○ ━━━━━━━━━━ ○                               │
│  1. 촬영 종류    2. 날짜/시간    3. 정보 입력                 │
└─────────────────────────────────────────────────────────────┘
```

**Step 1 — 촬영 종류 선택**:

```
"어떤 촬영을 원하시나요?" 제목 (22px, 800)

그리드 3열 (모바일 2열):
  각 카드:
    border-radius: 16px
    padding: 20px
    border: 2px solid border
    background: surface
    cursor: pointer
    hover: border-color primary, background: primaryLight
    선택: border primary, background primaryLight, box-shadow primary

    이모지: 32px
    종류명: 15px, 700
    소요시간: 12px, textMuted ("약 2시간")
    가격대: 12px, primary ("₩ 협의")
```

**Step 2 — 날짜/시간 선택**:

```
캘린더 (월간 뷰):

헤더: [◀] 2026년 7월 [▶]
      (24px, 700, center)

요일 행: 일 월 화 수 목 금 토
         (12px, textMuted)

날짜 그리드 (7열):
  가용일:
    background: surface
    color: text
    hover: background primaryLight, color primary
    border-radius: 50%
    width/height: 36px

  오늘:
    ::after 점 (4px, primary, bottom)

  선택됨:
    background: primary
    color: #fff
    border-radius: 50%

  불가 (예약 마감 or 차단):
    background: surfaceDim
    color: textMuted
    cursor: not-allowed
    opacity: 0.5

타임슬롯 선택 (날짜 선택 후 노출):
  "시간을 선택해주세요"
  [오전 10:00] [오후 14:00] [오후 18:00]
  (각 버튼: padding 10px 20px, border-radius 10px)
  가득 찬 슬롯: opacity 0.4, cursor not-allowed, "마감" 뱃지
```

**Step 3 — 정보 입력**:

```
이름 (input, 필수)
연락처 (input, placeholder: 010-1234-5678)
이메일 (input, 선택)
메모 (textarea, placeholder: "원하시는 스타일이나 요청사항을 남겨주세요")

[이전] [예약 요청하기]
```

### 4-2. 가용 시간 설정 모달 (작가용)

```
title: "가용 시간 설정"
width: 500px

섹션 1 — 촬영 가능 요일:
  [일] [월] [화] [수] [목] [금] [토]
  (토글 칩, 선택됨: primary bg)

섹션 2 — 시간 슬롯:
  [+ 슬롯 추가]
  슬롯마다: [오전 ▾] [10 : 00] [×]

섹션 3 — 차단 날짜 추가:
  input type="date" + [추가]
  차단된 날짜들: [2026-07-15 ×] [2026-08-01 ×]

섹션 4 — 예약 메모 (클라이언트에게 표시):
  textarea ("예약 확정까지 24시간 내 연락드립니다.")

[취소] [저장]
```

---

## 5. 데이터 모델

### 5-1. DB 스키마

```sql
-- 작가 가용 설정
CREATE TABLE IF NOT EXISTS booking_availability (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL UNIQUE,
  weekdays     VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',  -- 쉼표 구분 0=일..6=토
  time_slots   VARCHAR(100) NOT NULL DEFAULT '10:00,14:00',
  buffer_hours INTEGER NOT NULL DEFAULT 0,  -- 예약 후 최소 대기 시간 (시간)
  booking_note TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 차단 날짜
CREATE TABLE IF NOT EXISTS booking_blocked_dates (
  id        BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL,
  blocked_date DATE NOT NULL,
  reason    VARCHAR(100),
  UNIQUE (member_id, blocked_date)
);

-- 예약
CREATE TABLE IF NOT EXISTS bookings (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL,  -- 작가
  shoot_date   DATE NOT NULL,
  shoot_time   VARCHAR(10) NOT NULL,  -- "10:00"
  shoot_type   VARCHAR(20) NOT NULL,
  client_name  VARCHAR(100) NOT NULL,
  client_phone VARCHAR(30),
  client_email VARCHAR(255),
  memo         TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',  -- REQUESTED/CONFIRMED/REJECTED/CANCELLED/COMPLETED
  reject_reason VARCHAR(200),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id, shoot_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(shoot_date);
```

### 5-2. 백엔드 패키지

```
com.happiness.app/
└── booking/
    ├── Booking.java
    ├── BookingAvailability.java
    ├── BookingBlockedDate.java
    ├── BookingRepository.java
    ├── BookingController.java
    ├── BookingService.java
    └── dto/
        ├── BookingRequest.java
        ├── BookingResponse.java
        ├── AvailabilityCalendar.java  ← 캘린더 조회 응답
        └── BookingStats.java
```

### 5-3. API

```
GET /api/booking/:profileName/availability?year=2026&month=7
  (인증 불필요)
  → { availableDates: ["2026-07-01",...], bookedSlots: { "2026-07-15": ["10:00"] } }

POST /api/booking/:profileName
  (인증 불필요)
  Body: { shootDate, shootTime, shootType, clientName, clientPhone, clientEmail, memo }
  → BookingResponse

GET /api/booking  (작가, 인증 필요)
  Params: ?status=REQUESTED&month=2026-07
  → List<BookingResponse>

PUT /api/booking/:id/confirm  (작가)
PUT /api/booking/:id/reject   (작가, Body: { reason })
PUT /api/booking/:id/cancel   (작가)

GET /api/booking/availability  (작가, 인증 필요)
  → BookingAvailability

PUT /api/booking/availability  (작가, 인증 필요)
  → 가용 설정 저장

POST /api/booking/blocked-dates  (작가)
DELETE /api/booking/blocked-dates/:id  (작가)
```

---

## 6. 반응형 설계

| 구간 | 촬영 종류 | 캘린더 | 시간 슬롯 |
|------|---------|--------|---------|
| ≥768px | 3열 그리드 | 월간 (7열) | 가로 배열 |
| <768px | 2열 그리드 | 월간 (7열, 날짜 30px) | 세로 배열 |

---

## 7. 알림 연동

예약 상태 변경 시 **InquiryApi 패턴 활용**:

```
클라이언트 → POST /api/booking/:profileName
  → 작가 문의함에 알림 생성 (기존 Inquiry 시스템 재활용)
  → 이메일 알림 (InquiryEmailService 패턴)

작가 확인/거절
  → 클라이언트 이메일로 결과 알림
```

---

## 8. 포트폴리오 통합

`PortfolioPage.jsx` Footer CTA 버튼 업데이트:

```jsx
// 기존: "함께 작업하고 싶으신가요?" → [문의하기]
// 변경: [문의하기] [📅 촬영 예약]  (2개 버튼)

<a href={`/inquiry/${profileName}`}>문의하기</a>
<a href={`/booking/${profileName}`}>📅 촬영 예약</a>
```

---

## 9. 스프린트 계획

### Sprint 1 — 백엔드 (1주)
| 작업 | 파일 |
|------|------|
| DB 스키마 + 엔티티 | SQL, `Booking.java` 등 |
| 가용 캘린더 API | `BookingController.java` |
| 예약 CRUD | `BookingService.java` |
| 알림 연동 (InquiryEmailService 재활용) | |

### Sprint 2 — 클라이언트 예약 페이지 (1주)
| 작업 | 파일 |
|------|------|
| `/booking/:profileName` 라우트 (standalone) | `App.jsx` |
| ShootTypeSelector | `components/booking/` |
| BookingCalendar (순수 React) | `components/booking/BookingCalendar.jsx` |
| TimeSlotPicker | `components/booking/TimeSlotPicker.jsx` |
| BookingForm (정보 입력) | `components/booking/BookingForm.jsx` |
| StepWizard | `components/booking/StepWizard.jsx` |

### Sprint 3 — 작가 관리 (3일)
| 작업 | 파일 |
|------|------|
| BookingDashboard (작가 캘린더 뷰) | `pages/BookingDashboard.jsx` |
| AvailabilityModal | `components/booking/AvailabilityModal.jsx` |
| ProfilePage [예약] 탭 추가 | `ProfilePage.jsx` |
| PortfolioPage CTA 업데이트 | `PortfolioPage.jsx` |

---

## 10. 수용 기준 (Acceptance Criteria)

### AC-01. 클라이언트 예약
- [ ] `/booking/:profileName`에 로그인 없이 접근할 수 있다
- [ ] 촬영 종류 선택 → 캘린더 날짜 선택 → 시간 슬롯 선택 → 정보 입력 → 제출이 동작한다
- [ ] 차단/예약 마감된 날짜/슬롯은 선택 불가다
- [ ] 제출 후 "예약 요청이 전송되었습니다" 확인 화면이 표시된다

### AC-02. 작가 관리
- [ ] ProfilePage에 [예약] 탭이 추가된다
- [ ] 대기 중 예약에서 [확인] / [거절] 버튼이 동작한다
- [ ] 가용 시간 설정 모달에서 요일·슬롯·차단일을 저장할 수 있다

### AC-03. 통합
- [ ] PortfolioPage Footer에 [촬영 예약] 버튼이 추가된다
- [ ] 예약 요청 시 작가 문의함에 알림이 생성된다

### AC-04. 반응형
- [ ] 모바일(375px)에서 캘린더와 스텝 위저드가 정상 동작한다

---

## 11. Claude.ai 아티팩트 프롬프트 (시각 목업용)

```
아래 스펙으로 "촬영 예약 캘린더" React 컴포넌트 목업을 만들어줘.

[요구사항]

1. BookingPage — 3단계 위저드
   StepIndicator: ● ─── ○ ─── ○ (3단계)

   Step 1 — 촬영 종류:
   3열 그리드 카드
   [💍 웨딩 (8h)] [📷 스냅 (2h)] [👤 프로필 (1h)]
   [🌸 만삭 (2h)] [👶 신생아 (3h)] [📦 상업 (4h)]
   선택 시: primary 테두리 + primaryLight 배경

   Step 2 — 날짜/시간:
   달력 (7열, 2026년 7월)
   - 가용일: 흰색 hover primary
   - 선택일: primary 원형 배경
   - 불가일: 회색 opacity 0.4 cursor not-allowed
   날짜 선택 후 타임슬롯: [오전 10:00] [오후 14:00] [오후 18:00]

   Step 3 — 정보 입력:
   이름, 연락처, 메모 입력
   [이전] [예약 요청하기] 버튼

2. BookingDashboard — 작가용
   월간 캘린더 + 예약된 날짜에 ● 표시
   하단 예약 목록:
     REQUESTED (노란 뱃지): [확인] [거절] 버튼
     CONFIRMED (초록 뱃지): [취소] 버튼

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

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react만 허용)
- useState로 현재 단계(step), 선택된 날짜/시간/종류 상태 관리
- 캘린더: 순수 JS Date API로 달력 그리드 계산
- 한국어 UI 텍스트
```
