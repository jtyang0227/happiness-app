# PLAN — Google API 연동
> Feature 36 | 2026-06-30 | PM: Claude

## 개요
Happiness 앱에 Google API 3종을 연동하여 약속 관리 UX와 사진 AI 분석 품질을 개선한다.

## 사용자 문제
- **약속(Meet)**: 확정된 약속 일정을 수동으로 캘린더에 옮겨야 하는 불편함
- **장소**: 카카오맵 키 없는 환경에서 지도 없이 텍스트만 입력 가능
- **자동 태깅**: 현재 키워드 추출 방식은 정확도가 낮아 태그 품질이 떨어짐

## 유저 스토리
- As a **사진작가**, I want to **확정된 약속을 구글 캘린더에 한 번에 추가하고 싶다**, so that **별도 일정 관리 없이 일정이 자동으로 캘린더에 반영된다**.
- As a **모델**, I want to **구글맵으로 약속 장소를 확인하고 싶다**, so that **카카오맵 앱이 없어도 익숙한 지도로 위치를 파악할 수 있다**.
- As a **사진작가**, I want to **업로드한 사진에 AI가 정확한 태그를 자동으로 붙여주길 바란다**, so that **탐색·검색에서 내 사진이 잘 발견된다**.

## 수용 기준 (Acceptance Criteria)
- [ ] AC1: CONFIRMED 약속에 "구글 캘린더에 추가" 버튼이 표시되고 클릭 시 구글 캘린더 새 창이 열린다
- [ ] AC2: 장소 readOnly 뷰에 "구글맵에서 보기" 링크가 카카오맵과 함께 표시된다
- [ ] AC3: 카카오 키 없을 때 구글맵 Embed 또는 텍스트 입력으로 폴백된다
- [ ] AC4: `REACT_APP_GOOGLE_MAPS_KEY` 있을 때 구글맵 Places 검색이 동작한다
- [ ] AC5: Google Vision API 키가 설정된 경우 사진 자동 태깅 시 Vision API의 label을 활용한다
- [ ] AC6: Vision API 키 없을 때 기존 키워드 추출 방식으로 fallback된다

## 기능 범위

### In Scope (이번 구현)
1. **Google Calendar 딥링크** — MeetDetailPage CONFIRMED 섹션에 버튼 추가 (API 키 불필요)
2. **Google Maps 링크** — MeetLocationPicker readOnly에 구글맵 링크 추가 (API 키 불필요)
3. **Google Maps Embed 폴백** — 카카오 키 없을 때 `REACT_APP_GOOGLE_MAPS_KEY`로 Maps Embed
4. **Google Vision API 백엔드** — AutoTagService에 Vision REST API 호출 추가, 키 없으면 기존 방식 fallback

### Out of Scope (다음 버전)
- Google Drive 사진 가져오기
- Google Photos 연동
- Google Analytics SDK 직접 연동 (현재 자체 analytics 모듈 사용 중)

## 기술 트레이드오프

| 항목 | 옵션 A | 옵션 B | 결정 |
|-----|--------|--------|------|
| Calendar | 딥링크 URL | Google Calendar API OAuth | A ✅ (OAuth 불필요, 즉시 사용) |
| Maps | Google Maps JS SDK | Embed + 링크 | Embed ✅ (키 없어도 링크 fallback 가능) |
| Vision | REST API (키 기반) | Google Cloud SDK | REST ✅ (의존성 최소화) |

## API 엔드포인트
- 기존 `POST /api/photos/:id/auto-tags` — Vision API 결과 통합 (변경 없음)
- 기존 `GET /api/meets/:id` — 변경 없음 (프론트 버튼만 추가)

## 환경변수 추가
```
# frontend/.env.development / .env.production
REACT_APP_GOOGLE_MAPS_KEY=YOUR_MAPS_KEY   # 선택, 없으면 텍스트 모드

# backend application.yml
google:
  vision:
    api-key: ${GOOGLE_VISION_API_KEY:}     # 선택, 없으면 기존 방식 fallback
```

## 우선순위
- **P0:** Google Calendar 딥링크 (API 키 불필요, 즉시 가치)
- **P0:** Google Maps 링크 (API 키 불필요, 즉시 가치)
- **P1:** Google Maps Embed 폴백 (키 있을 때)
- **P1:** Google Vision 자동 태깅 강화

## 성공 지표
- CONFIRMED 약속에서 캘린더 버튼 클릭률
- 자동 태그 정확도 향상 (Vision API 태그 vs 키워드 추출 태그)

## 관련 파일
- `frontend/src/pages/MeetDetailPage.jsx` — Google Calendar 버튼
- `frontend/src/components/meet/MeetLocationPicker.jsx` — Google Maps 연동
- `backend/src/main/java/com/happiness/app/photo/service/AutoTagService.java` — Vision API
- `frontend/.env.development`, `frontend/.env.production` — 환경변수
- `backend/src/main/resources/application.yml` — Vision API 키
