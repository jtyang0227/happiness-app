# 19 — 포트폴리오 메타정보 & SEO 설계 (파비콘·OG·Twitter Card·Schema.org)

> 우선순위: P1 — 포트폴리오 링크를 SNS에 공유할 때 썸네일이 나와야 작가 신뢰도 상승  
> 현황: `public/index.html` — 정적 description 1개뿐, OG 태그 전무

---

## 1. 문제 정의

### 현재 상태

```html
<!-- public/index.html — 현재 -->
<meta name="description" content="Happiness — 포트폴리오 갤러리" />
<title>Happiness</title>
```

작가가 `/portfolio/photographer-kim` 링크를 카카오톡·인스타·X에 공유하면:
- 썸네일: ❌ 없음 (또는 기본 파비콘만)
- 제목: "Happiness" (모든 작가 동일)
- 설명: "Happiness — 포트폴리오 갤러리" (개인화 없음)
- 파비콘: Happiness 기본 아이콘 (작가별 개인화 없음)

### 목표 상태

```
카카오톡 미리보기:
┌────────────────────────────────────┐
│ [김하늘의 대표 사진 썸네일]          │
│ 김하늘 포트폴리오 — 웨딩 & 포트레이트 │
│ happiness.kr                       │
└────────────────────────────────────┘
```

---

## 2. 유저 스토리

```
As a 사진작가,
  나는 내 포트폴리오 링크를 카카오톡에 공유하면 내 대표 사진이 썸네일로 보이길 원한다.
  → OG:image 태그 필요

As a 사진작가,
  나는 구글에서 내 이름을 검색했을 때 내 포트폴리오가 나오길 원한다.
  → SEO 메타 태그 + Schema.org JSON-LD 필요

As a 사진작가,
  나는 방문자가 브라우저 탭에서 내 아바타 이미지를 파비콘으로 보길 원한다.
  → 동적 파비콘 변경 필요

As a 방문자,
  나는 검색 결과에서 작가의 사진 수·전문 분야를 미리 볼 수 있으면 클릭할지 결정하기 쉽다.
  → Rich Snippet (Schema.org ProfilePage) 필요
```

---

## 3. 수용 기준 (Acceptance Criteria)

### AC1 — Open Graph 태그 (카카오·페이스북·슬랙·Discord)

포트폴리오 페이지(`/portfolio/:profileName`) 접속 시:

```html
<meta property="og:type"        content="profile" />
<meta property="og:title"       content="김하늘 — 웨딩 & 포트레이트 사진작가" />
<meta property="og:description" content="감성적인 순간을 담는 사진작가 김하늘의 포트폴리오. 웨딩·인물·풍경 전문." />
<meta property="og:image"       content="https://cdn.supabase.co/.../cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height"content="630" />
<meta property="og:url"         content="https://app.example.com/portfolio/photographer-kim" />
<meta property="og:site_name"   content="Happiness" />
<meta property="og:locale"      content="ko_KR" />
```

### AC2 — Twitter Card (X 공유)

```html
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:site"        content="@happiness_photo" />
<meta name="twitter:title"       content="김하늘 — 웨딩 사진작가" />
<meta name="twitter:description" content="감성적인 순간을 담는 사진작가..." />
<meta name="twitter:image"       content="https://cdn.../cover.jpg" />
```

### AC3 — SEO 기본 메타

```html
<title>김하늘 포트폴리오 — 웨딩 & 포트레이트 | Happiness</title>
<meta name="description" content="감성적인 순간을 담는 사진작가 김하늘. 웨딩·인물·풍경 전문. 서울." />
<meta name="robots"      content="index, follow" />
<link rel="canonical"    href="https://app.example.com/portfolio/photographer-kim" />
<meta name="keywords"    content="사진작가, 웨딩 사진, 포트레이트, 서울, photographer-kim" />
```

