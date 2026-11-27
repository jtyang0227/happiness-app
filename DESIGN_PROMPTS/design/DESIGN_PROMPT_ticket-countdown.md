# DESIGN_PROMPT — 예매 카운트다운 · 관리자 예매 모니터링

> 기획: `DESIGN_PROMPTS/planning/PROMPT_server-time-booking-module.md` D·F·H, `PLANNING_server-time.md`.
> 구현: `apps/web/src/pages/TicketCountdownPage.tsx`(`/tickets/:id`), `apps/web/src/pages/admin/AdminTicketsPage.tsx`(`/admin/tickets`).

## Claude.ai 아티팩트 요청용 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary '#3182F6' / primaryDark '#1B64DA' / primaryLight '#E8F3FF' / bg '#F2F4F6' / surface '#ffffff'
  border '#E5E8EB' / text '#191F28' / textSecondary '#4E5968' / textMuted '#8B95A1'
  danger '#F04452' / success '#00C471' / successText '#007A45' / warning '#FFB800'

규칙:
- export default 함수형 컴포넌트 1개만 반환, style은 inline object
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용), 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint 그림자, 그라디언트 금지 — 플랫 서페이스만
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만

[화면 1 — 예매 카운트다운 /tickets/:id]
- 상단: 공연 제목, 장소. 예매 단계 칩(선예매·일반예매…) — 고르면 그 단계 카운트다운.
- 큰 카운트다운 카드(흰 카드, radius 20): "D-2 03:14:07"을 tabular-nums 48px로, 아래 "12/1(화) 20:00 KST 오픈 예정"
  + 원문 시간대가 KST가 아니면 "(현지 Europe/London 11:00)" 보조 표시.
- 상태 배지: 예정(회색) · 임박(파랑) · 오픈 확인 중(노랑) · 예매 진행 중(초록, OPEN_CONFIRMED일 때만) · 종료(회색) · 확인 불가(회색) · 시간 점검 중(빨강).
  0초가 돼도 "예매 진행 중"이라고 쓰지 않는다 — "오픈 확인 중…".
- 일정 상태: 미확정(TENTATIVE) "공식 확정 전 일정", 변경(CHANGED) "일정 변경 — 재확인 중", 취소·연기면 카운트다운 숨기고 안내만.
- 정확도: 서버 시각 기준임을 작은 글씨로 "서버 기준 시각 · 오차 ±0.12초". WARN이면 노란 안내 줄, UNRELIABLE이면 카운트다운 흐리게(opacity .45) + 빨간 안내.
- 알림 카드(로그인 시): 24시간·1시간·10분·1분 전 체크(1분은 선택), 저장 버튼. 비로그인은 "로그인하고 알림 받기".
- 스켈레톤 + 없는 공연 EmptyState.

[화면 2 — 관리자 /admin/tickets]
- 상단 시계 바: UTC·KST 시계(서버 기준), 동기화 등급 배지, 오차 ms, 마지막 동기화 "N초 전", [진단 실행].
- 다음 예매 일정 표(최대 20): 공연·단계·KST 시각·남은 시간(실시간)·일정 상태·오픈 상태·출처·확인 시각(24시간 지나면 노랑)·공지≠기준 차이 배지·예약 알림 수·[변경][재확인][오픈 확정][이력].
- 변경 모달: 새 시각(KST 입력 → UTC 저장), 일정 상태, 출처, 근거 링크, 사유(필수), revision 충돌 시 최신값 안내.
- 오픈 확정: OPEN/CLOSED + 근거 메모 필수, 이중 확인. 결과는 확인 기록으로 남는다.
- 최근 일정 변경 이력, 처리기 상태(하트비트·등급·DB 시계 차이·큐 지연·중단 여부), 큐(대기·처리 중·DEAD), 시간 장애 기록.
- 새 공연·새 단계 만들기 폼(접힘).
```

## 결정
- 시간 판단은 기기 시계가 아니라 서버 응답 기준(RTT가 가장 작은 측정 + performance.now 경과). 기기 시계를 바꿔도 남은 시간이 그대로.
- 다시 맞추는 간격은 서버가 준 `resyncAfterMs`(남은 시간이 짧을수록 자주) + 탭으로 돌아올 때.
