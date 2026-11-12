---
name: block-force-push
enabled: true
event: bash
action: block
pattern: git\s+push\b[^|;&]*(--force(?!-with-lease)|\s-f(\s|$))
---

🚫 **강제 push는 이 저장소에서 금지입니다.**

- 작업 브랜치에 push한 뒤 `git push origin <브랜치>:master`로 fast-forward만 합니다.
- 히스토리가 어긋났으면 rebase 후 일반 push, 그래도 안 되면 사용자에게 먼저 확인합니다.
- 이미 병합된 브랜치를 다시 시작할 때만 `--force-with-lease`를 씁니다.
