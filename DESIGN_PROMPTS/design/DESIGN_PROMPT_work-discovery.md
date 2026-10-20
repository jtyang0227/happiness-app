# DESIGN_PROMPT — 작업 탐색 & "예약 받는 중" 배지

> 기획: `DESIGN_PROMPTS/planning/PLANNING_work-discovery.md`
> 구현: `frontend/src/pages/ExplorePage.jsx`(탭), `frontend/src/components/discover/WorkDiscovery.jsx`,
> `frontend/src/components/common/AcceptingBadge.jsx`, `mobile/screens/ExploreScreen.js`

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
사진작가 앱의 "탐색" 화면에 작업(케이스) 단위로 둘러보는 탭을 만들어줘. 의뢰인이 "이런 촬영을 해본 작가"를 찾는 화면이다.

1. 상단 세그먼트 컨트롤: "사진" | "작업" (회색 트랙 #F2F4F6 위 흰 선택 칩, radius 10, 높이 40, 선택 텍스트 700)
2. 작업 탭 필터 줄:
   - 촬영 유형 칩 가로 스크롤: 전체 · 결혼식 · 제품 촬영 · 인물/프로필 · 풍경/여행 · 행사/이벤트 · 가족 · 기타
     (선택: 배경 text #191F28 + 흰 글자, 비선택: 흰 배경 + 1px border)
   - 오른쪽(모바일은 아래 줄) 지역 입력 "📍 지역 (예: 서울)" — 엔터 또는 입력 멈춘 뒤 0.4초 후 반영, 지우기 ✕ 버튼
3. 결과 수 "작업 24+건" (13px textMuted)
4. 작업 카드 그리드 3열(태블릿 2, 모바일 1), gap 16:
   - 커버 4:3, 오른쪽 위에 사진 수 "12장" 작은 어두운 칩(rgba(0,0,0,0.6) 흰 글자)
   - 본문: 제목 16px/700 2줄 말줄임 → 메타 "결혼식 · 개인 의뢰 · 2026.05" 12px textMuted
   - 하단 구분선 위에 작가 줄: 아바타 24px(없으면 이니셜 원, primary 배경) + 이름 13px/600 + 위치 12px textMuted
     + 오른쪽 "예약 받는 중" 배지(조건부)
   - hover: translateY(-2px) + 중립 그림자, focus-visible 2px primary 아웃라인
5. "작업 더 보기" secondary 버튼 (다음 페이지 있을 때), 실패 시 버튼 위 빨간 안내
6. 상태: 로딩 = 카드 6개 회색 스켈레톤(pulse), 빈 결과 = 📁 "조건에 맞는 작업이 없어요" + "필터를 줄여 보세요"

"예약 받는 중" 배지(공용):
- 작은 pill: 배경 #E5F9F0, 글자 #007A45(success 계열, 브랜드 블루 아님 — 상태 표시 의미 컬러), 11~12px/700,
  앞에 6px 초록 점, 패딩 3px 8px
- 링크로 쓸 때(포트폴리오 히어로·작업 페이지)는 "예약 받는 중 · 날짜 보기 →"로 늘려 예약 페이지로 이동, hover 시 배경 살짝 진하게
예시 데이터: 작업 6개(김하늘/서울 마포구/예약 받는 중, 박지수/부산/배지 없음 등), 결혼식·제품촬영·가족 섞어서.
```

## 구현 메모
- 데이터: `GET /api/series/discover?shootType=&location=&page=&size=` (공개). `acceptingBookings`는 포트폴리오 응답에도 포함.
- 지역 입력은 디바운스 400ms, 50자 제한. 유형 칩 어휘는 `constants/shootTypes.js` 재사용.
- 배지 텍스트 색은 `COLORS.successText`(#007A45, 신규 토큰). `success`(#00C471)나 #00A35E는 연녹(#E5F9F0) 배경에서 대비가 약 3:1이라 WCAG AA 미달 — #007A45는 약 4.9:1.

---

## P1 추가 — 작업 감상 + 조회수 공개 (2026-10-20)

```
[요청 — 위 시스템 컨텍스트 동일]
작업 노트 페이지 제목 메타 줄 아래에 반응 줄을 추가해줘.
- 왼쪽: "조회 128 · 감상 12" 13px textMuted, tabular-nums
- 오른쪽: 감상 토글 pill 버튼 "👏 감상하기" (흰 배경 + 1px border, textSecondary)
  → 누르면 "👏 감상했어요" (primaryLight 배경 + primary 테두리·글자), 다시 누르면 취소
- hover 시 테두리 primary, active scale(0.97), focus-visible 2px primary 아웃라인, aria-pressed
- 작가 본인에게는 버튼 없이 수치만, 비로그인은 누르면 로그인 화면으로
탐색 작업 카드 메타 아래에도 "👏 12 · 👁 128" 12px textMuted 한 줄.
```

구현 메모: 감상은 회원당 작업 1회(`series_appreciations` UNIQUE), 본인 작업 400. 조회수는 작업 노트 페이지 `WORK_VIEW` 이벤트 수
(작가 본인 방문 제외). 내 감상 여부는 인증 경로 `GET /series/{id}/appreciation`으로 따로 받는다(아래 함정 참고).

---

## P1 추가 — 무드보드 (2026-10-20)

```
[요청 — 위 시스템 컨텍스트 동일]
사진을 주제별로 모으는 "보드" 기능 화면 3개를 만들어줘. 보드는 나만 보는 비공개 컬렉션이다.
1. "보드에 담기" 다이얼로그(가운데 모달, 폭 400, radius 16, 중립 그림자): 제목 "보드에 담기" + ✕,
   보드 행(44px 썸네일 · 이름 14px/700 · "n장" 12px textMuted · 오른쪽 체크박스 22px — 체크 시 primary 채움 + ✓),
   행 hover surfaceDim, 아래 구분선 위 입력 "새 보드 이름" + primary 버튼 "만들고 담기". 보드 0개면 안내 문구.
2. 프로필 저장함 탭 상단 "내 보드 n": 카드 3열(모바일 2열) — 4:3 콜라주(왼쪽 큰 칸 + 오른쪽 위/아래 두 칸) + 이름 + n장,
   제목 줄 오른쪽에 작은 입력 + "+ 만들기". 아래 "저장한 사진" 소제목 + 기존 그리드.
3. 보드 상세 페이지: "‹ 프로필 · 저장함" → "📌 보드 이름 n장" 26px/800 + 오른쪽 "이름 바꾸기"(secondary) "보드 삭제"(ghost, danger 글자)
   → 누르면 "정말 삭제"(danger) + "취소"와 경고 문구 "보드만 삭제되고 사진은 그대로 남아요". 사진 정사각 그리드(minmax 180),
   hover 시 오른쪽 위 ✕(사진 빼기) 노출(터치 기기는 항상 보임). 빈 보드는 📌 빈 상태 + "사진 둘러보기".
```

---

## P2 추가 — 함께한 사람 (2026-10-20)

```
[요청 — 위 시스템 컨텍스트 동일]
1. 시리즈 수정 모달에 "함께한 사람 · 선택" fieldset: 한 줄 = 역할(자동완성 제안: 헤어/메이크업/스타일링/모델/어시스턴트/
   플로리스트/장소/기획/보정) · 이름 · "@프로필명 (선택)" · ✕. 아래 점선 버튼 "+ 함께한 사람 추가"(최대 20).
   역할·이름 중 하나만 채운 줄이 있으면 빨간 안내 "역할과 이름을 모두 적어 주세요" + 저장 비활성.
2. 작업 노트 페이지 작업 이야기 아래 "함께한 사람"(13px/700 textMuted 소제목) + 2열 정의 목록
   (역할 textMuted / 이름 600). 회원과 연결된 이름은 밑줄 1px border + "↗", hover 시 밑줄 진하게, 그 작가 포트폴리오로 이동.
```

---

## P2 추가 — 에디터 추천 (2026-10-20)

```
[요청 — 위 시스템 컨텍스트 동일]
1. 탐색 작업 탭, 필터 줄 아래에 "✦ 에디터 추천" 16px/800 + "운영팀이 고른 작업" 13px textMuted.
   폭 280 작업 카드 가로 스크롤(scroll-snap). 카드 커버 왼쪽 위에 흰 칩 "✦ 에디터 추천"(11px/800).
   유형·지역 필터를 걸면 이 띠는 숨긴다. 아래 일반 목록 카드에도 추천 작업이면 같은 칩.
2. 어드민 "작업 큐레이션" 페이지: 설명 문단 → 전체 작업 / 추천 중 탭(pill) → 행 목록
   (72×54 썸네일 · 제목 ↗(새 탭) · "유형 · 작가 · 지역 · 👏 · 👁 · n장" · 오른쪽 버튼).
   추천 중인 행은 primary 1px 테두리 + 제목 앞 ✦. "추천에 올리기"(primary) → "정말 올리기" + "취소",
   "추천 내리기"(secondary) → "정말 내리기"(danger) + "취소".
```
