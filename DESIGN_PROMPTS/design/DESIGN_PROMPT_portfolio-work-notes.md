# DESIGN_PROMPT — 포트폴리오 작업 노트 페이지 (WorkCasePage)

> 기획: `DESIGN_PROMPTS/planning/PLANNING_portfolio-work-notes-concept.md` (P0, AC-5~10)
> 구현: `frontend/src/pages/WorkCasePage.jsx` · 경로 `/portfolio/:profileName/work/:seriesId`

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
사진작가 포트폴리오 안의 "작업 노트" 페이지를 만들어줘. 컨셉은 "사진을 모아둔 곳이 아니라 해낸 일을 보여주는 곳"이다.
사진은 크게, 글은 좁고 담백하게 — 전시 캡션이나 작가 노트 같은 톤.

구조(위→아래):
1. 상단 얇은 바(흰 배경, 하단 1px border): 왼쪽 "‹ 김하늘 포트폴리오"(작가 포트폴리오로 돌아가기), 오른쪽 "🔗 링크 복사" 텍스트 버튼
   (누르면 "복사했어요"로 2초간 바뀜)
2. 커버: 가로 전체, 높이 min(64vh, 560px), object-fit cover. 커버 아래(이미지 위에 글 얹지 않음) 흰 영역에
   - 작은 eyebrow 라벨 "WORK NOTE" (11px, letter-spacing 0.15em, textMuted)
   - 제목 36px/800 (모바일 28px), text-wrap balance
   - 메타 줄: "웨딩 · 개인 의뢰 · 2026.05 · 24장" — 가운데 점으로 구분, 값 없는 항목은 생략, 14px textSecondary
3. 작업 이야기: 최대 640px 컬럼, 17px, line-height 1.85, 줄바꿈 유지. 위에 "작업 노트" 소제목(13px/700 textMuted).
   이야기가 없으면 섹션 자체를 숨김.
4. 사진: 최대 1040px 컬럼, 한 장씩 세로로 흐르는 전시형(각 사진 아래 12px 캡션 = 사진 제목, 있을 때만),
   사진 사이 간격 40px, 모바일은 간격 20px·좌우 여백 0. 이미지에는 alt = 사진 제목 또는 "작업 사진 n".
5. CTA 카드(흰 카드, 1px border, radius 16, 패딩 32): "이런 촬영이 필요하신가요?" 22px/800,
   보조 문구 "김하늘 작가에게 웨딩 촬영을 문의해 보세요." + primary 버튼 "이런 촬영 문의하기" + ghost 버튼 "포트폴리오 전체 보기".
6. 다른 작업: "다른 작업" 소제목 + 가로 스크롤 카드(폭 220, 커버 4:3 + 제목 + 유형 배지). 현재 작업은 제외. 없으면 숨김.

상태:
- 로딩: 커버 자리 회색 블록 + 제목/메타 회색 바 스켈레톤 (#E5E8EB, pulse)
- 작업 없음/다른 작가 소유: 가운데 📁 "작업을 찾을 수 없어요" + "포트폴리오로 돌아가기" 버튼
- 사진 0장: 사진 영역에 "아직 이 작업에 사진이 없어요" 안내
인터랙션: 버튼 hover 배경 변화, focus-visible 2px primary 아웃라인, active scale(0.98). 다른 작업 카드 hover 시 translateY(-2px).
예시 데이터: 작가 "김하늘", 작업 "봄, 한옥에서의 스몰웨딩", 유형 웨딩, 클라이언트 "개인 의뢰", 2026.05, 사진 5장,
작업 이야기 3문단(신부 측이 '꾸미지 않은 하루'를 원해 자연광만 사용했다는 내용), 다른 작업 3개.
```

## 구현 메모
- 데이터: `GET /api/portfolio/:profileName`(작가·작업 목록) + `GET /api/series/:seriesId`(작업 상세·사진). `series.memberId !== member.id`면 not-found 화면.
- CTA: `/inquiry/:profileName?memberId=:id&shootType=:shootType` — `InquiryFormPage`가 `shootType` 쿼리를 읽어 미리 선택.
- 진입점: `TemplateEditorial` 컬렉션 카드 하단 "작업 노트 보기 →".
- 버튼은 공통 `components/common/Button.jsx` 사용.

---

## P2 추가 화면 (2026-10-20)

```
[요청 — 위 시스템 컨텍스트 동일]
작업 노트 페이지와 포트폴리오에 아래 4가지를 더해줘. 톤은 기존과 같이 담백하게.

1. 대표 작업 카드 (포트폴리오 상단, 히어로 바로 아래)
   - 가로로 긴 카드 1개: 좌측 60% 커버 이미지(16:10), 우측 40% 텍스트
   - 텍스트: "대표 작업" eyebrow(11px, letter-spacing 0.15em, primary) → 제목 24px/800 → 메타 줄(유형 · 클라이언트 · 시기)
     → 작업 이야기 앞 2줄(말줄임) → "작업 노트 보기 →" 링크
   - 모바일(≤767px)은 이미지 위·텍스트 아래 1컬럼
   - 대표 작업이 없으면 아무것도 그리지 않음

2. 작업 페이지 "이 작업의 고객 후기" (작업 이야기 아래, 사진 위)
   - 큰 따옴표(“) 장식 없이, 좌측 3px 회색 세로선 + 본문 17px 이탤릭 아님, line-height 1.8
   - 아래 "— 고객 이름 · 역할" 13px textMuted
   - 후기가 여러 개면 세로로 나열, 없으면 섹션 숨김

3. 작업 페이지 CTA 카드에 보조 버튼 "바로 예약하기"
   - 작가가 예약을 받는 중일 때만 노출(이번 달 또는 다음 달 예약 가능일이 있을 때)
   - 위계: primary "이런 촬영 문의하기" > secondary "바로 예약하기" > ghost "포트폴리오 전체 보기"

4. 분석 대시보드 "많이 본 작업" 카드
   - 표: 순위 · 작업 제목(썸네일 40px) · 조회 · 문의 · 문의 전환율(%)
   - 숫자는 tabular-nums 오른쪽 정렬, 전환율은 조회 0이면 "—"
   - 데이터 없으면 "아직 작업 페이지 조회 기록이 없어요" 빈 상태
```

### 구현 메모 (P2)
- 대표 작업: `Series.pinned` — 작가당 1건(고정 시 같은 작가의 다른 작업은 해제). 시리즈 관리 카드의 "📌 대표 작업으로" 토글.
- 고객 후기 연결: `Testimonial.seriesId` — 포트폴리오 콘텐츠 관리의 추천사 폼에서 "연결할 작업" 선택.
- 예약 프리셋: 작업 유형(문의 어휘) → 예약 코드 매핑은 명확한 3개만(결혼식→WEDDING, 인물/프로필→PROFILE, 제품촬영→COMMERCIAL).
  나머지는 프리셋 없이 예약 위저드 첫 단계에서 고르게 한다.
- 분석: 작업 페이지 진입 시 `WORK_VIEW`(targetType `SERIES`) 기록, 작가 본인 방문은 제외.
