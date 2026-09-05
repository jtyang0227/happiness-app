# PLAN — 사진작가 업무 지원 확장
> Feature 39 | 2026-09-05 | PM: Claude

## 개요

사진작가가 이미 분산되어 있는 예약(Booking)·약속(Meet)·모임(Gathering) 3개 일정 도메인을 한 화면에서 통합 조망하고, 촬영 준비·정산 상태를 앱 안에서 관리하며, 모바일에서도 가용시간 설정을 완결할 수 있게 하여 "일정 관리 앱"으로서의 완성도를 높인다.

**우선순위 구분**: 사용자가 직접 요청한 "일정·날짜 관리 편의성" 개선은 **(a) 통합 캘린더 + (d) 모바일 가용시간 설정**이며, 이 두 항목이 이번 릴리스의 핵심 P1이다. **(b) 촬영 준비 체크리스트와 (c) 금전 흐름 기록**은 "업무 지원"이라는 맥락에서 합리적으로 추론·제안한 확장 항목으로, 사용자가 검토 후 범위를 결정해야 한다.

---

## 현황 분석 (코드 기반 실측)

### 기존 3개 일정 도메인 정확한 상태

#### Booking (`booking/entity/Booking.java`)
| 필드 | 타입 | 비고 |
|------|------|------|
| `shootDate` | `LocalDate` | 촬영 날짜 |
| `shootTime` | `VARCHAR(10)` | 예: "14:00" |
| `status` | `VARCHAR(20)` | REQUESTED / CONFIRMED / REJECTED / CANCELLED |
| `memberId` | `Long` | 촬영 작가 |
| `clientName/Phone/Email` | 문자열 | 클라이언트 정보 |
| `memo` | `TEXT` | 메모 |
| `confirmedAt`, `cancelledAt` | `LocalDateTime` | 상태 변경 시각 |

- 배치: **매일 02:00** (`cron = "0 0 2 * * *"`) — shootDate 지난 REQUESTED → CANCELLED, 30일 초과 차단날짜 삭제
- 기존 엔드포인트(이미 구현됨, 중복 제안 금지):
  - `GET /booking/{profileName}/availability` (공개, 월별 가용일)
  - `POST /booking/{profileName}` (공개, 예약 생성)
  - `GET /booking` (인증, 내 예약 목록, `?status=` 필터)
  - `PUT /booking/{id}/confirm`, `PUT /booking/{id}/reject`, `PUT /booking/{id}/cancel`
  - `GET/PUT /booking/availability-settings` (요일/시간슬롯/버퍼/메모)
  - `POST/DELETE /booking/blocked-dates/{id}`

#### Meet (`meet/entity/Meet.java`)
| 필드 | 타입 | 비고 |
|------|------|------|
| `confirmedDate` | `LocalDate` | 확정된 약속 날짜 |
| `confirmedTime` | `VARCHAR(10)` | 확정 시각 |
| `status` | `VARCHAR(20)` | PENDING / NEGOTIATING / CONFIRMED / COMPLETED / CANCELLED |
| `requesterId`, `receiverId` | `Long` | 양측 memberId |
| `locationName`, `locationAddress` | 문자열 | 장소 |
| `locationLat`, `locationLng` | `Double` | 좌표 |

- 배치: **매일 03:00** (`cron = "0 0 3 * * *"`) — confirmedDate 지난 CONFIRMED → COMPLETED

#### Gathering (`gathering/entity/Gathering.java`)
| 필드 | 타입 | 비고 |
|------|------|------|
| `startDateTime` | `LocalDateTime` | 모임 시작 일시 |
| `endDateTime` | `LocalDateTime` | 모임 종료 일시 |
| `recruitmentEndDateTime` | `LocalDateTime` | 모집 마감 |
| `status` | `VARCHAR(20)` | RECRUITING / RECRUITMENT_CLOSED / SCHEDULED / ONGOING / ENDED |
| `createdBy` | `Long` | 생성자 memberId |

- 배치: **5분마다** (`cron = "0 */5 * * * *"`) — 4단계 자동 상태 전환 + 알림 발송

