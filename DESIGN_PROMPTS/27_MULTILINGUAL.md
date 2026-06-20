# 27 — 다국어(i18n) 표기 시스템

> 작성일: 2026-06-20  
> 상태: 기획 완료 (구현 대기)  
> 관련 파일: 전체 프론트엔드, Photo/Member 엔티티, Header.jsx

---

## 1. 배경 및 목적

### 현재 상태

| 항목 | 현재 |
|------|------|
| UI 언어 | 전 화면 한국어 하드코딩 |
| 사진 제목/설명 | 단일 언어 (작가가 입력하는 언어) |
| 작가 소개(bio) | 단일 언어 |
| i18n 인프라 | 없음 |
| 언어 전환 UI | 없음 |

### 왜 필요한가

```
현재 타깃 → 미래 타깃
한국 사진작가      외국 클라이언트도 포트폴리오를 보는 사진작가
한국 방문자        일본·중국·북미 방문자가 탐색하는 글로벌 갤러리
```

한국 작가의 포트폴리오를 일본·미국 클라이언트에게 보여주려면,  
UI가 영어로 표시되어야 하고 사진 캡션도 영어로 입력할 수 있어야 한다.

### 두 가지 다국어 레이어

```
Layer A — UI 번역 (i18n)
  정적인 UI 텍스트를 사용자 선택 언어로 표시
  예) "갤러리" → "Gallery" / "ギャラリー" / "图库"

Layer B — 콘텐츠 이중 언어 (Bilingual Content)
  작가가 사진 제목/설명/소개를 한국어 + 외국어로 입력
  예) 제목: "봄 산책" + "Spring Walk"
```

두 레이어는 독립적으로 동작한다.  
UI는 영어로 보더라도 작가가 영어 캡션을 입력하지 않으면 콘텐츠는 한국어 원본이 표시된다.

---

## 2. 지원 언어 4종

| 코드 | 플래그 | 언어명 | 자국 표기 | 우선 타깃 |
|------|--------|--------|---------|---------|
| `ko` | 🇰🇷 | 한국어 | 한국어 | 기본 (default) |
| `en` | 🇺🇸 | English | English | 북미·유럽·글로벌 |
| `ja` | 🇯🇵 | 일본어 | 日本語 | 일본 (K-photo 수요 高) |
| `zh` | 🇨🇳 | 중국어 | 中文 | 중화권 |

> **V2 확장 후보**: 프랑스어(fr), 스페인어(es), 아랍어(ar-RTL)

---

## 3. i18n 아키텍처 (외부 라이브러리 없음)

### 3-1. 번역 키-값 구조

```
frontend/src/
└── i18n/
    ├── index.js          ← TRANSLATIONS 맵 + useLang 훅 export
    ├── ko.js             ← 한국어 (기본)
    ├── en.js             ← 영어
    ├── ja.js             ← 일본어
    └── zh.js             ← 중국어
```

