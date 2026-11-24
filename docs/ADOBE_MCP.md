# Photoshop · Lightroom Classic MCP 연결

Claude Code(또는 Claude Desktop)가 **내 PC의** Photoshop·Lightroom Classic을 직접 조작하게 하는 MCP 서버 설정이다.
두 서버 모두 Adobe와 무관한 **비공식 오픈소스(MIT)** 이고, 앱이 설치된 macOS/Windows에서만 동작한다
(클라우드 세션·Linux에서는 연결되지 않음).

| 이름 | 패키지(버전 고정) | 대상 | 동작 방식 |
|---|---|---|---|
| `photoshop` | `@alisaitteke/photoshop-mcp@1.7.38` ([GitHub](https://github.com/alisaitteke/photoshop-mcp)) | Photoshop | macOS AppleScript / Windows COM으로 ExtendScript 실행 |
| `lightroom` | `@mskalski/lightroom-mcp@0.27.0` ([GitHub](https://github.com/Automaat/lightroom-mcp)) | Lightroom Classic | 함께 들어 있는 Lua 플러그인과 통신 |

설정은 저장소 루트 `.mcp.json`에 이미 들어 있다(project scope).

## 처음 한 번
1. Node.js 18+ 설치, Photoshop / Lightroom Classic 설치.
2. Lightroom 플러그인 설치: `npx -y @mskalski/lightroom-mcp@0.27.0 install-plugin` → Lightroom Classic 재시작
   (파일 › 플러그인 관리자에서 활성 확인). 첫 실행 때 자동 설치되기도 한다.
3. macOS: Photoshop 제어를 처음 시도할 때 "터미널(또는 Claude)이 Adobe Photoshop을 제어하려고 합니다" →
   허용(시스템 설정 › 개인정보 보호 및 보안 › 자동화).
4. 이 저장소에서 `claude` 실행 → 새 project MCP 서버 승인 → `/mcp`로 `photoshop`·`lightroom`이 connected인지 확인.
   앱을 먼저 켜 두어야 도구 호출이 성공한다.

Claude Desktop에서 쓰려면 같은 `command`/`args`를 `claude_desktop_config.json`의 `mcpServers`에 넣는다.

## 안전 규칙
- 버전을 고정했다. 올릴 때는 GitHub 변경 내역을 보고 `.mcp.json`의 버전만 바꾼다(`@latest` 금지 — 공급망 위험).
- 두 서버의 도구는 `.claude/settings.json` 자동 허용에 넣지 않았다 → 파일 저장·카탈로그 변경마다 확인을 받는다.
- 원본 RAW·카탈로그는 작업 전 백업(Lightroom: 카탈로그 백업 켜기).

## Happiness와 함께 쓰는 예
1. "Lightroom에서 키워드 '웨딩', 별점 4 이상 사진 찾아서 내 프리셋 적용하고 2048px JPEG로 ~/Export/wedding 에 내보내줘"
2. "Photoshop으로 그 폴더 사진 오른쪽 아래에 워터마크 넣고 저장해줘"
3. Happiness 웹 "＋ 올리기"로 업로드 → "내 작업"에서 작업으로 묶기.
   업로드 자동화는 아직 없다 — `mcp-server/`(happiness-mcp-server)는 공개 GET만 감싸는 읽기 전용이다.

## 문제 해결
- `/mcp`에서 failed: Node 버전, 네트워크(npx 다운로드), 앱 실행 여부 확인.
- Lightroom 도구가 시간 초과: 플러그인이 꺼져 있거나 Lightroom이 모달 창을 띄운 상태.
- Windows Photoshop: COM 등록이 깨졌으면 Photoshop을 관리자 권한으로 한 번 실행.
