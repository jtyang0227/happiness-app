# DESIGN_PROMPT — 모바일 통합 일정 (ScheduleScreen, MASTER_PLAN v2 P1-2 / AC-M1)

> 구현: `mobile/screens/ScheduleScreen.js` (2026-10-07). 웹 `/calendar`(IntegratedCalendarPage)의 모바일 대응.

## Claude.ai 아티팩트 요청 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary: '#3182F6'  bg: '#F2F4F6'  surface: '#ffffff'  border: '#E5E8EB'
  text: '#191F28'  textSecondary: '#4E5968'  textMuted: '#8B95A1'
  success: '#00C471'  danger: '#F04452'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용

[요청]
390px 폭 모바일 "통합 일정" 화면을 만들어줘. 사진작가가 앞으로 할 일을 한눈에 보는 화면이다.
- 상단 흰색 헤더: 왼쪽 ‹ 뒤로, 가운데 "통합 일정"
- 범례 한 줄: ● 예약(primary) ● 약속(success) ● 모임(#B45309)
- 섹션 3개: "오늘 (n)" / "이번 주 (n)"(내일~6일 뒤) / "이후 (n)" — 비어 있는 섹션은 숨김, 지난 일정은 표시하지 않음
- 일정 카드: 흰 카드 + 1px border, 왼쪽 4px 유형 색상 스트라이프, 본문에 "오늘 · 14:00" 또는 "10월 9일 (목) · 10:00",
  굵은 제목("김하늘 촬영" / "민지님과 약속" / 모임 제목), 회색 보조줄(촬영 유형 / 장소 / 참여자 n명), 오른쪽 유형 라벨
- 일부 소스만 실패하면 주황 톤 안내 배너("약속 일정을 불러오지 못했어요. 나머지 일정은 정상 표시됩니다.")
- 일정이 하나도 없으면 📅 빈 상태 "다가오는 일정이 없어요"
- 예시 데이터로 오늘 1건, 이번 주 2건, 이후 1건을 채워서 보여줘
```

## 규칙 요약
- 포함 대상은 웹 `/calendar`와 동일: 예약 CONFIRMED · 약속 CONFIRMED · 모임 SCHEDULED/ONGOING.
- 3개 API를 `Promise.allSettled`로 병렬 호출 — 하나가 실패해도 나머지는 표시.
- 카드 탭: 예약 → 예약 관리, 약속 → 약속 상세, 모임 → 모임 상세.
- 달력 그리드는 모바일에서 생략(작은 화면에서는 "다음에 뭘 하나"가 핵심 질문이라 목록이 더 빠르다).