```javascript
// i18n/ko.js
export default {
  /* ─── 공통 ─── */
  'common.save':        '저장',
  'common.cancel':      '취소',
  'common.delete':      '삭제',
  'common.edit':        '수정',
  'common.upload':      '등록',
  'common.loading':     '불러오는 중...',
  'common.error':       '오류가 발생했습니다.',
  'common.retry':       '다시 시도',
  'common.noData':      '등록된 내용이 없습니다.',
  'common.submit':      '제출',
  'common.confirm':     '확인',
  'common.close':       '닫기',

  /* ─── 네비게이션 ─── */
  'nav.explore':        '탐색',
  'nav.gallery':        '갤러리',
  'nav.upload':         '등록',
  'nav.list':           '목록',
  'nav.editor':         '에디터',
  'nav.series':         '시리즈',
  'nav.inbox':          '문의함',
  'nav.profile':        '프로필',
  'nav.login':          '로그인',
  'nav.logout':         '로그아웃',
  'nav.signup':         '회원가입',

  /* ─── 인증 ─── */
  'auth.email':               '이메일',
  'auth.password':            '비밀번호',
  'auth.name':                '이름',
  'auth.emailPlaceholder':    'your@email.com',
  'auth.passwordPlaceholder': '••••••••',
  'auth.loginTitle':          '로그인',
  'auth.signupTitle':         '회원가입',
  'auth.loginFail':           '로그인에 실패했습니다.',
  'auth.emailRequired':       '이메일을 입력해주세요.',
  'auth.passwordRequired':    '비밀번호를 입력해주세요.',
  'auth.loginWith':           '{provider}로 로그인',
  'auth.terms':               '이용약관 및 개인정보처리방침에 동의합니다.',

  /* ─── 갤러리 ─── */
  'gallery.sortLatest':     '최신순',
  'gallery.sortOldest':     '오래된 순',
  'gallery.sortLikes':      '좋아요 순',
  'gallery.sortSaves':      '저장 순',
  'gallery.sortColor':      '색상 순',
  'gallery.sortManual':     '수동 순',
  'gallery.viewJustified':  'Justified',
  'gallery.viewMasonry':    'Masonry',
  'gallery.viewList':       'List',
  'gallery.empty':          '아직 등록된 사진이 없습니다',
  'gallery.emptyDesc':      '첫 번째 사진을 등록하고 갤러리를 채워보세요.',
  'gallery.emptyAction':    '첫 사진 등록하기',
  'gallery.count':          '{n}장',
  'gallery.addPhoto':       '+ 등록',

  /* ─── 탐색 ─── */
  'explore.searchPlaceholder': '제목, 설명, 작가 검색...',
  'explore.allMood':           '전체 색감',
  'explore.allRatio':          '전체 비율',
  'explore.allGenre':          '전체',
  'explore.resultNone':        '검색 결과가 없습니다.',
  'explore.history':           '최근 검색',
  'explore.clearHistory':      '전체 삭제',

  /* ─── 사진 상세 ─── */
  'photo.like':           '좋아요',
  'photo.liked':          '좋아요 취소',
  'photo.save':           '저장',
  'photo.saved':          '저장됨',
  'photo.share':          '공유',
  'photo.print':          '인쇄',
  'photo.fullscreen':     '전체화면',
  'photo.comment':        '댓글',
  'photo.commentInput':   '댓글을 입력하세요...',
  'photo.commentSend':    '전송',
  'photo.relatedPhotos':  '관련 사진',
  'photo.palette':        '대표 색상',
  'photo.clickToCopy':    '클릭하여 복사',
  'photo.deleteConfirm':  '사진을 삭제하시겠습니까?',
  'photo.editPhoto':      '수정',
  'photo.deletePhoto':    '삭제',
  'photo.magazineView':   '매거진으로 보기',

  /* ─── 사진 등록/수정 ─── */
  'form.titleLabel':       '제목',
  'form.titlePlaceholder': '사진 제목',
  'form.titleEnLabel':     '영문 제목 (선택)',
  'form.descLabel':        '설명',
  'form.descPlaceholder':  '사진에 대한 설명을 입력하세요...',
  'form.descEnLabel':      '영문 설명 (선택)',
  'form.mood':             '색감 무드',
  'form.ratio':            '화면 비율',
  'form.genre':            '장르',
  'form.tags':             '태그',
  'form.autoTag':          'AI 태그 추천',
  'form.uploadFile':       '파일 업로드',
  'form.uploadUrl':        'URL 입력',
  'form.submitNew':        '등록하기',
  'form.submitEdit':       '수정 완료',
  'form.saving':           '저장 중...',

  /* ─── 프로필 ─── */
  'profile.myWorks':       '내 작품',
  'profile.saved':         '저장함',
  'profile.series':        '시리즈',
  'profile.settings':      '설정',
  'profile.follow':        '팔로우',
  'profile.following':     '팔로잉',
  'profile.unfollow':      '팔로잉 취소',
  'profile.followers':     '팔로워',
  'profile.photos':        '사진',
  'profile.likes':         '좋아요',
  'profile.bioLabel':      '소개',
  'profile.bioEnLabel':    '영문 소개 (선택)',
  'profile.bioPlaceholder':'자신을 소개해주세요...',
  'profile.website':       '웹사이트',
  'profile.location':      '지역',

  /* ─── 시리즈 ─── */
  'series.create':         '시리즈 만들기',
  'series.title':          '시리즈 제목',
  'series.desc':           '시리즈 설명',
  'series.empty':          '아직 시리즈가 없습니다.',
  'series.magazineView':   '매거진으로 보기',

  /* ─── 문의 ─── */
  'inquiry.send':          '문의하기',
  'inquiry.inbox':         '문의함',
  'inquiry.markRead':      '읽음 처리',
  'inquiry.delete':        '삭제',
  'inquiry.empty':         '문의가 없습니다.',

  /* ─── 에러·빈 상태 ─── */
  'error.notFound':        '페이지를 찾을 수 없습니다.',
  'error.forbidden':       '접근 권한이 없습니다.',
  'error.serverError':     '서버 오류가 발생했습니다.',
  'error.networkError':    '네트워크 연결을 확인해주세요.',
  'error.photoNotFound':   '사진을 찾을 수 없습니다.',
  'error.loadFail':        '불러오는데 실패했습니다.',

  /* ─── 언어 전환 ─── */
  'lang.select':           '언어 선택',
  'lang.ko':               '한국어',
  'lang.en':               'English',
  'lang.ja':               '日本語',
  'lang.zh':               '中文',
  'lang.contentKoOnly':    '이 콘텐츠는 한국어로만 제공됩니다.',
};
```

### 3-2. LanguageContext