### 모바일 현재 gap (`mobile/src/api/bookingApi.js`)
모바일 bookingApi는 `getMyBookings / confirmBooking / rejectBooking` **3개만** 구현됨.  
웹에서만 가능한 기능: cancelBooking, 가용시간 설정(weekdays/timeSlots/bufferHours/bookingNote), 차단날짜 추가/삭제.  
모바일 BookingScreen은 설정 진입 시 `Linking.openURL('/bookings')`로 웹을 열도록 임시 처리됨.

### GatheringCalendarPage 현황
`/gatherings/calendar` (웹) — `GET /gatherings/my`를 클라이언트에서 날짜별로 그룹핑해 달력 표시. Gathering만 표시, Booking/Meet은 미포함. 별도 백엔드 엔드포인트 없음.

---

## 사용자 문제

- **현재 상황**: Booking·Meet·Gathering 3개 일정이 완전히 분리된 화면에 나뉘어 있어 작가가 "이번 주에 뭐가 있지?"를 확인하려면 3곳을 따로 열어야 한다.
- **Pain Point 1**: 촬영 당일 준비물 체크리스트나 후속 납품 기한 리마인더를 관리할 공간이 없어 외부 앱(메모, 캘린더)을 별도로 씀.
- **Pain Point 2**: 계약금/잔금 수령 여부를 앱 밖에서 기록(엑셀, 메모)하고 있어 예약 정보와 분리됨.
- **Pain Point 3**: 모바일 앱에서 가용시간 설정이 불가능해 현장에서 급히 날짜를 막아야 할 때 웹 PC를 켜야 한다.
- **해결 후 기대 효과**: 앱 하나로 "오늘/이번 주 일정 확인 → 촬영 준비 체크 → 수금 상태 기록 → 가용일 수정"까지 완결.

---

## 사용자 페르소나

| 페르소나 | 목표 | 현재 불편함 |
|---------|------|------------|
| **프리랜서 사진작가** (메인) | 한 달 촬영 스케줄을 한눈에 보고 준비물/수금을 놓치지 않음 | 3개 탭을 넘나들며 일정을 파악, 수금 기록은 엑셀 별도 관리 |
| **모바일 우선 사진작가** | 현장에서 스마트폰으로 빠르게 날짜 차단 | 가용시간 설정이 웹 전용이라 모바일에서 불가 |
| **모델 겸 작가** | Booking(클라이언트 예약) + Meet(협업 약속) 양쪽을 동시 관리 | 날짜 겹침을 수동으로 확인해야 함 |

---

## 유저 스토리

### (a) 통합 캘린더
- As a **프리랜서 사진작가**, I want to **한 달 치 달력에서 클라이언트 예약(Booking CONFIRMED)·협업 약속(Meet CONFIRMED)·그룹 모임(Gathering SCHEDULED/ONGOING)을 색상으로 구분해 동시에 보고 싶다**, so that **날짜 겹침 없이 일정을 관리하고 빈 날짜를 빠르게 파악할 수 있다**.
- As a **사진작가**, I want to **달력의 날짜를 클릭하면 그날 일정 목록(유형·제목·시간·상대방)을 볼 수 있기를 원한다**, so that **해당 촬영 상세 페이지로 바로 이동할 수 있다**.
- As a **모바일 우선 사진작가**, I want to **모바일 앱에서도 동일한 통합 달력을 볼 수 있기를 원한다**, so that **외출 중에도 일정을 확인하고 새 예약 수락 여부를 판단할 수 있다**.

### (b) 촬영 준비 체크리스트
- As a **사진작가**, I want to **확정된 예약(Booking CONFIRMED)에 촬영 준비 체크리스트 항목을 추가하고 완료 표시를 할 수 있기를 원한다**, so that **카메라/조명/소품을 빠뜨리지 않는다**.
- As a **사진작가**, I want to **촬영 후 납품 기한을 예약에 기록하고 마감 3일 전에 목록에서 강조 표시를 볼 수 있기를 원한다**, so that **납품 누락 사고를 방지한다**.
- As a **사진작가**, I want to **자주 쓰는 체크리스트 항목을 템플릿으로 저장해 다음 예약에 재사용할 수 있기를 원한다**, so that **매번 동일한 항목을 새로 입력하지 않아도 된다**.

