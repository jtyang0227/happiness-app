# 보안 점검 (2026-10-22)

> 요청: "보안적 점검해줘 혹시 취약점이 있으면 수정하고 검증까지해줘"
> 범위: 백엔드 컨트롤러 전수(요청 파라미터의 `memberId`를 그대로 믿는 곳), 공개 엔드포인트(SecurityConfig permitAll),
> 비밀값·설정, 웹 XSS(`dangerouslySetInnerHTML`), native 쿼리 문자열 결합, 추적 중인 시크릿 파일.

## 1. 발견·수정

| # | 위치 | 문제 | 심각도 | 수정 |
|---|---|---|---|---|
| 1 | `application.yml` `jwt.secret` | `JWT_SECRET`이 없으면 **저장소에 공개된 기본값**으로 서명 → 누구나 관리자(SA) 토큰 위조 가능. prod 파일은 덮어쓰지 않음 | 치명(조건부) | `JwtTokenProvider.initKey()` — prod 프로필에서 기본값·32바이트 미만이면 실행마다 새 난수 키 + ERROR 로그(서버는 계속 뜸, 재시작 시 로그인 풀림) |
| 2 | `PUT /api/delivery/{token}/approve·reject` | 비밀번호가 걸린 납품 세트도 **토큰만으로 승인·반려**(열람에만 비밀번호 검사), 의견 길이 무제한 | 높음 | 같은 비밀번호 검사·5회 실패 15분 차단 재사용, 의견 2000자. 웹 `ClientDeliveryPage`가 입력한 비밀번호를 메모리에 두고 함께 보냄 |
| 3 | `POST/DELETE /api/follows` | `followerId`를 믿어 남을 대신 팔로우·언팔로우 | 중간 | 본인·관리자 외 403 |
| 4 | `GET /api/feed` | 남의 `memberId`로 그 사람의 피드(팔로우 관계) 조회, `size` 무제한 | 중간 | 본인·관리자 외 403, size 1~50 |
| 5 | `POST /api/photos/{id}/tags` | 누구나 남의 사진에 **임의 이름**으로 태그 | 중간 | 사진 주인·관리자만, 이름은 서버가 회원 정보로 채움(요청 `memberName` 무시·선택), 없는 회원 404 |
| 6 | `DELETE /api/photos/{id}/tags/{tagId}` | 로그인한 누구나 아무 태그 삭제, 태그가 그 사진 것인지 미확인 | 중간 | 사진 주인·태그된 본인·관리자만, 다른 사진의 태그면 404 |
| 7 | `POST /api/photos/{id}/shares` | 남의 이름으로 공유 기록·공유 수 부풀리기 | 낮음 | 본인·관리자 외 403 |
| 8 | `POST /api/photos/{id}/auto-tags` | 남의 사진에도 유료 비전 API 호출 가능(비용 남용) | 낮음 | 사진 주인·관리자만 |

## 2. 확인했고 문제없던 것

운영 H2 콘솔 비활성, 웹에 `dangerouslySetInnerHTML` 없음, native 쿼리 1개는 파라미터 바인딩, 추적 중인 시크릿 파일 없음,
권한 변경은 `@PreAuthorize` WM/SA, 문의함·분석·시리즈·사진 생성은 이미 본인 검사, 분석 track은 소유자 확인.

## 3. 검증

- 통합 테스트 4개 추가(`CoreFlowIntegrationTest` — 팔로우/피드, 태그, 공유/AI 태그, 납품 비밀번호) + 단위 테스트 2개(`JwtTokenProviderTest`
  — 기본값으로 위조한 토큰이 prod에서 거절, 정상 비밀값은 재시작 후에도 같은 키).
- `./gradlew test` 50개 통과, `./gradlew clean build -x test` 성공, `npm run build` Compiled successfully.
- 기존 웹·모바일 호출부(팔로우·피드)는 모두 로그인 회원 id를 보내므로 영향 없음(grep 확인). 태그·공유 API는 앱에서 호출하는 곳이 없음.

## 4. 사용자 확인 필요

- **Railway Variables에 `JWT_SECRET`이 설정돼 있는지** 확인(`openssl rand -base64 64`). 없으면 배포 후 로그에 `[SECURITY] JWT_SECRET` ERROR가
  남고 재시작마다 모든 사용자가 다시 로그인해야 한다. 그동안 기본값으로 운영됐다면 기본값으로 위조된 토큰은 이 배포부터 무효가 된다.
- Railway 자동 배포가 멈춰 있어(CLAUDE.md CI/CD 절) 이 수정은 재배포 전까지 운영 API에 반영되지 않는다.

## 5. 남은 것(이번 범위 밖)

- 서버 rate limit·로그인 시도 제한이 모두 인메모리 — 인스턴스가 여러 개면 각자 센다.
- 이미 발급된 access token은 비밀번호 변경 후에도 만료(30분)까지 유효.
