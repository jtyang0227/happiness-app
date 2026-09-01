# PLAN — 사진작가 신뢰·영향력 인정 플랫폼
> 전략 탐색 문서 | 2026-09-01 | PM: jtyang0227@gmail.com

---

## 핵심 질문 (이 문서의 출발점)

> "사진작가들이 자격이나 영향력을 인정받는다고 느낄 수 있고,
> 그 모습을 보는 사람(뷰어/클라이언트)한테도 그 신뢰감·영향력이 느껴지는 플랫폼으로 만들고 싶다."

이 요청은 두 개의 분리된 문제를 담고 있다:
- **A. 작가 내부 경험** — "나는 이 플랫폼에서 인정받고 있다"는 감각
- **B. 뷰어 외부 신호** — "이 작가는 믿을 만하다"는 신뢰 전달

두 문제는 연결되어 있지만 해결책이 다르다. 이 문서는 둘 다 다룬다.

---

## 1. 코드베이스 감사 결과 — 지금 있는 것과 없는 것

### 이미 구현된 신뢰 인프라

아래는 추측이 아니라 실제 파일을 읽고 확인한 결과다.

| 모듈 | 파일 경로 | 무엇이 있나 |
|------|-----------|-------------|
| testimonial | `backend/.../testimonial/Testimonial.java`, `TestimonialController.java`, `frontend/.../TestimonialsSection.jsx` | clientName/clientRole/content/shootDate/featured 필드. 공개 GET 엔드포인트. 포트폴리오 EDITORIAL/DARK_ROOM 템플릿에 렌더링됨 |
| press | `backend/.../press/PressFeature.java`, `Achievement.java`, `PressController.java`, `frontend/.../PressAwardsSection.jsx` | 언론 피처(publication/title/url/publishedDate/logoUrl) + 수상·전시·출판 (AWARD/EXHIBITION/PUBLICATION 타입) |
| brand | `backend/.../brand/ClientBrand.java`, `frontend/.../ClientLogoWall.jsx` | 클라이언트 브랜드 로고 목록 ("함께한 브랜드") |
| analytics | `backend/.../analytics/` | portfolioViews/totalLikes/totalSaves/inquiryCount + 기간 대비 % 변화, 일별 조회수, 인기 사진. **인증 필요 + 본인만 접근** |
| follow | `backend/.../follow/` | followerCount/followingCount — 포트폴리오 공개 API에 노출됨 |
| booking | `backend/.../booking/` | Booking 엔티티 (REQUESTED/CONFIRMED/REJECTED/CANCELLED), BookingAvailability, 예약 배치 만료 처리 |
| delivery | `backend/.../delivery/` | DeliverySet (PENDING/APPROVED/REJECTED). 클라이언트가 납품을 최종 승인한 기록 |
| report | `backend/.../report/` | Report 엔티티, 신고 모더레이션. AdminReportController |
| portfolio | `backend/.../portfolio/PortfolioController.java`, `frontend/src/pages/PortfolioPage.jsx` | 공개 API: member/photos/series/photoCount/followerCount/followingCount/totalLikes. 템플릿 시스템(EDITORIAL/SCRL/MINIMAL/DARK_ROOM) |

### 핵심 Gap 목록

다음은 "데이터는 있는데 노출/서사화가 약한" 케이스와 "기능 자체가 없는" 케이스를 구분한 결과다.

**Gap 1 — 가장 강한 신뢰 신호가 완전히 숨겨져 있다**
- `Booking` 엔티티에 CONFIRMED 예약, APPROVED 납품(`DeliverySet.status`) 데이터가 있다.
- 이것은 실제 돈을 지불한 클라이언트와 완료된 작업의 기록 — 플랫폼 내에서 조작 불가능한 가장 강력한 신뢰 신호다.
- 그러나 포트폴리오 공개 API에도, 어떤 UI에도 "완료된 촬영 N건" 같은 형태로 노출되지 않는다.