### (c) 금전 흐름 기록
- As a **사진작가**, I want to **예약(Booking CONFIRMED)에 계약금/잔금 수령 여부를 클릭 한 번으로 기록할 수 있기를 원한다**, so that **수금 현황을 앱 안에서 파악하고 미수금 예약을 빠르게 찾을 수 있다**.
- As a **사진작가**, I want to **내 예약 목록에서 미수금 예약만 필터링할 수 있기를 원한다**, so that **수금 독촉을 빠뜨리지 않는다**.
- As a **사진작가**, I want to **월별 총 수금액·예상 수입(계약금+잔금 합산)을 조회할 수 있기를 원한다**, so that **월 수익을 별도 계산 없이 확인한다**.

### (d) 모바일 가용시간 설정
- As a **모바일 우선 사진작가**, I want to **모바일 앱에서 예약 가능 요일과 시간 슬롯을 설정하고 특정 날짜를 차단할 수 있기를 원한다**, so that **PC를 열지 않고도 현장에서 즉시 일정 관리를 완결한다**.
- As a **사진작가**, I want to **모바일에서 오늘 날짜를 차단하거나 특정 요일 전체를 빠르게 활성화/비활성화할 수 있기를 원한다**, so that **갑작스러운 개인 사정을 바로 반영한다**.

---

## 수용 기준 (Acceptance Criteria)

### (a) 통합 캘린더

- [ ] AC-a1: `/calendar` 라우트에서 월간 달력이 렌더링되고, Booking CONFIRMED(파란색), Meet CONFIRMED(초록색), Gathering SCHEDULED/ONGOING(주황색) 3종 일정이 해당 날짜 셀에 점(dot) 또는 이름 태그로 표시된다.
- [ ] AC-a2: 날짜 클릭 시 하단 또는 사이드 패널에 해당 날짜의 일정 목록(유형 배지·제목·시간·상대방 이름)이 표시된다.
- [ ] AC-a3: 목록 항목 클릭 시 해당 도메인 상세 페이지(`/bookings`, `/meets/:id`, `/gatherings/:id`)로 이동한다.
- [ ] AC-a4: 전월/다음달 이동이 가능하고, 이동 시 해당 월 데이터를 재조회한다.
- [ ] AC-a5: 로딩 중 스켈레톤, 일정 없는 날짜는 빈 셀 표시, 일정 있는 날짜는 색상 도트를 표시한다.
- [ ] AC-a6: 모바일 ProfileScreen 메뉴에 "통합 일정" 항목이 추가되고, 탭 시 `Linking.openURL`로 웹 `/calendar` 페이지를 시스템 브라우저에서 연다. 네이티브 통합 달력 화면은 P2(Out of Scope).

### (b) 촬영 준비 체크리스트

- [ ] AC-b1: BookingDashboard의 CONFIRMED 예약 카드에 "체크리스트" 토글 섹션이 추가된다.
- [ ] AC-b2: 체크리스트 항목을 텍스트 입력으로 추가하고 체크박스로 완료 표시할 수 있다.
- [ ] AC-b3: 예약 상세에 `deliveryDeadline` (납품 기한) 날짜 입력 필드가 추가되고, 오늘로부터 3일 이내인 경우 목록에 "납품 임박" 배지(주황색)가 표시된다.
- [ ] AC-b4: 체크리스트 항목 목록과 완료 상태는 서버에 저장되어 새로고침 후에도 유지된다.
- [ ] AC-b5 (P2): "템플릿으로 저장" 버튼으로 현재 항목 목록을 템플릿에 저장하고, 다른 예약 생성 시 템플릿을 불러올 수 있다.

### (c) 금전 흐름 기록

- [ ] AC-c1: CONFIRMED 예약 카드에 계약금 수령(depositStatus) / 잔금 수령(balanceStatus) 토글 버튼이 표시된다(PENDING → RECEIVED 전환, 수령 시각 기록).
- [ ] AC-c2: 예약 목록 상단 필터에 "미수금" 탭이 추가되고, depositStatus=PENDING 또는 balanceStatus=PENDING인 CONFIRMED 예약만 표시된다.
- [ ] AC-c3 (P2): BookingDashboard 상단 요약 카드에 이번 달 예상 수입(depositAmount+balanceAmount 합산), 실제 수금액(RECEIVED 건만), 미수금액이 표시된다. — 이를 계산하는 `GET /api/booking/payment-summary` 엔드포인트는 P2이므로 (c) 전체가 P1-제안으로 채택된 이후에도 이 항목은 다음 릴리스에서 구현한다.
- [ ] AC-c4: IDOR 방지 — 수금 상태 변경 API는 `findByIdAndMemberId` 패턴으로 자기 예약만 수정 가능.
- [ ] AC-c5: 금액 입력은 옵션 필드(미입력 가능), 금액 없는 경우에도 수령 여부 토글은 동작한다.

