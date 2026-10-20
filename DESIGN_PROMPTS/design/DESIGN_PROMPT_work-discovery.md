# DESIGN_PROMPT — 작업 탐색 & "예약 받는 중" 배지

> 기획: `DESIGN_PROMPTS/planning/PLANNING_work-discovery.md`
> 구현: `frontend/src/pages/ExplorePage.jsx`(탭), `frontend/src/components/discover/WorkDiscovery.jsx`,
> `frontend/src/components/common/AcceptingBadge.jsx`, `mobile/screens/ExploreScreen.js`

## Claude.ai 아티팩트 요청 프롬프트

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

[요청]
사진작가 앱의 "탐색" 화면에 작업(케이스) 단위로 둘러보는 탭을 만들어줘. 의뢰인이 "이런 촬영을 해본 작가"를 찾는 화면이다.

1. 상단 세그먼트 컨트롤: "사진" | "작업" (회색 트랙 #F2F4F6 위 흰 선택 칩, radius 10, 높이 40, 선택 텍스트 700)
2. 작업 탭 필터 줄:
   - 촬영 유형 칩 가로 스크롤: 전체 · 결혼식 · 제품 촬영 · 인물/프로필 · 풍경/여행 · 행사/이벤트 · 가족 · 기타
     (선택: 배경 text #191F28 + 흰 글자, 비선택: 흰 배경 + 1px border)
   - 오른쪽(모바일은 아래 줄) 지역 입력 "📍 지역 (예: 서울)" — 엔터 또는 입력 멈춘 뒤 0.4초 후 반영, 지우기 ✕ 버튼
3. 결과 수 "작업 24+건" (13px textMuted)
4. 작업 카드 그리드 3열(태블릿 2, 모바일 1), gap 16:
   - 커버 4:3, 오른쪽 위에 사진 수 "12장" 작은 어두운 칩(rgba(0,0,0,0.6) 흰 글자)
   - 본문: 제목 16px/700 2줄 말줄임 → 메타 "결혼식 · 개인 의뢰 · 2026.05" 12px textMuted
   - 하단 구분선 위에 작가 줄: 아바타 24px(없으면 이니셜 원, primary 배경) + 이름 13px/600 + 위치 12px textMuted
     + 오른쪽 "예약 받는 중" 배지(조건부)
   - hover: translateY(-2px) + 중립 그림자, focus-visible 2px primary 아웃라인
5. "작업 더 보기" secondary 버튼 (다음 페이지 있을 때), 실패 시 버튼 위 빨간 안내
6. 상태: 로딩 = 카드 6개 회색 스켈레톤(pulse), 빈 결과 = 📁 "조건에 맞는 작업이 없어요" + "필터를 줄여 보세요"

"예약 받는 중" 배지(공용):
- 작은 pill: 배경 #E5F9F0, 글자 #007A45(success 계열, 브랜드 블루 아님 — 상태 표시 의미 컬러), 11~12px/700,
  앞에 6px 초록 점, 패딩 3px 8px
- 링크로 쓸 때(포트폴리오 히어로·작업 페이지)는 "예약 받는 중 · 날짜 보기 →"로 늘려 예약 페이지로 이동, hover 시 배경 살짝 진하게
예시 데이터: 작업 6개(김하늘/서울 마포구/예약 받는 중, 박지수/부산/배지 없음 등), 결혼식·제품촬영·가족 섞어서.
```

## 구현 메모
- 데이터: `GET /api/series/discover?shootType=&location=&page=&size=` (공개). `acceptingBookings`는 포트폴리오 응답에도 포함.
- 지역 입력은 디바운스 400ms, 50자 제한. 유형 칩 어휘는 `constants/shootTypes.js` 재사용.
- 배지 텍스트 색은 `COLORS.successText`(#007A45, 신규 토큰). `success`(#00C471)나 #00A35E는 연녹(#E5F9F0) 배경에서 대비가 약 3:1이라 WCAG AA 미달 — #007A45는 약 4.9:1.
