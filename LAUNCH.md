# Happiness App — 운영 런치 가이드

> 도메인 구매 완료 기준으로 작성. 이 문서 하나로 최초 배포부터 지속 운영까지 커버.

---

## 현재 상태 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 소스코드 | ✅ 완성 | GitHub `master` 브랜치 |
| CI/CD 파이프라인 | ✅ 완성 | `.github/workflows/deploy.yml` |
| Docker 이미지 빌드 | ✅ 완성 | GHCR 자동 푸시 |
| 도메인 구매 | ✅ 완료 | Cloudflare DNS 연결 필요 |
| Supabase 설정 | ⬜ 필요 | DB + Storage |
| Railway 배포 | ⬜ 필요 | Backend |
| Vercel 배포 | ⬜ 필요 | Frontend |
| GitHub Secrets 등록 | ⬜ 필요 | CI/CD 자동화 키 |
| Cloudflare DNS | ⬜ 필요 | 도메인 → 서비스 연결 |

---

## 아키텍처 (최종)

```
사용자 (웹 / iOS / Android)
         │
         ▼
   Cloudflare CDN + SSL
         │
   ┌─────┴──────────────┐
   ▼                    ▼
app.도메인.com        api.도메인.com
   │                    │
 Vercel              Railway
 React SPA           Spring Boot
 (무료)              ($5/월)
                         │
          ┌──────────────┼────────────┐
          ▼              ▼            ▼
    Supabase DB    Supabase       Upstash Redis
    PostgreSQL     Storage        (무료)
    (무료 500MB)   (무료 1GB)
```

---

## Step 1 — Supabase 프로젝트 생성

> **소요시간: 10분**

