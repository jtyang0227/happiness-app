# 사진작가 포트폴리오 앱 — 기능 분석 및 로드맵

> 분석일: 2026-06-11  
> 현재 완성도: Backend 82% / Frontend 72% / Mobile 20%

---

## 현재 구현 현황

### ✅ 구현 완료

| 기능 | Backend | Frontend | Mobile |
|------|---------|----------|--------|
| 회원가입 / 로그인 | ✅ | ✅ | ✅ |
| JWT 토큰 관리 (Access + Refresh) | ✅ | ✅ | ✅ |
| Kakao OAuth | ✅ | ❌ | ❌ |
| 프로필 조회 / 수정 | ✅ | ✅ | ⚠️ |
| 사진 업로드 (파일 / URL) | ✅ | ✅ | ⚠️ |
| 이미지 자동 리사이징 (1080px + 썸네일) | ✅ | — | — |
| 색체학 무드 분석 (11가지) | ✅ | ✅ | ❌ |
| 좋아요 / 저장 / 공유 | ✅ | ⚠️ UI만 | ❌ |
| 사진 갤러리 (마소너리) | — | ✅ | ❌ |
| 사진 목록 (테이블) | — | ✅ | ❌ |
| 사진 상세 조회 | ✅ | ✅ | ❌ |
| 사진 수정 / 삭제 | ✅ | ✅ | ❌ |
| 이미지 고급 보정 (Canvas LUT) | — | ✅ | ❌ |
| 키워드 / 무드 검색 | ✅ | ✅ | ❌ |
| Rate Limiting (100req/60s) | ✅ | — | — |
| 보안 감시 로그 | ✅ | — | — |

### ⚠️ 이번 패치로 수정된 버그

| 버그 | 수정 내용 |
|------|-----------|
| 비밀번호 검증 불일치 | Frontend 6자 → 8자 (Backend와 통일) |
| PhotoDetail 비효율 API | `getAll()` + 클라이언트 필터 → `getOne(id)` 직접 호출 |
| `likeCount` 필드명 오류 | `photo.likeCount` → `photo.likesCount` |
| Photo 삭제 시 고아 레코드 | 삭제 전 like/save/share/tag 연관 레코드 cascade 삭제 |
| ExplorePage Mock 데이터 | 실제 API 연동 + 무드 필터 칩 추가 |
| PhotoController `@CrossOrigin("*")` | 제거 (WebConfig CORS로 통일) |
| PhotoRepository 쿼리 부재 | `search()`, `findByMemberId()`, `findByColorMood()` 추가 |
| `deleteByPhotoId` 누락 | 4개 Repository에 cascade delete 메서드 추가 |

---

## 사진작가 포트폴리오 앱에 필요한 핵심 기능 분석

### Phase 1 — MVP 완성 (즉시 필요)

#### 1-1. 포트폴리오 공개 페이지
사진작가의 작품을 외부인이 URL로 바로 볼 수 있는 **공개 포트폴리오 페이지**가 핵심입니다.

```
/portfolio/:profileName        ← 작가의 전체 포트폴리오
/portfolio/:profileName/:photoId  ← 개별 작품 상세
```

- 로그인 없이 접근 가능
- 커스텀 도메인 또는 서브패스로 공유 가능
- OG 메타태그 (`og:image`, `og:title`) 자동 생성 → SNS 공유 미리보기

**현재 상태**: 없음. `/photo/:id`는 로그인 필요.

#### 1-2. 좋아요 / 저장 버튼 실제 API 연결
PhotoDetailPage의 좋아요 버튼이 로컬 상태만 토글하고 API 호출 없음.

**필요한 작업**:
- `photoApi.likePhoto(id, memberId)` / `unlikePhoto()` 호출 추가
- 로그인하지 않은 유저가 좋아요 시 → 로그인 유도

#### 1-3. Kakao OAuth Frontend 연결
Backend에 `POST /api/auth/oauth/kakao` 완성되어 있으나 Frontend에 버튼 없음.

**필요한 작업**:
- 로그인 페이지에 "카카오로 계속하기" 버튼 추가
- Kakao SDK 또는 인가 코드 방식 구현

#### 1-4. 이미지 비율 선택 UI
업로드 시 `imageRatio` 선택 불가 (기본 1:1 고정).
Backend는 `1:1`, `4:3`, `16:9`, `3:4` 지원.

---

### Phase 2 — 포트폴리오 완성도 향상 (1–2주)

#### 2-1. 시리즈 / 컬렉션 기능
여러 사진을 하나의 프로젝트로 묶는 기능.

```
Series: "도시의 빛 2024"
  └─ Photo 1: 남산타워
  └─ Photo 2: 한강야경
  └─ Photo 3: 을지로 골목
```

- 클라이언트에게 특정 시리즈만 공유 가능
- 커버 이미지 + 시리즈 설명 포함

**필요한 DB**: `series` 테이블, `series_photos` 조인 테이블

#### 2-2. 워터마크 / 저작권 보호
무단 복제를 방지하는 기능.

