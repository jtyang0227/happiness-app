# Cloudflare Code Mode MCP (`.mcp.json`의 `cloudflare-api`)

Claude Code로 이 저장소를 작업할 때 **Cloudflare 계정 전체 API**(Pages·DNS·Workers·R2·방화벽 등 약 2,500개 엔드포인트)를
도구 2개로 다루는 Cloudflare 공식 원격 MCP 서버. 제품 기능이 아니라 개발 도구다(제품용 MCP는 `mcp-server/`).

- 출처: Cloudflare 블로그 "Code Mode: give agents an entire API in 1,000 tokens"(2026-02-20) — 한국어 요약 가이드
  sdk-kim-builds.com/guides/cloudflare-code-mode-mcp (2026-11-23).
- 서버: `https://mcp.cloudflare.com/mcp` (HTTP, 패키지 설치·API 키 없음 — 처음 연결 시 브라우저로 Cloudflare 로그인 + 허용할 권한 선택, OAuth)
- 도구 2개 (컨텍스트 약 1,000토큰, 엔드포인트마다 도구를 만들면 100만 토큰 이상)
  - `search` — OpenAPI 명세를 JavaScript로 검색해 필요한 엔드포인트만 찾는다(읽기 전용) → `.claude/settings.json`에서 **허용**
  - `execute` — 모델이 쓴 JavaScript로 Cloudflare API를 호출(여러 호출·페이지 넘김을 한 번에). **바꾸는 작업이 가능**하므로 `permissions.ask` — 매번 확인
  - 둘 다 Cloudflare Dynamic Worker 샌드박스에서 실행(파일시스템·환경 변수 없음, 외부 요청 기본 차단)

## 이 프로젝트에서 쓰는 곳

무료 호스팅 전환(`DESIGN_PROMPTS/planning/PLANNING_free-hosting.md`)에서 웹은 **Cloudflare Pages**, DNS·SSL은 Cloudflare다. 예:
- "happiness-app Pages 프로젝트의 최근 배포 상태와 실패 로그 보여줘"
- "happiness.io.kr DNS 레코드 목록(api·app·www) 확인해줘"
- "Pages 프로젝트 환경 변수 이름 목록"(값은 출력하지 말 것)
- "SSL/TLS 모드가 Full (strict)인지, Always Use HTTPS가 켜졌는지"

## 규칙

- **조회는 자유, 변경은 사용자 확인 후** — DNS 레코드·Pages 설정·환경 변수·방화벽 변경은 프로젝트 지침의 "배포 설정 변경"에 해당.
  `execute`가 확인 창을 띄우므로, 실행 전 무엇을 바꾸는지 사용자에게 말하고 승인받는다.
- OAuth 로그인 때 고르는 권한은 필요한 만큼만(처음엔 읽기 권한 위주: Account·Zone·DNS·Pages Read). 쓰기가 필요할 때 다시 연결해 넓힌다.
- 토큰·시크릿 값을 대화나 커밋에 남기지 않는다.

## 연결 방법

1. 저장소를 Claude Code로 열기(`.mcp.json` 자동 인식) → 대화형 `claude`에서 새 project 서버 승인
2. `/mcp` → `cloudflare-api` → Authenticate → 브라우저에서 Cloudflare 로그인·권한 선택
3. `/mcp`에서 connected 확인. 다른 MCP 클라이언트(Claude Desktop 등)는 같은 URL을 원격 서버로 추가.

**한계**: 클라우드 개발 세션(claude.ai 원격 컨테이너)은 네트워크 정책상 `mcp.cloudflare.com`에 접속하지 못하고 브라우저 OAuth도 할 수 없다 —
로컬 PC의 Claude Code·Claude Desktop에서 쓴다. 이 저장소 추가 시점에 클라우드 세션에서 접속 확인(HTTP 000)만 했고 실제 연결은 미확인.