### AC4 — Schema.org JSON-LD (Rich Snippet)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": {
    "@type": "Person",
    "name": "김하늘",
    "description": "웨딩 & 포트레이트 사진작가",
    "image": "https://cdn.../avatar.jpg",
    "url": "https://app.example.com/portfolio/photographer-kim",
    "sameAs": ["https://www.instagram.com/sky_kim_photo"],
    "jobTitle": "사진작가",
    "knowsAbout": ["웨딩 사진", "포트레이트", "풍경 사진"],
    "worksFor": {
      "@type": "Organization",
      "name": "프리랜서"
    }
  },
  "hasPart": [
    {
      "@type": "ImageObject",
      "url": "https://cdn.../photo1.jpg",
      "name": "웨딩 포트레이트",
      "description": "봄날의 웨딩 스냅"
    }
  ]
}
</script>
```

### AC5 — 동적 파비콘 (작가별 개인화)

```javascript
// PortfolioPage.jsx 내부 — 마운트 시 실행
useEffect(() => {
  if (member?.avatarUrl) {
    // 파비콘 변경
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = member.avatarUrl;

    // 탭 제목 변경
    document.title = `${member.name} 포트폴리오 — Happiness`;
  }

  // 페이지 이탈 시 원래 파비콘 복원
  return () => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = '/favicon.ico';
    document.title = 'Happiness';
  };
}, [member]);
```

### AC6 — 슬라이드쇼 메타정보

```
/portfolio/:profileName/slideshow 접속 시:
  title: "김하늘 포트폴리오 슬라이드쇼 — Happiness"
  og:image: 첫 번째 사진 URL
  robots: noindex (중복 콘텐츠 방지)
```

---

## 4. 기술 설계 — React SPA의 SEO 한계 극복 방법

### 문제: React SPA는 클라이언트 렌더링

카카오·페이스북 크롤러는 JavaScript를 실행하지 않음.  
→ `<head>` 태그에 있는 OG 메타를 읽을 수 없음.

### 해결 방법 3가지 (비교)

| 방법 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 서버 사이드 렌더링 (추천)** | Spring Boot에서 포트폴리오 HTML 생성 | 완벽한 SEO | 백엔드 Thymeleaf 추가 필요 |
| **B. 동적 `<head>` 업데이트** | PortfolioPage에서 `document.head` 직접 수정 | 즉시 구현 가능 | 크롤러에게는 무효 |
| **C. 프리렌더 서비스** | Cloudflare Workers에서 Bot 감지 시 prerender | 높은 SEO 효과 | 유료 또는 복잡한 설정 |

**채택 전략: A (Spring Boot SSR) — 포트폴리오 페이지만 선택적 적용**

---

## 5. 구현 설계 — Spring Boot SSR (Option A)

### 5-1. Thymeleaf 템플릿 추가

```
backend/src/main/resources/templates/
  portfolio.html   ← 신규 Thymeleaf 템플릿
```

```html
<!-- portfolio.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO -->
  <title th:text="${member.name} + ' 포트폴리오 — Happiness'">포트폴리오 — Happiness</title>
  <meta name="description" th:content="${member.bio ?: member.name + ' 사진작가의 포트폴리오'}" />
  <link rel="canonical" th:href="'https://app.example.com/portfolio/' + ${member.profileName}" />

  <!-- Open Graph -->
  <meta property="og:type"         content="profile" />
  <meta property="og:title"        th:content="${member.name} + ' — ' + ${member.specialties ?: '사진작가'}" />
  <meta property="og:description"  th:content="${member.bio ?: member.name + '의 사진 포트폴리오'}" />
  <meta property="og:image"        th:content="${coverPhotoUrl ?: member.avatarUrl}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"          th:content="'https://app.example.com/portfolio/' + ${member.profileName}" />
  <meta property="og:locale"       content="ko_KR" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       th:content="${member.name} + ' 포트폴리오'" />
  <meta name="twitter:image"       th:content="${coverPhotoUrl ?: member.avatarUrl}" />

  <!-- Favicon (작가 아바타) -->
  <link rel="icon" th:href="${member.avatarUrl ?: '/favicon.ico'}" type="image/x-icon" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json" th:utext="${schemaJson}"></script>
