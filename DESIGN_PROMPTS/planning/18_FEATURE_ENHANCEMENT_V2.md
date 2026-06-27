# 18 — 기능 고도화 로드맵 V2 (현재 구현 기반 개선 아이디어)

> 작성일: 2026-06-19  
> 대상: 현재 구현된 전체 기능 → 차별화·수익화·UX 개선 관점에서 도출  
> 원칙: 외부 라이브러리 최소화, 기존 Spring Boot + React 스택 활용

---

## 현재 구현 기능 현황

| 영역 | 구현 완료 | 미흡한 부분 |
|------|----------|-----------|
| 갤러리 | 12컬럼 그리드, 무드 필터, 정렬 | 무한 스크롤 없음, 키보드 네비 없음 |
| 탐색 | 키워드+무드+비율 필터, 자동완성 | 결과 수 표시 없음, 빈 상태 UI 미흡 |
| 사진 상세 | 컬러팔레트, 전체화면, 공유, 댓글 | 다운로드 버튼 없음, EXIF 표시 미흡 |
| 포트폴리오 | 에디토리얼 레이아웃, 슬라이드쇼, 임베드 | 방문자 통계 없음, 커스텀 도메인 없음 |
| 이미지 에디터 | 색보정, 필터, 텍스트, 프리셋 | 폰트 3종, 크롭 없음 |
| 소셜 | 팔로우, 댓글, 문의, 피드 | DM 없음, 알림 없음 |
| 관리자 | 회원·사진·갤러리 순서 | 활동 로그 없음, 통계 차트 없음 |

---

## 아이디어 1 — 클라이언트 납품 포털 (Client Proofing)

### 배경
결혼·행사·상업 사진작가의 핵심 워크플로우: 촬영 → 보정 → 클라이언트 선택 → 납품.  
현재 이 과정을 이메일로 처리하는 작가가 대부분 → 앱 안에서 완결 가능.

### 기능
```
/proof/:token  — 공개 링크 (로그인 불필요, 토큰 기반)
```

| 기능 | 설명 |
|------|------|
| 앨범 공유 | 작가가 시리즈를 비공개 토큰 링크로 공유 |
| 사진 선택 | 클라이언트가 납품받을 사진에 ✓ 체크 |
| 코멘트 | 사진별 메모 ("이 사진 더 밝게 해주세요") |
| 승인 제출 | "선택 완료" 버튼 → 작가에게 이메일 알림 |
| 다운로드 | 승인된 사진만 ZIP 다운로드 (JSZip 또는 Backend ZIP API) |

**유저 스토리**: 작가는 `/series/1/share` 버튼으로 토큰 링크 생성 → 클라이언트에게 전달  
**AC**: 토큰 24시간 만료, 선택 내역 DB 저장, 작가는 인박스에서 확인 가능

### 구현 난이도: ⭐⭐⭐ (중)
- Backend: `ProofToken` 테이블, `GET /proof/:token`, `POST /proof/:token/selections`
- Frontend: 새 공개 라우트 `/proof/:token`

---

## 아이디어 2 — 방문자 분석 대시보드 (Portfolio Analytics)

### 배경
작가가 "내 포트폴리오에 누가 얼마나 방문하는지"를 알고 싶어함.

### 기능

| 지표 | 설명 |
|------|------|
| 포트폴리오 방문 수 | 일별/주별/월별 |
| 가장 많이 본 사진 Top 5 | 조회 수 기준 |
| 유입 경로 | Referrer 분석 (SNS·검색·직접) |
| 문의 전환율 | 방문 대비 문의 비율 |
| 슬라이드쇼 완료율 | 전체 슬라이드를 끝까지 본 비율 |

### 구현

**Backend**: `PortfolioView` 엔티티 (portfolioId, referrer, userAgent, createdAt)  
**Frontend**: AdminDashboardPage에 작가별 Analytics 탭 추가  
**차트**: Canvas API로 직접 그리기 (외부 차트 라이브러리 없이)  