### (d) 모바일 가용시간 설정

- [ ] AC-d1: 모바일 ProfileScreen "예약 관리" 메뉴 하위에 "가용시간 설정" 항목이 추가되어 AvailabilitySettingsScreen으로 이동한다.
- [ ] AC-d2: AvailabilitySettingsScreen에서 요일(월-일) 토글 칩, 시간 슬롯 추가/삭제, 버퍼 시간(숫자 입력), 예약 메모 입력이 가능하다.
- [ ] AC-d3: "저장" 버튼으로 `PUT /api/booking/availability-settings`를 호출하고 성공 시 Alert를 표시한다.
- [ ] AC-d4: AvailabilitySettingsScreen 내에서 차단 날짜 목록 조회 및 날짜 추가/삭제가 가능하다(`POST/DELETE /booking/blocked-dates`).
- [ ] AC-d5: 모바일 bookingApi.js에 `cancelBooking`, `getAvailabilitySettings`, `saveAvailabilitySettings`, `addBlockedDate`, `deleteBlockedDate` 5개 메서드가 추가된다.

---

## 기능 범위

### In Scope (이번 구현 — Feature 39)

**(a) 통합 캘린더**
- 웹: `/calendar` 신규 페이지 (ProtectedRoute)
- 프론트엔드에서 3개 API 병렬 호출 후 클라이언트 병합
- 월간 달력 UI (GatheringCalendarPage 기존 구조 재사용)
- Header 내비게이션에 "📅 일정" 링크 추가

**(b) 촬영 준비 체크리스트 (MVP)**
- Booking 엔티티에 `checklistJson` (TEXT) + `deliveryDeadline` (DATE) 2개 컬럼 추가
- `PUT /api/booking/{id}/checklist` 신규 엔드포인트
- BookingDashboard CONFIRMED 카드에 체크리스트 아코디언 추가

**(c) 금전 흐름 (MVP)**
- Booking 엔티티에 `depositStatus`, `depositAmount`, `depositReceivedAt`, `balanceStatus`, `balanceAmount`, `balanceReceivedAt` 6개 컬럼 추가
- `PUT /api/booking/{id}/payment` 신규 엔드포인트
- BookingDashboard에 수금 토글 + 미수금 필터 + 월간 요약 카드

**(d) 모바일 가용시간 설정**
- `mobile/screens/AvailabilitySettingsScreen.js` 신규
- `mobile/src/api/bookingApi.js` 5개 메서드 추가
- ProfileScreen 메뉴에 "가용시간 설정" 진입점 추가
- AppNavigator에 AvailabilitySettings 스택 등록

### Out of Scope (다음 버전)

- 백엔드 통합 캘린더 API (`GET /api/calendar?year=&month=`) — MVP는 프론트 병합으로 대체
- 체크리스트 템플릿 저장/불러오기 (AC-b5)
- PG사 연동, 실제 결제 처리 (요구사항 명시적 제외)
- Meet/Gathering에도 체크리스트 첨부 (Booking 우선)
- 캘린더 iCal 내보내기 / Google Calendar 동기화
- 납품 기한 Push 알림 (현재 앱은 FCM/APNs 없이 폴링만 사용)
- 모바일 통합 캘린더 전용 화면 (ProfileScreen에서 웹으로 딥링크로 대체 가능)

---

## 기술 트레이드오프

### (a) 통합 캘린더 — 데이터 병합 전략

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| **A: 프론트엔드 3 API 병렬 호출 + 클라이언트 병합** | 신규 백엔드 없음, 기존 API 재사용, 빠르게 구현 가능 | 3개 응답 중 하나라도 실패 시 부분 표시, 전체 목록 로드(월 필터 없음)로 데이터 多 | **MVP 선택 (P1)** |
| **B: 백엔드 통합 API `GET /api/calendar?year=&month=`** | 서버 사이드 날짜 필터, 단일 요청, 성능 우수 | 신규 쿼리 3개(Booking/Meet/Gathering), 새 DTO 설계, 개발 공수 2배 | P2로 연기 |

