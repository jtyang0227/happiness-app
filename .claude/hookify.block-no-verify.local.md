---
name: block-no-verify
enabled: true
event: bash
action: block
pattern: git\s+[^|;&]*(--no-verify\b|-c\s+core\.hooksPath=)
---

🚫 **git 훅 우회(`--no-verify`, `-c core.hooksPath=`)는 금지입니다.** (출처: ECC block-no-verify, MIT)

훅이 막았다면 그 이유(린트·시크릿·빌드)를 고친 뒤 다시 커밋합니다. 정말 우회가 필요하면 사용자에게 먼저 확인합니다.