1. [supabase.com](https://supabase.com) → New Project
   - Region: **Northeast Asia (ap-northeast-1)**
   - DB Password: 강력한 비밀번호 저장 (나중에 필요)

2. **Settings → API** 에서 복사:
   ```
   Project URL      → SUPABASE_URL
   anon/public key  → SUPABASE_ANON_KEY
   service_role key → SUPABASE_SERVICE_ROLE_KEY  ← 절대 외부 노출 금지
   ```

3. **Storage → New Bucket**:
   - Name: `images`
   - Public: **ON**

4. **Storage → Policies** 설정:
   ```sql
   -- SELECT: 전체 공개
   CREATE POLICY "Public read" ON storage.objects
     FOR SELECT USING (bucket_id = 'images');

   -- INSERT: 인증 유저만
   CREATE POLICY "Auth upload" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
   ```

5. **Settings → Database → Connection string** 복사 → `DATABASE_URL`

---

## Step 2 — Upstash Redis 생성

> **소요시간: 5분**

1. [upstash.com](https://upstash.com) → Create Database
   - Region: **ap-northeast-1 (Tokyo)**
   - Type: Redis

2. **Details** 탭에서 복사:
   ```
   REDIS_URL=redis://default:TOKEN@HOST:PORT
   ```

---

## Step 3 — Railway 백엔드 배포

> **소요시간: 15분**

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
   - 레포 선택 → `happiness-app`

2. **Variables** 탭에서 아래 환경변수 전부 입력:

   ```bash
   SPRING_PROFILES_ACTIVE=prod
   JWT_SECRET=<openssl rand -base64 64 결과값>
   SUPABASE_URL=<Step 1에서 복사>
   SUPABASE_ANON_KEY=<Step 1에서 복사>
   SUPABASE_SERVICE_ROLE_KEY=<Step 1에서 복사>
   SUPABASE_BUCKET=images
   DATABASE_URL=<Step 1에서 복사>
   REDIS_URL=<Step 2에서 복사>
   CORS_ALLOWED_ORIGINS=https://app.도메인.com,https://도메인.com
   ```

3. **Settings → Networking** → Generate Domain → 메모해둠
   - 예: `happiness-backend-production.up.railway.app`

4. (나중에) Custom Domain: `api.도메인.com` 추가

5. **Account → Tokens** → 토큰 생성 → `RAILWAY_TOKEN` 메모

---

## Step 4 — Vercel 프론트엔드 배포

> **소요시간: 10분**

1. [vercel.com](https://vercel.com) → Add New Project → Import `happiness-app`
   - Framework: **Create React App**
   - Root Directory: `frontend`

2. **Environment Variables** 설정:
   ```bash
   REACT_APP_API_URL=https://api.도메인.com/api
   REACT_APP_SUPABASE_URL=<Step 1에서 복사>
   REACT_APP_SUPABASE_ANON_KEY=<Step 1에서 복사>
   ```

3. **Settings → General** 에서 복사:
   - `VERCEL_PROJECT_ID`

4. **vercel.com/account/tokens** → Create Token → `VERCEL_TOKEN`

5. **Settings → General → Team ID** → `VERCEL_ORG_ID`

6. (나중에) Domains: `app.도메인.com` 추가

---

## Step 5 — GitHub Secrets 등록

> **소요시간: 10분**
>
> GitHub repo → **Settings → Secrets → Actions → New repository secret**

| Secret 이름 | 값 |
|-------------|-----|
| `RAILWAY_TOKEN` | Step 3에서 복사 |
| `VERCEL_TOKEN` | Step 4에서 복사 |
| `VERCEL_ORG_ID` | Step 4에서 복사 |
| `VERCEL_PROJECT_ID` | Step 4에서 복사 |
| `REACT_APP_API_URL` | `https://api.도메인.com/api` |
| `REACT_APP_SUPABASE_URL` | Supabase URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anon key |

> 등록 완료 후 `master` 브랜치에 아무 커밋이나 push → GitHub Actions에서 자동 배포 확인.

---

## Step 6 — Cloudflare DNS 설정

> **소요시간: 10분**

### 도메인을 Cloudflare로 이관 (아직 안 했다면)

1. [cloudflare.com](https://cloudflare.com) → Add a Site → 도메인 입력
2. 도메인 구매처(가비아/네임칩 등)에서 네임서버를 Cloudflare 네임서버로 변경
3. 전파 대기: 최대 24시간 (보통 30분 이내)

### DNS 레코드 추가

Cloudflare → DNS → Add record:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `app` | `cname.vercel-dns.com` | ✅ ON |
| CNAME | `api` | `xxx.railway.app` | ✅ ON |
| CNAME | `@` | `cname.vercel-dns.com` | ✅ ON |
| CNAME | `www` | `app.도메인.com` | ✅ ON |

### SSL/TLS 설정

- **SSL/TLS → Overview**: `Full (strict)` 선택
- **SSL/TLS → Edge Certificates**: Always Use HTTPS **ON**

---

## Step 7 — 커스텀 도메인 연결

### Vercel에 도메인 추가
Vercel → Project → Settings → Domains:
- `도메인.com` 추가
- `app.도메인.com` 추가
- Vercel이 자동으로 SSL 인증서 발급

### Railway에 도메인 추가
Railway → Service → Settings → Networking → Custom Domain:
- `api.도메인.com` 추가

---

## Step 8 — 최종 동작 확인

```bash
# 백엔드 헬스체크
curl https://api.도메인.com/actuator/health
# 기대값: {"status":"UP"}

# 사진 목록 API
curl https://api.도메인.com/api/photos
# 기대값: [] 또는 사진 목록 JSON

# 프론트엔드 접속
open https://app.도메인.com
```

- [ ] 회원가입 / 로그인 정상 동작
- [ ] 사진 등록 (파일 업로드 → Supabase Storage 저장)
- [ ] 갤러리 표시
- [ ] 사진 보정 패널 동작
- [ ] 프리셋 저장/불러오기

---

## 월별 비용 정리

| 서비스 | 플랜 | 비용 |
|--------|------|------|
| Vercel | Hobby (무료) | **$0** |
| Railway | Hobby | **$5/월** |
| Supabase | Free | **$0** (500MB DB, 1GB Storage) |
| Upstash Redis | Free | **$0** (10K 명령/일) |
| Cloudflare | Free | **$0** |
| GitHub Actions | Free | **$0** (2,000분/월) |
| 도메인 | .com | **~$10/년** |
| **합계** | | **$5/월 + $10/년** |

> **용량 한계 도달 시 업그레이드 기준:**
> - Supabase DB 400MB 초과 → Pro $25/월
> - Supabase Storage 800MB 초과 → Pro $25/월
> - Upstash 8,000 cmd/일 초과 → Pay-as-you-go

---

## 지속 운영 체크리스트

### 매주

- [ ] Railway 대시보드에서 메모리/CPU 사용량 확인
- [ ] Supabase → Storage 용량 확인
- [ ] GitHub Actions 워크플로우 실패 여부 확인

### 매월

- [ ] Upstash Redis 일일 명령 수 확인 (10K 한계)
- [ ] Supabase DB 용량 확인 (500MB 한계)
- [ ] 백업: Supabase → Settings → Database → Download backup
- [ ] Railway 청구서 확인

### 배포할 때마다 (자동)

```
master 브랜치 push
  → GitHub Actions 자동 실행
    → Backend CI (테스트 + JAR 빌드)
    → Frontend CI (빌드)
    → Docker 이미지 → GHCR
    → Railway 자동 배포
    → Vercel 자동 배포
```

---

## 장애 대응 가이드

### 백엔드 다운 시

```bash
# Railway 로그 확인
railway logs --service backend

# 재시작
railway restart
```

### DB 연결 실패 시

1. Supabase → Settings → Database → Connection pooling 확인
2. Railway 환경변수 `DATABASE_URL` 값 재확인
3. Supabase → Logs → API 탭에서 에러 확인

### 이미지 업로드 실패 시

1. Supabase → Storage → Policies 재확인
2. `SUPABASE_SERVICE_ROLE_KEY` Railway 환경변수 재확인
3. Storage 용량 1GB 한계 확인

### Cloudflare 526 에러 (SSL)

- SSL/TLS 모드를 `Full` (strict 아님)으로 임시 변경
- Railway/Vercel 인증서 발급 대기 후 다시 `Full (strict)`으로

---

## 보안 운영 수칙

- `SUPABASE_SERVICE_ROLE_KEY`는 Railway 환경변수에만 존재 — 프론트/모바일/GitHub에 절대 노출 금지
- JWT Secret은 최소 256비트: `openssl rand -base64 64`
- `.env.local`은 절대 Git 커밋 금지 (`.gitignore`에 등록 완료)
- Cloudflare에서 악성 IP 차단 및 Rate Limiting 규칙 추가 권장
- 3개월마다 JWT Secret 교체 (Railway 환경변수 업데이트)

---

## 스케일링 로드맵

| 단계 | 기준 | 조치 |
|------|------|------|
| 현재 | ~100 DAU | 현재 구성 유지 |
| 성장 | 100~1,000 DAU | Supabase Pro ($25/월) |
| 확장 | 1,000~10,000 DAU | Railway Pro + CDN 이미지 리사이징 |
| 대형 | 10,000+ DAU | 자체 서버 또는 AWS/GCP 이전 |

---

*최종 업데이트: 2026-05-30*