**Gap 2 — 추천사/언론/수상이 자기 신고(self-reported)다**
- `TestimonialController`의 POST 엔드포인트: `SecurityUtil.getCurrentMemberId()`로 작가 본인이 직접 작성.
- `TestimonialsSection.jsx` 라인 22: `<StarRating n={5} />` — 별점이 **항상 5점으로 하드코딩**.
- 언론 피처(`PressFeature`)도 본인 신고. URL이 실제로 해당 작가를 다루는지 플랫폼이 검증하지 않음.
- 뷰어가 이것을 신뢰하기 어렵다. "본인이 쓴 후기"라는 인상을 주면 역효과.

**Gap 3 — 애널리틱스가 작가 본인 전용이다**
- `AnalyticsController`의 모든 GET 엔드포인트: `verifyMemberAccess(memberId)` — 본인 또는 ADMIN만 접근.
- 작가는 "내 포트폴리오 조회수 이번 달 +40%" 같은 수치를 볼 수 있지만, 뷰어/클라이언트는 아무것도 볼 수 없다.
- 더 중요하게는: 이 수치들이 단순 숫자 집계이지 "영향력 서사"로 프레이밍되지 않는다. 작가 본인이 "내가 성장하고 있다"는 감정적 만족을 얻기 어렵다.

**Gap 4 — 신뢰 신호가 템플릿에 따라 사라진다**
- `TemplateEditorial.jsx`와 `TemplateDarkRoom.jsx`: testimonials/press/brands 렌더링.
- `TemplateScrl.jsx`와 `TemplateMinimal.jsx`: 신뢰 섹션 없음.
- SCRL/MINIMAL 템플릿을 쓰는 작가의 추천사는 포트폴리오에서 보이지 않는다.

**Gap 5 — 플랫폼 검증/큐레이션이 없다**
- "이달의 작가", "에디터 픽", "Verified 배지" 개념이 코드베이스에 전혀 없다.
- 신규 작가와 5년 경력 작가가 플랫폼 UI에서 동일하게 보인다.
- 작가가 플랫폼으로부터 "인정받는다"는 경험 자체가 설계되지 않았다.

**Gap 6 — report 모듈이 신뢰 생태계와 연결되지 않는다**
- 신고가 처리되고 결과가 기록되지만, "이 작가는 신고된 콘텐츠 없음" 같은 긍정적 신뢰 신호로 전환되지 않는다.

**왜 testimonial/press 모듈이 있는데도 작가가 '인정받는 느낌'이 부족한가?**
두 모듈의 핵심 문제는 **검증 부재와 자기 신고 구조**다. 소셜프루프는 제3자가 말해줄 때 신뢰를 만든다. 본인이 입력한 별점 5점짜리 추천사는 소셜프루프가 아니라 광고에 가깝다. 뷰어는 이를 직관적으로 감지한다. 또한 이 데이터들이 포트폴리오 API에 포함되지 않아 에이전트(MCP)도 읽지 못한다(AX 문서 참조).

---

## 2. 사용자 페르소나

| 페르소나 | 목표 | 현재 불편함 |
|---------|------|------------|
| **작가 — 프리랜서 초기** | 신뢰를 쌓아 첫 유료 클라이언트를 유치하고 싶다 | 포트폴리오는 있는데 "왜 나를 선택해야 하는지" 설득력 있는 신호가 없다. 플랫폼이 나를 어떤 방식으로도 주목하지 않는다 |
| **작가 — 경력 3년+** | 지금까지의 작업 실적을 포트폴리오에 녹여내고 싶다 | 완료된 예약, 승인된 납품 기록이 있는데 포트폴리오에 표시할 방법이 없다 |
| **클라이언트 — 기업 담당자** | 안전하고 믿을 만한 작가를 빠르게 찾고 싶다 | 포트폴리오가 아름다운데 실제 납품 경험이 있는지 확인할 방법이 없다 |
| **모델 — 포트폴리오 탐색** | 자신의 스타일에 맞는 작가를 찾고 싶다 | 팔로워 수와 좋아요 외에 이 작가가 "진지하게 일하는 사람"인지 판단 기준이 없다 |
| **플랫폼 운영자** | 진짜 프로 작가들이 머무는 고신뢰 생태계를 만들고 싶다 | 신고 처리, 모더레이션은 있는데 "이 플랫폼이 안전하다"는 신호를 외부에 내보내지 못한다 |

