# Happiness App — 프로젝트 현황 & 기능 로드맵

> 최종 업데이트: 2026-06-11  
> 전체 완성도: **Backend 96% / Frontend 92% / Mobile 20%**
> Phase 2-7 완료: pg_trgm 유사도 검색, 자동완성 드롭다운, 검색 히스토리, 결과 하이라이팅

---

## 📋 요약

| 구분 | 상태 | 비고 |
|------|------|------|
| **Phase 1 — MVP** | ✅ 완료 | 공개 포트폴리오, 카카오 OAuth, 이미지 비율, 좋아요 API |
| **Phase 2-1 — 시리즈/컬렉션** | ✅ 완료 | Series CRUD, 사진 추가/제거, 포트폴리오 탭 표시 |
| **Phase 2-2 — 워터마크** | ✅ 완료 | Canvas 텍스트 워터마크, ON/OFF, 5가지 위치 |
| **Phase 2-3 — 문의 폼** | ✅ 완료 | 공개 폼, 수신함 CRUD, 이메일 알림(선택), 읽음 처리 |
| **Phase 2-4 — 통계 대시보드** | ⬜ 별도 앱 | happiness-admin 앱에 구현 예정 |
| **Phase 2-5 — 사진 순서 정렬** | ✅ 완료 | HTML5 DnD 드래그 정렬, displayOrder 저장 |
| **Phase 2-6 — 갤러리 정렬 강화** | ✅ 완료 | 6가지 정렬, 그리드/리스트 뷰, 비율 필터 |
| **Phase 2-7 — 검색 고도화** | ✅ 완료 | pg_trgm 유사도 검색, 자동완성, 히스토리, 하이라이팅 |
| **Phase 2-8 — 마이페이지 강화** | 📋 기획 완료 | 아바타 업로드, 비밀번호 변경, 저장함, 통계 |
| **Phase 3 — 커뮤니티** | ⬜ 미착수 | 팔로우/피드/댓글/AI태그 |

### 주요 완성 기능 (2026-06-11 기준)

```
✅ 회원가입 / 로그인 (JWT Access+Refresh)
✅ 카카오 OAuth 로그인 (Frontend 버튼 + Callback 페이지)
✅ 사진 업로드 (파일/URL, Canvas 보정, LUT 파이프라인)
✅ 갤러리 12컬럼 masonry 그리드
✅ 탐색 페이지 (키워드/무드 필터, 실제 API 연동)
✅ 사진 상세 (좋아요/저장 API 연결, 보정값 요약)
✅ 공개 포트폴리오 (/portfolio/:profileName) — 로그인 불필요, 문의하기 버튼
✅ 시리즈/컬렉션 CRUD + 사진 추가/제거 관리 UI
✅ 포트폴리오 페이지 — 작품/시리즈 탭 분리
✅ 이미지 비율 선택 (16:9 / 4:3 / 1:1 / 3:4 / 2:3)
✅ 워터마크 — Canvas 텍스트 오버레이, 5가지 위치, 업로드 이미지에 내장
✅ 촬영 문의 폼 (/inquiry/:profileName) — 공개 접근, 7가지 촬영 종류
✅ 문의 수신함 (/inbox) — 읽음/안읽음 필터, 삭제, 이메일 답장
✅ 사진 순서 정렬 (/gallery/sort) — 드래그&드롭, displayOrder API 저장
✅ Rate Limiting, JWT 보안, Supabase Storage 연동
```

---

## 현재 구현 현황

### Frontend (React 18 SPA)

#### 페이지