```javascript
// contexts/LanguageContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import ko from '../i18n/ko';
import en from '../i18n/en';
import ja from '../i18n/ja';
import zh from '../i18n/zh';

const TRANSLATIONS = { ko, en, ja, zh };

const SUPPORTED = ['ko', 'en', 'ja', 'zh'];

function detectLang() {
  const saved = localStorage.getItem('app_lang');
  if (saved && SUPPORTED.includes(saved)) return saved;
  const browser = navigator.language?.slice(0, 2);
  if (browser === 'ja') return 'ja';
  if (browser === 'zh') return 'zh';
  if (browser === 'en') return 'en';
  return 'ko'; // 기본값
}

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(detectLang);

  const changeLang = useCallback((code) => {
    if (!SUPPORTED.includes(code)) return;
    setLang(code);
    localStorage.setItem('app_lang', code);
    document.documentElement.setAttribute('lang', code);
  }, []);

  // t(key, variables) — 번역 함수
  // 변수 보간: 'auth.loginWith' = '{provider}로 로그인' → t('auth.loginWith', {provider:'카카오'})
  const t = useCallback((key, vars) => {
    let text = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.ko[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, SUPPORTED }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
```

### 3-3. App.jsx에 Provider 추가

```jsx
// App.jsx
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        {/* 기존 라우터 구조 */}
      </AuthProvider>
    </LanguageProvider>
  );
}
```

---

## 4. 언어 전환 UI 디자인

### 4-1. Header 언어 토글 버튼 (데스크탑)

**위치**: PC 헤더 우측, 프로필 아바타 왼쪽

```
┌────────────────────────────────────────────────────────────────────┐
│  Happiness  │ 탐색  갤러리  시리즈  목록  등록  에디터  문의함  │ [🌐 KO▾] [◎] │
└────────────────────────────────────────────────────────────────────┘
                                                          ↑
                                              언어 토글 버튼
```

**언어 토글 버튼 스타일**:
```
형태: 아이콘 + 언어코드 + 드롭다운 화살표
크기: height 34px, padding 6px 12px, border-radius 10px
기본 상태:
  background: rgba(255,255,255,0.0)
  border: 1px solid rgba(92,92,122,0.2)
  color: textSecondary (#5555aa)
  font-size: 13px, font-weight: 500
hover:
  background: primaryLight (#eef0ff)
  border-color: primary
  color: primary
활성(드롭다운 열림):
  background: primaryLight
  border-color: primary
  color: primary

텍스트: "🌐 KO ▾" / "🌐 EN ▾" / "🌐 JA ▾" / "🌐 ZH ▾"
```

**드롭다운 패널**:
```
┌──────────────────────┐
│  언어 선택           │
├──────────────────────┤
│ ✓ 🇰🇷 한국어         │  ← 현재 선택 (checkmark + primaryLight bg)
│   🇺🇸 English        │
│   🇯🇵 日本語         │
│   🇨🇳 中文           │
└──────────────────────┘

패널 스타일:
  position: absolute, top: calc(100% + 8px), right: 0
  width: 160px
  background: surface (#ffffff)
  border: 1px solid border (#e5e5ed)
  border-radius: 14px
  box-shadow: 0 8px 24px rgba(0,0,0,0.12)
  padding: 6px
  z-index: 200

헤더 텍스트:
  padding: 6px 10px 4px
  font-size: 11px, font-weight: 600
  color: textMuted, letter-spacing: 0.5px
  text-transform: uppercase

각 옵션:
  display: flex, align-items: center, gap: 10px
  padding: 9px 10px
  border-radius: 10px
  font-size: 14px, cursor: pointer
  플래그: 18px
  이름: flex 1, color: text
  체크: 16px, color: primary, font-weight: 700

선택됨: background primaryLight (#eef0ff), color primary
hover: background surfaceDim (#ededf4)

닫기: 드롭다운 외부 클릭 / ESC 키
```

### 4-2. 모바일 언어 전환 (프로필 메뉴 또는 바텀시트)

```
방법 A — 바텀 네비게이션 + 프로필 탭 내부:
  프로필 페이지 → 설정 탭 → "언어 설정" 섹션

방법 B — 헤더 햄버거 메뉴에 포함 (선택)
  모바일 헤더 우상단 ... 메뉴 → "언어"

권장: 방법 A (프로필 설정 탭에 언어 선택)
```

**프로필 설정 탭 언어 섹션**:
```
──── 언어 설정 ────────────────────────────────
  앱 언어      [🇰🇷 한국어      ▾]    (드롭다운)
──────────────────────────────────────────────
```

**모바일 드롭다운 (바텀 시트)**:
```
────────────────────────── ↑ 드래그 핸들
언어 선택
──────────────────────────
●  🇰🇷 한국어
○  🇺🇸 English
○  🇯🇵 日本語
○  🇨🇳 中文
──────────────────────────
            [확인]
```