---

## 3. 전략 방향 후보

### 방향 A — 검증된 실적 공개 (Verified Activity)

**핵심 아이디어**: 조작 불가능한 플랫폼 내부 데이터(완료된 예약, 승인된 납품)를 포트폴리오에 공개적으로 표시한다.

**구체 신호 후보**:
- "완료된 촬영 N건" — `Booking.status = CONFIRMED`인 건수 (취소/거절 제외)
- "클라이언트 승인 납품 N건" — `DeliverySet.status = APPROVED`인 건수
- "평균 응답 시간 N시간" — Inquiry 응답 패턴 분석

**장점**:
- 완전히 조작 불가능. 예약과 납품은 클라이언트 행동으로만 기록됨
- 기존 booking/delivery 인프라를 재활용. 새 테이블 불필요
- 클라이언트 입장에서 가장 직접적으로 유의미한 신호

**단점/트레이드오프**:
- 신규 작가에게 불리 — "0건"이 오히려 부정적 신호로 작용할 수 있음. 표시 임계값 설계 필요 (예: 3건 이상부터 표시)
- 개인정보 고려 — 완료 건수 자체는 괜찮으나 클라이언트명/날짜 노출은 별도 동의 필요
- 예약 시스템을 아직 사용하지 않는 작가는 혜택 없음 — 도입 동기 부여 정책 필요

**결정**: P0 — 가장 높은 신뢰 가치 대비 구현 비용이 낮다

---

### 방향 B — 검증된 추천사 (Verified Testimonial)

**핵심 아이디어**: 작가가 직접 입력하는 현재 방식 대신, 완료된 예약 또는 승인된 납품에 연결된 후기만 "Verified" 배지를 붙인다.

**구체 구현**:
- 예약 확정 후 클라이언트(client_email)에게 후기 요청 이메일 발송
- 후기 제출 시 `Testimonial`에 `bookingId` FK + `verified = true` 컬럼 추가
- 미검증 추천사는 여전히 표시하되 "Verified" 배지 없이
- 별점: 1~5점 실제 입력으로 교체 (현재 하드코딩 5점 제거)

**장점**:
- 소셜프루프의 가장 강력한 형태 — 실제 클라이언트의 실제 후기
- 기존 `Testimonial` 엔티티에 컬럼 추가만으로 구현 가능
- 별점 데이터가 생기면 플랫폼 내 평점 정렬 기능으로 확장 가능

**단점/트레이드오프**:
- 클라이언트가 이메일에 응답하지 않으면 후기 수집률 낮을 수 있음
- 이메일 발송 인프라 필요 (`InquiryEmailService`는 `@Autowired(required=false)`로 선택적 — 운영 구성 필요)
- 클라이언트 데이터를 이메일 외에 어떻게 관리할지 (개인정보 처리방침 업데이트 필요)
- 기술 부채: `Testimonial` 엔티티 DB 마이그레이션, `BookingService`에 후기 요청 훅 추가

**결정**: P1 — 방향 A 이후 빠르게 연결 가능

---

### 방향 C — 애널리틱스 "영향력 서사"로 재프레이밍

**핵심 아이디어**: 현재 숫자만 보여주는 analytics 대시보드를 "당신의 영향력이 이만큼 커졌다"는 감정적 프레이밍으로 바꾼다. 일부는 뷰어에게도 공개한다.

**현재 상태**: `KpiSummaryDto`(portfolioViews/totalLikes/totalSaves/inquiryCount + %)를 `AnalyticsController`가 반환하지만, 본인만 볼 수 있고 단순 수치 나열이다.

