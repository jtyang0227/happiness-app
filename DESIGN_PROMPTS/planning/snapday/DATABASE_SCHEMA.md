# SNAPDAY 병합 — 데이터베이스 (2026-11-25)

> 표 정의는 **Spring 엔티티**(`backend/.../outing/entity/*`, `gathering/entity/*`)에 둔다 — 컷오버 전까지 운영 스키마의 주인은 Hibernate(`ddl-auto: update`)다.
> 새 API(`apps/api`)는 `npx prisma db pull`로 같은 표를 읽는다. 운영 SQL은 CLAUDE.md "운영 DB 수동 마이그레이션"에 `IF NOT EXISTS`로 기록.
> 지시서의 표 이름과 이 앱의 기존 표 대응:

| 지시서 | 이 앱 | 비고 |
|---|---|---|
| users / photo_preferences | `members`(name·avatar_url·bio·instagram_id·specialties·location) | 촬영 취향 = `specialties`(콤마 구분, 기존) |
| monthly_polls | **`outing_polls`** (신규) | 월 1개(UNIQUE poll_year+poll_month) |
| poll_options | **`outing_poll_options`** (신규) | 날짜 후보 |
| poll_votes | **`outing_poll_votes`** (신규) | 회원×날짜 1행(UNIQUE option+member), 행 없음 = 미응답 |
| (공휴일) | **`public_holidays`** (신규) | 공공데이터포털 가져오기 또는 관리자 등록 — 코드에 박지 않음 |
| events / event_members | `gatherings` / `gathering_participants` | 투표 확정 시 모임 생성, `outing_polls.gathering_id`로 연결 |
| ai_recommendations | **`gathering_ai_recommendations`** (신규) | 결과 JSON + 출처(AI/SAMPLE) |
| places | `spots` / `gathering_place_options` | AI 추천 장소 → 장소 투표 후보로 등록 |
| photos | `gathering_photos`(현장·앨범), `photos`(포트폴리오) | |
| stories / story_tags | **`gathering_stories`** (신규, 태그는 `tagged_member_ids` 콤마 — 기존 `instagram_story_shares`와 같은 방식) | 공유 시도 로그는 기존 표 |
| comments / likes | `gathering_post_comments` / `gathering_post_likes` | |
| (베스트 포토) | **`gathering_best_votes`** (신규) | 1인 3표는 서비스에서 검사 |
| notifications | `gathering_notifications` | 투표 알림은 `gathering_id = 0`, `related_post_id = 투표 id`, type `POLL_*` |
| reports | `reports` | 기존 신고 |

## 신규 표

```sql
CREATE TABLE IF NOT EXISTS outing_polls (
  id                 BIGSERIAL PRIMARY KEY,
  poll_year          INTEGER NOT NULL,          -- year/month는 H2 예약어라 피함
  poll_month         INTEGER NOT NULL,          -- 1~12
  title              VARCHAR(100) NOT NULL,
  description        TEXT,
  region             VARCHAR(50),               -- 예정 지역(선택, AI 추천 입력)
  status             VARCHAR(20) NOT NULL,      -- OPEN | CLOSED | CONFIRMED
  starts_at          TIMESTAMP NOT NULL,
  ends_at            TIMESTAMP NOT NULL,
  min_participants   INTEGER,
  max_participants   INTEGER,
  confirmed_option_id BIGINT,
  gathering_id       BIGINT,
  closing_notified   BOOLEAN,                   -- 마감 24시간 전 알림 보냈는지
  created_by         BIGINT NOT NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_outing_polls_month UNIQUE (poll_year, poll_month)
);
CREATE TABLE IF NOT EXISTS outing_poll_options (
  id          BIGSERIAL PRIMARY KEY,
  poll_id     BIGINT NOT NULL,
  option_date DATE NOT NULL,
  day_kind    VARCHAR(10) NOT NULL,             -- SAT | SUN | HOLIDAY | WEEKDAY
  label       VARCHAR(50),                      -- 공휴일 이름
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_outing_poll_options UNIQUE (poll_id, option_date)
);
CREATE TABLE IF NOT EXISTS outing_poll_votes (
  id           BIGSERIAL PRIMARY KEY,
  poll_id      BIGINT NOT NULL,
  option_id    BIGINT NOT NULL,
  member_id    BIGINT NOT NULL,
  availability VARCHAR(12) NOT NULL,            -- AVAILABLE | UNAVAILABLE
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_outing_poll_votes UNIQUE (option_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_opv_poll_member ON outing_poll_votes(poll_id, member_id);
CREATE TABLE IF NOT EXISTS public_holidays (
  id           BIGSERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL,
  name         VARCHAR(50) NOT NULL,
  substitute   BOOLEAN,                          -- 대체공휴일
  source       VARCHAR(10) NOT NULL,             -- API | MANUAL
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_public_holidays_date UNIQUE (holiday_date)
);
CREATE TABLE IF NOT EXISTS gathering_ai_recommendations (
  id            BIGSERIAL PRIMARY KEY,
  gathering_id  BIGINT NOT NULL,
  member_id     BIGINT NOT NULL,
  source        VARCHAR(10) NOT NULL,            -- AI | SAMPLE
  model         VARCHAR(60),
  question      VARCHAR(500),                    -- 추가 질문(있으면)
  result_json   TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gar_gathering ON gathering_ai_recommendations(gathering_id);
CREATE TABLE IF NOT EXISTS gathering_best_votes (
  id           BIGSERIAL PRIMARY KEY,
  gathering_id BIGINT NOT NULL,
  photo_id     BIGINT NOT NULL,                  -- gathering_photos.id
  member_id    BIGINT NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_gathering_best_votes UNIQUE (photo_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_gbv_gathering_member ON gathering_best_votes(gathering_id, member_id);
CREATE TABLE IF NOT EXISTS gathering_stories (
  id                BIGSERIAL PRIMARY KEY,
  gathering_id      BIGINT NOT NULL,
  member_id         BIGINT NOT NULL,
  image_url         VARCHAR(500) NOT NULL,
  caption           VARCHAR(300),
  tagged_member_ids VARCHAR(500),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gathering_stories_gathering ON gathering_stories(gathering_id);
CREATE INDEX IF NOT EXISTS idx_gathering_stories_member ON gathering_stories(member_id);
```

## 권한·무결성
- 이 앱은 Supabase를 JDBC로만 쓴다(PostgREST 미사용). 권한은 서버(새 API)에서 검사하고, 공개 anon 키 직접 접근은 `apps/api/db/supabase-lockdown.sql`(RLS 켜기 + anon/authenticated 권한 회수)로 막는다 — 새 표도 이 SQL의 이벤트 트리거로 RLS가 자동으로 켜진다.
- 중복 방지: 월 1투표(UNIQUE), 날짜 중복(UNIQUE), 회원×날짜 1표(UNIQUE, 다시 고르면 갱신), 베스트 포토 회원×사진 1표(UNIQUE) + 모임당 3표(서비스).
- 회원 탈퇴: 투표·베스트 표·스토리·AI 기록 삭제(새 API 탈퇴 연쇄에 추가).