- 이미지 다운로드 시 워터마크 자동 삽입 (서버 사이드)
- 우클릭 / 드래그 방지 옵션
- 이미지 URL에 만료 시간이 있는 Signed URL 사용 (Supabase 지원)

#### 2-3. 문의 / 고객 연락 폼
포트폴리오 페이지에서 잠재 고객이 작가에게 연락할 수 있는 기능.

```
필드: 이름, 이메일, 촬영 종류, 날짜, 예산, 메시지
```

- 이메일 발송 (Spring Mail / SendGrid)
- 작가 대시보드에서 수신함 관리

#### 2-4. 통계 대시보드
작가 전용 Analytics.

| 지표 | 설명 |
|------|------|
| 조회수 | 페이지별 방문자 수 |
| 좋아요 추이 | 최근 30일 그래프 |
| 인기 작품 | 가장 많이 본 / 좋아요 받은 사진 |
| 방문자 출처 | 직접 접속 / SNS / 검색 |

#### 2-5. 사진 순서 / 드래그 정렬
포트폴리오 갤러리에서 사진 순서를 작가가 직접 조정.

- DB에 `displayOrder` 필드 추가
- 드래그&드롭 재정렬 (dnd-kit 또는 react-beautiful-dnd)

---

### Phase 3 — 성장 기능 (향후)

#### 3-1. 팔로우 / 팔로워
사진 커뮤니티 기능.

```
팔로우 → 팔로잉 작가 최신 업로드 피드
```

- `follows` 테이블 (`follower_id`, `following_id`)
- 알림: "A님이 팔로우했습니다"

#### 3-2. 댓글
사진에 피드백 / 감상 댓글.

- `comments` 테이블
- 대댓글 1단계 (parent_id)
- 작가만 댓글 삭제 가능

#### 3-3. 인쇄 / 굿즈 주문 연동
작품을 실물 인쇄로 판매.

- 파트너 API 연동 (예: Photobook Korea, Minted)
- 작가 수익 정산 대시보드

#### 3-4. AI 자동 태그 / 설명 생성
업로드 시 AI가 메타데이터 자동 생성.

- 촬영 장소 인식 (랜드마크 인식)
- 주제 자동 태그 (인물, 풍경, 건축 등)
- 촬영 조건 추출 (EXIF: 조리개, 셔터, ISO)

#### 3-5. EXIF 데이터 표시
사진의 촬영 정보 표시.

```
카메라: Sony A7IV
렌즈: 24-70mm f/2.8
셔터: 1/250s  조리개: f/5.6  ISO: 400
촬영일: 2024-03-15
```

- `exif` 테이블 또는 Photo 엔티티 확장
- 상세 페이지에 접을 수 있는 메타데이터 섹션

---

## 기술 개선 사항

### 즉시 필요

| 항목 | 현재 | 개선안 |
|------|------|--------|
| Token 저장 | localStorage (위험) | HttpOnly Cookie |
| 이미지 저장소 | 로컬 파일시스템 | Supabase Storage (이미 코드 있음) |
| 페이지네이션 | 전체 로드 | Cursor-based pagination |
| 이미지 지연 로딩 | 없음 | `loading="lazy"` + Intersection Observer |
| SEO | SPA (크롤러 불가) | Next.js 전환 또는 OG 태그 최소화 |

### 보안

| 항목 | 현재 | 개선안 |
|------|------|--------|
| 업로드 파일 크기 | multipart 20MB, Supabase 20MB | 통일 (20MB) |
| Signed URL | 없음 (Public URL 항상 공개) | Signed URL for private photos |
| Admin API | 권한 체크만, 엔드포인트 없음 | Admin Controller 구현 |

---

## 우선순위 로드맵

```
즉시 (이번 주)
  ├─ 공개 포트폴리오 페이지 (/portfolio/:profileName)
  ├─ 좋아요 버튼 API 실제 연결
  └─ Kakao OAuth Frontend 버튼 추가

단기 (2주)
  ├─ 이미지 비율 선택 UI
  ├─ 이미지 저장소 → Supabase Storage 전환
  ├─ 페이지네이션 (무한 스크롤)
  └─ 시리즈 / 컬렉션 기능

중기 (1개월)
  ├─ 문의 폼 + 이메일 발송
  ├─ 통계 대시보드
  ├─ EXIF 데이터 표시
  └─ 사진 순서 드래그 정렬

장기 (3개월)
  ├─ 팔로우 / 피드
  ├─ 댓글
  ├─ AI 자동 태그
  └─ 인쇄 주문 연동
```

---

## API 엔드포인트 전체 목록 (현재 구현)

### 인증 (`/api/auth`)
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

### 사진 (`/api/photos`)
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
| GET | `/:id/shares` | 공유 통계 | ✅ |
| POST | `/:id/tags` | 사용자 태그 | ✅ |
| GET | `/:id/tags` | 태그 목록 | — |
| DELETE | `/:id/tags/:tagId` | 태그 삭제 | ✅ |

### 스토리지 (`/api/upload`)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/image?folder=photos` | Supabase 이미지 업로드 | ✅ |