```javascript
// 막대 차트 직접 구현 (Canvas)
function drawBarChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const max = Math.max(...data.map(d => d.value));
  data.forEach((d, i) => {
    const h = (d.value / max) * (canvas.height - 40);
    ctx.fillStyle = '#5b6ef5';
    ctx.fillRect(i * 60 + 10, canvas.height - h - 20, 40, h);
  });
}
```

### 구현 난이도: ⭐⭐ (낮음~중)

---

## 아이디어 3 — AI 스마트 앨범 자동 분류

### 배경
AutoTagService는 이미 있음 (키워드 추출 + MOOD_TAGS 매핑).  
한 걸음 더 나아가 업로드된 사진을 자동으로 앨범에 분류.

### 기능

| 분류 기준 | 설명 |
|----------|------|
| 무드 자동 그룹 | WARM·COOL·DRAMATIC 등 무드별 자동 시리즈 생성 |
| 날짜 기반 앨범 | EXIF 날짜 → "2026년 6월 웨딩" 자동 앨범명 |
| 인물/풍경 감지 | 파일명+태그 기반 휴리스틱 분류 |
| 중복 감지 | 비슷한 사진 묶기 (해시 비교) |

### 구현 (백엔드)

```java
// AutoAlbumService.java
@Service
public class AutoAlbumService {
  public void classifyNewPhoto(Photo photo) {
    String mood = photo.getColorMood();
    if (mood != null) {
      Series moodSeries = seriesRepository
        .findByMemberIdAndTitle(photo.getMemberId(), mood + " 컬렉션")
        .orElseGet(() -> createAutoSeries(photo.getMemberId(), mood));
      seriesPhotoRepository.save(new SeriesPhoto(moodSeries, photo));
    }
  }
}
```

### 구현 난이도: ⭐⭐ (낮음~중)

---

## 아이디어 4 — 촬영 예약 캘린더

### 배경
InquiryFormPage로 문의를 받지만, 일정 확인이 이메일로만 이루어짐.

### 기능

| 기능 | 설명 |
|------|------|
| 가용 일정 등록 | 작가가 월별 캘린더에 촬영 가능한 날짜 선택 |
| 실시간 예약 | 클라이언트가 가용 날짜 클릭 → 문의 폼으로 연결 |
| 예약 현황 | 작가가 확정·대기·취소 상태 관리 |
| iCal 내보내기 | `.ics` 파일로 구글/애플 캘린더 연동 |

### 구현

**Backend**: `ShootSchedule` 엔티티 (memberId, date, status ENUM: AVAILABLE·BOOKED·BLOCKED)  
**Frontend**: `/portfolio/:profileName` 하단에 캘린더 섹션 추가 (공개)  
**Calendar**: CSS Grid로 직접 구현 (외부 라이브러리 없이)  

```
[6월 2026]
Mo Tu We Th Fr Sa Su
 1   2   3   4   5  6  7
 8   9  10  11  12 13 14   ← 초록=예약가능, 빨강=마감
15  16  17  18  19 20 21
22  23  24  25  26 27 28
29  30
```

### 구현 난이도: ⭐⭐⭐ (중)

---

## 아이디어 5 — 사진 이야기 (Photo Story) 스크롤 내러티브

### 배경
Instagram Stories·Medium 스타일로 사진과 글을 섞은 스크롤 페이지.

### 기능
- 시리즈에 "스토리 모드" 옵션 추가
- 각 사진마다 제목·본문 텍스트 등록
- 스크롤 시 사진이 전환되는 Scroll Storytelling 레이아웃
- 고정(sticky) 이미지 + 텍스트 패럴랙스 효과

### 구현

```
/portfolio/:profileName/story/:seriesId  (공개)

레이아웃 예시:
  [화면 꽉 찬 커버 이미지]
  [스크롤 ↓]
  [좌측 sticky 사진 | 우측 스크롤 텍스트]
  [전체 폭 파노라마 사진]
  [2컬럼 비교 사진]
  [마지막: 문의하기 CTA]
```

