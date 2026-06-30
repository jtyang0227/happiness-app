# Feature 35 — 모델-작가 약속 커뮤니케이션 공간

> 작성일: 2026-06-30  
> 우선순위: P1  
> 담당: PM + Designer + Dev (Full-Stack)

---

## 1. 배경 및 목적

사진작가와 모델이 촬영 약속을 잡을 때 현재는 외부 메신저(카카오톡 등)로 날짜·장소를 조율해야 한다.  
Happiness 앱 내에서 약속 커뮤니케이션을 완결할 수 있는 공간을 만들어 **사용자 리텐션을 높이고 플랫폼 의존도를 강화한다.**

---

## 2. 유저 스토리

| 역할 | 스토리 |
|------|--------|
| 작가 | 모델의 프로필에서 "약속 요청하기"를 눌러 장소·날짜 후보를 보내고 싶다 |
| 모델 | 받은 약속 요청을 수락하고 내가 가능한 날짜를 골라서 알려주고 싶다 |
| 양측 | 겹치는 날짜가 하이라이트되어 어떤 날이 서로 가능한지 한눈에 보고 싶다 |
| 양측 | 약속 관련 메시지를 해당 약속 채팅방에서 주고받고 싶다 |
| 양측 | 장소를 지도에서 검색해 핀으로 찍고 공유하고 싶다 |

---

## 3. 수용 기준 (Acceptance Criteria)

### 약속 요청
- [ ] 상대방 프로필·포트폴리오에서 "약속 요청" 버튼 클릭 가능
- [ ] 요청 폼: 희망 날짜(복수 선택 달력) + 장소 검색(지도) + 메시지
- [ ] 요청 전송 후 수신자에게 알림

### 날짜 조율
- [ ] 양측이 각자 가능한 날짜를 달력에서 복수 선택
- [ ] 양측 모두 선택한 날짜를 초록색으로 강조
- [ ] 작가 또는 모델이 최종 날짜+시간 확정 가능

### 장소 선택
- [ ] Kakao Maps API로 키워드 검색 → 목록에서 선택 → 지도에 핀 표시
- [ ] 선택된 장소 이름·주소·좌표 저장
- [ ] API 키 없을 때 텍스트 입력 fallback

### 약속 채팅
- [ ] 약속별 채팅방(메시지 스레드) 존재
- [ ] 텍스트 메시지 전송/수신 (REST 풀링, 30초 주기)
- [ ] 발신자 아바타+이름 표시, 내 메시지 오른쪽 정렬

### 상태 흐름
- [ ] PENDING → 수락 시 NEGOTIATING → 날짜 확정 시 CONFIRMED → COMPLETED / CANCELLED

### 접근 제어
- [ ] 약속 당사자(requester/receiver)만 상세 조회·메시지 가능 (IDOR 차단)
- [ ] 제3자 URL 직접 접근 시 403

---

## 4. 데이터 모델

### `meets` 테이블
```sql
CREATE TABLE IF NOT EXISTS meets (
  id                BIGSERIAL PRIMARY KEY,
  requester_id      BIGINT NOT NULL,
  receiver_id       BIGINT NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  location_name     VARCHAR(200),
  location_address  VARCHAR(400),
  location_lat      DOUBLE PRECISION,
  location_lng      DOUBLE PRECISION,
  confirmed_date    DATE,
  confirmed_time    VARCHAR(10),
  initial_message   TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meets_requester ON meets(requester_id);
CREATE INDEX IF NOT EXISTS idx_meets_receiver  ON meets(receiver_id);
```

### `meet_availabilities` 테이블
```sql
CREATE TABLE IF NOT EXISTS meet_availabilities (
  id              BIGSERIAL PRIMARY KEY,
  meet_id         BIGINT NOT NULL,
  member_id       BIGINT NOT NULL,
  available_dates TEXT,  -- "2026-07-10,2026-07-11,2026-07-15" 콤마 구분
  available_times TEXT,  -- "10:00,14:00,18:00"
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (meet_id, member_id)
);
```