### 4-3. 포트폴리오 페이지 (공개 접근, 로그인 불필요)

포트폴리오는 외국 방문자가 접근하는 주요 경로 → 언어 전환이 중요.

```
포트폴리오 Hero 영역 우상단 (항상 표시):

┌─────────────────────────────────────────────────────┐
│                                               [🌐 KO▾] │
│        Hero 사진 / 작가명                            │
└─────────────────────────────────────────────────────┘

스타일:
  position: absolute, top: 16px, right: 16px, z-index: 10
  배경: rgba(255,255,255,0.15) + backdrop-filter: blur(10px)
  (다크 Hero 위에서도 읽힘)
  border: 1px solid rgba(255,255,255,0.2)
  color: #fff
  border-radius: 10px
  padding: 6px 12px
```

---

## 5. 콘텐츠 이중 언어 (Layer B)

### 5-1. 사진 메타데이터 이중 언어

**입력 (PhotoFormPage)**:
```
제목 *
┌──────────────────────────────────────────┐
│  봄 산책                                 │  ← 한국어 (필수)
└──────────────────────────────────────────┘

🌐 영문 제목 추가  [+ 펼치기]   ← 기본 접힘
  ┌──────────────────────────────────────────┐
  │  Spring Walk                            │  ← 영어 (선택)
  └──────────────────────────────────────────┘

설명
┌──────────────────────────────────────────┐
│  서울 한강변을 걷던 봄날의 기억           │
└──────────────────────────────────────────┘

🌐 영문 설명 추가  [+ 펼치기]
  ┌──────────────────────────────────────────┐
  │  Memories of a spring day walking...   │
  └──────────────────────────────────────────┘
```

"🌐 영문 ~ 추가" 버튼:
```
font-size: 12px, color: primary, cursor: pointer
background: none, border: none
display: inline-flex, gap: 4px
hover: text-decoration: underline
```

### 5-2. 표시 (PhotoCard, PhotoDetailPage)

**PhotoCard 표시 규칙**:
```
방문자 언어 = 영어(en), 작가가 영문 제목을 입력한 경우:
  제목: "Spring Walk"

방문자 언어 = 영어(en), 영문 제목 없는 경우:
  제목: "봄 산책"
  서브텍스트: "🌐 한국어 원문" (10px, textMuted)
```

**PhotoDetailPage 표시 규칙**:
```
┌──────────────────────────────────────────────┐
│  Spring Walk                                 │  ← 영문 제목 (en 선택 시)
│  봄 산책                                      │  ← 한국어 원문 (secondaryTextMuted, 13px)
│                                              │
│  Memories of a spring day walking along...  │  ← 영문 설명
└──────────────────────────────────────────────┘

한국어 원문 표시 스타일:
  font-size: 13px
  color: textMuted (#8888bb)
  font-style: italic
  margin-top: -6px (제목 바로 아래)
```

**"콘텐츠 없음" 안내 뱃지**:
```
방문자 언어 = en, 영문 콘텐츠가 0%인 작가의 포트폴리오:

[🌐 한국어로만 제공됩니다]

스타일:
  background: surfaceDim, border: 1px solid border
  border-radius: 8px, padding: 4px 10px
  font-size: 11px, color: textMuted
  display: inline-block, margin-bottom: 12px
```

### 5-3. 작가 소개 (ProfilePage / PortfolioPage)

```
ProfilePage 설정 탭:

소개 *
┌───────────────────────────────────────┐
│  서울 기반 웨딩 사진작가입니다.        │
└───────────────────────────────────────┘

🌐 영문 소개 추가  [+ 펼치기]
  ┌───────────────────────────────────────┐
  │  Wedding photographer based in Seoul. │
  └───────────────────────────────────────┘
```

**PortfolioPage Bio 섹션 표시**:
```
방문자가 en 선택 시:
  "Wedding photographer based in Seoul."

방문자가 ko:
  "서울 기반 웨딩 사진작가입니다."
```

---

## 6. 데이터 모델 변경

### 6-1. Photo 엔티티 신규 컬럼

```sql
-- Layer B 콘텐츠 이중 언어 컬럼
ALTER TABLE photos ADD COLUMN IF NOT EXISTS title_en      VARCHAR(255);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS description_en TEXT;

-- 추후 일본어·중국어 추가 시 (V2):
-- ALTER TABLE photos ADD COLUMN IF NOT EXISTS title_ja    VARCHAR(255);
-- ALTER TABLE photos ADD COLUMN IF NOT EXISTS title_zh    VARCHAR(255);
```

### 6-2. Member 엔티티 신규 컬럼

```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS bio_en TEXT;
-- V2: bio_ja, bio_zh
```

### 6-3. Photo.java 엔티티 추가

