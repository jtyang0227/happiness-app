# DESIGN_PROMPT — 신고·차단·회원 탈퇴 (모바일, 앱 심사 대응)

기획: `DESIGN_PROMPTS/planning/PLANNING_app-store-review.md`

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
```

## 요청

390px 모바일 화면 3개를 한 컴포넌트에 탭으로 보여 줘.

1. **신고 하단 시트** — 반투명 검정 배경 위 흰 시트(위쪽 모서리 18px). 제목 "사진 신고"/"댓글 신고" + ✕.
   안내 "신고 사유를 골라 주세요. 신고한 사실은 작성자에게 알려지지 않아요." 라디오 5개(부적절한 내용 / 스팸·광고 /
   저작권 침해 / 개인정보 노출 / 기타). 사유를 고르면 메모 입력(기타면 필수). 빨간(danger) 꽉 찬 "신고하기" 버튼 —
   사유 전엔 회색 비활성. 구분선 아래 회색 글자 "🚫 ○○님 차단하기"(누르면 확인 대화상자).
2. **차단한 사용자** — 흰 카드 목록(아바타·이름·@프로필명·테두리 "해제" 버튼). 빈 상태: 🚫 "차단한 사용자가 없어요".
3. **프로필 하단** — "법적 고지" 카드(개인정보처리방침 · 이용약관 · 🚫 차단한 사용자 ›), 빨간 테두리 "로그아웃",
   그 아래 회색 밑줄 텍스트 "회원 탈퇴"(파괴적 작업이라 눈에 덜 띄게, 누르면 2단계 확인).

상태: 버튼 눌림(투명도), 처리 중 스피너, 오류 문구(danger, 13px). 사진 상세 상단 오른쪽 "🚩 신고"(textMuted 13px),
남의 댓글 오른쪽 "신고"(내 댓글은 기존 "삭제").
