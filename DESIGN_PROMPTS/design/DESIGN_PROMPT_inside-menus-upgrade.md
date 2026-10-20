# DESIGN_PROMPT — 4개 메뉴 내부 고도화 (비슷한 사진 · 색 필터 · 보드 공유 · 캐러셀 내보내기)

> 기획: `DESIGN_PROMPTS/planning/PLANNING_inside-menus-upgrade.md`

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
사진작가 앱의 화면 4개 조각을 만들어줘.

1. 탐색 색 분위기 필터 줄 (장르 탭 아래, 배경 bg #F2F4F6)
   - 가로 스크롤 칩: "전체" + 11종(따뜻함·에너지·자연스러움·시원함·평온함·로맨틱·생동감·차분함·극적임·청결함·단색)
   - 칩 = 10px 색 점 + 라벨 12px. 비선택: 흰 배경 + 1px border, 선택: text(#191F28) 배경 + 흰 글자(점은 그대로)
   - hover 테두리 textMuted, focus-visible 2px primary 아웃라인, aria-pressed

2. "비슷한 사진" 섹션 (사진 모달 본문 아래, 상세 페이지 하단)
   - 제목 "비슷한 사진" 15px/700 + 보조 "장르·색감이 비슷한 다른 작가의 사진" 12px textMuted
   - 정사각 썸네일 그리드 4열(모바일 3열) gap 6, radius 8, hover 시 살짝 어두워짐(오버레이 rgba(0,0,0,0.12)) + 작가 이름 하단 표시
   - 로딩: 회색 정사각 8개 pulse, 결과 0개면 섹션을 숨김

3. 보드 공유 (보드 상세 상단 버튼 줄)
   - 꺼짐: secondary 버튼 "🔗 공유 링크 만들기"
   - 켜짐: 회색 박스(bg) 안에 읽기 전용 입력(링크) + "복사" primary sm + "링크 끄기" ghost(danger 글자)
     → 누르면 "정말 끄기"(danger) + "취소", 경고 "이전 링크로는 더 이상 볼 수 없어요"
   - 공유 페이지(비로그인): 상단 "📌 보드 이름" 26px/800 + "○○님의 보드 · n장", 정사각 그리드(minmax 180), 맨 아래 "Happiness에서 둘러보기 →"

4. 에디터 내보내기 창 캐러셀 모드 (다크 서페이스 #1A1E22, 폭 440)
   - 상단 세그먼트 "한 장 | 캐러셀"
   - 캐러셀: 미리보기(가로로 긴 축소 캔버스, 슬라이드 경계 흰 점선 + 왼쪽 위 번호 칩 "1" "2"…)
   - 옵션: 비율 칩(4:5 · 1:1), 장 수 스테퍼(− 3 +, 2~10), 여백 슬라이더(0~12%), 배경 색 동그라미 3개(흰·검정·회색),
     원본 칩(지금 사진 · 올린 사진 n장 이어 붙이기)
   - 버튼 "⬇️ 3장 다운로드" primary, 진행 "2 / 3 저장 중"
```

## 구현 메모
- 색 칩은 `MOOD_COLORS`(constants/colors.js)의 dot·label을 쓴다. 점 색은 데이터 표시라 토큰 예외(이미 무드 배지에서 쓰는 값).
- 캐러셀 미리보기 경계선은 캔버스에 직접 그린다. 실제 내보내기에는 경계선이 들어가지 않는다.
- 공유 페이지에는 `<meta name="robots" content="noindex">`를 넣는다.
