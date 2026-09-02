# Feature 37 — 사진 모임(Photo Gathering) SNS

> **상태**: 기획(STEP1 분석 + STEP2 설계) 완료. **코드 구현 전 단계** — 사용자 요청대로
> STEP3(개발)는 아래 "13. 확인이 필요한 사항"에 대한 답을 받은 뒤 작은 단위로 시작한다.
> 이 문서는 요청받은 23개 섹션짜리 기획서를 이 저장소의 실제 코드 상태에 맞춰 검증·구체화한
> 것이다 — 스펙을 그대로 베끼지 않고, 이미 있는 것/충돌하는 것/불가능한 것을 먼저 걸러냈다.

## 0. 한 줄 요약

모임을 만들고 → 사람을 모으고 → 함께 사진을 찍고 → 모임 피드에 공유하고 →
Instagram Story로 확산하는 기능. **단, "Instagram 자동 멘션/음악 삽입"은 Instagram
공식 정책상 원천적으로 불가능하다는 사실이 이번 조사에서 확정됐고, 이는 UX 전체의
설계를 바꾼다 — 자세한 내용은 9번 섹션 최상단에 굵게 표시.**

---

## 1. STEP1 — 기존 프로젝트 분석 결과

### 1-1. 재사용 가능한 기존 자산 (그대로 쓴다)

| 필요 기능 | 기존 자산 | 비고 |
|---|---|---|
| Instagram ID 등록 (스펙 12번) | `Member.instagramId` (이미 엔티티/DTO/`ProfilePage.jsx` 설정 탭/배지 표시까지 **완전 구현되어 있음**) | **신규 작업 불필요.** 스펙 12번 전체가 이미 끝나 있다. |
| 이미지 업로드 | `POST /api/upload/image?folder=`, `SupabaseStorageService` | `folder=gatherings` 값만 새로 써서 그대로 재사용 |
| 참여/팔로우류 관계 테이블 | `Follow`, `PhotoLike`, `PhotoSave` 패턴 | "관계 엔티티는 도메인별로 별도 테이블" 컨벤션 확인 — 폴리모픽 테이블 쓰지 않는 이 저장소 스타일을 따른다 |
| 좋아요/댓글 UI 패턴 | `comment/` 패키지, `CommentsSection`(P0_03) | 구조는 재사용, 엔티티는 신규(아래 6번 참고 — 이유 있음) |
| 자동 상태 전환 배치 | `BookingBatchService`, `MeetBatchService` — `@Scheduled(cron=...)` + bulk `@Modifying @Query`, `catch(Exception)` 로깅 후 스킵 | 모집종료/모임시작/모임종료 자동 전환에 동일 패턴 적용 |
| 달력 UI | `BookingCalendar.jsx`(웹), `MeetCalendar.jsx`(웹+모바일) — 외부 라이브러리 없이 순수 JS Date API | 그대로 복제해 `GatheringCalendar` 작성 |
| Rate limiting | `ConcurrentHashMap<String,long[]>` IP/회원 기준 (booking/meet/assistant 등에서 반복 사용) | 동일 패턴으로 재사용 |
| IDOR 방지 | `findByIdAndMemberId()` 조회 관례 (meet/booking/testimonial 등) | 그대로 적용 |
| 대기자 승격 로직 참고 | 없음(신규) — 단, 상태 enum 패턴은 `Booking.status`/`Meet.status` 참고 |  |

### 1-2. 이름 충돌 — 반드시 피해야 함

스펙이 제시한 엔티티명 `Meeting`, `MeetingParticipant`는 **이 저장소에 이미 있는
`meet/` 패키지(Feature 35, 모델-작가 1:1 약속 — `Meet`, `MeetAvailability`,
`MeetMessage`, `/api/meets`, 프론트 `MeetsPage`/`MeetDetailPage`)와 이름이 겹쳐
혼란을 유발한다.** 완전히 다른 기능(1:1 약속 vs N명 그룹 촬영 모임)이므로 패키지·
엔티티·라우트를 명확히 분리한다.

**결정: 새 기능은 `gathering`(모임)으로 명명한다.**