### `meet_messages` 테이블
```sql
CREATE TABLE IF NOT EXISTS meet_messages (
  id              BIGSERIAL PRIMARY KEY,
  meet_id         BIGINT NOT NULL,
  sender_id       BIGINT NOT NULL,
  sender_name     VARCHAR(100) NOT NULL,
  sender_avatar   VARCHAR(500),
  content         TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meet_messages_meet_id ON meet_messages(meet_id);
```

---

## 5. API 설계

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | /api/meets | 약속 요청 생성 | ✅ |
| GET | /api/meets | 내 약속 목록 | ✅ |
| GET | /api/meets/{id} | 약속 상세 | ✅ 당사자만 |
| PUT | /api/meets/{id}/respond | 수락/거절 | ✅ 수신자만 |
| POST | /api/meets/{id}/availability | 가능 날짜 제출 | ✅ 당사자만 |
| GET | /api/meets/{id}/availability | 양측 가능 날짜 조회 | ✅ 당사자만 |
| PUT | /api/meets/{id}/confirm | 날짜 최종 확정 | ✅ 당사자만 |
| PUT | /api/meets/{id}/cancel | 취소 | ✅ 당사자만 |
| GET | /api/meets/{id}/messages | 메시지 목록 | ✅ 당사자만 |
| POST | /api/meets/{id}/messages | 메시지 전송 | ✅ 당사자만 |
| GET | /api/meets/unread-count | 미확인 약속 수 | ✅ |

---

## 6. 상태 흐름

```
PENDING ──[수신자 수락]──► NEGOTIATING ──[날짜 확정]──► CONFIRMED ──[촬영 완료]──► COMPLETED
   │                          │
   └──[수신자 거절/요청자 취소]──┴──[어느 쪽이든 취소]──► CANCELLED
```

---

## 7. 화면 구성

### `/meets` — 약속 목록 페이지
- 탭: 전체 / 대기중 / 조율중 / 확정됨 / 완료
- 카드: 상대방 아바타·이름, 상태 배지, 확정 날짜/장소 미리보기, 미읽은 메시지 수

### `/meets/:id` — 약속 상세 페이지
- 상단: 상태 헤더 + 상대방 정보
- 날짜 조율 패널: 양측 가능 날짜 달력 (겹치는 날 초록)
- 장소 패널: 지도 + 선택 장소 정보
- 하단: 채팅 스레드 + 메시지 입력

### 약속 요청 모달 (포트폴리오/프로필에서 진입)
- Step 1: 날짜 후보 선택 (달력)
- Step 2: 장소 선택 (지도 검색)
- Step 3: 메시지 입력 + 전송

---

## 8. 기술 결정

| 항목 | 결정 |
|------|------|
| 지도 API | Kakao Maps JS SDK (REACT_APP_KAKAO_APP_KEY 재사용) |
| 실시간 메시지 | REST 풀링 (30초 인터벌) — WebSocket은 오버엔지니어링 |
| 달력 | 순수 JS Date API (외부 라이브러리 없음) |
| 날짜 저장 | 콤마 구분 TEXT (단순, 최대 60일치) |

---

## 9. 보안 고려사항

- 약속 상세·메시지 API: `requester_id = :me OR receiver_id = :me` IDOR 체크
- 메시지 콘텐츠 XSS: 백엔드에서 HTML 스트립, 프론트에서 textContent 렌더링
- 좌표 입력: lat/lng 범위 검증 (위도 -90~90, 경도 -180~180)
- IP 기반 rate limit: 메시지 전송 30req/min

---

## 10. 로드맵 연계

- Phase 1 (현재): 기본 약속 요청·날짜조율·채팅
- Phase 2: 푸시 알림 (약속 확정, 새 메시지)
- Phase 3: 촬영 완료 후 후기 요청 (Testimonial 연동)
