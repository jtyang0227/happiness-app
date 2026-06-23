# 15 — 포트폴리오 슬라이드쇼 전체화면 + 임베드 코드 + PDF 인쇄

> 구현 완료일: 2026-06-19  
> 관련 파일:  
> - `frontend/src/pages/PortfolioSlideshowPage.jsx`  
> - `frontend/src/components/portfolio/PortfolioCoverPage.jsx`  
> - `frontend/src/components/portfolio/EmbedCodeModal.jsx`  
> - `frontend/src/components/portfolio/PrintButton.jsx`  
> - `frontend/src/components/portfolio/MagazineGrid.jsx`  
> 접근 경로: `/portfolio/:profileName/slideshow` (공개, 로그인 불필요, Header 없음)

---

## 기획 배경

작가가 클라이언트에게 포트폴리오를 발표할 때 쓸 수 있는 풀스크린 슬라이드쇼가 필요하다.  
또한 외부 블로그/사이트에 포트폴리오를 임베드하거나 PDF로 인쇄할 수 있어야 한다.

---

## 기능 구현 현황

### PortfolioSlideshowPage (`/portfolio/:profileName/slideshow`)

| 기능 | 구현 상태 | 설명 |
|------|----------|------|
| 풀스크린 슬라이드 | ✅ | `position: fixed, inset: 0` 블랙 배경 |
| 커버 페이지 (슬라이드 0) | ✅ | PortfolioCoverPage 컴포넌트 |
| 사진 슬라이드 (1~N) | ✅ | `object-fit: contain`, 페이드 인/아웃 (220ms) |
| 키보드 네비게이션 | ✅ | ← → Space(재생/일시정지) Esc(홈으로) |
| 터치 스와이프 | ✅ | 50px 이상 스와이프로 이전/다음 |
| 자동 재생 | ✅ | 3초 간격, hover 시 일시정지 |
| 도트 인디케이터 | ✅ | 최대 7개, 현재 슬라이드 강조 |
| 컨트롤 자동 숨김 | ✅ | 3초 마우스 정지 시 숨김, 이동 시 표시 |
| PDF 인쇄 | ✅ | PrintButton → `window.print()` + 인쇄 CSS |
| 임베드 코드 | ✅ | EmbedCodeModal — 3크기(소·중·전체화면) iFrame 코드 |

### PortfolioCoverPage (슬라이드 0 — 작가 소개)

- 다크 배경(darkBg #090909) 위에 작가 아바타 + 이름 + bio + 사진 수/팔로워 통계
- 중앙 정렬 세로 배치
- 아바타: 96px 원형 (없으면 이름 첫 글자)

### EmbedCodeModal

- 다크 테마(darkSurface #0f0f0f) 모달
- 크기 선택 탭: `600×400` / `800×500` / `전체화면(100%×600)`
- `<iframe src="...">` 코드 박스 (monospace, `#a0d0ff` 텍스트)
- "📋 코드 복사" 버튼 → 클립보드 복사 → "✓ 복사됨" 피드백

### MagazineGrid (PortfolioPage에서 magazine 레이아웃 시 사용)

- CSS columns: 3 (데스크탑) → 2 (태블릿) → 1 (모바일)
- `break-inside: avoid` 각 사진 카드
- 사진 카드: 세로 비율 유지(width 100%), hover 시 오버레이

---

## claude.ai 아티팩트 요청 프롬프트 — PortfolioSlideshowPage

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryLight:  '#eef0ff'
  text:          '#1a1a2e'
  textMuted:     '#9090b0'
  bg:        '#090909'
  surface:   '#0f0f0f'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

[컴포넌트 요청]
풀스크린 포트폴리오 슬라이드쇼 페이지를 만들어줘.

상태 (mock 데이터 사용):
- profileName: 'photographer'
- member: { name: '김하늘', bio: '감성 포트레이트 & 웨딩 사진작가', avatarUrl: null }
- photos: 6장 (imageUrl 없으므로 placeholder 색상 배경으로 대체)
- index: 현재 슬라이드 번호 (0 = 커버)

UI 구조:
1. 풀스크린 배경 (position: fixed, inset: 0, background: #000)
2. 슬라이드 영역 (중앙 정렬):
   - 슬라이드 0: 커버 페이지 (다크 배경, 작가 이름 + bio 중앙)
   - 슬라이드 1~: 사진 (object-fit: contain, 페이드 인/아웃)
3. 상단 오른쪽 컨트롤 바 (hover 시만 표시):
   - 슬라이드 번호 "2 / 7"
   - ⏸ / ▶ 재생/일시정지 버튼
   - 🖨️ 인쇄 버튼
   - </> 임베드 버튼
   - ✕ 닫기 버튼 (→ /portfolio/:profileName)
4. 좌우 화살표 버튼 (< >) — 화면 가장자리, 반투명 배경
5. 하단 도트 인디케이터 (최대 7개 도트, 현재 슬라이드 primary 색상)
6. 키보드 안내 텍스트 (하단 중앙, 아주 작게): "← → 이동  Space 재생  Esc 닫기"

인터랙션:
- hover 시 컨트롤 표시 (3초 후 자동 숨김)
- 페이드 전환 (opacity 0→1, 220ms)
- 모바일: 화살표 버튼 없음, 도트 인디케이터만
```

---

## claude.ai 아티팩트 요청 프롬프트 — EmbedCodeModal

```
[시스템 컨텍스트]
(위와 동일)

[컴포넌트 요청]
슬라이드쇼 임베드 코드 모달 컴포넌트를 만들어줘.

props: isOpen, onClose, profileName

UI:
- 다크 모달 (background: #0f0f0f, border: 1px solid rgba(255,255,255,0.1))
- 모달 배경: rgba(0,0,0,0.8)
- 헤더: "임베드 코드" 제목 + × 닫기 버튼
- 크기 선택 탭 3개: "600×400" / "800×500" / "전체화면"
  · 선택된 탭: primary(#5b6ef5) 배경 + 흰 텍스트
  · 미선택: 투명 배경 + textMuted 텍스트
- 코드 박스: <pre> 태그, monospace, 하늘색(#a0d0ff) 텍스트, 어두운 배경
  · 내용: <iframe src="https://app.example.com/portfolio/{profileName}/slideshow" ... >
- "📋 코드 복사" 버튼 (primary 색상) → 복사 후 "✓ 복사됨" (초록색) 2초
- 안내 문구: "삽입할 페이지에 위 코드를 붙여 넣으세요."
```

---

## UX 개선 아이디어 (다음 스프린트)

- 슬라이드 전환 효과 선택: 페이드 / 슬라이드 / 줌
- 슬라이드마다 작가 코멘트(description) 하단 자막으로 표시 토글
- 자동재생 속도 조절 (3s / 5s / 10s) UI
- QR코드 생성 버튼 (Canvas API, 외부 라이브러리 없이)
- 소셜 공유 버튼 (Web Share API)
