---
name: warn-blur-in-web
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: frontend/src/.*\.(jsx|js|css)$
  - field: content
    operator: regex_match
    pattern: backdrop-?[Ff]ilter
---

⚠️ **블러(backdrop-filter)는 Toss 플랫 디자인 규칙 위반입니다.**

허용 예외는 풀블리드 사진 위 컨트롤뿐입니다(`PortfolioSlideshowPage`, `PhotoViewer`의 로컬 `glass()`).
그 밖의 화면은 배경 불투명도를 높인 flat rgba + 중립 회색 그림자를 씁니다.