**구체 변화**:
- **작가 내부**: 마일스톤 알림 ("포트폴리오 뷰 1,000명 달성!"), 주간 성장 리포트 ("지난주 대비 저장 +23%"), 핵심 지표 인사이트 ("이 사진이 이번 주 탐색에서 가장 많이 저장됨")
- **뷰어 공개 (선택적)**: 포트폴리오에 "이번 달 N명이 방문했습니다" — opt-in 방식. 공개 여부는 작가가 결정

**장점**:
- 신규 코드 최소 — 기존 analytics 데이터를 다르게 표현하는 것
- 작가 내부 경험(문제 A)에 직접적으로 답

**단점/트레이드오프**:
- "이번 달 방문자 N명" 공개는 방문자 수가 적을 때 오히려 부정적 신호
- 애매한 지표("저장 수 증가")가 실제 비즈니스 임팩트("예약 문의 증가")와 다를 수 있음
- 뷰어가 "조작된 숫자"라고 의심할 가능성 — 검증 메커니즘 없이는 방향 A보다 신뢰도 낮음

**결정**: P1 (내부 리프레이밍) / P2 (뷰어 공개)

---

### 방향 D — 플랫폼 큐레이션 ("이달의 작가", 에디터 픽)

**핵심 아이디어**: 플랫폼이 공식적으로 특정 작가를 주목하고 소개하는 큐레이션 레이어를 추가한다. "플랫폼에서 인정받는다"는 가장 직접적인 경험.

**구체 구현**:
- 어드민에서 "이달의 작가" 선정 (Admin 권한 필요)
- 홈/갤러리 상단에 Featured 작가 배너
- 선정된 작가 포트폴리오에 "Editor's Pick" 배지
- 기준: 완료된 예약 수 + 포트폴리오 조회수 + 작품 퀄리티 (어드민 주관 판단)

**장점**:
- 작가가 "플랫폼으로부터 인정받는다"는 경험의 가장 강력한 형태
- 선정된 작가의 동기 부여 및 재방문율 상승 효과
- 플랫폼 브랜드 구축에도 기여 ("이 플랫폼은 좋은 작가를 알아본다")

**단점/트레이드오프**:
- 운영 비용 — 매달 큐레이션 판단에 어드민 리소스 투입 필요
- 선정/탈락 기준 투명성 문제 — 불공정 논란 가능성
- 플랫폼 규모가 작을 때 의미 있으려면 사용자 수 임계치 필요
- MVP 단계에서 복잡도 높음

**결정**: P2 — 플랫폼 규모 성장 후 도입

---

### 방향 E — 마일스톤/성취 배지 시스템

**핵심 아이디어**: 작가가 플랫폼 내에서 달성한 이정표(첫 예약 완료, 팔로워 100명, 완료된 촬영 10건 등)를 배지로 표시한다.

**장점**:
- 허영 지표가 아닌 진짜 행동 기반 이정표
- 신규 작가에게 성장 경로 제시 ("다음 배지: 완료된 촬영 5건")
- 게임화(gamification) 요소로 플랫폼 재방문 촉진

**단점/트레이드오프**:
- 게임화 과잉 위험 — 배지 수집이 목적이 되면 진정성 상실
- 설계 복잡도 높음 — 배지 기준, 디자인, 달성 통보 로직
- "배지가 많은 작가"가 실제로 더 좋은 작가인지 뷰어가 신뢰하지 않을 수 있음

**결정**: P2 — 방향 A~D 이후 데이터 충분히 쌓인 뒤 도입

---

## 4. 유저 스토리 + 수용 기준 (AC)

### 방향 A — 검증된 실적 공개

**유저 스토리 A1 (작가)**
As a **경력 작가**, I want to **내가 완료한 촬영 건수를 포트폴리오에 표시**하고 싶다. so that **잠재 클라이언트가 내 실제 작업 이력을 신뢰할 수 있다**.