| 페이지 | 경로 | 구현 상태 | 주요 기능 |
|--------|------|----------|----------|
| 갤러리 | `/` | ✅ 완성 | 12컬럼 masonry 그리드, 무드별 정렬 |
| 탐색 | `/explore` | ✅ 완성 | 카드 그리드, 키워드+무드 필터, 실제 API 연동 |
| 목록 | `/list` | ✅ 완성 | 행 목록, 좋아요/저장/공유 카운트 |
| 사진 등록 | `/photo/new` | ✅ 완성 | 파일/URL, 이미지 비율 선택, Canvas 보정 패널 |
| 사진 상세 | `/photo/:id` | ✅ 완성 | 좋아요/저장 API, 보정값 요약, 작성자 정보 |
| 시리즈 | `/series` | ✅ 완성 | 시리즈 CRUD, 사진 추가/제거, 포트폴리오 링크 |
| 공개 포트폴리오 | `/portfolio/:profileName` | ✅ 완성 | 작품/시리즈 탭, 프로필, 문의하기 버튼 |
| 촬영 문의 폼 | `/inquiry/:profileName` | ✅ 완성 | 공개 폼, 촬영 종류 7가지, 성공 화면 |
| 문의 수신함 | `/inbox` | ✅ 완성 | 읽음/안읽음 필터, expandable 카드, 답장/삭제 |
| 사진 순서 정렬 | `/gallery/sort` | ✅ 완성 | HTML5 DnD 드래그, 순서 번호 배지, API 저장 |
| 프로필 | `/profile` | ⚠️ 기본 | 기본 정보 표시, SNS 스타일 미완성 |
| 로그인 | `/login` | ✅ 완성 | 다크 테마, 카카오 OAuth 버튼 |
| 회원가입 | `/signup` | ✅ 완성 | 이메일/비밀번호/프로필명 검증 |
| 카카오 콜백 | `/oauth/kakao/callback` | ✅ 완성 | 인가코드 처리, JWT 수신, 자동 로그인 |

#### 핵심 컴포넌트

| 컴포넌트 | 위치 | 상태 |
|---------|------|------|
| ImageAdjustmentPanel | `components/photo/` | ✅ 완성 — 노출/대비/밝은영역/어두운영역 슬라이더 |
| CurveEditor | `components/photo/` | ✅ 완성 — Lightroom 스타일 채널별 RGB 톤 커브 |
| PresetManager | `components/photo/` | ✅ 완성 — 최대 5개, 저장/불러오기/삭제 |
| ImageUploader | `components/common/` | ✅ 완성 — 드래그&드롭, 진행률, 미리보기 |
| GridSpanPicker | `components/common/` | ✅ 완성 — 12컬럼 너비 선택 |
| Header | `components/layout/` | ✅ 완성 — PC 헤더 + 모바일 하단 탭바 |
| PhotoCard | `components/photo/` | ✅ 완성 — 색체학 무드 뱃지 |
| Toast | `components/common/` | ✅ 완성 — 타입별 색상/아이콘/스택 (최대 3개) |

#### 보정 엔진 (canvas 기반)
- 노출, 대비, 밝은영역, 어두운영역, 흰색계열, 검정계열
- 채널별 톤 커브 (RGB master + R/G/B 개별) — Catmull-Rom 보간 + LUT 파이프라인
- 효과: 텍스처, 부분대비(Clarity), 디헤이즈, 비네팅, 그레인(농도/크기/거칠기)
- 히스토그램 실시간 표시 (로그 스케일)
- 보정값 프리셋 localStorage 저장 (최대 5개)

---

### Backend (Spring Boot 3.4.5 + Java 25)

#### API 엔드포인트 전체 목록

##### 인증 (`/api/auth`)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/signup` | 회원가입 | — |
| POST | `/login` | 로그인 | — |
| POST | `/refresh` | 토큰 재발급 | — |
| POST | `/logout` | 로그아웃 | ✅ |
| POST | `/oauth/kakao` | 카카오 로그인 | — |
| GET | `/check-email` | 이메일 중복 확인 | — |
| GET | `/check-profile-name` | 프로필명 중복 확인 | — |
| GET | `/member/:id` | 회원 정보 조회 | ✅ |
| PUT | `/member/:id/profile` | 프로필 수정 | ✅ |

##### 사진 (`/api/photos`)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/?keyword=&colorMood=&memberId=` | 사진 목록 (필터) | — |
| GET | `/:id` | 사진 상세 | — |
| POST | `/` | 사진 등록 (JSON/URL) | ✅ |
| POST | `/upload` | 사진 업로드 (파일) | ✅ |
| PUT | `/:id` | 사진 수정 | ✅ |
| DELETE | `/:id` | 사진 삭제 (cascade) | ✅ |
| POST | `/:id/likes` | 좋아요 | ✅ |
| DELETE | `/:id/likes` | 좋아요 취소 | ✅ |
| POST | `/:id/saves` | 북마크 | ✅ |
| DELETE | `/:id/saves` | 북마크 취소 | ✅ |
| GET | `/saves/:memberId` | 저장한 사진 목록 | ✅ |
| POST | `/:id/shares` | 공유 기록 | ✅ |
| POST | `/:id/tags` | 사용자 태그 추가 | ✅ |
| GET | `/:id/tags` | 태그 목록 | — |
| DELETE | `/:id/tags/:tagId` | 태그 삭제 | ✅ |

