# DESIGN_PROMPT — 모바일 가용시간 설정 화면

> Feature 39(d) | 2026-09-05 | Toss 디자인 시스템 (모바일)

## 시스템 컨텍스트
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (React Native / Expo)
스택: React Native 0.72, StyleSheet(인라인 유사 방식), `constants/colors.js` / `constants/layout.js` 토큰만 사용
아이콘: 이모지만 사용 (외부 아이콘 라이브러리 없음)

컬러 토큰 (mobile/constants/colors.js):
```
primary: '#3182F6'  bg: '#F2F4F6'  white: '#ffffff'
border: '#E5E8EB'  danger: '#F04452'  success: '#00C471'
textPrimary: '#191F28'  textSecondary: '#4E5968'  textMuted: '#8B95A1'
```

규칙:
- 색상/간격 하드코딩 금지, `COLORS`/`SPACING`/`RADIUS`/`FONT` 상수만 사용
- 외부 날짜/시간 피커 라이브러리 없음 → 텍스트 입력(HH:MM, YYYY-MM-DD) + 정규식 검증 + Alert 안내로 대체
- 한국어 UI 텍스트

---

## 화면: AvailabilitySettingsScreen

```
┌─────────────────────────────────────┐
│ ‹   가용 시간 설정                     │
├─────────────────────────────────────┤
│ 예약 가능 요일                         │
│ (일)(월●)(화●)(수●)(목●)(금●)(토)      │
│                                       │
│ 시간 슬롯                              │
│ [10:00 ×] [14:00 ×]                  │
│ [HH:MM 입력______] [+ 추가]           │
│                                       │
│ 버퍼 시간 (시간 단위)                    │
│ [0______________]                    │
│                                       │
│ 예약 메모                              │
│ [클라이언트에게 보여줄 안내 메모_____]    │
│                                       │
│ 차단 날짜                              │
│ [2026-09-20 ×]                       │
│ [YYYY-MM-DD______] [추가]             │
│                                       │
│         [        저장        ]        │
└─────────────────────────────────────┘
```

- 요일 칩: 선택 시 `primary` 배경 + 흰 텍스트, 미선택 시 흰 배경 + `border` 테두리
- 백엔드 `weekdays` 값은 1=월..7=일(CSV) — 화면 표시 순서(일~토)와 인덱스 매핑에 주의(`uiIndexToBackend`/`backendToUiIndex`)
- 시간 슬롯/차단 날짜는 칩 형태로 표시, `×` 버튼으로 개별 삭제
- 저장 버튼은 `PUT /api/booking/availability-settings` 호출 후 성공 Alert
- 차단 날짜는 추가 즉시 서버 반영(`POST /api/booking/blocked-dates`), 삭제 시 확인 Alert 후 `DELETE`
- 진입 경로: ProfileScreen "예약 관리" → BookingScreen 우측 상단 "⚙ 설정" (기존 웹 딥링크 Alert를 제거하고 네이티브 화면으로 직접 이동)
- ProfileScreen 메뉴에 "📅 통합 일정" 항목 추가 — 웹 `/calendar` 페이지를 `Linking.openURL`로 시스템 브라우저에서 오픈 (네이티브 통합 달력은 P2)