| 스펙 제안 | 실제 사용할 이름 | 이유 |
|---|---|---|
| `meeting/` 패키지 | `gathering/` | `meet/`(약속) 과 충돌 |
| `Meeting` | `Gathering` | 동일 |
| `MeetingParticipant` | `GatheringParticipant` | 동일 |
| `MeetingPost` | `GatheringPost` | 동일 |
| `MeetingPhoto` | `GatheringPhoto` | 동일 |
| `InstagramShare` | `InstagramStoryShare` | 다른 기능에서 재사용될 수 있는 일반적인 이름을 피함 |
| `/api/meetings` | `/api/gatherings` | `/api/meets` 와 혼동 방지 |
| 모바일 화면 `MeetingsScreen` | `GatheringsScreen` | `MeetsScreen` 과 혼동 방지 |

### 1-3. 없어서 새로 필요한 것 (신규 작업/의존성 — 사용자 확인 필요, 13번 참고)

| 스펙 요구 | 조사 결과 | 영향 |
|---|---|---|
| EXIF에서 촬영 시간 등 자동 추출 (9번) | 백엔드/프론트 어디에도 EXIF 파싱 라이브러리가 없음(`ImageProcessingUtil`은 리사이즈만 함). `Photo.cameraModel` 등 기존 필드도 전부 수동 입력 필드였음 | 새 의존성 추가 필요 — 아래 13번에서 옵션 제시 |
| 실시간 푸시 알림 (18번) | FCM/APNs 등 push 인프라가 이 저장소 어디에도 없음. 기존 "알림"은 전부 **폴링 기반 unread count 배지**(`inquiryApi.getUnreadCount`, `meetApi.getPendingCount`, `reportApi.myUnreadCount`) 방식이지 실제 push가 아님 | Phase 1은 기존 패턴과 동일한 인앱 알림 목록 + 배지로 제한, 진짜 push는 별도 인프라 투자가 필요한 P2로 분리 |

---

## 2. 기능 목록 (우선순위)

| 우선순위 | 기능 | 비고 |
|---|---|---|
| **P0** | 모임 생성/수정/삭제 (운영자) | |
| **P0** | 모집 공지 화면 + 참여/미참여 응답 | |
| **P0** | 참여자 관리(운영자) + 대기자 자동 승격 | |
| **P0** | 모집 종료 → 모임예정 → 진행중 → 종료 자동 상태 전환(배치) | |
| **P0** | 모임 달력(내 모임 표시) | |
| **P0** | 모임 진행 중 사진/글 업로드(참여자만) | |
| **P0** | 모임 피드(좋아요/댓글) | |
| **P0** | 모임 종료 후 앨범(사진 모아보기) | |
| **P1** | Instagram Story 공유 — **모바일 전용**, 사진+텍스트+참여자 핸들 합성 이미지, 딥링크 전달 | 9번 섹션 필독 |
| **P1** | Story 템플릿 3종(사진중심/사진+참여자/사진+글) | 클라이언트 캔버스 합성 |
| **P1** | 인앱 알림 목록 + 배지(폴링) | 기존 패턴 재사용 |
| **P2** | EXIF 자동 촬영시간 추출 | 신규 의존성 필요, 승인 후 진행 |
| **P2** | 실제 push 알림(FCM/APNs) | 신규 인프라, 승인 후 진행 |
| **보류/미구현** | Instagram 음악 자동 삽입, 실제 멘션 스티커 자동 생성 | 공식 API로 불가능 — 9번 참고, 억지 구현하지 않음(사용자 지시 준수) |

---

## 3. 사용자 플로우

