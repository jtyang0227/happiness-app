---
name: warn-secret-literal
enabled: true
event: file
conditions:
  - field: content
    operator: regex_match
    pattern: (AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{24,}|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|BEGIN [A-Z ]*PRIVATE KEY)
---

⚠️ **시크릿처럼 보이는 문자열이 파일에 들어갑니다.**

실제 키·토큰이면 지우고 환경 변수(`${VAR}`)로 바꾸세요. 예시 값이면 `YOUR_...` 같은 자리표시자를 씁니다.
