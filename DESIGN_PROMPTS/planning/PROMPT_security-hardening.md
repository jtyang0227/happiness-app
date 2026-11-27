# PROMPT — 보안 강화 점검 (2026-11-27)

> 요청: "보안쪽 강화하는 프롬프트 작성해서 바로 진행해줘"
> 이 문서는 지금 실행하는 점검의 지시서이자, 다음에 같은 점검을 다시 돌릴 때 그대로 붙여 넣는 프롬프트다.
> 결과 보고서: `SECURITY_AUDIT_2026-11-27.md`, 진행 기록: `WORK_QUEUE.md` "보안 강화" 묶음.
> 이전 점검: `SECURITY_AUDIT_2026-10-22.md`(IDOR 8건) — 같은 항목은 다시 보지 않고 회귀만 확인한다.

## 붙여 넣을 프롬프트

```
happiness-app 보안 강화 점검을 진행해줘. PROMPT_security-hardening.md 절차대로.
```

## 0. 전제

- 운영 중인 서버는 Spring `backend/`(2026-11-27 새 배포: Render + 새 Supabase + Upstash), 웹은 `frontend/`(Vercel).
  `apps/api`(Nest)·`apps/web`·`apps/admin`은 컷오버 대기 — **둘 다 고친다**(Nest가 곧 운영이 되므로 Spring과 같은 수준이어야 한다).
- Spring ↔ Nest는 계약 테스트로 1:1 호환을 지킨다. 응답 형식·상태 코드를 바꾸는 수정은 양쪽을 같이 고치거나 의도적 차이로 기록한다.
- 검증은 저장소에 있는 명령만(`PROJECT_MEMORY.md` 3절).

## 1. 바로 고쳐도 되는 것 / 먼저 확인받을 것

| 바로 적용 | 제안으로만 정리(사용자 확인 후) |
|---|---|
| 응답 보안 헤더 추가, 로그에서 비밀값·토큰·개인정보 가리기, 업로드 형식·크기 검사 강화(지금 허용 범위 안에서), 입력 길이 상한·형식 검사(정상 사용자 입력이 막히지 않는 범위), 의존성 패치·마이너 업데이트(빌드·테스트 통과 시), 메모리 누수형 DoS(무한히 커지는 맵) 정리, 문서 | 인증·권한 동작 변경(토큰 수명, 비밀번호 정책, 로그인 잠금 기준, 새 역할 검사), CORS 허용 도메인 변경, 운영 DB 스키마·RLS, 배포 설정(Render·Vercel·Cloudflare 환경 변수·헤더), 메이저 버전 업그레이드, 키 재발급 |

## 2. 점검 항목 (순서대로, 항목마다 커밋)

1. **비밀값 노출** — 추적 중인 파일과 git 이력에서 키 모양 문자열(`eyJ`·`sk-`·`AKIA`·`ghp_`·`-----BEGIN`·`service_role`), `.env*` 추적 여부, 웹·모바일 번들에 들어가는 값(`REACT_APP_*`·`NEXT_PUBLIC_*`·`EXPO_PUBLIC_*`)에 서버 전용 키가 섞였는지, 기본 비밀값(JWT·암호화 키)이 운영에서 쓰일 수 있는 경로.
2. **의존성 취약점** — `npm audit --omit=dev`(apps/api·apps/web·apps/admin·frontend·mobile·mcp-server), Gradle 의존성 버전 대조. 운영 런타임에 들어가는 high/critical만 우선, 패치·마이너로 해결되는 것만 적용.
3. **보안 헤더·CORS** — Spring `SecurityConfig.headers`, Nest `main.ts`, 웹 정적 호스팅 헤더(`frontend/public/_headers`·`vercel.json`·`apps/*/next.config`), CORS 와일드카드·credentials 조합.
4. **레이트리밋·잠금** — 전역 IP 제한(Spring `RateLimitFilter`·`IpBlockFilter` ↔ Nest), 로그인·계정 찾기·문의·업로드·AI 호출 같은 비용·남용 경로, 인메모리 맵의 무한 증가.
5. **입력·업로드 검증** — 요청 본문 크기 상한, 문자열 길이, 정렬·페이지 파라미터, 파일 업로드(MIME 위조·매직 바이트·크기·폴더 경로), 외부 URL을 서버가 대신 여는 곳(SSRF), 원시 SQL 결합.
6. **로그 민감정보** — 비밀번호·토큰·이메일·전화·재설정 링크·Authorization 헤더가 로그에 남는 곳(Spring `log.*`, Nest `console.*`/`Logger`, 프록시·요청 로깅, 웹·모바일 `console.log`).
7. **보고서** — `SECURITY_AUDIT_2026-11-27.md`: 발견·수정 표(위치·문제·심각도·수정), 확인했고 문제없던 것, 검증 명령과 결과, **사용자 할 일**(키 재발급 등), 제안(확인 필요) 목록. PROJECT_MEMORY·CLAUDE.md 갱신.

## 3. 검증

- 바꾼 영역만: 백엔드 `./gradlew clean build -x test && ./gradlew test`, Nest `npm run build`(+ 바뀐 경로가 있으면 계약 테스트 양쪽),
  웹 `CI=true npm run build`, 어드민 웹 `typecheck·test·build`, 모바일 `npx expo export --platform web`.
- 수정마다 "고치기 전 재현 → 고친 뒤 확인"을 curl·테스트로 남긴다. 확인 못 한 것은 보고서에 그렇게 쓴다.

## 4. 알려진 사용자 할 일 (코드로 못 하는 것)

- **Supabase `service_role` 키가 채팅에 노출된 적이 있다 → Supabase 대시보드에서 재발급**(Settings › API › JWT/Service key 재생성) 후 Render 환경 변수 교체.
  재발급 전까지 그 키로 RLS를 무시하고 DB·Storage 전체를 읽고 쓸 수 있다.
- `backend/db/supabase-lockdown.sql` 실행(anon 키로 PostgREST 직접 접근 차단).