```
[운영자] 모임 생성
        │
        ▼
   모집 공지 발행 (status: RECRUITING)
        │
        ▼
[참여자] 참여/미참여 응답 ──미참여 선택──▶ 사유 선택(운영자만 열람)
        │ 참여
        ▼
   정원 이내? ──아니오──▶ 대기자 등록(WAITING)
        │ 예                    │
        ▼                      │ 참여자 취소 발생 시 자동 승격
   참여 확정(PARTICIPATING) ◀───┘
        │
        ▼
   모집 종료(수동 또는 recruitmentEndDateTime 도달, 배치)
   → status: RECRUITMENT_CLOSED, 참여/미참여 변경 잠금
        │
        ▼
   startDateTime 도달(배치) → status: SCHEDULED → ONGOING
        │
        ▼
[참여자만] 사진 업로드 / 글 작성 → 모임 피드에 실시간 반영
        │                              │
        │                              ▼
        │                    [참여자] Instagram Story 공유(모바일)
        │                       사진 선택 → 미리보기(캔버스 합성)
        │                       → 참여자 핸들 텍스트 배치
        │                       → (선택) 캡션 텍스트
        │                       → 최종 미리보기
        │                       → OS 딥링크로 Instagram Story 작성화면 전달
        │                       → (Instagram 안에서) 사용자가 직접 멘션/음악 추가
        ▼
   endDateTime 도달(배치) → status: ENDED
        │
        ▼
   모임 앨범 자동 생성(사진 모아보기/참여자/후기/다운로드)
```

---

## 4. 화면 목록

### 웹 (`frontend/src/pages/`)

| 라우트 | 화면 | 인증 |
|---|---|---|
| `/gatherings` | 모임 목록(모집중 피드 + 내 모임) | 공개(내 모임 섹션만 인증 필요) |
| `/gatherings/new` | 모임 생성/수정 폼 | 인증(운영자) |
| `/gatherings/:id` | 모임 상세(모집 공지 / 진행중 피드 / 종료 후 앨범 — status 따라 동일 라우트 내 분기) | 공개(참여 액션만 인증) |
| `/gatherings/:id/manage` | 참여자 관리(운영자 전용) | 인증(운영자 본인, IDOR 체크) |
| `/gatherings/calendar` | 모임 달력 | 인증 |

### 모바일 (`mobile/screens/`)

| 화면 | 대응 웹 라우트 |
|---|---|
| `GatheringsScreen` | `/gatherings` |
| `GatheringFormScreen` | `/gatherings/new` |
| `GatheringDetailScreen` | `/gatherings/:id` |
| `GatheringManageScreen` | `/gatherings/:id/manage` |
| `GatheringCalendarScreen` | `/gatherings/calendar` |
| `InstagramStorySharePreviewScreen` | **모바일 전용, 웹에 대응 화면 없음** — 9번 참고 |

---

## 5. 화면별 UI 구성 (핵심 화면만 상세, 나머지는 스펙 원문 와이어프레임 그대로 채택)

- **모임 상세(`/gatherings/:id`)**: status에 따라 같은 페이지 내 3단 분기.
  - `RECRUITING`: 스펙 3번 모집 공지 카드 그대로 + 참여/미참여 버튼 + 정원 표시.
  - `ONGOING`: 스펙 7·8번 그대로 — 상단 "📷 사진 올리기 / ✏️ 글 작성 / 📱 Instagram 공유" 버튼 + 하단 피드(Instagram 유사 카드, 참여자만 작성 가능 배지).
  - `ENDED`: 스펙 16·17번 그대로 — 앨범 헤더(참여자 수/사진 수/게시글 수) + 사진 모아보기 그리드 + 피드 + 후기.
- **참여자 관리(`/gatherings/:id/manage`)**: 스펙 4번 그대로(참여자/대기자 리스트), 미참여 사유는 이 화면에서만 노출.
- **Instagram Story 공유 미리보기(모바일 전용)**: 스펙 11·13·14·15번의 UI 구성 유지하되, "음악 선택" 단계는 **실제 음악 삽입 기능이 아니라 안내 문구**로 대체(9번 참고). 참여자 태그 체크박스는 실제 Instagram 멘션이 아니라 "합성 이미지에 텍스트로 표시될 핸들 목록 선택"임을 라벨로 명시.

---

## 6. DB 변경사항 (신규 테이블 초안 — 구현 시점에 CLAUDE.md 마이그레이션 섹션에 등재)

