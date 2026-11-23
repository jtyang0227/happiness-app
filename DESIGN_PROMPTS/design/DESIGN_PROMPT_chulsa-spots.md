# DESIGN PROMPT — 출사 스팟 & 출사 모임 강화

근거: `DESIGN_PROMPTS/planning/ANALYSIS_chulsa-app-public-features.md` (출사 앱 공개 기능 대조, 실화면 검증 전)

---

## 1. Claude Code 구현 프롬프트 (그대로 붙여 넣기)

### 1-1. P0 — 출사 스팟 (백엔드 + 웹)
```
기획 문서 DESIGN_PROMPTS/planning/ANALYSIS_chulsa-app-public-features.md 의 P0 "출사 스팟"을 구현해줘.

[백엔드 — backend/src/main/java/com/happiness/app/spot/]
- Spot 엔티티(spots): id, name(50), lat, lng(DOUBLE), address(200), region(30, "서울 성동구" 수준),
  bestTime(30, 예 "일몰 30분 전"), tips(TEXT, 1000자, HTML 태그 제거), createdBy, createdAt, updatedAt.
  인덱스: (lat, lng), region, created_by.
- PhotoSpot(photo_spots, UNIQUE photo_id): 사진 1장당 스팟 1개. Photo 엔티티는 건드리지 말 것.
- SpotController(/api/spots)
  - GET /api/spots?minLat&maxLat&minLng&maxLng&region&page&size — 공개, 지도 범위 조회, 스팟별 photoCount·대표 사진 3장(배치 조회, N+1 금지)
  - GET /api/spots/{id} — 공개, 사진 목록은 공개 포트폴리오 작가 것만, 작성자 정보 attachMembers
  - GET /api/spots/nearby-duplicate?name&lat&lng — 200m 이내 같은/비슷한 이름 후보(중복 제안)
  - POST /api/spots — 인증, 좌표 범위 검증(아니면 400)
  - PUT/DELETE /api/spots/{id} — 만든 사람 또는 WM/SA만(403), 삭제 시 photo_spots 정리
  - PUT /api/photos/{photoId}/spot {spotId|null} — 사진 주인만
- SecurityConfig: GET /api/spots/** permitAll (nearby-duplicate 포함).
- 회원 탈퇴·사진 삭제 cascade에 photo_spots 정리 추가.
- CLAUDE.md "운영 DB 수동 마이그레이션"에 CREATE TABLE IF NOT EXISTS 기록.
- CoreFlowIntegrationTest: 생성·공개 조회·범위 밖 좌표 400·타인 수정 403·중복 후보 반환.

[웹 — frontend/src]
- services/spotApi.js
- 둘러보기(/explore)에 세 번째 탭 "스팟"(?tab=spots): 상단 지역 입력 + 지도/목록 토글.
  지도는 components/meet/MeetLocationPicker 의 카카오 SDK 로드 로직을 utils/kakaoMap.js 로 추출해 재사용,
  키가 없으면 목록만. 지도 이동이 끝나면(idle, 디바운스 300ms) 범위 조회.
- pages/SpotDetailPage.jsx (/spots/:id, 공개, lazyPage 등록): 대표 사진 콜라주 → 이름·지역·찍기 좋은 시간·팁 →
  작은 지도 + "길찾기"(카카오맵 링크) → 사진 그리드(PhotoModal 재사용) → "이 스팟으로 모임 만들기"(P1).
- 이미지 에디터 내보내기/사진 수정에 "출사 스팟(선택)" 선택기: 검색 → 없으면 지도에서 찍어 새로 만들기,
  저장 직전 nearby-duplicate 결과가 있으면 "혹시 이 스팟인가요?" 제안.
- EXIF GPS는 읽지도 보내지도 않는다(개인정보).

[검증] ./gradlew clean build -x test, ./gradlew test(통과 개수 보고), CI=true npm run build,
Playwright로 390/1280px 스팟 탭·상세 캡처, 가로 넘침 0건. 끝나면 CLAUDE.md·PROJECT_MEMORY.md 갱신 후 커밋·push.
```

