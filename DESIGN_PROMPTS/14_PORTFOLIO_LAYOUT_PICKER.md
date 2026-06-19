# 14 — 포트폴리오 레이아웃 피커 (ProfilePage 설정 탭)

> 구현 완료일: 2026-06-19  
> 관련 파일: `frontend/src/components/portfolio/PortfolioLayoutPicker.jsx`, `frontend/src/pages/ProfilePage.jsx`  
> 위치: ProfilePage → 설정 탭 → "포트폴리오 레이아웃" 섹션

---

## 기획 배경

포트폴리오 방문자에게 어떤 레이아웃으로 사진을 보여줄지 작가가 직접 선택할 수 있어야 한다.  
현재 3가지 레이아웃을 지원한다:

| 키 | 레이블 | 설명 |
|----|--------|------|
| `grid` | 그리드 | 12-컬럼 균형 잡힌 격자 레이아웃 |
| `magazine` | 매거진 | 에디토리얼 느낌의 불균형 레이아웃 |
| `slideshow` | 슬라이드쇼 | 풀스크린 슬라이드 발표용 (`/portfolio/:name/slideshow`) |

---

## 저장 경로

```
frontend/src/
  components/portfolio/PortfolioLayoutPicker.jsx   (신규 — 3-카드 선택 UI)
  pages/ProfilePage.jsx                            (수정 — 설정 탭에 섹션 추가)
```

---

## 현재 구현 상태

- 3-카드 수평 배치 (flex)
- 각 카드: 상단 미리보기 영역(62px) + 레이블·설명 텍스트
- 선택된 카드: `primary` 색상 테두리 + `primaryLight` 배경
- 미선택 카드: `border` 색상 테두리 + `surface` 배경
- `value` / `onChange` props로 부모(ProfilePage)와 상태 공유

---

## claude.ai 아티팩트 요청 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryDark:   '#4458e0'
  primaryLight:  '#eef0ff'
  accent:        '#a78bfa'
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'
  danger:        '#e53e3e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

[컴포넌트 요청]
ProfilePage 설정 탭 안에 들어가는 "포트폴리오 레이아웃 선택" 섹션을 만들어줘.

필수 기능:
- props: value ('grid' | 'magazine' | 'slideshow'), onChange(key)
- 3개 레이아웃 카드를 수평으로 배치 (모바일: 세로 1열)
- 각 카드 상단에 해당 레이아웃을 시각적으로 표현하는 미니 미리보기 (CSS만, 이미지 없음)
  · grid: 2×2 정사각형 타일 격자
  · magazine: 좌측 큰 사진 + 우측 상하 2개 타일
  · slideshow: 가로 꽉 찬 직사각형 + 중앙 ▶ 버튼
- 선택된 카드: primary(#5b6ef5) 테두리 2px + primaryLight(#eef0ff) 배경 + 상단 체크 뱃지(✓)
- 미선택 카드: border(#e2e2ee) 테두리 + white 배경
- 카드 하단: 레이아웃 이름(볼드) + 한 줄 설명 (textMuted 색상)
- hover: 테두리 primary 색으로 변환 (transition 0.15s)
- 카드 클릭 → onChange(key) 호출

레이아웃 데이터:
- grid: "그리드", "균형 잡힌 격자 레이아웃"
- magazine: "매거진", "에디토리얼 느낌의 불균형 레이아웃"
- slideshow: "슬라이드쇼", "풀스크린 슬라이드 발표용"
```

---

## UX 개선 아이디어 (다음 스프린트)

- 레이아웃 변경 즉시 미니 애니메이션 재생 (카드가 흔들리거나 페이드)
- 각 레이아웃 카드 클릭 시 "어떻게 보이는지 미리보기" 링크 → 실제 포트폴리오 페이지 새 탭으로 열기
- `slideshow` 선택 시 자동재생 간격(3s/5s/10s) 추가 옵션 인라인 표시