**결정 근거**: 초기 데이터 양이 적은 단계에서 프론트 병합으로 충분히 동작하며, 백엔드 추가 없이 빠르게 검증 가능. 단, 병렬 호출은 `Promise.allSettled`를 사용해 하나 실패해도 나머지 데이터는 정상 표시해야 한다.

**날짜 정규화**: Booking은 `shootDate` (ISO date string `"2026-09-15"`), Meet는 `confirmedDate` (ISO date string), Gathering은 `startDateTime` (ISO datetime `"2026-09-15T10:00:00"`)를 앞 10자(`slice(0, 10)`)로 잘라 동일한 `"YYYY-MM-DD"` 키로 그룹핑. GatheringCalendarPage의 기존 `dateKeyOf()` 함수 패턴 재사용.

**현황**: GatheringCalendarPage (`/gatherings/calendar`)는 이미 동일한 클라이언트 그룹핑 패턴을 Gathering 전용으로 구현함. 이 페이지를 "통합 캘린더"로 확장하거나(경로 변경 포함), 신규 `/calendar` 페이지를 만들어 Gathering 달력과 병존시키는 두 가지 방법이 있음.

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| GatheringCalendarPage 경로 변경·확장 | 기존 UI 재사용, 코드 중복 없음 | `/gatherings/calendar` 경로 의미가 "통합 캘린더"로 바뀌어 기존 사용자 혼동, Feature 37 Gathering 달력 기능과 관심사 분리 위반 | ❌ 기각 |
| **신규 `/calendar` 페이지 + 공통 컴포넌트 추출** | 기존 Gathering 달력(`/gatherings/calendar`) 유지, 관심사 분리 명확 | `UnifiedCalendar` 공통 컴포넌트 추출 작업 필요 | **선택** |

**결정 근거**: `/gatherings/calendar`는 Feature 37 Gathering SNS의 일부로 기존 사용자가 진입점을 이미 인지하고 있으므로 경로를 건드리지 않는다. 대신 달력 렌더링 핵심 로직(`dateKeyOf`, 월 이동, 날짜 클릭 패널)을 `components/calendar/UnifiedCalendar.jsx`로 추출해 신규 `/calendar`와 기존 `/gatherings/calendar` 양쪽에서 재사용한다.

### (b) 체크리스트 — 저장 방식

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| **Booking 엔티티에 checklistJson (TEXT) 추가** | 신규 테이블 없음, 마이그레이션 1줄, 조인 없음 | JSON 파싱 필요, 항목별 인덱싱 불가, 항목 수 증가 시 칼럼 크기 부담 | **MVP 선택** |
| 별도 `BookingChecklistItem` 엔티티 | 정규화, 항목별 쿼리 | 새 테이블, N+1 위험, Booking 조회마다 조인 필요 | P2 |

**결정 근거**: 체크리스트 항목은 검색/집계 대상이 아니고 한 예약에 최대 20~30개 수준이므로 JSON 칼럼이 충분히 실용적. 항목 구조: `[{"id":"uuid","text":"카메라 바디","checked":false}, ...]`

### (c) 금전 흐름 — 엔티티 설계

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| **Booking 엔티티 컬럼 추가 (6개)** | 신규 테이블 없음, 단순 쿼리 | 복수 분납이나 세금계산서 연동 시 구조 한계 | **MVP 선택** |
| 별도 `BookingPayment` 엔티티 | 분납·환불·세금계산서 확장성 | 신규 테이블, 조인 필요, 당장 요구사항 초과 | P2 |

**결정 근거**: "계약금 받음/잔금 받음" 2단계만 기록하면 되는 MVP 요구사항에는 Booking 컬럼 추가로 충분. 분납 처리가 실제로 요구될 때 별도 엔티티로 마이그레이션.

#### 금전 정보 분산 문제 — 인지해야 할 기술 부채

