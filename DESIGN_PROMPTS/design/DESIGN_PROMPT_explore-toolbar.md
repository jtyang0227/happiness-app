# DESIGN_PROMPT — 탐색 사진 툴바 정리

> 기획: `DESIGN_PROMPTS/planning/PLANNING_explore-toolbar.md`

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
사진 탐색 화면의 툴바를 모바일(390px)에서도 한 줄로 정리해줘. 흰 배경, 아래 1px border, sticky.

1. 툴바 한 줄 (높이 52, 좌우 16 패딩, gap 8):
   - 정렬 select pill: 배경 bg(#F2F4F6), radius 999, 높이 34, 13px/600 text, 오른쪽 ▾, 값: 최신순·오래된 순·좋아요 순·저장 순·조회 순·색상 순
   - 색감 버튼 pill(같은 크기): 기본 "🎨 색감 ▾", 색을 고르면 "● 따뜻함 ▾"(점 = 그 색), 펼친 상태면 테두리 text색
   - 오른쪽 끝: 결과 수 "9장" 12px textMuted tabular-nums + 보기 방식 세그먼트(배경 bg, radius 10, 아이콘 버튼 32×32 4개,
     선택 = 흰 칩 + 중립 그림자, 아이콘 ▦ 행 맞춤 / ▥ 벽돌 / ☰ 목록 / ▤ 매거진, 같은 글자 크기 15px)
2. 색감 펼침 줄(버튼 누를 때만): 가로 스크롤 칩(10px 색 점 + 12px 라벨), 선택은 text 배경 + 흰 글자
3. 장르 탭 줄: 기존 pill 가로 스크롤
4. 적용 중인 필터 요약 줄(걸린 필터가 있을 때만): 작은 칩 "💍 웨딩 ✕" "● 따뜻함 ✕" "🔍 노을 ✕"
   (primaryLight 배경, primary 글자, radius 999, 12px/600) + 오른쪽 "모두 지우기" 텍스트 버튼(textSecondary, 밑줄 없음)
상태: 모든 버튼 hover 배경 살짝 진하게, active scale(0.97), focus-visible 2px primary 아웃라인.
```

## 구현 메모
- 정렬은 네이티브 `<select>`(`appearance: none` + ▾ 글자) — 모바일 기본 피커·키보드 접근성을 그대로 쓴다.
- 색 점 색은 `MOOD_COLORS`의 데이터 색(토큰 예외, 기존 무드 배지와 동일).
