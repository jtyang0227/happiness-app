# DESIGN_PROMPT — 메뉴 통합 (헤더 · 탐색 · 업무 허브)

> 기획: `DESIGN_PROMPTS/planning/PLANNING_nav-consolidation.md`

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
사진작가 앱의 메뉴를 정리한 3개 화면 요소를 만들어줘.

1. PC 헤더(높이 58, 흰 배경, 하단 1px border): 왼쪽 로고 "HAPPINESS" → 가운데 메뉴 4개 "탐색 · 내 작업 · 업무 · 모임"
   (14px, 비활성 textSecondary 500 / 활성 text 700, 업무 옆 빨간 숫자 배지 9px) → 오른쪽 primary 버튼 "＋ 올리기"(높이 34, radius 10)
   + 언어 버튼 + 아바타 32px(메뉴: 이름·@아이디 / 프로필 / 내 포트폴리오 보기 / 로그아웃(빨강)).
2. 업무 탭(업무 하위 화면 상단 공통): 가로 스크롤 pill 탭 "한눈에 · 문의 · 예약 · 일정 · 약속 · 납품", 활성은 text 배경 흰 글자,
   문의·약속 탭 옆 작은 숫자 배지. 아래 1px 구분선.
3. 업무 "한눈에" 화면(최대 960): 제목 "업무" 26px/800 + "오늘 처리할 일을 모아 봤어요" 14px textMuted.
   카드 5개 그리드(3열 → 태블릿 2열 → 모바일 2열): 아이콘(✉ 📥 💰 📦 🤝) + 라벨 13px textMuted + 숫자 28px/800 tabular-nums
   + "확인하기 →" 12px primary. 숫자가 0이면 회색, 1 이상이면 text 색 + 카드 1px primary 테두리. 카드 전체가 링크(hover 리프트 -2px).
   아래 "다가오는 7일" 섹션: 날짜 그룹(오늘·내일·10월 23일 (목)) 아래 행 = 유형 색 점(예약 파랑/약속 초록/모임 주황) + 시간 + 제목 + 부제.
   일정이 없으면 "7일 안에 잡힌 일정이 없어요" + "통합 달력 보기" 링크. 로딩은 카드·행 회색 스켈레톤(pulse).
```

## 구현 메모
- 탐색 사진 탭은 기존 갤러리(`GalleryPage`) 화면에 기존 탐색의 검색바·자동완성·최근 검색어를 얹은 `components/explore/PhotoBrowser.jsx`.
- 업무 허브 데이터: `inquiryApi.getUnreadCount`, `bookingApi.getMyBookings('REQUESTED'|'CONFIRMED')`, `meetApi.getPendingCount`,
  `deliveryApi.getMyList`, 일정은 `utils/scheduleEvents.js`(통합 달력과 공유).