```java
@Column(name = "title_en", length = 255)
private String titleEn;

@Column(name = "description_en", columnDefinition = "TEXT")
private String descriptionEn;
```

### 6-4. PhotoResponse DTO 추가

```java
private String titleEn;
private String descriptionEn;

// fromEntity에서:
.titleEn(photo.getTitleEn())
.descriptionEn(photo.getDescriptionEn())
```

### 6-5. API 변경

```
PUT /api/photos/:id
  Body에 titleEn, descriptionEn 허용

GET /api/photos/:id
  응답에 titleEn, descriptionEn 포함

GET /api/auth/member/:id
  응답에 bioEn 포함
```

---

## 7. 번역 파일 주요 항목 — 영어 (en.js)

```javascript
// i18n/en.js
export default {
  /* ─── 공통 ─── */
  'common.save':        'Save',
  'common.cancel':      'Cancel',
  'common.delete':      'Delete',
  'common.edit':        'Edit',
  'common.upload':      'Upload',
  'common.loading':     'Loading...',
  'common.error':       'An error occurred.',
  'common.retry':       'Try Again',
  'common.noData':      'Nothing here yet.',
  'common.submit':      'Submit',
  'common.confirm':     'Confirm',
  'common.close':       'Close',

  /* ─── 네비게이션 ─── */
  'nav.explore':        'Explore',
  'nav.gallery':        'Gallery',
  'nav.upload':         'Upload',
  'nav.list':           'List',
  'nav.editor':         'Editor',
  'nav.series':         'Series',
  'nav.inbox':          'Inbox',
  'nav.profile':        'Profile',
  'nav.login':          'Log In',
  'nav.logout':         'Log Out',
  'nav.signup':         'Sign Up',

  /* ─── 인증 ─── */
  'auth.email':               'Email',
  'auth.password':            'Password',
  'auth.name':                'Name',
  'auth.emailPlaceholder':    'your@email.com',
  'auth.passwordPlaceholder': '••••••••',
  'auth.loginTitle':          'Log In',
  'auth.signupTitle':         'Sign Up',
  'auth.loginFail':           'Login failed. Please check your credentials.',
  'auth.emailRequired':       'Please enter your email.',
  'auth.passwordRequired':    'Please enter your password.',
  'auth.loginWith':           'Continue with {provider}',
  'auth.terms':               'I agree to the Terms of Service and Privacy Policy.',

  /* ─── 갤러리 ─── */
  'gallery.sortLatest':     'Latest',
  'gallery.sortOldest':     'Oldest',
  'gallery.sortLikes':      'Most Liked',
  'gallery.sortSaves':      'Most Saved',
  'gallery.sortColor':      'By Color',
  'gallery.sortManual':     'Manual Order',
  'gallery.viewJustified':  'Justified',
  'gallery.viewMasonry':    'Masonry',
  'gallery.viewList':       'List',
  'gallery.empty':          'No photos yet',
  'gallery.emptyDesc':      'Upload your first photo to start filling your gallery.',
  'gallery.emptyAction':    'Upload First Photo',
  'gallery.count':          '{n} photos',
  'gallery.addPhoto':       '+ Upload',

  /* ─── 탐색 ─── */
  'explore.searchPlaceholder': 'Search by title, description, or author...',
  'explore.allMood':           'All Moods',
  'explore.allRatio':          'All Ratios',
  'explore.allGenre':          'All',
  'explore.resultNone':        'No results found.',
  'explore.history':           'Recent Searches',
  'explore.clearHistory':      'Clear All',

  /* ─── 사진 상세 ─── */
  'photo.like':           'Like',
  'photo.liked':          'Unlike',
  'photo.save':           'Save',
  'photo.saved':          'Saved',
  'photo.share':          'Share',
  'photo.print':          'Print',
  'photo.fullscreen':     'Full Screen',
  'photo.comment':        'Comments',
  'photo.commentInput':   'Write a comment...',
  'photo.commentSend':    'Send',
  'photo.relatedPhotos':  'Related Photos',
  'photo.palette':        'Color Palette',
  'photo.clickToCopy':    'Click to copy',
  'photo.deleteConfirm':  'Are you sure you want to delete this photo?',
  'photo.editPhoto':      'Edit',
  'photo.deletePhoto':    'Delete',
  'photo.magazineView':   'View as Magazine',

  /* ─── 사진 등록/수정 ─── */
  'form.titleLabel':       'Title',
  'form.titlePlaceholder': 'Photo title',
  'form.titleEnLabel':     'English Title (Optional)',
  'form.descLabel':        'Description',
  'form.descPlaceholder':  'Describe this photo...',
  'form.descEnLabel':      'English Description (Optional)',
  'form.mood':             'Color Mood',
  'form.ratio':            'Aspect Ratio',
  'form.genre':            'Genre',
  'form.tags':             'Tags',
  'form.autoTag':          'AI Tag Suggestions',
  'form.uploadFile':       'Upload File',
  'form.uploadUrl':        'Enter URL',
  'form.submitNew':        'Upload',
  'form.submitEdit':       'Save Changes',
  'form.saving':           'Saving...',

  /* ─── 프로필 ─── */
  'profile.myWorks':       'My Works',
  'profile.saved':         'Saved',
  'profile.series':        'Series',
  'profile.settings':      'Settings',
  'profile.follow':        'Follow',
  'profile.following':     'Following',
  'profile.unfollow':      'Unfollow',
  'profile.followers':     'Followers',
  'profile.photos':        'Photos',
  'profile.likes':         'Likes',
  'profile.bioLabel':      'Bio',
  'profile.bioEnLabel':    'English Bio (Optional)',
  'profile.bioPlaceholder':'Tell us about yourself...',
  'profile.website':       'Website',
  'profile.location':      'Location',

  /* ─── 에러·빈 상태 ─── */
  'error.notFound':        'Page not found.',
  'error.forbidden':       'Access denied.',
  'error.serverError':     'Server error. Please try again.',
  'error.networkError':    'Check your network connection.',
  'error.photoNotFound':   'Photo not found.',
  'error.loadFail':        'Failed to load.',

  /* ─── 언어 전환 ─── */
  'lang.select':           'Select Language',
  'lang.ko':               '한국어',
  'lang.en':               'English',
  'lang.ja':               '日本語',
  'lang.zh':               '中文',
  'lang.contentKoOnly':    'This content is only available in Korean.',
};
```

