# DESIGN_PROMPT — 아이디·비밀번호 찾기 (2026-10-21)

기획: `DESIGN_PROMPTS/planning/PLANNING_account-recovery.md`

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

로그인 화면과 같은 단독 레이아웃(회색 배경 #F2F4F6, 가운데 420px 흰 카드, 로고)으로 "계정 찾기" 화면을 만들어 주세요.

1. 카드 상단 세그먼트 탭 2개: "아이디 찾기 | 비밀번호 찾기"(활성 탭 흰 칩, 비활성 회색 글자, 높이 40px).
2. 아이디 찾기: 이름, 휴대폰 번호(자동 하이픈) 입력 → "아이디 찾기" 버튼.
   - 결과 카드: 가려진 이메일 `ja****@gmail.com`(16px 굵게, tabular), 아래 "이메일 가입 · 2026.10.21 가입"(12px muted). 소셜 가입은 "카카오 가입" 배지(primaryLight 배경 + primary 글자).
   - 버튼 2개: "로그인하러 가기"(primary), "비밀번호 찾기"(secondary — 흰 배경 + 회색 테두리).
   - 없음: "일치하는 계정이 없어요" + 안내 문구(번호를 등록하지 않았을 수 있음).
3. 비밀번호 찾기: 이메일 입력 → "재설정 메일 받기".
   - 완료: ✉ 아이콘 + "메일을 확인해 주세요" + "가입된 이메일이면 30분 동안 쓸 수 있는 재설정 링크를 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요." + "다시 보내기"(텍스트 버튼).
4. 재설정 화면(/reset-password): 확인 중 스켈레톤 → 유효: "새 비밀번호 정하기" + 대상 이메일(가림) + 새 비밀번호·확인(눈 아이콘 토글) → "비밀번호 바꾸기". 완료: ✓ "비밀번호를 바꿨어요" + "로그인하기". 무효: "링크가 만료되었거나 이미 사용되었어요" + "다시 요청하기".
5. 모든 버튼에 hover(primaryDark)·focus-visible(2px primary 링)·disabled(회색) 상태. 오류는 입력란 아래 11px danger + ⚠, `role="alert"`.
