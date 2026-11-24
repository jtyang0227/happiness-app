# happiness-api (NestJS + Prisma)

Spring Boot `backend/`를 기능 묶음 단위로 대체하는 TypeScript API. 계획·단계: `DESIGN_PROMPTS/planning/PLANNING_typescript-migration.md`.

- **옮긴 경로**는 여기서 처리하고, **안 옮긴 경로**는 `LEGACY_API_URL`(Spring)로 그대로 넘긴다 → 언제든 이 서버를 앞에 세워도 기능이 빠지지 않는다.
- JWT(같은 `JWT_SECRET`, HS256/384/512는 jjwt처럼 키 길이로 선택)·BCrypt·Redis 키(`rt:*`, `bl:*`)가 Spring과 같아 로그인·토큰이 두 서버 사이에서 그대로 통한다.
- DB 스키마의 주인은 아직 Hibernate. `prisma/schema.prisma`는 `prisma db pull`로 읽은 것이고 여기서 마이그레이션을 하지 않는다.

## 실행
```bash
cp .env.example .env    # 값 채우기
npm install
npm run build           # prisma generate + tsc
npm start               # :8090
```

## 계약 테스트 (Spring·Nest 양쪽에 같은 테스트)
```bash
# 1) 로컬 PostgreSQL + Redis, Spring을 같은 DB로 (스키마 생성 겸)
cd ../../backend && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/happiness \
  SPRING_DATASOURCE_USERNAME=happy SPRING_DATASOURCE_PASSWORD=happy \
  SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver SPRING_JPA_HIBERNATE_DDL_AUTO=update \
  SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect ./gradlew bootRun
# 2) 이 서버 (LEGACY_API_URL=http://localhost:8080)
# 3) 같은 테스트를 두 서버에
API_BASE_URL=http://localhost:8080 npm run test:contract
API_BASE_URL=http://localhost:8090 npm run test:contract
API_BASE_URL=http://localhost:8090 OTHER_API_BASE_URL=http://localhost:8080 npm run test:contract   # 서버 간 호환
```

## 옮긴 경로 (2026-11-24)
| 경로 | 비고 |
|---|---|
| `GET /actuator/health` | 배포 헬스체크 주소 유지 |
| `POST /api/auth/signup·login·refresh·logout`, `GET /api/auth/check-email·check-profile-name·member/{id}` | 계약 테스트 14개 |

## Spring과 의도적으로 다른 점
- 깨진 JSON 본문·숫자가 아닌 경로 변수: Spring은 처리 못 한 예외로 500, 여기서는 400 C002.
- 로그아웃 때 Redis가 죽어 있으면 Spring은 500(`TokenBlacklistService`에 예외 처리 없음), 여기서는 다른 Redis 사용처처럼 통과.