이 저장소에는 이미 "얼마"에 관한 정보가 두 곳에 존재한다.

- `pricing/entity/PricingPackage.java` — 작가가 포트폴리오에 공개한 촬영 패키지 가격표 (`price` INT, `priceLabel` VARCHAR). 클라이언트가 예약 전에 참고하는 "제안가"다.
- `inquiry/entity/Inquiry.java` — 클라이언트가 촬영 문의 시 입력하는 `budget` 텍스트 필드. 고객의 "희망 예산"이다.

그런데 현재 BookingPage 예약 위저드(3단계: 촬영유형 → 날짜/시간 → 연락처)에는 가격 선택·확인 단계가 없다. 여기에 `depositAmount / balanceAmount` 컬럼을 추가하면 한 사진작가의 "실제로 얼마 받기로 했는지" 정보가 서로 연결되지 않은 3~4곳(`PricingPackage.price`, `Inquiry.budget`, `Booking.depositAmount`, `Booking.balanceAmount`)에 흩어지는 구조가 된다.

**이번에 이 분산을 통합하는 것은 Out of Scope**이지만, (c)가 실제로 구현될 때는 아래 P2 항목을 함께 검토해야 한다:

> P2 후속 과제: BookingPage 3단계 위저드에 "패키지 선택(선택사항)" 단계를 추가해, 작가가 등록한 PricingPackage 중 하나를 클라이언트가 선택하면 `depositAmount / balanceAmount` 초기값이 자동으로 채워지도록 프리필. 이 연결이 없으면 금전 정보 분산은 영구적인 기술 부채로 남는다.

### (d) 모바일 가용시간 — UI 방식

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| **네이티브 AvailabilitySettingsScreen 신규 구현** | 앱 내 완결, UX 일관성 | 웹 AvailabilityModal 로직 RN으로 재구현 필요 | **선택** |
| WebView로 웹 `/bookings` 페이지 임베딩 | 구현 공수 최소 | 웹/모바일 UX 괴리, JWT 쿠키 공유 이슈, 심사 리스크 | 기각 |
| 기존 Linking.openURL 유지 | 변경 없음 | 사용자 불편 지속, 이번 기획 목표 미충족 | 기각 |

---

## 화면/플로우 목록

### 웹 신규
1. **IntegratedCalendarPage** (`/calendar`, ProtectedRoute) — 월간 달력 + 날짜 클릭 일정 패널
2. **BookingDashboard 확장** — CONFIRMED 카드에 체크리스트 아코디언, 수금 토글, 월간 요약 카드, 미수금 필터 탭 추가

### 모바일 신규
3. **AvailabilitySettingsScreen** — 요일 토글, 시간 슬롯 관리, 차단 날짜 관리

### 수정 (기존 화면)
4. **Header.jsx** — "📅 일정" 내비게이션 항목 추가 (`/calendar`)
5. **ProfileScreen.js (모바일)** — "가용시간 설정" 메뉴 항목 추가
6. **AppNavigator.js (모바일)** — AvailabilitySettings 스택 등록

---

## API 엔드포인트 (신규만)

### (a) 통합 캘린더
기존 API 3개 재사용 (신규 없음):
- `GET /api/booking` → CONFIRMED 필터
- `GET /api/meets` → 클라이언트에서 CONFIRMED 필터
- `GET /api/gatherings/my` → 클라이언트에서 SCHEDULED/ONGOING 필터

P2 전환 시 추가 예정:
- `GET /api/calendar?year=&month=` — 3개 도메인 통합 월별 조회

### (b) 촬영 준비 체크리스트
- `PUT /api/booking/{id}/checklist` — 체크리스트 JSON + deliveryDeadline 저장 (인증, IDOR 검사)

### (c) 금전 흐름
- `PUT /api/booking/{id}/payment` — depositStatus/depositAmount/depositReceivedAt/balanceStatus/balanceAmount/balanceReceivedAt 업데이트 (인증, IDOR 검사)
- `GET /api/booking/payment-summary?year=&month=` — 월간 수금 요약 (인증)

