# ExplorePage 심플 리디자인 — Cosmos 스타일

> 참고: Cosmos 앱 탐색 화면 (2026-06-27)  
> 방향: 필터 패널 제거 → 검색 + 장르탭 + 그리드만 노출

---

## 변경 요약

### Before (현재)
- 검색바 + 정렬 + 검색버튼
- 장르 탭 (pill 버튼 스타일)
- 무드 필터 칩 12개 (WARM/COOL/...)
- 비율 필터 칩 6개 (1:1/4:3/...)
- 태그 입력 필터
- 활성 키워드 뱃지
- 마소닉 그리드

### After (심플)
- 검색바 (pill, 우측 정렬 드롭다운 통합)
- 장르 탭 (Cosmos 언더라인 스타일)
- 마소닉 그리드

---

## 카테고리 탭 — Cosmos 언더라인 스타일

```
전체  인물  풍경  건축  스트릿  음식  동물 ...
────
(활성 탭에만 하단 2px 흰선)
```

- 배경: 없음 (투명)
- 활성: fontWeight 700, color #ffffff, borderBottom 2px solid #ffffff
- 비활성: color rgba(255,255,255,0.45), fontWeight 400
- 탭 사이 간격: 28px (gap 대신 paddingRight)
- 수평 스크롤, 스크롤바 숨김
- 탭 하단에 전체 폭 구분선 1px rgba(255,255,255,0.08)

---

## 검색바

```
[🔍  제목, 설명 검색...          최신순 ▾]
```

- 배경: #1c1c1c, radius 9999px
- 내부 정렬 select 오른쪽 inline
- 검색 아이콘 왼쪽 (🔍 텍스트)
- 테두리: 1px solid rgba(255,255,255,0.08)
- 포커스: border-color #5b6ef5

---

## 시스템 컨텍스트 (Claude.ai 아티팩트용)

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
배경: #090909, surface: #0f0f0f, primary: #5b6ef5

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object
- 외부 라이브러리 import 없음

## 컴포넌트 프롬프트

React 18 + inline style로 ExplorePage의 카테고리 탭바를 Cosmos 앱처럼 심플하게 만들어줘.
- 배경 #090909 다크
- 탭: 텍스트만 (pill 없음), 활성 탭은 bold + 하단 2px 흰색 라인
- 비활성 탭: rgba(255,255,255,0.45) 회색
- 수평 스크롤
- 탭 아래 1px 구분선 rgba(255,255,255,0.08)