```sql
CREATE TABLE IF NOT EXISTS gatherings (
  id                       BIGSERIAL PRIMARY KEY,
  title                    VARCHAR(200) NOT NULL,
  description              TEXT,
  detail_description       TEXT,
  location                 VARCHAR(300) NOT NULL,
  start_date_time          TIMESTAMP NOT NULL,
  end_date_time            TIMESTAMP NOT NULL,
  max_participants         INTEGER NOT NULL,
  recruitment_end_date_time TIMESTAMP NOT NULL,
  status                   VARCHAR(20) NOT NULL DEFAULT 'RECRUITING',
  -- RECRUITING | RECRUITMENT_CLOSED | SCHEDULED | ONGOING | ENDED
  thumbnail_url            VARCHAR(500),
  preparation_note         TEXT,
  fee                      VARCHAR(100),
  shoot_theme              VARCHAR(200),
  location_intro           TEXT,
  reference_image_url      VARCHAR(500),
  hashtags                 VARCHAR(300),
  created_by               BIGINT NOT NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gatherings_status ON gatherings(status);
CREATE INDEX IF NOT EXISTS idx_gatherings_start_date ON gatherings(start_date_time);

CREATE TABLE IF NOT EXISTS gathering_participants (
  id           BIGSERIAL PRIMARY KEY,
  gathering_id BIGINT NOT NULL,
  member_id    BIGINT NOT NULL,
  status       VARCHAR(20) NOT NULL,  -- PARTICIPATING | NOT_PARTICIPATING | WAITING | CANCELLED
  reason       VARCHAR(200),          -- 미참여 사유, 운영자만 조회
  joined_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (gathering_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_gathering_participants_gathering ON gathering_participants(gathering_id, status);

CREATE TABLE IF NOT EXISTS gathering_posts (
  id           BIGSERIAL PRIMARY KEY,
  gathering_id BIGINT NOT NULL,
  member_id    BIGINT NOT NULL,
  content      TEXT,
  hashtags     VARCHAR(300),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gathering_posts_gathering ON gathering_posts(gathering_id);

CREATE TABLE IF NOT EXISTS gathering_photos (
  id                BIGSERIAL PRIMARY KEY,
  gathering_post_id BIGINT NOT NULL,
  image_url         VARCHAR(500) NOT NULL,
  sort_order        INTEGER DEFAULT 0,
  caption           VARCHAR(300),
  taken_at          TIMESTAMP,        -- EXIF 있으면 채움(P2), 없으면 NULL
  location_note     VARCHAR(200),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gathering_photo_tags (   -- 사진에 태그된 참여자
  gathering_photo_id BIGINT NOT NULL,
  member_id          BIGINT NOT NULL,
  PRIMARY KEY (gathering_photo_id, member_id)
);

CREATE TABLE IF NOT EXISTS gathering_post_likes (
  id                BIGSERIAL PRIMARY KEY,
  gathering_post_id BIGINT NOT NULL,
  member_id         BIGINT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (gathering_post_id, member_id)
);
CREATE TABLE IF NOT EXISTS gathering_post_comments (
  id                BIGSERIAL PRIMARY KEY,
  gathering_post_id BIGINT NOT NULL,
  member_id         BIGINT NOT NULL,
  content           TEXT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Instagram 공유는 서버 저장이 사실상 로그 성격(실제 게시는 OS가 함) — 통계/이력용
CREATE TABLE IF NOT EXISTS instagram_story_shares (
  id             BIGSERIAL PRIMARY KEY,
  gathering_id   BIGINT NOT NULL,
  member_id      BIGINT NOT NULL,
  gathering_post_id BIGINT,
  template       VARCHAR(20) NOT NULL,   -- PHOTO_ONLY | PHOTO_PARTICIPANTS | PHOTO_TEXT
  caption_text   VARCHAR(300),
  tagged_member_ids VARCHAR(500),        -- 콤마 구분, "합성 이미지에 그려질" 핸들 목록
  shared_at      TIMESTAMP NOT NULL DEFAULT NOW()
  -- status 컬럼 없음: 실제 게시 성공 여부는 OS/Instagram 쪽 이벤트라 서버가 알 수 없음(9번 참고)
);

-- Member 재사용: instagramId 이미 존재, 신규 컬럼 불필요
```