---

## 8. 컴포넌트 목록

| 컴포넌트 | 파일 경로 | 역할 |
|---------|----------|------|
| `LanguageToggle` | `components/common/LanguageToggle.jsx` | 버튼 + 드롭다운 (PC 헤더, 포트폴리오 용) |
| `LanguageSheet` | `components/common/LanguageSheet.jsx` | 모바일 바텀시트 |
| `BilingualInput` | `components/common/BilingualInput.jsx` | 한국어 + 영어 펼침 입력 (제목/설명/bio 공용) |
| `LangFallbackBadge` | `components/common/LangFallbackBadge.jsx` | "한국어로만 제공됩니다" 뱃지 |

### LanguageToggle Props

```javascript
LanguageToggle({
  theme?: 'light' | 'dark',  // light: PC헤더, dark: 포트폴리오 Hero 위
  showLabel?: boolean,        // 언어명 표시 여부 (기본 true)
})
```

### BilingualInput Props

```javascript
BilingualInput({
  label: string,              // 주 레이블 (예: "제목")
  labelEn: string,            // 보조 레이블 (예: "영문 제목 (선택)")
  value: string,              // 한국어 값
  valueEn: string,            // 영어 값
  onChange: (val) => void,
  onChangeEn: (val) => void,
  placeholder?: string,
  placeholderEn?: string,
  multiline?: boolean,        // textarea 여부
  rows?: number,
})
```

---

## 9. useLang 훅 사용 예시 — 기존 컴포넌트 수정 방법

### 기존 (하드코딩):
```jsx
<button>저장</button>
<div>갤러리에 사진이 없습니다.</div>
<input placeholder="사진 제목" />
```

### 수정 후:
```jsx
const { t } = useLang();

<button>{t('common.save')}</button>
<div>{t('gallery.empty')}</div>
<input placeholder={t('form.titlePlaceholder')} />
```

### 조건부 콘텐츠 표시 (PhotoCard):
```jsx
const { lang } = useLang();

// 언어에 따라 제목 선택
const displayTitle = (lang !== 'ko' && photo.titleEn) ? photo.titleEn : photo.title;
const showFallback = lang !== 'ko' && !photo.titleEn;
```

---

## 10. 전환 적용 우선순위 (어떤 페이지부터 번역할 것인가)

### Phase 1 — 핵심 공개 경로 (방문자 경험 직결)

| 페이지/컴포넌트 | 이유 |
|--------------|------|
| `Header.jsx` (네비게이션) | 가장 많이 보이는 텍스트 |
| `PortfolioPage.jsx` | 외국 방문자의 주요 진입점 |
| `PhotoDetailPage.jsx` | 작품 감상 핵심 화면 |
| `ExplorePage.jsx` | 검색·탐색 텍스트 |
| `LoginPage.jsx` / `SignUpPage.jsx` | 회원가입 시 필요 |

### Phase 2 — 내부 기능

| 페이지/컴포넌트 |
|--------------|
| `GalleryPage.jsx` |
| `PhotoFormPage.jsx` (BilingualInput 포함) |
| `ProfilePage.jsx` |
| `SeriesPage.jsx` |
| `EmptyState.jsx`, `Toast.jsx` 등 공통 컴포넌트 |

