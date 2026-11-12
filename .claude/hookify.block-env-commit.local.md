---
name: block-env-commit
enabled: true
event: bash
action: block
pattern: git\s+add\b[^|;&]*(^|[\s/])\.env(\.local|\.[\w-]+\.local)?(\s|$)
---

🚫 **`.env` / `.env.local` 파일은 커밋하지 않습니다.**

시크릿은 `${VAR}` 참조나 호스트(GitHub Secrets·Railway·Render) 설정에만 둡니다.
템플릿이 필요하면 값 없는 `.env.example` / `.env.local.example`을 고칩니다.