### 1-2. P1 — 출사 모임 강화
```
ANALYSIS_chulsa-app-public-features.md 의 P1을 구현해줘(P0 스팟이 먼저 있어야 함).
- Gathering에 nullable 컬럼 추가: spotId, beginnerFriendly(Boolean), portraitConsentRule(Boolean).
  모임 상세에 스팟 카드(지도 썸네일 + 상세 링크), "초보 환영" 배지, 인물 촬영 동의 안내 고정 문구.
- 장소 투표: GatheringPlacePoll(gathering_id, spot_id 또는 장소명, 최대 5개) + GatheringPlaceVote
  (UNIQUE poll_option+member). 투표는 PARTICIPATING·WAITING 참여자만, 모집 마감 시 최다 득표를 location에 반영
  (동점은 먼저 등록된 후보), 결과 알림은 기존 GatheringNotification 재사용(type PLACE_DECIDED).
- 모임 게시물에 wantsFeedback(Boolean) — 피드에서 "피드백 원해요" 칩, 필터.
- 웹 GatheringFormPage·DetailPage, 모바일 GatheringDetailScreen(투표·배지 표시만).
- 통합 테스트: 비참여자 투표 403, 중복 투표 멱등, 마감 시 반영.
```

---

## 2. Claude.ai 아티팩트 디자인 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'
  darkBg:        '#111417'
  darkSurface:   '#1A1E22'
  galleryBg:     '#111417'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용

[요청] "출사 스팟" 화면 2개를 한 컴포넌트 안에서 탭으로 전환되게 만들어줘. 목업 데이터 사용.

1) 스팟 탐색 (둘러보기 > 스팟 탭)
- 상단: 지역 검색 입력(📍 아이콘, pill) + 오른쪽 "지도 | 목록" 세그먼트
- 지도 모드: 지도 자리(회색 #E5E8EB 사각형 + 격자선)에 핀 8개(흰 원 + 사진 썸네일 28px, 선택 시 파란 테두리 2px),
  하단에 선택한 스팟 카드 시트(썸네일 3장, 이름, 지역, "사진 24장", "일몰 30분 전" 칩, "자세히 →")
- 목록 모드: 카드 그리드(모바일 1열·태블릿 2열·데스크탑 3열), 카드 = 2px 간격 콜라주(왼쪽 큰 1장 + 오른쪽 2장) +
  이름 + 지역 · 사진 수 + 찍기 좋은 시간 칩
- "📍 내 주변" 버튼(누를 때만 위치 요청한다는 안내 툴팁)
- 로딩 스켈레톤, 빈 상태("이 지역엔 아직 스팟이 없어요 · 첫 스팟을 남겨 보세요")

2) 스팟 상세
- 상단 콜라주(3~5장), 이름(22px bold), 지역, 칩: "🌅 일몰 30분 전", "📷 사진 24장"
- 팁 카드(흰 카드, 본문 15px, 줄바꿈 유지)
- 작은 지도 + "카카오맵 길찾기" 보조 버튼
- 사진 3열 그리드(호버 시 제목·작가)
- 하단 고정 CTA: "이 스팟으로 출사 모임 만들기"(primary, 48px)
- 모든 버튼 hover/focus-visible/active 상태 정의, 터치 영역 44px 이상, 대비 WCAG AA
```

---

## 3. 체크리스트 (2026-11-23 구현·확인 완료)
- [x] 스팟 없는 기존 사진·모임이 그대로 동작
- [x] EXIF GPS 미수집, 위치 권한은 버튼 클릭 시 1회
- [x] 지도 키 없을 때 목록 fallback
- [x] 응답 래퍼 `ApiResponse` → 프론트 `res.data.data`
- [x] IDOR(남의 스팟·사진 연결) 403, 4xx는 `ResponseStatusException`
