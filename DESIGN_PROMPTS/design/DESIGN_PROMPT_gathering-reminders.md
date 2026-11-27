# DESIGN PROMPT — 모임 알림 & 인원 진행 UI
> Feature 40 | 2026-11-27 | 디자인 에이전트용 아티팩트 요청 프롬프트

---

## Claude.ai 아티팩트 요청 프롬프트

아래 내용을 claude.ai에서 아티팩트로 요청할 때 그대로 붙여 넣는다.

---

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템):
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
  success:       '#00C471'
  successText:   '#007A45'
  warning:       '#FF9500'
  darkBg:        '#111417'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용

---

다음 3개 UI 컴포넌트를 각각 아티팩트로 만들어 주세요.

---

## 컴포넌트 1 — GatheringCapacityBar

모임 상세 화면(RECRUITING 상태)에서 인원 현황을 보여 주는 진행 막대입니다.

Props:
  current: number       // 현재 참여 확정자 수
  max: number           // 최대 정원
  min?: number          // 최소 인원 (없으면 undefined)
  waiting?: number      // 대기자 수 (없으면 0)

시각 요구사항:
- 가로 막대(height 8px, border-radius 999px)
- 배경은 border 색(#E5E8EB), 채워진 부분은 primary(#3182F6)
- fill 비율 = current / max, 100% 초과하지 않음
- min이 있으면 막대 위에 얇은 세로선(1px, warning #FF9500)을 (min/max * 100)% 위치에 표시
- 막대 오른쪽에 "n / m명" 텍스트(textSecondary 색)
- current === max면 "🎉 정원 마감" 배지(success 배경, 흰색 텍스트, pill 형태)
- min이 있고 current < min이면 막대 아래에 textMuted로 "최소 인원 k명까지 n명 남았어요" 표시
- waiting > 0이면 "대기 n명" pill(warning 옅은 배경, warning 텍스트)
- 애니메이션: 마운트 시 fill 너비가 0 → 목표값으로 0.4초 ease-out (CSS transition)

---

## 컴포넌트 2 — GatheringMinParticipantsField

모임 만들기/수정 폼 안에서 "최소 인원" 항목을 입력하는 필드입니다.

Props:
  value: number | ''    // 현재 입력값 (빈 문자열 = 미설정)
  max: number           // 현재 설정된 최대 정원
  onChange: (v: number | '') => void

시각 요구사항:
- 라벨: "최소 인원 (선택)"
- 숫자 입력란(type="number", min=1, max=max)
- placeholder "미설정"
- 입력란 오른쪽에 단위 "명"
- 1 이상 max 이하가 아니면 아래에 danger 색으로 오류 문구("1 이상 최대 정원 이하로 입력해 주세요")
- 필드 아래 textMuted로 안내 문구:
  "설정하면 모집 마감 24시간 전 현재 인원을 알림으로 알려 드려요."
  "미달 시 취소 여부는 주최자가 직접 결정해요."
- 자동 알림 안내 블록(배경 primaryLight #E8F3FF, border-left 3px primary, padding 8px 12px):
  "⏰ 자동 알림 안내
   · 모집 마감 24시간 전 — 주최자에게 현재 인원 알림
   · 모임 전날 — 참여자에게 날짜·시간·장소 리마인더
   · 시작 2시간 전 — 참여자에게 최종 알림"

---

## 컴포넌트 3 — GatheringNotificationItem (알림 종류 아이콘 확장)

모임 알림 목록의 단일 항목 컴포넌트입니다.

Props:
  notification: {
    id: number
    type: string          // 알림 종류 코드
    message: string
    gatheringId: number
    isRead: boolean
    createdAt: string
  }
  onClick: (n: notification) => void

지원할 알림 종류와 이모지:
  PARTICIPATION_CONFIRMED → ✅
  RECRUITMENT_CLOSED      → 🔒
  GATHERING_STARTED       → 🎬
  GATHERING_ENDED         → 🏁
  SCHEDULE_CHANGED        → 📅
  NEW_POST                → 📸
  NEW_COMMENT             → 💬
  NEW_LIKE                → ❤️
  PLACE_DECIDED           → 📍
  POLL_OPENED             → 🗳️
  POLL_CLOSING            → ⏳
  POLL_CONFIRMED          → 🎯
  RECRUITMENT_CLOSING     → 📣   ← 신규
  GATHERING_FULL          → 🎉   ← 신규
  MIN_NOT_MET             → ⚠️   ← 신규
  GATHERING_REMINDER_DAY  → 📅   ← 신규
  GATHERING_REMINDER_SOON → ⏰   ← 신규
  NEW_GATHERING           → 🆕   ← 신규
  MONTHLY_DIGEST          → 🗓️   ← 신규
  (기타)                  → 🔔

시각 요구사항:
- 가로 레이아웃: [이모지 40px 원] [메시지+시간] [>]
- 미읽음(isRead=false): 왼쪽 3px 파란 보더(primary) + 배경 primaryLight
- 읽음: 배경 흰색
- 이모지 원: 배경 F2F4F6, border-radius 999px, 텍스트 가운데
- 메시지는 2줄 클램프(overflow: hidden, display: -webkit-box, -webkit-line-clamp: 2)
- 시간은 "방금 전", "n분 전", "n시간 전", "n일 전"으로 포맷(Date 계산, 외부 라이브러리 없음)
- 클릭 시 onClick 호출, hover 시 배경 약간 어두워짐(rgba(0,0,0,0.03))
```

---

## 구현 시 주의사항

### GatheringCapacityBar
- `min` 세로선은 막대 `position: relative` 위에 `position: absolute`로 올린다.
- transition은 `width: 0`으로 초기 렌더 후 `useEffect`에서 실제 너비로 setState하는 패턴 — CSS transition만으로 처리.

### GatheringMinParticipantsField
- `max`가 아직 미입력(0)이면 최소 인원 입력란을 비활성화하고 "최대 정원을 먼저 입력해 주세요" 표시.
- 자동 알림 안내 블록은 항상 표시(입력값과 무관).

### GatheringNotificationItem
- 시간 포맷 함수는 컴포넌트 파일 안에 순수 함수로 정의(import 없음).
- `MONTHLY_DIGEST`는 `gatheringId`가 0(모임 없는 알림)이라 onClick에서 `/gatherings`로 이동.

---

## 연관 파일
- 기획: `DESIGN_PROMPTS/planning/PLANNING_gathering-schedule-reminders.md`
- 적용 화면(웹): `apps/web/src/pages/GatheringFormPage.tsx`, `GatheringDetailPage.tsx`, `GatheringNotificationsPage.tsx`
- 컬러 토큰: `frontend/src/constants/colors.js`