AC:
- [ ] 포트폴리오 공개 API(`GET /api/portfolio/{profileName}`)가 `completedBookings` 카운트를 포함한다 (Booking.status=CONFIRMED 집계, 취소/거절 제외)
- [ ] 포트폴리오 히어로 섹션에 "완료된 촬영 N건" 표시 (0건 시 숨김 처리)
- [ ] 표시 임계값: 1건 이상부터 표시 (0건 신규 작가에게 부정적 신호 방지)
- [ ] EDITORIAL/SCRL/MINIMAL/DARK_ROOM 모든 템플릿에 동일하게 적용

**유저 스토리 A2 (클라이언트)**
As a **촬영을 의뢰하려는 클라이언트**, I want to **이 작가가 실제로 몇 번의 촬영을 완료했는지** 보고 싶다. so that **연락하기 전에 신뢰 여부를 판단할 수 있다**.

AC:
- [ ] 포트폴리오 페이지 비로그인 방문자도 completedBookings 수치를 볼 수 있다
- [ ] MCP 도구 `happiness_get_portfolio`가 `completed_bookings` 필드를 반환한다 (AX 연결)
- [ ] 승인된 납품(`DeliverySet.status=APPROVED`) 건수도 별도로 노출된다

**유저 스토리 A3 (모델)**
As a **작가를 찾는 모델**, I want to **이 작가와 촬영한 사람이 실제로 있다는 증거**를 보고 싶다. so that **사기나 미숙한 작가를 구별할 수 있다**.

AC:
- [ ] 탐색 페이지(`/explore`) 검색 결과 카드에 "완료된 촬영 N건" 뱃지 표시 옵션 (설정 가능)
- [ ] 완료된 촬영 0건 작가와 5건+ 작가가 시각적으로 명확히 구분된다

---

### 방향 B — 검증된 추천사

**유저 스토리 B1 (작가)**
As a **작가**, I want to **내 포트폴리오의 추천사에 "실제 클라이언트"임을 나타내는 배지**가 붙기를 원한다. so that **단순 지인 후기와 다르다는 것을 보여줄 수 있다**.

AC:
- [ ] `Testimonial` 엔티티에 `bookingId` (nullable FK) + `verified` (boolean, default false) 추가
- [ ] 예약 확정 후 클라이언트 이메일로 후기 요청 링크 발송 (BookingService 훅)
- [ ] 클라이언트가 링크를 통해 제출한 후기는 `verified=true`
- [ ] TestimonialsSection에서 verified 후기에 "Verified Client" 배지 표시
- [ ] 별점: 하드코딩 5점 제거, 실제 1~5점 입력 및 저장

**유저 스토리 B2 (작가)**
As a **작가**, I want to **별점 평균이 포트폴리오 통계에 표시**되기를 원한다. so that **종합적인 만족도를 한눈에 전달할 수 있다**.

AC:
- [ ] verified 후기의 별점 평균 계산 (소수점 1자리)
- [ ] 후기 3건 이상일 때만 평균 별점 표시 (표본 신뢰성 기준)
- [ ] 포트폴리오 API가 `averageRating` 필드 반환

---

### 방향 C — 애널리틱스 리프레이밍 (작가 내부)

**유저 스토리 C1 (작가)**
As a **작가**, I want to **주간 성장 인사이트 요약**을 받고 싶다. so that **내 영향력이 커지고 있다는 것을 감정적으로 느낄 수 있다**.

AC:
- [ ] ProfilePage 분석 탭에 "이번 주 하이라이트" 카드 추가 ("포트폴리오 조회 +X%, 저장 +Y%")
- [ ] 마일스톤 달성 시 인앱 알림 표시 (첫 1,000 조회, 팔로워 50명 등)
- [ ] 단순 숫자가 아닌 문장형 인사이트 ("이번 주 스튜디오 사진이 특히 많이 저장됐어요")
- [ ] 하이라이트 카드는 항상 긍정적 프레이밍 (감소는 "도전 구간"으로 표현)

