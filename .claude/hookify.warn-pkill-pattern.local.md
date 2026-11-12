---
name: warn-pkill-pattern
enabled: true
event: bash
pattern: (pkill\s+-f|kill\s+[^|;&]*\$\(pgrep\s+-f)
---

⚠️ **명령줄 패턴으로 프로세스를 죽이면 이 셸까지 함께 죽습니다(exit 144).**

로컬 서버는 포트로 종료합니다: `fuser -k 8080/tcp 3000/tcp` 또는 `lsof -ti:8080 | xargs kill`.