### 구현 난이도: ⭐⭐ (낮음 — CSS position:sticky만 활용)

---

## 아이디어 6 — 다크모드 / 테마 전환

### 배경
PortfolioPage는 이미 다크 테마. 앱 전체(갤러리·탐색 등)는 라이트.  
OS 다크모드 감지 + 수동 토글 지원.

### 구현

```javascript
// hooks/useTheme.js
export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
}
```

**CSS 변수 전략**: `constants/colors.js`를 CSS 변수로 전환 → 테마 전환 시 자동 반영

### 구현 난이도: ⭐⭐ (낮음~중)

---

## 아이디어 7 — 인쇄용 포트폴리오 책 (Photo Book PDF)

### 배경
PrintButton이 `window.print()`를 호출하지만 레이아웃이 슬라이드쇼 기준.  
A4/A3 규격 PhotoBook 스타일 PDF가 필요한 작가가 많음.

### 기능

| 항목 | 설명 |
|------|------|
| 페이지 레이아웃 선택 | 1장/페이지·2장/페이지·잡지형 |
| 표지 디자인 | 작가명·로고·날짜 자동 배치 |
| 목차 | 시리즈별 섹션 제목 자동 생성 |
| 해상도 | 300dpi 고해상도 옵션 (이미지를 원본 URL로 로드) |
| 브랜딩 | 작가 로고 워터마크 자동 삽입 |

### 구현

```javascript
// Canvas → PDF 변환 (PDF 라이브러리 없이 — 브라우저 print CSS만)
// A4 @media print 에서 각 페이지를 div로 분리
// page-break-after: always

// 고해상도를 위해: CSS zoom 적용 후 print
```

### 구현 난이도: ⭐⭐⭐ (중, 레이아웃 엔진 구현 필요)

---

## 아이디어 8 — 빠른 공유 명함 (포토카드)

### 배경
작가가 명함 대신 사진+연락처를 담은 디지털 카드를 SNS에 공유하는 트렌드.

### 기능
```
/portfolio/:profileName/card  (공개)
```
- 작가 대표 사진 1장 + 이름 + 전문 분야 + 연락처
- 8가지 카드 디자인 템플릿
- "PNG로 저장" 버튼 (Canvas.toDataURL)
- "링크 공유" 버튼 (Web Share API)

### 구현 난이도: ⭐ (낮음)

---

## 우선순위 정리

| 아이디어 | 작가 가치 | 구현 난이도 | 우선순위 |
|----------|----------|-----------|---------|
| 클라이언트 납품 포털 | ★★★★★ | ⭐⭐⭐ | **P0** |
| 촬영 예약 캘린더 | ★★★★ | ⭐⭐⭐ | **P1** |
| 방문자 분석 대시보드 | ★★★★ | ⭐⭐ | **P1** |
| AI 스마트 앨범 | ★★★ | ⭐⭐ | **P1** |
| 다크모드 전환 | ★★★ | ⭐⭐ | **P1** |
| 사진 이야기 스크롤 | ★★★ | ⭐⭐ | **P2** |
| 포토북 PDF | ★★★ | ⭐⭐⭐ | **P2** |
| 디지털 명함 카드 | ★★ | ⭐ | **P2** |

---

## 수익화 연계 전략

| 기능 | 무료 | 프리미엄 ($9/월) |
|------|------|----------------|
| 포트폴리오 | 공개 1개 | 다중 도메인 |
| 사진 수 | 최대 50장 | 무제한 |
| 클라이언트 납품 포털 | ❌ | ✅ |
| 방문자 분석 | ❌ | ✅ |
| PhotoBook PDF | ❌ | ✅ |
| 예약 캘린더 | ❌ | ✅ |
| 커스텀 도메인 연결 | ❌ | ✅ |