---

## 5. 기능 범위

### In Scope (이번 구현 — 방향 A 중심)

- `PortfolioController.getPortfolio()` 응답에 `completedBookings`, `approvedDeliveries` 카운트 추가
- 포트폴리오 공개 API DB 쿼리: `BookingRepository.countByMemberIdAndStatus(CONFIRMED)`, `DeliverySetRepository.countByMemberIdAndStatus(APPROVED)`
- `TemplateEditorial`, `TemplateScrl`, `TemplateMinimal`, `TemplateDarkRoom` 모두에서 `completedBookings` 표시 (방향 A)
- `TestimonialsSection.jsx`: 하드코딩 별점 5점 → 실제 `item.rating` 필드로 교체 (별점 없으면 숨김)
- 추천사/언론 섹션: SCRL/MINIMAL 템플릿에도 렌더링 추가 (현재 누락)

### Out of Scope (다음 버전)

- 후기 이메일 발송 자동화 (방향 B 전체)
- 플랫폼 큐레이션 / 이달의 작가 (방향 D)
- 마일스톤 배지 시스템 (방향 E)
- 공개 방문자 수 표시 (방향 C 뷰어 공개 부분)

---

## 6. 기술 트레이드오프

| 항목 | 옵션 A | 옵션 B | 결정 |
|------|--------|--------|------|
| completedBookings 집계 | PortfolioController에서 즉시 COUNT 쿼리 | Member 엔티티에 캐시 컬럼 | A — 현재 규모에서 즉시 COUNT가 더 단순하고 정확 |
| Testimonial 별점 | Testimonial 엔티티에 rating 컬럼 추가 | 외부 평점 API 연동 | A — 자체 관리, 복잡도 낮음 |
| 신뢰 지표 공개 범위 | 모든 신뢰 지표 기본 공개 | 작가가 opt-in 선택 | opt-in — 0건 신규 작가 보호, 개인정보 존중 |
| 검증된 추천사 인프라 | 이메일 링크 방식 | 앱 내 클라이언트 리뷰 흐름 | 이메일 — InquiryEmailService 기반으로 빠른 구현 가능 |

---

## 7. 우선순위 (P0/P1/P2) 및 근거

### P0 — 이번 라운드 (데이터는 있는데 안 보이는 것부터)

1. **PortfolioController에 completedBookings/approvedDeliveries 추가** — 새 인프라 불필요, 기존 booking/delivery DB 조회만 추가. 즉시 구현 가능하고 임팩트 최대.
2. **TestimonialsSection.jsx 별점 하드코딩 제거** — 한 줄 수정. 현재 "항상 5점"이라는 명백한 신뢰 훼손 요소.
3. **SCRL/MINIMAL 템플릿에 신뢰 섹션 추가** — 현재 두 템플릿 사용자의 추천사가 완전히 숨겨짐. 기존 컴포넌트 import만 추가.

### P1 — 다음 라운드 (검증 구조 추가)

4. **Testimonial에 verified 필드 + bookingId FK 추가** — DB 마이그레이션 필요, 이메일 발송 훅 설계
5. **실제 별점(1~5) 입력/저장/평균 표시** — Testimonial 엔티티 rating 컬럼 추가
6. **애널리틱스 리프레이밍** — 마일스톤 알림, 성장 서사 카드

### P2 — 중기 (플랫폼 큐레이션)

7. **이달의 작가 / 에디터 픽 어드민 기능** — 어드민 패널 확장
8. **마일스톤 배지 시스템** — 게임화 레이어
9. **공개 방문자 통계 opt-in** — 프라이버시 설계 완료 후

---

## 8. 성공 지표 (KPI)

방향 A 구현 후:
- **작가 활성화**: 포트폴리오에 completedBookings > 0인 작가 비율 (현재: 0%, 목표: 60일 내 30%)
- **클라이언트 전환**: 포트폴리오 방문 후 예약 문의(`INQUIRY_SENT` 이벤트) 전환율 변화
- **신뢰 인식**: 사용자 인터뷰에서 "이 작가가 실제로 일한 사람인지 알 수 있었다" 긍정 응답률