### (d) 모바일 — 기존 엔드포인트 활용 (신규 없음)
모바일 bookingApi.js에 추가할 메서드 (백엔드 엔드포인트는 이미 존재):
```javascript
cancelBooking: (id) => apiClient.put(`/booking/${id}/cancel`).then(r => r.data),
getAvailabilitySettings: () => apiClient.get('/booking/availability-settings').then(r => r.data),
saveAvailabilitySettings: (data) => apiClient.put('/booking/availability-settings', data).then(r => r.data),
addBlockedDate: (data) => apiClient.post('/booking/blocked-dates', data).then(r => r.data),
deleteBlockedDate: (id) => apiClient.delete(`/booking/blocked-dates/${id}`).then(r => r.data),
getBlockedDates: () => apiClient.get('/booking/blocked-dates').then(r => r.data), // 목록 조회 신규
```

**주의**: `GET /api/booking/blocked-dates` (목록 조회)는 현재 백엔드 컨트롤러에 없으므로 신규 엔드포인트 1개 추가 필요.

---

## 우선순위

### P0 (블로커) — 없으면 기능 불가
- 없음 (기존 기능을 파괴하지 않는 순수 추가 기능)

### P1-핵심 — 사용자가 직접 요청한 "일정·날짜 관리 편의성" 개선 (즉시 착수)
- **(a)** 웹 통합 캘린더 페이지 (`/calendar`) — 3 API 병렬 호출 + 클라이언트 병합 + `UnifiedCalendar` 컴포넌트 추출
- **(d)** 모바일 AvailabilitySettingsScreen 신규 + bookingApi.js 5개 메서드 추가 + ProfileScreen "통합 일정" 딥링크 추가

### P1-제안 — 업무 지원 확장 (사용자 확인 후 착수 권장)
아래 두 항목은 "업무 지원"이라는 맥락에서 추론·제안한 기능이다. 스키마 변경(최소 8컬럼 추가)과 UI 공수가 수반되므로 사용자가 실제로 필요한지 먼저 확인한 뒤 착수 범위를 결정해야 한다.
- **(b)** 체크리스트 MVP — Booking 엔티티 2컬럼 추가 + `PUT /api/booking/{id}/checklist` + BookingDashboard UI
- **(c)** 수금 상태 MVP — Booking 엔티티 6컬럼 추가 + `PUT /api/booking/{id}/payment` + 토글 UI + 미수금 필터

### P2 (향상) — 다음 릴리스 가능
- 백엔드 통합 캘린더 API (`GET /api/calendar?year=&month=`) — 프론트 병합 성능 한계 도달 시
- 월간 수금 요약 API (`GET /api/booking/payment-summary`) + 대시보드 요약 카드 — (c)가 P1-제안으로 채택된 경우에만
- 체크리스트 템플릿 저장/불러오기 (AC-b5)
- 모바일 네이티브 통합 달력 화면 — 현재 P1-핵심에서는 웹 딥링크(`Linking.openURL`)로 대체
- BookingPage 위저드에 PricingPackage 선택 단계 추가 → depositAmount/balanceAmount 초기값 프리필 (아래 트레이드오프 섹션 "금전 정보 분산 문제" 참고)

---

## 배치 스케줄 충돌 검토

기존 배치:
- Booking: `0 0 2 * * *` (02:00)
- Meet: `0 0 3 * * *` (03:00)
- Gathering: `0 */5 * * * *` (5분마다)

신규 배치 필요 항목:
- **납품 기한 임박 배지** — 서버 배치 불필요. 프론트엔드에서 `deliveryDeadline`과 오늘 날짜를 비교해 클라이언트 렌더링. 서버 알림(FCM)은 Out of Scope.
- **미수금 자동 리마인더** — Out of Scope (FCM 미구현).

결론: 이번 Feature 39에서 새로운 배치 스케줄은 추가되지 않는다. 기존 Booking 02:00 배치에서 수금 관련 로직이 필요할 경우(예: 촬영일 경과 후 미수금 알림)는 P2에서 해당 배치를 확장 검토.

---

## 운영 DB 마이그레이션 SQL

```sql
-- Feature 39 (b): 촬영 준비 체크리스트
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checklist_json TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_deadline DATE;

-- Feature 39 (c): 금전 흐름 기록
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status     VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount     INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_received_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_status     VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_amount     INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_received_at TIMESTAMP;

-- Feature 39 (d): 모바일 차단 날짜 목록 조회용 (인덱스는 이미 UNIQUE로 존재)
-- booking_blocked_dates 테이블: member_id + blocked_date UNIQUE 이미 구성됨
-- 신규 SQL 불필요, 기존 테이블 재사용
```