##### 시리즈 (`/api/series`) — Phase 2-1 신규
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/?memberId=` | 멤버별 시리즈 목록 | — |
| GET | `/:id` | 시리즈 상세 (사진 포함) | — |
| POST | `/` | 시리즈 생성 | ✅ |
| PUT | `/:id` | 시리즈 수정 | ✅ |
| DELETE | `/:id` | 시리즈 삭제 | ✅ |
| POST | `/:id/photos` | 사진 추가 | ✅ |
| DELETE | `/:id/photos/:photoId` | 사진 제거 | ✅ |

##### 포트폴리오 (`/api/portfolio`)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/:profileName` | 공개 포트폴리오 (멤버+사진+시리즈) | — |

##### 문의 (`/api/inquiry`) — Phase 2-3 신규
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/` | 문의 전송 (DB 저장 + 이메일 알림) | — |
| GET | `/inbox?memberId=` | 수신함 목록 | ✅ |
| GET | `/inbox/unread-count?memberId=` | 읽지 않은 문의 수 | ✅ |
| PUT | `/:id/read` | 읽음 처리 | ✅ |
| DELETE | `/:id` | 문의 삭제 | ✅ |

##### 사진 순서 (Photo 추가) — Phase 2-5 신규
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| PUT | `/api/photos/reorder` | 사진 순서 일괄 저장 (`[{id, displayOrder}]`) | ✅ |

##### 스토리지 (`/api/upload`)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/image?folder=photos` | Supabase 이미지 업로드 | ✅ |

#### 보안 & 인프라
- JWT Access Token (30분) + Refresh Token (7일, Redis 저장)
- Bucket4j IP 기준 Rate Limiting (100req/60s)
- XSS 보호 (Jsoup sanitize)
- Kakao OAuth 완성
- Supabase Storage 연동 (업로드/삭제, UUID 파일명)
- CORS allowedOrigins 환경변수 제어

#### 이메일 알림 설정 (선택적)

문의 폼(Phase 2-3)에서 새 문의가 접수되면 작가에게 이메일을 발송하는 기능입니다.  
**설정하지 않아도 앱은 정상 동작합니다** — 문의는 DB에 저장되고, 이메일 발송만 건너뜁니다.

##### application.yml 설정 위치