방향 B 구현 후:
- **후기 수집률**: 완료된 예약 대비 verified 후기 수집 비율 (목표: 30% 이상)
- **별점 분포**: 실제 별점 평균 (4점대 유지 여부 모니터링)

---

## 9. "가짜 신뢰" 방지 원칙

이 플랫폼에서 신뢰 신호를 설계할 때 반드시 지켜야 할 원칙:

**원칙 1 — 조작 불가능한 소스만 "검증됨" 표시**
- 작가가 직접 입력한 정보(testimonial content, press, achievement)에는 "Verified" 배지를 붙이지 않는다.
- 플랫폼 내 클라이언트 행동(예약 확정, 납품 승인, 클라이언트가 제출한 후기)만이 "검증됨"의 자격이 있다.

**원칙 2 — 0이 부정적 신호가 되지 않도록**
- 신규 작가 보호: completedBookings=0일 때는 해당 항목을 숨긴다. "0건"이라고 표시하지 않는다.
- 임계값 이하 데이터는 노출하지 않는다.

**원칙 3 — 표본 크기 명시**
- 별점 평균은 "4.8점 (후기 3건 기반)"처럼 표본 수를 함께 표시한다. 후기 1건짜리 5점을 "평균 5점"으로 표시하지 않는다.

**원칙 4 — 작가가 통제 불가능한 지표만 신뢰 신호로 사용**
- 좋아요, 저장 수는 작가 본인이 증가시킬 수 없는 지표가 아니므로 "신뢰 신호" 프레임보다 "반향" 프레임으로 표현한다.
- completedBookings는 클라이언트만 만들 수 있으므로 진정한 신뢰 신호다.

**원칙 5 — 신고 모더레이션 결과를 긍정 신호로 순환**
- 신고 처리 완료 시 해당 작가에게 결과 알림 (현재: `reporterSeen` 필드 있음)
- 향후: "신고 없음" 상태를 포트폴리오 내 안전성 배지로 표시 가능 (P2)

---

## 10. 관련 파일

**백엔드**:
- `backend/src/main/java/com/happiness/app/portfolio/PortfolioController.java` — completedBookings 추가 대상
- `backend/src/main/java/com/happiness/app/booking/` — BookingRepository에 countByMemberIdAndStatus 쿼리 추가
- `backend/src/main/java/com/happiness/app/delivery/` — DeliverySetRepository에 countByMemberIdAndStatus 쿼리 추가
- `backend/src/main/java/com/happiness/app/testimonial/Testimonial.java` — rating(int), verified(boolean), bookingId(Long nullable) 컬럼 추가 예정

**프론트엔드**:
- `frontend/src/components/portfolio/TestimonialsSection.jsx` — 라인 22: `<StarRating n={5} />` 하드코딩 수정
- `frontend/src/components/portfolio/templates/TemplateScrl.jsx` — 신뢰 섹션 import 추가 필요
- `frontend/src/components/portfolio/templates/TemplateMinimal.jsx` — 신뢰 섹션 import 추가 필요
- `frontend/src/pages/PortfolioPage.jsx` — templateProps에 completedBookings 전달

**운영 DB 마이그레이션 (방향 B 구현 시)**:
```sql
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS booking_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_testimonials_verified ON testimonials(member_id, verified);
```

**관련 기획 문서**:
- `DESIGN_PROMPTS/planning/30_SHOOT_BOOKING_CALENDAR.md`
- `DESIGN_PROMPTS/planning/28_CLIENT_DELIVERY_PORTAL.md`
- `DESIGN_PROMPTS/planning/32_PORTFOLIO_WORLD_CLASS.md`
- `DESIGN_PROMPTS/planning/AX_agent-experience-direction.md` (연결 문서)