---

## 성공 지표 (KPI)

| 지표 | 측정 방법 | 목표 |
|------|---------|------|
| 통합 캘린더 일간 활성 사용 | `/calendar` 페이지 뷰 Analytics 이벤트 | 로그인 사용자 중 30% 이상/주 1회 이상 접근 |
| 체크리스트 사용률 | `checklistJson` 비어있지 않은 CONFIRMED 예약 비율 | CONFIRMED 예약 중 40% 이상에 체크리스트 입력 |
| 수금 기록 사용률 | `depositStatus = RECEIVED`인 예약 비율 | CONFIRMED 예약 중 60% 이상 수금 상태 기록 |
| 모바일 가용시간 설정 | `PUT /api/booking/availability-settings` 모바일 User-Agent 호출 수 | 웹 설정 호출 대비 30% 이상 모바일 비중 |

---

## 기존 기능과의 통합 및 중복 분석

| 기능 | 중복 여부 | 판단 |
|------|---------|------|
| 예약 확정/거절/취소 | 이미 구현 (BookingController, BookingDashboard) | 이번 기획에서 새로 제안하지 않음 |
| 예약 목록 4탭 필터 | 이미 구현 (BookingDashboard STATUS_TABS) | "미수금" 필터만 신규 추가 |
| Gathering 달력 (`/gatherings/calendar`) | 이미 구현, Gathering 전용 | 통합 캘린더는 `/calendar` 신규 경로로 분리, 기존 Gathering 달력은 유지 |
| 가용시간 설정 (웹 AvailabilityModal) | 이미 구현 (웹 전용) | 모바일 전용 AvailabilitySettingsScreen 신규 추가 |
| IDOR 패턴 (`findByIdAndMemberId`) | 기존 booking/meet 전역 사용 | 신규 엔드포인트도 동일 패턴 적용 |

---

## 관련 파일

**백엔드 (수정 대상)**
- `backend/src/main/java/com/happiness/app/booking/entity/Booking.java` — 컬럼 추가
- `backend/src/main/java/com/happiness/app/booking/controller/BookingController.java` — 신규 엔드포인트 추가
- `backend/src/main/java/com/happiness/app/booking/service/BookingService.java` — 체크리스트/수금 로직
- `backend/src/main/java/com/happiness/app/booking/dto/BookingResponse.java` — 신규 필드 반영
- `backend/src/main/java/com/happiness/app/booking/repository/BookingBlockedDateRepository.java` — 목록 조회 메서드 추가

**프론트엔드 (수정 대상)**
- `frontend/src/pages/BookingDashboard.jsx` — 체크리스트 아코디언, 수금 토글, 미수금 필터
- `frontend/src/services/bookingApi.js` — 신규 API 메서드
- `frontend/src/components/layout/Header.jsx` — "📅 일정" 내비 추가

**프론트엔드 (신규)**
- `frontend/src/pages/IntegratedCalendarPage.jsx`
- `frontend/src/components/calendar/UnifiedCalendar.jsx` (GatheringCalendarPage 공통 로직 추출)

**모바일 (신규)**
- `mobile/screens/AvailabilitySettingsScreen.js`

**모바일 (수정 대상)**
- `mobile/src/api/bookingApi.js` — 5개 메서드 추가
- `mobile/screens/ProfileScreen.js` — "가용시간 설정" 메뉴
- `mobile/src/navigation/AppNavigator.js` — AvailabilitySettings 스택 등록

**기획 연관 문서**
- `DESIGN_PROMPTS/planning/30_SHOOT_BOOKING_CALENDAR.md` — Booking 원래 기획
- `DESIGN_PROMPTS/planning/35_MODEL_MEET_PLANNING.md` — Meet 원래 기획
- `DESIGN_PROMPTS/planning/37_PHOTO_GATHERING_SNS.md` — Gathering 원래 기획
- `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` — 모바일 gap 분석 기준 문서
- `DESIGN_PROMPTS/planning/PLANNING_batch-jobs.md` — 배치 스케줄 현황 참고
