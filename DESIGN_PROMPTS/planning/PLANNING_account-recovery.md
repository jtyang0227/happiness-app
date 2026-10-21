# PLANNING — 아이디(이메일)·비밀번호 찾기 (2026-10-21)

> 요청: "작업이 끝나면 아이디, 비밀번호 찾기도 기획하고서 개발 진행해줘"
> 현재: 로그인 화면에 찾기 진입점이 없고, 비밀번호를 잊으면 복구 방법이 전혀 없다(고객센터도 없음).

## 1. 사용자 문제

| 상황 | 지금 | 목표 |
|---|---|---|
| 어느 이메일로 가입했는지 모름 | 방법 없음 | 이름 + 휴대폰 번호로 가입 이메일(일부 가림)과 가입 방식 확인 |
| 비밀번호를 잊음 | 방법 없음 | 이메일로 재설정 링크 → 새 비밀번호 |
| 카카오·구글 등으로 가입했는데 비밀번호를 찾음 | 로그인 실패만 반복 | "○○ 계정입니다, ○○로 로그인하세요" 안내 |

## 2. 흐름

### 2.1 아이디 찾기 — `POST /api/auth/find-email` `{name, tel}` (공개)
- 이름(공백 제거 후 완전 일치) + 휴대폰 번호(숫자만 비교 — 저장 형식이 `010-1234-5678`/`01012345678` 섞여 있음).
- 응답 `{ accounts: [{ maskedEmail, provider, createdAt(YYYY.MM.DD) }] }` — 없으면 빈 목록. 이메일은 가린다: `ja****@gmail.com`(로컬 파트 앞 2자만, 2자 이하면 1자).
- 휴대폰 번호를 등록하지 않은 회원은 찾을 수 없다 → 화면에 "가입 때 휴대폰 번호를 넣지 않았다면 비밀번호 찾기에서 이메일을 직접 입력해 보세요" 안내.

### 2.2 비밀번호 재설정 요청 — `POST /api/auth/password-reset/request` `{email}` (공개)
- **항상 같은 응답**(200, "가입된 이메일이면 재설정 메일을 보냈습니다") — 가입 여부를 노출하지 않는다.
- 이메일 회원(ACTIVE): 새 토큰 발급 → 이전 미사용 토큰 무효화 → 메일 발송(링크 `{FRONTEND_URL}/reset-password?token=…`, 30분 유효, 1회용).
- 소셜 회원(비밀번호 없음): 재설정 대신 "카카오 계정입니다" 안내 메일.
- 메일 서버 미설정(`MAIL_HOST` 없음): WARN 로그만, dev 프로필에서는 테스트용으로 링크를 INFO 로그에 남긴다(운영 로그에는 토큰을 남기지 않음).

### 2.3 토큰 확인·재설정
- `GET /api/auth/password-reset/verify?token=` → `{ valid, maskedEmail }` — 재설정 화면을 열 때 만료·사용됨을 먼저 알려 준다.
- `POST /api/auth/password-reset/confirm` `{token, newPassword}` → 비밀번호 규칙(8자 이상) 검사 → 저장 → 토큰 사용 처리 → **모든 기기 로그아웃**(refresh token 전부 삭제). 실패 사유: 만료/사용됨/없음 → 400 "링크가 만료되었거나 이미 사용되었습니다".

## 3. 보안

- 토큰: 32바이트 난수(URL-safe Base64), DB에는 **SHA-256 해시만** 저장(DB가 새도 링크를 못 만든다). 30분 만료, 1회용, 새 요청 시 이전 토큰 무효.
- 열거(enumeration) 방지: 재설정 요청은 가입 여부와 무관하게 같은 응답·같은 상태 코드. 아이디 찾기는 이름+번호 둘 다 맞아야 하고 이메일은 가려서만 보여 준다.
- 속도 제한(IP 기준, in-memory — 기존 `BookingService`·`NewsletterController`와 같은 패턴): 아이디 찾기 10분 5회, 재설정 요청 10분 5회 + 같은 이메일 1시간 3회, 재설정 확정 10분 10회. 초과 시 429 + 사유.
- 재설정 후 기존 refresh token 전부 폐기. (이미 발급된 access token은 만료(짧은 수명)까지 유효 — 알려진 한계.)
- 링크 주소는 서버 설정 `app.frontend-url`(`FRONTEND_URL`)로만 만든다 — 요청 헤더(Host)를 믿지 않는다(호스트 헤더 주입 방지).

