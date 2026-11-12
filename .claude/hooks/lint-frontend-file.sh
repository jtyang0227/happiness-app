#!/usr/bin/env bash
# PostToolUse(Write|Edit) — 방금 고친 웹 소스 파일 하나만 ESLint로 검사한다.
# 예전 훅은 편집마다 전체 `npm run build`를 돌렸고, 한 사람 PC의 절대 경로가 박혀 있어 다른 환경에서는 아무 일도 하지 않았다.
# 전체 빌드는 커밋 전에 `CI=true npm run build`로 따로 확인한다(CLAUDE.md 검증 규칙).
# 오류가 있으면 exit 2 + stderr → Claude가 바로 보고 고친다. 경고만 있거나 ESLint가 없으면 조용히 통과.

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""' 2>/dev/null)
case "$file" in
  */frontend/src/*.js|*/frontend/src/*.jsx) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null)}"
eslint="$root/frontend/node_modules/.bin/eslint"
[ -x "$eslint" ] || exit 0   # 의존성 미설치 환경에서는 건너뜀

config="$root/frontend/node_modules/eslint-config-react-app/index.js"   # CRA 빌드가 쓰는 규칙과 같다
[ -f "$config" ] || exit 0
out=$(cd "$root/frontend" && BROWSERSLIST_IGNORE_OLD_DATA=1 "$eslint" --quiet --no-eslintrc -c "$config" "$file" 2>&1)
if [ $? -ne 0 ] && [ -n "$out" ]; then
  echo "ESLint 오류 (${file#"$root"/}):" >&2
  echo "$out" | tail -30 >&2
  exit 2
fi
exit 0