```yaml
spring:
  mail:
    host: ${MAIL_HOST:}          # SMTP 서버 주소 (비어 있으면 발송 비활성화)
    port: ${MAIL_PORT:587}       # SMTP 포트 (Gmail: 587, SSL: 465)
    username: ${MAIL_USERNAME:}  # 발신 계정 이메일
    password: ${MAIL_PASSWORD:}  # 앱 비밀번호 (Google: 2단계 인증 후 앱 비밀번호 발급)
    from: ${MAIL_FROM:noreply@happiness.app}  # 메일 발신자 표시명
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

##### 동작 방식

| 상태 | 동작 |
|------|------|
| `MAIL_HOST` 미설정 (기본값) | DB 저장 후 이메일 발송 생략, 로그에 안내 메시지 출력 |
| `MAIL_HOST` 설정됨 | DB 저장 + 작가 이메일로 HTML 알림 발송 |
| 발송 실패 (연결 오류 등) | 예외 catch → 로그 경고만 출력, 앱 중단 없음 |

##### 활성화 방법 (Gmail 기준)

1. Google 계정 → **보안** → **2단계 인증** 활성화
2. **앱 비밀번호** 발급 (앱: 메일, 기기: Windows)
3. 아래 환경변수 설정:

```bash
# Railway Variables 또는 .env.local
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx   # 앱 비밀번호 (16자리)
MAIL_FROM=your-gmail@gmail.com
```

> **주의**: `MAIL_PASSWORD`에 Gmail 계정 비밀번호가 아닌 **앱 비밀번호**를 사용해야 합니다.  
> SendGrid 등 다른 SMTP 서비스도 동일한 방식으로 연결 가능합니다.

---

### Mobile (React Native 0.72 + Expo 49)

| 화면 | 상태 |
|------|------|
| Login / SignUp | ✅ |
| Gallery | ✅ |
| Explore | ⚠️ 목 데이터 |
| List | ✅ |
| PhotoDetail | ✅ |
| PhotoForm | ✅ (보정 패널 일부) |
| Profile | ⚠️ 기본 |
| Series | ❌ 미구현 |

---

## Phase 별 로드맵

### ✅ Phase 1 — MVP 완성 (완료: 2026-06-11)

| 기능 | 상태 | 비고 |
|------|------|------|
| 공개 포트폴리오 `/portfolio/:profileName` | ✅ | 로그인 불필요, 다크 테마 |
| 좋아요/저장 버튼 API 실제 연결 | ✅ | PhotoDetailPage |
| 카카오 OAuth Frontend | ✅ | 로그인 버튼 + KakaoCallbackPage |
| 이미지 비율 선택 UI | ✅ | 16:9/4:3/1:1/3:4/2:3 |

### ✅ Phase 2-1 — 시리즈/컬렉션 (완료: 2026-06-11)

| 기능 | 상태 | 비고 |
|------|------|------|
| Series 엔티티 + SeriesPhoto 조인 테이블 | ✅ | |
| SeriesController CRUD API | ✅ | `/api/series` |
| 사진 추가/제거 API | ✅ | `/api/series/:id/photos` |
| SeriesPage (관리 UI) | ✅ | 생성/수정/삭제/사진 피커 |
| 포트폴리오 시리즈 탭 | ✅ | PortfolioPage 탭 분기 |
| 포트폴리오 API에 series 포함 | ✅ | PortfolioController 업데이트 |

### ⬜ Phase 2-2 — 워터마크 / 저작권 보호

- 이미지 다운로드 시 워터마크 자동 삽입 (서버 사이드 Java ImageIO)
- 우클릭 / 드래그 방지 옵션 (Frontend CSS/JS)
- Supabase Signed URL (만료 시간 설정)

### ⬜ Phase 2-3 — 문의 / 고객 연락 폼

포트폴리오 페이지에서 잠재 고객이 작가에게 연락하는 기능.

```
필드: 이름, 이메일, 촬영 종류, 날짜, 예산, 메시지
```

- 이메일 발송 (Spring Mail + Gmail SMTP 또는 SendGrid)
- 작가 대시보드에서 수신함 관리

### ⬜ Phase 2-4 — 통계 대시보드

| 지표 | 설명 |
|------|------|
| 조회수 | 페이지별 방문자 수 |
| 좋아요 추이 | 최근 30일 그래프 |
| 인기 작품 | 가장 많이 본 / 좋아요 받은 사진 |
| 방문자 출처 | 직접 접속 / SNS / 검색 |

### ⬜ Phase 2-5 — 사진 순서 드래그 정렬

- Photo/Series에 `displayOrder` 필드 활용
- 드래그&드롭 재정렬 (HTML5 DnD 또는 라이브러리 없이 구현)

---

## ✅ Phase 2-6 — 갤러리 정렬 강화 (완료)

> 완료일: 2026-06-11

### 구현 내용

| 파일 | 변경 내용 |
|------|-----------|
| `Photo.java` | `savesCount` 필드 추가 (nullable=false, @PrePersist 초기값 0) |
| `PhotoResponse.java` | `savesCount` 응답 필드 추가 |
| `PhotoRepository.java` | `search()` 메서드: `imageRatio` 파라미터 + `Sort sort` 동적 정렬 추가, 하드코딩 ORDER BY 제거 |
| `PhotoController.java` | `GET /photos?sortBy=&order=&imageRatio=` 파라미터 처리, Sort 화이트리스트 검증, save/unsave에서 savesCount 증감 |
| `api.js` | `photoApi.search()` + `getAll()` + `getByMember()` 에 sortBy/order/imageRatio 파라미터 추가 |
| `GalleryPage.jsx` | 6가지 정렬 칩(최신/오래된/좋아요/저장/색상/표시순서) + 그리드/리스트 뷰 토글 |
| `ExplorePage.jsx` | 정렬 드롭다운 + 이미지 비율 필터 칩 추가 |

### API

```
GET /api/photos?keyword=&colorMood=&imageRatio=&sortBy=createdAt&order=desc&memberId=
```

`sortBy` 허용값: `createdAt` · `likesCount` · `savesCount` · `sharesCount` · `displayOrder` · `title`

### 운영 DB 마이그레이션 (신규 배포 시)

```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;
```

---

## ✅ Phase 2-7 — 검색 엔진 고도화 (완료)

> 완료일: 2026-06-11  
> 목표: Elasticsearch 없이 빠르고 정확한 한국어 검색 구현

### 현재 상태
```sql
-- 현재 JPQL LIKE 검색 (PhotoRepository.search)
LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
```
**한계**: 부분 일치만 가능, 오타 허용 불가, 성능 인덱스 없음

### 검색 엔진 선택 비교

| 방식 | 설명 | 적합성 |
|------|------|--------|
| **PostgreSQL FTS + pg_trgm** | DB 내장, 별도 서버 불필요, Supabase 지원 | ⭐ **최우선 권장** |
| Hibernate Search + Lucene | Spring Boot 임베디드, JPA 엔티티 자동 인덱싱 | ✅ 차선 |
| MeiliSearch | 가볍고 빠른 전용 검색 서버, 오타 허용 | 🔧 별도 서버 필요 |
| Typesense | MeiliSearch 대안, 자체 호스팅 가능 | 🔧 별도 서버 필요 |
| Algolia | 클라우드 서비스, 무료 플랜 10K 레코드 | 💳 유료 확장 |
| Elasticsearch | 강력하지만 메모리 사용량 많음, 오버스펙 | ❌ 현 규모 불필요 |

### 권장 방식: PostgreSQL FTS + pg_trgm

**선택 이유:**
- Supabase PostgreSQL에서 `pg_trgm` 확장 기본 제공
- 추가 인프라·비용 없음 (현재 DB 그대로 사용)
- 한글 포함 유니코드 trigram 지원 → 부분 일치·오타 허용
- `GIN 인덱스` 적용 시 대용량에서도 빠른 검색

#### 적용 방법

**① Supabase에서 확장 활성화 (SQL Editor)**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 검색 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_photos_title_trgm    ON photos USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_photos_desc_trgm     ON photos USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_photos_tags_trgm     ON photos USING GIN (tags_text gin_trgm_ops);
```