### Phase 3 — 어드민 + 나머지

| 페이지/컴포넌트 |
|--------------|
| `AdminDashboardPage.jsx` 등 어드민 (영어로만도 무방) |
| `InquiryFormPage.jsx`, `InquiryInboxPage.jsx` |
| 에러 페이지, Toast 메시지 |

---

## 11. 디자인 토큰 추가 불필요 사항

다국어 전환은 **레이아웃에 영향을 미친다.**

### 고려 사항

| 상황 | 대처 |
|------|------|
| 일본어/중국어 폰트 로딩 | system-ui 폰트 스택 사용 → 별도 폰트 로딩 불필요 |
| 영어 텍스트가 더 길 경우 | `overflow: hidden; text-overflow: ellipsis` 이미 적용됨 → OK |
| 일본어 줄바꿈 | `word-break: break-all` 추가 (CJK 자동 처리) |
| 숫자 포맷 | 언어마다 다름 → `{n}장` / `{n} photos` / `{n}枚` 키 분리로 처리 |
| 날짜 표기 | `new Intl.DateTimeFormat(lang, {...}).format(date)` 사용 |

### 날짜 포맷 유틸리티

```javascript
// utils/dateFormat.js
export function formatDate(dateStr, lang = 'ko') {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : lang, {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
}
// ko → "2026년 6월 20일"
// en → "June 20, 2026"
// ja → "2026年6月20日"
// zh → "2026年6月20日"
```

---

## 12. 스프린트 계획

### Sprint 1 — 인프라 + 핵심 UI (1.5주)

| 작업 | 파일 | 시간 |
|------|------|------|
| i18n 폴더 생성 + ko.js, en.js 작성 (전체 키) | `i18n/` | 4h |
| ja.js, zh.js 작성 | `i18n/` | 3h |
| LanguageContext + useLang 훅 | `contexts/LanguageContext.jsx` | 2h |
| App.jsx에 LanguageProvider 삽입 | `App.jsx` | 0.5h |
| `LanguageToggle` 컴포넌트 (버튼 + 드롭다운) | `LanguageToggle.jsx` | 3h |
| Header.jsx에 LanguageToggle 삽입 + 네비 텍스트 번역 | `Header.jsx` | 2h |
| formatDate 유틸리티 | `utils/dateFormat.js` | 0.5h |

### Sprint 2 — 공개 경로 번역 (1주)

| 작업 | 파일 | 시간 |
|------|------|------|
| LoginPage, SignUpPage 번역 적용 | 각 페이지 | 2h |
| PortfolioPage 번역 + 언어 토글 추가 | `PortfolioPage.jsx` | 2h |
| PhotoDetailPage 번역 + 이중 제목/설명 표시 | `PhotoDetailPage.jsx` | 2h |
| ExplorePage 번역 (탭, 버튼, 빈 상태) | `ExplorePage.jsx` | 2h |
| EmptyState, Toast, 공통 컴포넌트 번역 | 각 컴포넌트 | 2h |

### Sprint 3 — 콘텐츠 이중 언어 + 나머지 (1주)

| 작업 | 파일 | 시간 |
|------|------|------|
| DB 컬럼 추가 (title_en, description_en, bio_en) | SQL | 0.5h |
| Photo/Member 엔티티 수정 + API 수정 | Backend | 2h |
| `BilingualInput` 컴포넌트 구현 | `BilingualInput.jsx` | 2h |
| PhotoFormPage에 BilingualInput 삽입 | `PhotoFormPage.jsx` | 1.5h |
| ProfilePage bio 이중 언어 입력 | `ProfilePage.jsx` | 1h |
| GalleryPage, SeriesPage 번역 | 각 페이지 | 2h |
| `LangFallbackBadge` + PhotoCard 다국어 표시 | 각 컴포넌트 | 1h |

---

## 13. 수용 기준 (Acceptance Criteria)

### AC-01. 언어 전환 기본
- [ ] PC 헤더 우상단에 `🌐 KO ▾` 버튼이 표시된다
- [ ] 드롭다운에서 언어 선택 시 UI 전체가 해당 언어로 즉시 전환된다
- [ ] 선택한 언어가 localStorage에 저장되어 새로고침 후에도 유지된다
- [ ] 브라우저 언어가 영어이면 첫 방문 시 영어로 자동 선택된다

### AC-02. 번역 커버리지
- [ ] Header 네비게이션 전체가 번역된다
- [ ] LoginPage 모든 레이블/플레이스홀더/에러 메시지가 번역된다
- [ ] GalleryPage 정렬 버튼, 빈 상태 메시지가 번역된다
- [ ] PhotoDetailPage 버튼 (좋아요/저장/공유)이 번역된다
- [ ] 날짜 표시가 선택 언어 포맷으로 변환된다