</head>
<body>
  <!-- React SPA로 리다이렉트 (JS 있는 경우) -->
  <script>
    window.location.href = '/portfolio/[[${member.profileName}]]';
  </script>
  <!-- JS 없는 크롤러를 위한 최소 HTML -->
  <h1 th:text="${member.name}">사진작가</h1>
  <p th:text="${member.bio}">포트폴리오</p>
  <ul>
    <li th:each="photo : ${photos}">
      <img th:src="${photo.thumbnailUrl}" th:alt="${photo.title}" />
    </li>
  </ul>
</body>
</html>
```

### 5-2. Spring Boot 컨트롤러 (SEO용 별도 엔드포인트)

```java
// portfolio/PortfolioSeoController.java
@Controller  // ← @RestController 아님 (Thymeleaf 반환용)
@RequestMapping("/portfolio")
public class PortfolioSeoController {

    @GetMapping("/{profileName}")
    public String portfolioPage(
            @PathVariable String profileName,
            @RequestHeader(value = "User-Agent", defaultValue = "") String ua,
            Model model) {

        // 크롤러만 Thymeleaf로 서빙, 일반 브라우저는 SPA로
        boolean isBot = isCrawler(ua);
        if (!isBot) {
            return "redirect:/#/portfolio/" + profileName; // React SPA fallback
        }

        Member member = memberRepository.findByProfileName(profileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<Photo> photos = photoRepository
                .findByMemberIdOrderByCreatedAtDesc(member.getId());

        model.addAttribute("member", member);
        model.addAttribute("photos", photos);
        model.addAttribute("coverPhotoUrl", getCoverPhotoUrl(member, photos));
        model.addAttribute("schemaJson", buildSchemaJson(member, photos));

        return "portfolio"; // templates/portfolio.html
    }

    private boolean isCrawler(String ua) {
        String lower = ua.toLowerCase();
        return lower.contains("googlebot") || lower.contains("facebookexternalhit")
            || lower.contains("twitterbot") || lower.contains("kakaotalk")
            || lower.contains("slackbot") || lower.contains("discordbot")
            || lower.contains("linkedinbot") || lower.contains("whatsapp");
    }
}
```

### 5-3. Schema.org JSON-LD 빌더

```java
private String buildSchemaJson(Member member, List<Photo> photos) {
    StringBuilder sb = new StringBuilder();
    sb.append("""
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "mainEntity": {
        "@type": "Person",
        "name": "%s",
        "description": "%s",
        "image": "%s",
        "url": "https://app.example.com/portfolio/%s"
        %s
        %s
      }
    }
    """.formatted(
        member.getName(),
        member.getBio() != null ? member.getBio().replace("\"", "\\\"") : "",
        member.getAvatarUrl() != null ? member.getAvatarUrl() : "",
        member.getProfileName(),
        member.getInstagramId() != null
            ? ",\"sameAs\": [\"https://www.instagram.com/" + member.getInstagramId() + "\"]" : "",
        member.getSpecialties() != null
            ? ",\"knowsAbout\": " + specialtiesToJsonArray(member.getSpecialties()) : ""
    ));
    return sb.toString();
}
```

---

## 6. 동적 `<head>` 업데이트 (Option B — 즉시 적용)

React SPA에서 `document.head`를 직접 수정 (크롤러 대응은 안 되지만 탭 제목·파비콘은 즉시 적용).

```javascript
// hooks/usePortfolioMeta.js
export function usePortfolioMeta(member, coverPhotoUrl) {
  useEffect(() => {
    if (!member) return;

    const title = `${member.name} 포트폴리오 — Happiness`;
    const desc  = member.bio || `${member.name} 사진작가의 포트폴리오`;
    const image = coverPhotoUrl || member.avatarUrl;

    // 탭 제목
    document.title = title;

    // 파비콘
    setFavicon(member.avatarUrl);

    // meta 태그 헬퍼
    setMeta('description', desc);
    setOg('title', title);
    setOg('description', desc);
    setOg('image', image);
    setOg('type', 'profile');

    return () => {
      document.title = 'Happiness';
      setFavicon('/favicon.ico');
      setMeta('description', 'Happiness — 포트폴리오 갤러리');
    };
  }, [member, coverPhotoUrl]);
}

function setFavicon(href) {
  let el = document.querySelector("link[rel~='icon']");
  if (!el) { el = document.createElement('link'); el.rel = 'icon'; document.head.appendChild(el); }
  el.href = href || '/favicon.ico';
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content || '';
}

function setOg(property, content) {
  let el = document.querySelector(`meta[property="og:${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', `og:${property}`); document.head.appendChild(el); }
  el.content = content || '';
}
```

**사용처**: `PortfolioPage.jsx`, `PortfolioSlideshowPage.jsx`

```javascript
// PortfolioPage.jsx
import { usePortfolioMeta } from '../hooks/usePortfolioMeta';

export default function PortfolioPage() {
  const { data } = usePortfolioData(profileName);
  usePortfolioMeta(data?.member, data?.coverPhotoUrl);
  // ...
}
```

---

## 7. 파비콘 설계 가이드

### 크기별 필요 파비콘

```
public/
  favicon.ico         — 16×16, 32×32 (IE 호환)
  favicon-32.png      — 32×32 (Chrome)
  favicon-180.png     — 180×180 (iOS Safari "홈화면 추가")
  favicon-192.png     — 192×192 (Android PWA)
  favicon-512.png     — 512×512 (PWA 스플래시)
```

### 현재 Happiness 브랜드 파비콘

```html
<!-- public/index.html에 추가 -->
<link rel="icon"             href="/favicon.ico" sizes="any" />
<link rel="icon"             href="/favicon-32.png" type="image/png" />
<link rel="apple-touch-icon" href="/favicon-180.png" />
<link rel="manifest"         href="/manifest.json" />
```

### manifest.json (PWA — "홈화면에 추가" 지원)

```json
{
  "name": "Happiness 포트폴리오",
  "short_name": "Happiness",
  "description": "사진작가 포트폴리오 갤러리",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#090909",
  "theme_color": "#5b6ef5",
  "icons": [
    { "src": "/favicon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 8. 사이트맵 자동 생성

```java
// SitemapController.java (공개)
@GetMapping("/sitemap.xml")
@ResponseBody
public ResponseEntity<String> sitemap() {
    List<Member> members = memberRepository.findAll();
    StringBuilder xml = new StringBuilder("""
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        """);
    members.stream()
        .filter(m -> m.getProfileName() != null && m.isPublicProfile())
        .forEach(m -> xml.append("""
            <url>
              <loc>https://app.example.com/portfolio/%s</loc>
              <lastmod>%s</lastmod>
              <changefreq>weekly</changefreq>
              <priority>0.8</priority>
            </url>
            """.formatted(m.getProfileName(), m.getUpdatedAt().toLocalDate())));
    xml.append("</urlset>");
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_XML)
        .body(xml.toString());
}
```

---

## 9. 구현 우선순위

| 작업 | 구현 시간 | 효과 |
|------|----------|------|
| `usePortfolioMeta` 훅 (Option B) | 2시간 | 탭 제목·파비콘 즉시 개선 |
| OG 이미지용 커버 사진 선정 로직 | 1시간 | SNS 공유 시 썸네일 |
| manifest.json + PWA 아이콘 | 1시간 | 홈화면 추가 지원 |
| Thymeleaf SSR 포트폴리오 (Option A) | 1일 | 완벽한 크롤러 대응 |
| Schema.org JSON-LD | 2시간 | 구글 리치 스니펫 |
| /sitemap.xml 생성 | 1시간 | 구글 인덱싱 가속 |
| robots.txt 추가 | 30분 | 크롤링 가이드 |

---

## 10. 트레이드오프

| 방안 | 비용 | 구현 난이도 | SEO 효과 |
|------|------|-----------|---------|
| Option B (동적 head) | 무료 | ⭐ | SNS 공유 일부 작동 |
| Option A (Spring Boot SSR) | 없음 (기존 스택) | ⭐⭐⭐ | 완전한 SEO |
| Next.js 마이그레이션 | 없음 (오픈소스) | ⭐⭐⭐⭐ | 완전한 SSR + 더 나은 DX |
| Cloudflare Workers + Prerender | $5/월 | ⭐⭐ | 90% SEO |

**권장 순서**: Option B 즉시 적용 → Option A(Spring Boot SSR) 포트폴리오 페이지 한정 적용