**② 유사도 기반 검색 쿼리 (Native Query)**
```sql
SELECT *, GREATEST(
  similarity(title, :keyword),
  similarity(COALESCE(description,''), :keyword)
) AS score
FROM photos
WHERE (
  title % :keyword OR
  description % :keyword OR
  title ILIKE '%' || :keyword || '%'
)
AND (:colorMood = '' OR color_mood = :colorMood)
ORDER BY score DESC, created_at DESC
```

**③ Spring Boot 적용 포인트**
```java
// PhotoRepository.java — Native Query 추가
@Query(value = """
    SELECT *, GREATEST(
      similarity(title, :kw),
      similarity(COALESCE(description,''), :kw)
    ) AS score
    FROM photos
    WHERE (title % :kw OR description % :kw OR title ILIKE '%' || :kw || '%')
      AND (:mood = '' OR color_mood = :mood)
    ORDER BY score DESC, created_at DESC
    """, nativeQuery = true)
List<Photo> searchFuzzy(@Param("kw") String keyword, @Param("mood") String mood);
```

### 추가 구현 기능

**① 자동완성 (Autocomplete)**
```
GET /api/photos/suggestions?q=풍경
→ ["풍경 사진", "풍경 여행", "겨울 풍경"]
```
- `photos.title` 에서 앞글자 LIKE 매칭 (`title ILIKE :q || '%'`)
- 최대 5건, debounce 300ms

**② 태그 검색 강화**
```
GET /api/photos?tags=여행,풍경
```
- `photo_tags` 테이블의 태그 값으로 IN 검색
- Frontend: 태그 칩 클릭 → 해당 태그 검색 자동 실행

**③ 검색 결과 하이라이팅**
- 제목·설명에서 검색어 위치를 `<mark>` 스타일로 강조
- Frontend에서 `keyword` 기준 문자열 split+highlight 처리

**④ 검색 히스토리 (로컬)**
- `localStorage`에 최근 5개 검색어 저장
- 검색창 포커스 시 드롭다운으로 표시