### AC-03. 콘텐츠 이중 언어
- [ ] PhotoFormPage에서 영문 제목/설명을 선택적으로 입력할 수 있다
- [ ] 영어 UI 상태에서 영문 제목이 있는 사진은 영문 제목으로 표시된다
- [ ] 영문 제목이 없는 사진은 한국어 원문 + `🌐 한국어로만 제공됩니다` 표시된다
- [ ] ProfilePage에서 영문 bio를 입력할 수 있다

### AC-04. 포트폴리오 국제화
- [ ] 포트폴리오 페이지 Hero 우상단에 언어 전환 버튼이 표시된다 (다크 테마)
- [ ] 방문자가 언어를 전환하면 작가 소개(bio)도 해당 언어로 표시된다

### AC-05. 반응형
- [ ] 모바일에서 프로필 설정 탭에 언어 선택 섹션이 표시된다
- [ ] 모바일에서 언어 전환 시 바텀시트가 올라온다

---

## 14. Claude.ai 아티팩트 프롬프트 (시각 목업용)

```
아래 스펙으로 "Happiness 앱 다국어 UI" React 컴포넌트 목업을 만들어줘.

[요구사항]

1. PC 헤더 언어 토글 (LanguageToggle)
   - "🌐 KO ▾" 버튼 (border 1px solid, border-radius 10px, 34px 높이)
   - 클릭 시 드롭다운: 헤더 "언어 선택" + 4개 옵션 (🇰🇷 한국어 / 🇺🇸 English / 🇯🇵 日本語 / 🇨🇳 中文)
   - 현재 선택에 ✓ + primaryLight 배경
   - 드롭다운: 160px 너비, 14px border-radius, box-shadow

2. 전체 헤더 레이아웃 (LanguageToggle 포함)
   - Happiness 로고 (좌측)
   - 탐색 / 갤러리 / 시리즈 / 목록 / 등록 / 에디터 / 문의함 (중앙)
   - [🌐 KO ▾] [프로필 아이콘] (우측)
   - Liquid Glass 스타일 (반투명 + blur)

3. BilingualInput 컴포넌트
   - 상단: "제목 *" 레이블 + 한국어 input
   - 하단 "🌐 영문 제목 추가 +" 버튼
   - 클릭 시 애니메이션으로 "English Title (Optional)" input 펼침

4. PhotoCard 다국어 표시 (3가지 상태 비교)
   상태①: 한국어 UI → "봄 산책" (한국어만)
   상태②: 영어 UI + 영문 제목 있음 → "Spring Walk"
   상태③: 영어 UI + 영문 없음 → "봄 산책" + "🌐 KO" 뱃지

5. 포트폴리오 Hero 언어 토글 (다크 배경 위)
   - position: absolute, 우상단
   - 배경: rgba(255,255,255,0.15) + backdrop-filter: blur
   - 테두리: 1px solid rgba(255,255,255,0.2)
   - 텍스트: 흰색

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5', primaryDark: '#4458e0', primaryLight: '#eef0ff'
  accent: '#a78bfa'
  bg: '#f7f7fb', surface: '#ffffff', surfaceDim: '#ededf4', border: '#e5e5ed'
  text: '#0f0f1a', textSecondary: '#5555aa', textMuted: '#8888bb'
  danger: '#e53e3e', success: '#22c55e'
  darkBg: '#0a0a18', darkSurface: '#12122a', darkBorder: '#2a2a50'
  darkText: '#e8e8f0', darkTextSub: '#8080b0'
  galleryBg: '#0e0e0e'

Liquid Glass 스타일:
  light: background rgba(255,255,255,0.72) + backdrop-filter blur(20px)
  dark: background rgba(14,14,30,0.65) + backdrop-filter blur(20px)

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react만 허용)
- useState로 언어 선택 상태 관리 (ko/en/ja/zh 전환)
- 언어 전환 시 모든 텍스트가 즉시 해당 언어로 변경됨 (실제 번역 텍스트 사용)
- BilingualInput: useState로 펼침/접힘 상태 관리
```

---

## 15. 기존 분류 체계와의 관계

```
앱 분류·언어 체계 전체 맵:

  사용자 설정:
    └── 앱 언어 (ko/en/ja/zh) → UI 전체 번역 + 콘텐츠 언어 선택

  사진 분류 (기존 + 신규):
    ├── colorMood   → "어떤 색감?" (자동 감지)
    ├── imageRatio  → "어떤 비율?" (작가 선택)
    ├── tags        → "어떤 키워드?" (자유 입력)
    ├── genre       → "무엇을 찍었나?" (26_GENRE_CLASSIFICATION 참조)
    └── 다국어 제목/설명 → "어떤 언어로 표기?" (이번 기획)

  콘텐츠 언어:
    ├── title       → title_en (옵션)
    ├── description → description_en (옵션)
    └── bio         → bio_en (옵션)
```