## 4. 화면

- 로그인 화면 비밀번호 아래 "아이디 찾기 · 비밀번호 찾기" 링크(웹·모바일).
- 웹 `/find-account?tab=email|password`(공개, 로그인 화면과 같은 단독 레이아웃): 탭 2개. 결과는 같은 카드 안에서 보여 주고 "로그인하러 가기", "비밀번호 찾기" 버튼으로 잇는다.
- 웹 `/reset-password?token=`: 열면 토큰 확인 → 유효하면 새 비밀번호·확인(회원가입과 같은 blur 검사) → 완료 후 로그인 화면으로. 무효면 "다시 요청하기".
- 모바일 `FindAccountScreen`: 같은 두 탭. 재설정 링크는 메일에서 웹으로 열린다(모바일 딥링크는 범위 밖).

## 5. 데이터

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  member_id   BIGINT NOT NULL,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_member ON password_reset_tokens(member_id);
```
회원 탈퇴 시 토큰 행도 삭제.

## 6. 수용 기준

- AC-1 이름+번호가 맞으면 가린 이메일과 가입 방식이 보이고, 틀리면 "일치하는 계정이 없습니다". 번호는 하이픈 유무와 무관.
- AC-2 재설정 요청은 가입된/안 된 이메일 모두 같은 응답. 가입된 이메일 회원에게만 토큰이 생긴다.
- AC-3 링크로 새 비밀번호를 정하면 새 비밀번호로 로그인되고, 예전 비밀번호는 안 된다. 같은 링크 두 번째 사용·30분 지난 링크는 400.
- AC-4 재설정 후 기존 refresh token으로 재발급이 안 된다.
- AC-5 속도 제한 초과 시 429 + 사유.
- AC-6 로그인 화면(웹·모바일)에서 두 찾기로 들어갈 수 있다.

## 7. 운영 준비 (사용자 작업)

Railway Variables: `MAIL_HOST`/`MAIL_PORT`/`MAIL_USERNAME`/`MAIL_PASSWORD`/`MAIL_FROM`(예: Gmail 앱 비밀번호, Resend·SendGrid SMTP), `FRONTEND_URL=https://happiness.io.kr`.
메일 서버가 없으면 재설정 요청은 성공 응답이지만 메일이 가지 않는다.

## 8. 트레이드오프

- 휴대폰 본인인증(PASS 등)은 비용·계약이 필요해 제외 — 이름+번호 일치로 대신하고 이메일을 가려서 위험을 줄인다.
- 속도 제한을 in-memory로 둔 것은 기존 패턴과 같다. 서버를 여러 대로 늘리면 Redis(이미 있음)로 옮겨야 한다.

## 9. 구현 결과 (2026-10-21)

- 백엔드: `PasswordResetToken`·`PasswordResetTokenRepository`·`AccountRecoveryService`·`AccountRecoveryController`, SecurityConfig 4개 공개, `app.frontend-url`. 통합 테스트 4개 추가 → `./gradlew test` 39개 통과.
- 웹: `FindAccountPage`·`ResetPasswordPage`·로그인 링크. `npm run build` 통과. Playwright 390px(dev, 메일 서버 없음 → dev 로그의 링크 사용):
  로그인 → 아이디 찾기 → 빈 값 오류 → `01022223333` 자동 하이픈 → `jo*****@test.com`·"이메일 가입" → 비밀번호 찾기 탭 → 앞뒤 공백 이메일 요청 → "메일을 확인해 주세요"
  → 링크 열기(가린 이메일 표시) → 확인 불일치 오류 → 변경 완료 → 같은 링크 다시 열기 = 만료 화면. curl: 새 비밀번호 로그인 200, 예전 비밀번호 401. 가로 스크롤·페이지 에러 없음.
- 모바일: `FindAccountScreen` + 로그인 링크. `expo export` 통과, 웹 번들에서 탭 진입·빈 이메일 오류·번호 하이픈 확인(API 호출은 웹 번들에서 `expo-secure-store` 부재로 불가 → 실기기 확인 필요).
- 미확인: 실제 메일 발송(운영 `MAIL_*` 미설정 가능성), AC-4(재설정 후 refresh 재발급 차단)는 코드(`deleteAll`)로만 확인 — 테스트 환경에 Redis가 없어 저장소가 빈값을 돌려준다.
