# Happiness App — 현재 기능 및 방향성 정리

> 작성일: 2026-05-30

---

## 현재 구현된 기능 전체 목록

### Frontend (React 18 SPA)

#### 페이지

| 페이지 | 경로 | 구현 상태 | 주요 기능 |
|--------|------|----------|----------|
| 갤러리 | `/` | ✅ 완성 | 12컬럼 masonry 그리드, 무드별 정렬, 사진 카드 |
| 탐색 | `/explore` | ⚠️ 목 데이터 | 카드 그리드, 실제 API 미연결 |
| 목록 | `/list` | ✅ 완성 | 행 목록, 좋아요/저장/공유 카운트 표시 |
| 사진 등록 | `/photo/new` | ✅ 완성 | 파일/URL 업로드, 12컬럼 그리드 너비 선택, Lightroom 보정 패널 전체 |
| 사진 상세 | `/photo/:id` | ⚠️ 기본 | 메타정보, 보정값 요약 없음 |
| 프로필 | `/profile` | ⚠️ 기본 | 기본 정보 표시, SNS 스타일 아님 |
| 로그인 | `/login` | ✅ 완성 | 다크 테마, JWT 로그인 |
| 회원가입 | `/signup` | ✅ 완성 | 이용약관 동의 포함 |

#### 핵심 컴포넌트

| 컴포넌트 | 위치 | 상태 |
|---------|------|------|
| ImageAdjustmentPanel | `components/photo/` | ✅ 완성 — 노출/대비/밝은영역/어두운영역/흰색/검정 슬라이더 |
| CurveEditor | `components/photo/` | ✅ 완성 — Lightroom 스타일 채널별(RGB/R/G/B) 톤 커브 |
| PresetManager | `components/photo/` | ✅ 완성 — 최대 5개, 저장/불러오기/삭제/이름수정 |
| ImageUploader | `components/common/` | ✅ 완성 — 드래그&드롭, 진행률, 미리보기 |
| Header | `components/layout/` | ⚠️ 모바일 미대응 — 데스크톱 전용 |
| PhotoCard | `components/photo/` | ✅ 완성 — 색체학 무드 뱃지 |
| Toast | `components/common/` | ⚠️ 기본 — 타입별 스타일/스택 없음 |

#### 보정 엔진 (canvas 기반)
- 노출, 대비, 밝은영역, 어두운영역, 흰색계열, 검정계열
- 채널별 톤 커브 (RGB master + R/G/B 개별) — Catmull-Rom 보간 + LUT 파이프라인
- 효과: 텍스처, 부분대비, 디헤이즈, 비네팅, 그레인(농도/크기/거칠기)
- 히스토그램 실시간 표시 (로그 스케일)
- 보정값 프리셋 localStorage 저장 (최대 5개)

---

### Backend (Spring Boot 3.4.5 + Java 25)

#### API 엔드포인트

| 도메인 | 엔드포인트 | 상태 |
|--------|-----------|------|
| 사진 | GET/POST/PUT/DELETE `/api/photos` | ✅ |
| 사진 | POST `/api/photos/{id}/like` | ✅ |
| 사진 | POST `/api/photos/{id}/save` | ✅ |
| 사진 | POST `/api/photos/{id}/share` | ✅ |
| 사진 | POST/DELETE `/api/photos/{id}/tags` | ✅ |
| 인증 | POST `/api/auth/signup`, `/api/auth/login` | ✅ |
| 인증 | POST `/api/auth/refresh`, `/api/auth/logout` | ✅ |
| 스토리지 | POST `/api/upload/image` | ✅ |
| 헬스 | GET `/actuator/health` | ✅ |

#### 보안 & 인프라
- JWT Access Token (15분) + Refresh Token (7일, Redis 저장)
- Bucket4j IP 기준 Rate Limiting (100req/60s)
- XSS 보호 (Jsoup sanitize)
- Kakao OAuth (구조 있음, 미완성)
- Supabase Storage 연동 (업로드/삭제, UUID 파일명)
- CORS allowedOrigins 명시

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

- expo-secure-store 기반 토큰 저장
- Zustand authStore (access token 메모리, refresh SecureStore)
- expo-image-picker 업로드

---

## 현재 미완성 / 약한 부분

| 항목 | 우선순위 | 이유 |
|------|---------|------|
| 탐색 페이지 실제 API 연결 | 높음 | 목 데이터라 실사용 불가 |
| 모바일 반응형 헤더 + 하단 탭바 | 높음 | 모바일 UX 핵심 |
| 프로필 페이지 리디자인 | 중간 | SNS 앱으로서 정체성 필요 |
| 사진 상세 페이지 개선 | 중간 | 보정값 요약, 작성자 정보 등 |
| Toast 업그레이드 | 중간 | 타입별 색상/아이콘/스택 |
| 빈 화면 온보딩 | 낮음 | 첫 사용자 경험 |
| Kakao OAuth 완성 | 낮음 | 소셜 로그인 편의성 |
| 갤러리 검색/필터 | 낮음 | 사진 많아질 때 필요 |

---

## 방향성 추천

### 단기 (지금 ~ 오픈 직전)

**목표: "쓸 수 있는 앱" 완성**

1. **탐색 페이지 API 연결** — Explore가 목 데이터인 채로 오픈하면 신뢰도 하락
2. **모바일 반응형** — 모바일에서 헤더가 없는 건 치명적. 하단 탭바 추가
3. **LAUNCH.md 기반 배포 실행** — Supabase → Railway → Vercel 순서로 세팅

### 중기 (오픈 후 1~4주)

**목표: "계속 쓰고 싶은 앱" 만들기**

4. **프로필 SNS 스타일 개선** — 사용자가 자신을 표현하는 공간
5. **사진 상세 개선** — 보정값 공유, 작성자 팔로우 유도
6. **Toast + 빈 화면** — 세부 UX 완성도

### 장기 (사용자 생기면)

**목표: 커뮤니티 + 발견 기능**

7. **갤러리 검색/필터** — 무드, 제목, 작성자로 필터
8. **팔로우/피드** — 팔로잉한 사람 사진만 보기
9. **댓글** — 사진에 반응할 수 있는 방법 추가
10. **Kakao OAuth** — 가입 마찰 줄이기

---

## 다음 작업 추천 순서

```
1. ExplorePage 실제 API 연결 (1~2시간)
2. 모바일 반응형 헤더 + BottomNav (2~3시간)
3. 배포 실행 (LAUNCH.md 따라, 1일)
4. 프로필 페이지 리디자인 (2시간)
5. 사진 상세 페이지 개선 (2시간)
```

---

*최종 업데이트: 2026-05-30*