### 구현 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `PhotoRepository.java` | `searchFuzzy()` native query (pg_trgm) + `findTitleSuggestions()` JPQL 추가 |
| `PhotoController.java` | `GET /photos/suggestions` 자동완성 엔드포인트 + getAllPhotos에서 fuzzy/LIKE 자동 fallback |
| `api.js` | `photoApi.getSuggestions(q)` 추가 |
| `ExplorePage.jsx` | 자동완성 드롭다운(debounce 300ms), 검색 히스토리(localStorage, 최근 5개), 결과 하이라이팅, 이미지 비율 필터 |

### fallback 전략

키워드 검색 시:
1. `searchFuzzy()` (pg_trgm native query) 시도 → 유사도 기반 정렬
2. `DataAccessException` 발생 시 (H2 dev / pg_trgm 미설치) → JPQL LIKE 검색으로 자동 fallback

### 운영 DB 설정 (Supabase SQL Editor)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_photos_title_trgm ON photos USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_photos_desc_trgm  ON photos USING GIN (description gin_trgm_ops);
```

---

## 📋 Phase 2-8 — 마이페이지 / 프로필 관리 강화 (기획)

> 목표: 작가가 자신의 계정을 완전히 관리할 수 있는 SNS 스타일 마이페이지

### 현재 상태 (`ProfilePage.jsx`)
- 이름, 전화번호, 포트폴리오 주소, 인스타그램 ID 편집만 가능
- 아바타: 이름 첫 글자 텍스트 (이미지 업로드 불가)
- 통계: 사진수·좋아요·저장 3가지
- 내 사진: 최대 9개 썸네일만 표시
- 저장한 사진: 없음
- 비밀번호 변경: 없음

### 추가할 섹션 / 기능

#### ① 프로필 사진(아바타) 업로드
```
- 클릭 → 파일 선택 → Supabase Storage 업로드 → member.avatarUrl 저장
- 원형 크롭 미리보기 (canvas)
- 업로드 경로: /api/upload/image?folder=avatars
- 권장 사이즈: 400×400px
```

#### ② 프로필 정보 확장

| 필드 | 현재 | 추가 |
|------|------|------|
| 이름 | ✅ | — |
| 전화번호 | ✅ | — |
| 포트폴리오 주소 | ✅ | — |
| 인스타그램 | ✅ | — |
| 자기소개 (Bio) | ❌ | 최대 200자, textarea |
| 웹사이트 URL | ❌ | URL 유효성 검증 |
| 위치 (도시) | ❌ | 선택적 텍스트 입력 |
| 촬영 전문 분야 | ❌ | 체크박스 다중 선택 (결혼식·인물·풍경 등) |
| 커버 이미지 | ❌ | 헤더 배경 이미지 업로드 |

**백엔드 DB 변경 필요 (운영 마이그레이션 SQL):**
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url     VARCHAR(500);
ALTER TABLE members ADD COLUMN IF NOT EXISTS bio            TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS website_url    VARCHAR(300);
ALTER TABLE members ADD COLUMN IF NOT EXISTS location       VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS specialties    VARCHAR(300);
ALTER TABLE members ADD COLUMN IF NOT EXISTS cover_url      VARCHAR(500);
```

#### ③ 비밀번호 변경 섹션
```
현재 비밀번호 확인 → 새 비밀번호 → 새 비밀번호 확인
POST /api/auth/member/:id/password
```
- 카카오 OAuth 로그인 유저는 해당 섹션 숨김 (`user.provider === 'kakao'`)

#### ④ 탭 구조 전환

```
[내 작품] [저장함] [시리즈] [설정]
```

| 탭 | 현재 | 변경 |
|----|------|------|
| 내 작품 | 9개 썸네일 고정 | 페이지네이션, 정렬, 그리드/리스트 뷰 |
| 저장함 | ❌ 없음 | photoApi.getSaved(userId) 연결 |
| 시리즈 | ❌ 없음 | seriesApi.getByMember(userId) 연결 |
| 설정 | 편집 폼만 | 아래 설정 항목 분리 |

#### ⑤ 설정 탭

