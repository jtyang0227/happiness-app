# Happiness — 디자인 작업 로드맵

분석일: 2026-06-14

## 파일 구성

| 파일 | 포함 작업 |
|------|----------|
| `01_FOUNDATION.md` | Button · Input · EmptyState · Skeleton (공통 컴포넌트) |
| `02_GALLERY_EXPLORE.md` | 갤러리 반응형 · 탐색 정렬/필터 · 무한 스크롤 |
| `03_NAVIGATION_UX.md` | Header 재설계 · Modal UX · 접근성(a11y) |
| `04_PHOTO_FORM.md` | PhotoForm 레이아웃 · Before/After · 드래프트 자동저장 |
| `05_PROFILE_SOCIAL.md` | 댓글 컴포넌트 · 아바타 업로드 · 작가 프로필 페이지 |

---

## 우선순위

### P0 — 즉시 (UX 블로커)
- [ ] 빈 상태 UI → `01_FOUNDATION.md`
- [ ] 갤러리 모바일 2컬럼 → `02_GALLERY_EXPLORE.md`
- [ ] 댓글 컴포넌트 분리 (Modal+Detail 공용) → `05_PROFILE_SOCIAL.md`
- [ ] 모달 body 스크롤 잠금 → `03_NAVIGATION_UX.md`
- [ ] 이미지 alt 텍스트 → `03_NAVIGATION_UX.md`

### P1 — 단기 (1~2주)
- [ ] 스켈레톤 로딩 → `01_FOUNDATION.md`
- [ ] 공통 Button / Input 컴포넌트 → `01_FOUNDATION.md`
- [ ] Header 아바타 드롭다운 → `03_NAVIGATION_UX.md`
- [ ] 탐색 정렬 + 활성 필터 배지 → `02_GALLERY_EXPLORE.md`
- [ ] 프로필 아바타 업로드 → `05_PROFILE_SOCIAL.md`

### P2 — 중기 (1개월)
- [ ] PhotoForm 2컬럼 레이아웃 → `04_PHOTO_FORM.md`
- [ ] Before/After 비교 뷰 → `04_PHOTO_FORM.md`
- [ ] 무한 스크롤 → `02_GALLERY_EXPLORE.md`
- [ ] 드래프트 자동저장 → `04_PHOTO_FORM.md`
- [ ] 작가 공개 프로필 → `05_PROFILE_SOCIAL.md`

---

## 디자인 토큰 (전 파일 공통 참조)

```
primary '#5b6ef5'   primaryDark '#4458e0'   primaryLight '#eef0ff'
accent  '#a78bfa'   bg '#f5f5fa'            surface '#ffffff'
border  '#e2e2ee'   text '#1a1a2e'          textSecondary '#5c5c7a'
textMuted '#9090b0' danger '#e53e3e'        success '#22c55e'
darkBg '#0a0a18'   darkSurface '#12122a'   galleryBg '#0e0e0e'
radius: xs=4 sm=8 md=12 lg=16 full=9999
shadow: sm='0 2px 8px rgba(91,110,245,0.08)'
        md='0 4px 16px rgba(91,110,245,0.12)'
        focus='0 0 0 3px rgba(91,110,245,0.25)'
```

## 작업 원칙

1. P0 완료 후 P1 진입 (블로커 먼저)
2. `01_FOUNDATION` 완료 후 나머지 파일 작업 (Button/Input 먼저)
3. 모든 컴포넌트: 모바일 375px 테스트 필수
4. 기존 기능 회귀 없음 (갤러리/탐색/등록 수동 테스트)
