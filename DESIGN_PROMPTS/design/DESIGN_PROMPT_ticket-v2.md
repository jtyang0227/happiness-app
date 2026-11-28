# DESIGN PROMPT — 예매 일정 목록·알림함 (v2)

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)
컬러: primary #3182F6 / primaryLight #E8F3FF / bg #F2F4F6 / surface #ffffff / border #E5E8EB /
text #191F28 / textSecondary #4E5968 / textMuted #8B95A1 / danger #F04452 / successText #007A45
규칙: export default 함수형 컴포넌트 1개, inline style, react·react-router-dom만, 한국어 UI,
blur·그라디언트·컬러 그림자 금지(회색 그림자만).

## 화면 1 — 예매 일정 목록 `/tickets`
- 상단: "예매 일정" 제목 + 보조 문구 "시각은 모두 서버 시계 기준이에요" + 오른쪽 "🔔 내 알림" 링크.
- 카드(흰색, radius 16, 패딩 20): 공연 제목(17px 700) · 장소(13px muted) · 다음 단계 줄 "1차 예매 · 12/1(화) 20:00 KST" ·
  오른쪽 상태 배지(예정/임박/오픈 확인 중/예매 진행 중/시간 점검 중) · 남은 시간 "2일 03:12:09"(tabular-nums, 1초마다).
- 카드 전체가 링크(hover 배경 #F9FAFB, focus-visible 2px primary 링).
- 로딩 스켈레톤 3장, 빈 상태 "🎫 예정된 예매 일정이 없어요".
- 390px: 배지·남은 시간이 제목 아래 줄로.

## 화면 2 — 내 예매 알림 `/tickets/alerts`
- 세그먼트 탭 "알림함 n | 켠 알림 n".
- 알림함: 행(아이콘 🔔/⚠️/✅ · 메시지 · 상대 시각), 안 읽음은 왼쪽 3px primary 선 + 굵게 + 점. 누르면 읽음.
  상단 오른쪽 "모두 읽음"(ghost). 아래 "더 보기"(secondary).
- 켠 알림: 단계 카드 — 공연·단계 이름, 예정 시각, 시점 칩(24시간·1시간·10분·1분 전, 켠 것만 파란 칩),
  "설정 바꾸기"(카운트다운으로) · "끄기"(danger ghost, 확인 후).
- 빈 상태: 알림함 "아직 받은 알림이 없어요", 켠 알림 "켜 둔 알림이 없어요 · 예매 일정 보러 가기".

## 카운트다운 화면 추가 요소
- 알림 카드 아래 버튼 줄: "📅 캘린더에 추가"(secondary) — .ics 파일 다운로드, 도움말 "일정이 바뀌면 다시 받아 주세요".
- 상단: "← 전체 일정" 링크.