| 항목 | 설명 |
|------|------|
| 포트폴리오 공개 여부 | 공개 / 비공개 토글 (`member.isPublic`) |
| 이메일 알림 | 새 문의 알림 수신 여부 |
| 비밀번호 변경 | 현재 비밀번호 확인 후 변경 |
| 계정 연결 | 카카오 연결 상태 표시 |
| 계정 삭제 | 2단계 확인(이메일 재입력) 후 탈퇴 |

#### ⑥ 통계 강화

| 지표 | 데이터 소스 |
|------|------------|
| 전체 사진 수 | `photos COUNT` |
| 전체 좋아요 | `SUM(likes_count)` |
| 전체 저장 | `SUM(saves_count)` |
| 전체 공유 | `SUM(shares_count)` |
| 받은 문의 | `inquiries COUNT WHERE receiver_member_id = :id` |
| 미읽음 문의 | `inquiries COUNT WHERE is_read = false` |

**백엔드 신규 API:**
```
GET /api/auth/member/:id/stats
→ { photoCount, totalLikes, totalSaves, totalShares, inquiryCount, unreadInquiryCount }
```

### 구현 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `ProfilePage.jsx` | 전체 리팩토링 — 탭 구조, 아바타 업로드, 저장함, 통계 강화 |
| `MemberController.java` | `GET /:id/stats`, `PUT /:id/password`, `PUT /:id/profile` 필드 확장 |
| `MemberService.java` | 비밀번호 변경 로직 (`BCrypt` 현재→새 비밀번호 검증) |
| `MemberUpdateRequest.java` | `bio`, `websiteUrl`, `location`, `specialties`, `coverUrl` 추가 |
| `MemberResponse.java` | 신규 필드 포함 |
| Supabase SQL | members 테이블 컬럼 추가 마이그레이션 |

---

### ⬜ Phase 3 — 성장 기능 (향후)

| 기능 | 설명 |
|------|------|
| 팔로우 / 팔로워 | `follows` 테이블, 피드 기능 |
| 댓글 | `comments` 테이블, 대댓글 1단계 |
| EXIF 데이터 표시 | 카메라/렌즈/조리개/셔터/ISO |
| AI 자동 태그 | 업로드 시 주제/장소 자동 분류 |
| 인쇄/굿즈 주문 | 파트너 API 연동 |

---

## 기술 개선 사항

### 즉시 필요

| 항목 | 현재 | 개선안 |
|------|------|--------|
| 페이지네이션 | 전체 로드 | Cursor-based pagination |
| 이미지 지연 로딩 | 없음 | `loading="lazy"` + Intersection Observer |
| SEO | SPA (크롤러 불가) | OG 메타태그 + SSR 검토 |
| Token 저장 | sessionStorage | HttpOnly Cookie (보안 강화) |

### 보안

| 항목 | 현재 | 개선안 |
|------|------|--------|
| 업로드 크기 | 20MB | 환경별 제한 통일 |
| Signed URL | 없음 | Private 사진용 Signed URL |
| Admin API | 권한 체크만 | Admin Controller 구현 |

---

## 수정된 버그 이력

| 버그 | 수정 내용 | 날짜 |
|------|-----------|------|
| 비밀번호 검증 불일치 | Frontend 6자 → 8자 (Backend와 통일) | 2026-06-11 |
| PhotoDetail 비효율 API | `getAll()` + 클라이언트 필터 → `getOne(id)` | 2026-06-11 |
| `likeCount` 필드명 오류 | `photo.likeCount` → `photo.likesCount` | 2026-06-11 |
| Photo 삭제 고아 레코드 | 삭제 전 like/save/share/tag cascade 삭제 | 2026-06-11 |
| ExplorePage Mock 데이터 | 실제 API 연동 + 무드 필터 칩 추가 | 2026-06-11 |
| PhotoController `@CrossOrigin("*")` | 제거 (WebConfig CORS로 통일) | 2026-06-11 |
| PhotoDetailPage ternary 오류 | 모바일/데스크탑 레이아웃 분기 복구 | 2026-06-11 |
| PhotoRequest colorMood 누락 | DTO에 필드 추가 (빌드 오류 수정) | 2026-06-11 |
| application.yml 중복 spring 블록 | 단일 블록으로 병합, InquiryEmailService mailHost 가드 추가 | 2026-06-11 |
| Docker 빌드 Java 25 충돌 | Dockerfile.prod (pre-built JAR 방식) | 2026-06-11 |