> 좋아요/댓글을 `PhotoLike`/`Comment`처럼 도메인별 전용 테이블로 새로 만든 이유:
> 이 저장소는 폴리모픽(다형성) 연관 테이블을 쓰지 않고 도메인마다 전용 테이블을
> 두는 컨벤션이 확고하다(`PhotoLike`/`PhotoSave`/`PhotoShare`가 각각 별도 테이블).
> 기존 `comment/Comment`(photoId 전용)를 억지로 재사용하면 IDOR 체크·인덱스·N+1
> 방지 쿼리가 사진 도메인과 얽혀버려 오히려 위험하다.

---

## 7. API 목록

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/gatherings` | 인증 | 모임 생성 |
| PUT | `/api/gatherings/{id}` | 인증(작성자, IDOR) | 모임 수정 |
| DELETE | `/api/gatherings/{id}` | 인증(작성자) | 모임 삭제 |
| GET | `/api/gatherings` | 공개 | 목록(상태/기간 필터) |
| GET | `/api/gatherings/{id}` | 공개 | 상세 |
| GET | `/api/gatherings/my` | 인증 | 내가 참여/운영 중인 모임(달력용) |
| POST | `/api/gatherings/{id}/participation` | 인증 | 참여/미참여 응답(사유 포함) |
| GET | `/api/gatherings/{id}/participants` | 인증(작성자) | 참여자/대기자 목록 |
| DELETE | `/api/gatherings/{id}/participation` | 인증 | 참여 취소(대기자 자동 승격 트리거) |
| POST | `/api/gatherings/{id}/close-recruitment` | 인증(작성자) | 수동 모집 종료 |
| POST | `/api/gatherings/{id}/posts` | 인증(참여자만) | 글+사진 업로드 |
| GET | `/api/gatherings/{id}/posts` | 공개(진행중~종료), | 모임 피드 조회 |
| DELETE | `/api/gatherings/posts/{postId}` | 인증(작성자 or ADMIN) | 게시글 삭제 — 종료 후 권한 정책은 8번 참고 |
| POST | `/api/gatherings/posts/{postId}/like` / DELETE | 인증 | 좋아요 토글 |
| POST | `/api/gatherings/posts/{postId}/comments` | 인증(참여자만) | 댓글 작성 |
| GET | `/api/gatherings/{id}/album` | 공개 | 종료 후 앨범(사진 모아보기) |
| GET/POST | `/api/gatherings/{id}/instagram-share` | 인증(참여자만) | 공유 이력 기록(실제 게시는 클라이언트 딥링크) |

---

## 8. 권한 정책

- 참여자만 글/사진 업로드·댓글 가능 = `GatheringParticipant.status == PARTICIPATING` 여부로 매 요청 시 서버에서 확인(클라이언트 숨김만으로 처리 금지 — IDOR/권한 우회 방지).
- 미참여 사유는 운영자(`gathering.createdBy` 본인 또는 ADMIN)만 조회 가능.
- 모집 종료 후 참여/미참여 변경 API는 상태값이 `RECRUITING`이 아니면 400 반환.
- 모임 종료 후 콘텐츠 수정/삭제: **본인 게시글만 삭제 가능, 수정은 막는다**(SNS 관례 + 앨범의 "그날의 기록" 무결성 유지 목적) — 삭제는 허용하되 사진 파일도 함께 정리(Photo 삭제 cascade와 동일 패턴).
- 대기자 승격은 서버 배치/이벤트에서만 수행, 클라이언트가 직접 상태를 WAITING→PARTICIPATING으로 못 바꾸게 함.

---

## 9. Instagram 연동 구조 — **가장 중요한 섹션, 반드시 먼저 읽을 것**

### 조사 결과 (2026년 9월 기준, Meta 공식 "Sharing to Stories" 문서 및 iOS/Android 구현 사례 기준)

> Sources:
> - [Sharing to Stories - Instagram Platform - Meta for Developers](https://developers.facebook.com/docs/instagram/sharing-to-stories/)
> - [Story Sharing on Facebook & Instagram in iOS Apps](https://medium.com/@burakekmen/story-sharing-on-facebook-instagram-in-ios-apps-2df2a82ebf96)
> - [Share content to an Instagram story from an iOS app](https://medium.com/@danielcrompton5/share-content-to-an-instagram-story-from-an-ios-app-d55b1e10e68a)

**"Instagram Story 공유"에 쓸 수 있는 공식 메커니즘은 서버 API가 아니라 OS 레벨
딥링크(iOS `instagram-stories://share` URL scheme + pasteboard, Android
Intent `com.instagram.share.ADD_TO_STORY`)다.** 이게 뜻하는 것:

1. **웹 브라우저에서는 이 기능을 구현할 수 없다.** Instagram 네이티브 앱을 호출하는
   메커니즘이므로 **모바일 앱(iOS/Android)에서만 가능**하다. 스펙 6·22번의 "모바일
   환경에서 Instagram 앱으로 자연스럽게 전달되는 공유 흐름"이라는 표현이 정확히 이걸
   가리킨다 — 웹에는 이 기능을 만들지 않는다(웹에서는 "이미지 다운로드 후 Instagram
   앱에서 직접 올려주세요" 안내만 제공).
2. **전달 가능한 것은 이미지(배경/스티커)와 attributionURL(앱으로 돌아오는 탭 링크)
   뿐이다.** 텍스트 캡션, 사용자 멘션, 음악은 딥링크 파라미터로 전달할 방법이
   **없다.**
3. **결론 — 스펙 12·13번에 대한 답:**
   - "참여자 Instagram ID 자동 태그" → 실제 Instagram 멘션 스티커를 자동 생성하는
     것은 불가능. 대신 **참여자 핸들 텍스트를 이미지 위에 클라이언트에서 합성(캔버스
     렌더링)해서 "그림으로" 굽는다.** 탭 가능한 진짜 멘션이 필요하면 Instagram 안에서
     사용자가 직접 추가해야 한다 — 이 사실을 공유 화면에 명확히 안내한다("공유 후
     Instagram에서 실제 멘션을 추가해보세요").
   - "음악 추가" → 자동 삽입 불가. **음악 선택 UI 자체를 만들지 않는다**(사용자 지시
     "Instagram에서 지원하지 않는 음악 삽입 방식은 구현하지 않는다"를 그대로 따름).
     공유 화면에 "Instagram 안에서 🎵 스티커로 음악을 추가할 수 있어요" 안내 문구만
     둔다.
4. **`InstagramStoryShare` 테이블에 `status` 컬럼을 넣지 않은 이유**: 딥링크로 넘긴
   뒤 사용자가 실제로 게시했는지, 취소했는지는 OS/Instagram 쪽 이벤트라 서버가
   알 방법이 없다. "공유 시도 로그"로만 기록한다(실제 게시 여부 추적 불가라는
   한계를 기능 설명에 명시).

### 실제 구현 흐름 (모바일, React Native)

```
사진 선택
  → 클라이언트 Canvas로 합성 이미지 생성
     (사진 + 템플릿별 텍스트 오버레이 + 참여자 핸들 텍스트 + 모임 타이틀)
  → 합성 이미지 미리보기(최종 확인)
  → react-native-share 등으로 OS 딥링크 호출
     (iOS: instagram-stories://share, Android: ADD_TO_STORY intent)
  → Instagram 앱 실행, 사용자가 최종 확인 후 직접 게시
  → 서버에는 "공유 시도" 로그만 기록(POST /instagram-share)
```

Instagram이 설치돼 있지 않은 기기에서는 딥링크가 열리지 않으므로, 실패 시 폴백으로
"이미지 저장 후 Instagram 앱에서 직접 공유해주세요" 안내를 반드시 둔다.

---

## 10. 알림 설계 (현실적 스코프)

기존 관례(폴링 unread count 배지)를 그대로 따라 **Phase 1은 인앱 알림**으로 제한한다.

| 상황 | Phase 1 (인앱) | Phase 2(P2, 별도 승인 필요) |
|---|---|---|
| 참여 확정/취소, 모집 마감 임박, 모임 시작 임박, 새 사진/댓글/좋아요, 모임 종료, 앨범 생성 | 알림 목록 테이블(`gathering_notifications`) + 헤더 배지(기존 `getUnreadCount` 패턴) | 동일 이벤트를 FCM/APNs로도 발송 |

실제 push(FCM/APNs)는 새 외부 서비스 연동(Firebase 프로젝트, 모바일 네이티브 설정,
비용)이 필요한 별도 인프라 투자이므로, 이번 라운드의 "작은 단위 개발"에는 포함하지
않고 13번에서 확인을 구한다.

---

## 11. 개발 로드맵 (STEP3 — 작은 단위)

1. `gathering/` 백엔드 패키지 스캐폴딩(엔티티/리포지토리) — 모임 생성/조회 API만
2. 참여/미참여 + 대기자 승격 로직 + 참여자 관리 화면
3. 모집 종료/모임 시작/모임 종료 자동 전환 배치(`GatheringBatchService`)
4. 모임 달력(웹+모바일)
5. 모임 진행중 피드(사진/글 업로드, 참여자 권한 체크) — 웹+모바일
6. 좋아요/댓글
7. 모임 종료 후 앨범
8. 인앱 알림(Phase 1)
9. Instagram Story 공유(모바일 전용, 캔버스 합성 + 딥링크)
10. (승인 시) EXIF 자동 추출, 실제 push 알림

각 단계 완료 후 기존 기능(특히 `meet/`, `booking/`, `photo/` 갤러리) 회귀 여부를
확인하고 다음 단계로 진행한다.

---

## 12. 테스트 시나리오 (STEP4, 스펙 원문 + 추가)

스펙 23번의 시나리오를 그대로 채택하고 아래를 추가한다:

- 정원 초과 상태에서 참여자 취소 → 대기자 1순위가 자동으로 PARTICIPATING으로
  승격되는지, 그리고 정확히 1명만 승격되는지(경합 조건 없이)
- 모집 종료 후 참여/미참여 API 호출 시 400 확인
- 참여하지 않은 사용자가 사진 업로드 API를 직접 호출했을 때 403 확인(클라이언트
  숨김 우회 테스트)
- Instagram 미설치 기기에서 공유 버튼 클릭 시 폴백 안내가 뜨는지
- 모임 종료 후 자신의 게시글 삭제는 되고 수정은 막히는지

---

## 13. 확인이 필요한 사항 (STEP3 착수 전, 사용자 답변 필요)

1. **EXIF 자동 촬영시간 추출(스펙 9번)** — 신규 라이브러리 추가가 필요하다
   (백엔드 `metadata-extractor` 또는 프론트 `exifr` 등). Phase 1 범위에 포함할지,
   아니면 P2로 미룰지?
2. **실제 push 알림(FCM/APNs)** — 이 저장소에 전혀 없는 새 인프라. 지금 만들지,
   아니면 Phase 1은 인앱 알림(기존 패턴)으로 하고 나중에 추가할지?
3. **운영자 권한** — "모임 생성"을 아무 로그인 회원이나 할 수 있게 할지, 아니면
   ADMIN/특정 역할만 가능하게 할지? (스펙엔 "운영자"라고만 돼 있고 이 앱의 기존
   Authority 체계상 일반 회원과 ADMIN만 있음 — 새 역할을 만들지 결정 필요)
4. **모임 종료 후 게시글 "수정"까지 허용할지** — 8번 정책에서 저는 삭제만 허용하고
   수정은 막는 쪽으로 제안했는데, 이게 맞는 방향인지 확인 필요.

---

## 참고: STEP1에서 이번에 새로 발견해 CLAUDE.md에는 아직 없는 것

- `backend/src/main/java/com/happiness/app/audit/entity/SecurityAuditLog.java` —
  이 세션 이전에 추가된 것으로 보이는 감사 로그 엔티티. 이 기능과 직접 관련은 없지만
  CLAUDE.md Architecture 섹션에 아직 문서화돼 있지 않음(별도 건으로 남겨둠, 이번
  작업 범위 아님).
