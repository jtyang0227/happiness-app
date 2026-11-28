# DESIGN PROMPT — 예매 알림 배지 · 구독 캘린더 · 메일 토글 (v3)

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)
컬러: primary #3182F6 / primaryLight #E8F3FF / bg #F2F4F6 / surface #ffffff / border #E5E8EB / text #191F28 / textSecondary #4E5968 / textMuted #8B95A1 / danger #F04452 / successText #007A45
규칙: export default 함수형 컴포넌트 1개, inline style, react·react-router-dom만, 한국어, blur·그라디언트·컬러 그림자 금지(회색 그림자만)

## 요청
1. **PC 헤더 🔔 버튼** — 34×34 원형 고스트 버튼(hover surfaceDim), 오른쪽 위 빨간 배지(최소 16px, 흰 테두리 2px, 99+). aria-label "예매 알림, 새 알림 n건".
2. **프로필 상단 줄** — 통계 아래 흰 카드 한 줄 "🔔 읽지 않은 예매 알림 3건  ›", 탭하면 알림함. 없으면 렌더링 안 함.
3. **알림함 "캘린더 구독" 카드**(켠 알림 탭 맨 위)
   - 꺼짐: 설명 2줄("켠 알림이 기기 캘린더에 자동으로 들어가요 / 반영은 캘린더 앱에 따라 몇 시간 늦을 수 있어요") + primary 버튼 "구독 링크 만들기".
   - 막 발급: 링크 입력란(읽기 전용, 말줄임) + "복사"·"캘린더 앱에서 열기(webcal)" 버튼, 주황 안내 "이 링크는 지금만 보여요. 잃어버리면 새로 만드세요."
   - 켜짐(링크 숨김): "구독 중 · 만든 날 · 마지막으로 가져간 시각" + "새 링크 만들기"(확인 후, 옛 링크 끊김 안내) + danger 텍스트 버튼 "구독 끄기"(확인).
4. **알림 카드 메일 토글** — 시점 칩 아래 "✉️ 메일로도 받기" 스위치(44×24, 켜짐 primary). 서버에 메일이 없으면 비활성 + "지금은 메일을 보낼 수 없어요" muted.
상태: 로딩 스켈레톤, 실패 시 인라인 오류, 모든 버튼 hover·focus-visible·active·disabled.
