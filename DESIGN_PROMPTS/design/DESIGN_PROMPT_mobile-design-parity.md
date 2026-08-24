# DESIGN_PROMPT — 모바일 디자인 패리티 (AKIRA 다크 통일 + 기능 격차 해소)
> Feature: Mobile Design Parity | 2026-08-23 | AKIRA Neo-Tokyo 다크 테마

연관 문서:
- `DESIGN_PROMPT_akira-neo-tokyo-concept.md` — AKIRA 컬러 시스템
- `PLANNING_multiplatform-uiux-improvement.md` — 기획 기반
- `DESIGN_PROMPTS/planning/35_MODEL_MEET_PLANNING.md` — Meets 기능 기획
- `DESIGN_PROMPTS/planning/26_GENRE_CLASSIFICATION.md` — 장르 시스템 기획

---

## 시스템 컨텍스트

```
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (React Native / Expo 49)
기술 스택: React Native 0.72, StyleSheet.create, Expo 49
아이콘: 이모지/유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

모바일 컬러 시스템 (mobile/constants/colors.js — AKIRA Neo-Tokyo 기반 다크):
  primary:       '#E8121A'   // AKIRA 레드 (CTA, 활성 상태)
  primaryDark:   '#A80D14'   // 레드 pressed
  accent:        '#22D3EE'   // 네온 시안 (보조 강조)
  dark:          '#1a1a2e'   // 탭바/헤더 배경 (COLORS.dark 토큰)
  darkDeep:      '#0a0a18'   // 가장 깊은 다크 배경
  darkAlt:       '#1e1e3a'   // 경계선/구분선 (새로 추가 필요 시)
  surface:       '#12122a'   // 카드/패널 배경
  text:          '#eeeeff'   // 주요 텍스트 (다크 배경 위)
  textSub:       '#8888cc'   // 보조 텍스트
  textMuted:     '#5555aa'   // 힌트 텍스트
  border:        '#2a2a50'   // 경계선

디자인 정책:
- 모바일은 웹의 Cosmos 화이트가 아닌 AKIRA 다크 테마로 통일
- 다크 배경이 사진 갤러리 앱의 콘텐츠 감상에 더 적합 (네이티브 앱 관행)
- 레드(#E8121A)는 CTA·활성 탭·좋아요 등 강조 포인트에만 사용 (배경 금지)
- 한국어 UI 텍스트
```

---

## 적용 대상 4개 영역

| 영역 | 파일 | 문제 | 우선순위 |
|------|------|------|---------|
| AppNavigator 컬러 토큰화 | `mobile/src/navigation/AppNavigator.js` | '#0a0a18', '#1e1e3a' 하드코딩 | P0 |
| ExploreScreen 장르 필터 | `mobile/screens/ExploreScreen.js` | 장르 필터 없음 (웹에는 있음) | P1 |
| SeriesScreen 콜라주 카드 | `mobile/screens/SeriesScreen.js` | 3장 콜라주 미적용 | P1 |
| Meets 화면 추가 | `mobile/screens/MeetsScreen.js` (신규) | 모바일 전용 핵심 기능 부재 | P1 |

> **디자이너 이견 — Meets P1 확정화**: 기획서는 AC-M5를 "P1 조건부"로 표시했지만, 페르소나 분석에서 모델은 현장 이동 중 약속 조율이 필요하다고 명시되어 있다. Meets는 모바일에서 가장 자주 쓰이는 기능이 될 가능성이 크다. 조건 없이 P1로 확정을 권장한다.

> **디자이너 이견 — 장르 필터 UX**: 기획서는 "상위 6개 + 더 보기 옵션"을 제안했지만, 모바일에서 "더 보기"를 탭하면 다른 UI로 전환되는 패턴은 인터랙션 복잡도를 높인다. 대신 수평 스크롤(HorizontalFlatList)로 12개 전체를 보여주되 처음 6개가 자동으로 보이는 구조를 권장한다. 사용자가 원하는 장르를 1탭으로 바로 선택할 수 있다.

---

## 1. AppNavigator.js — COLORS 토큰화

### 1-1 와이어프레임 (탭바)

```
[하단 탭바 — iOS/Android 공통]
┌─────────────────────────────────────────────────────────────────────┐
│ bg: COLORS.dark (#1a1a2e) ← 변경, 현재: '#0a0a18' 하드코딩          │
│ borderTop: 1px solid COLORS.border (#2a2a50) ← 변경, 현재: '#1e1e3a'│
│                                                                     │
│  🔍 탐색   🖼 갤러리   ＋    📋 목록   👤 프로필                    │
│  textSub   textSub   [원형]  textSub   textSub                      │
│                     primary                                         │
│  활성 탭 아이콘: COLORS.primary (AKIRA 레드)                        │
└─────────────────────────────────────────────────────────────────────┘

[스택 헤더 — PhotoFormScreen, SeriesScreen]
┌─────────────────────────────────────────────────────────────────────┐
│ bg: COLORS.dark (#1a1a2e) ← 변경                                    │
│ 제목: COLORS.text (#eeeeff)                                         │
│ 뒤로가기: COLORS.text 또는 primary                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1-2 토큰 교체 스펙

```javascript
// AppNavigator.js 수정 위치
import COLORS from '../../constants/colors';
// (또는 경로에 맞게: '../constants/colors')

// 탭 바 스타일
tabBarStyle: {
  backgroundColor: COLORS.dark,         // 변경 전: '#0a0a18'
  borderTopColor: COLORS.border,         // 변경 전: '#1e1e3a'
  borderTopWidth: 1,
}

// 활성 탭 아이콘/텍스트
tabBarActiveTintColor: COLORS.primary,   // '#E8121A' AKIRA 레드

// 비활성 탭 아이콘/텍스트
tabBarInactiveTintColor: COLORS.textSub, // '#8888cc'

// 스택 헤더 (PhotoForm, Series 공통)
headerStyle: {
  backgroundColor: COLORS.dark,          // 변경 전: '#0a0a18'
},
headerTintColor: COLORS.text,            // '#eeeeff'

// 등록 탭 원형 강조 버튼 (tabBarIcon)
{
  backgroundColor: COLORS.primary,       // '#E8121A' — AKIRA 레드
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: 'center',
  justifyContent: 'center',
  // 기존 다크 계열에서 프라이머리 레드로 교체
}
```

> `COLORS.darkAlt`가 `mobile/constants/colors.js`에 없다면 `COLORS.border`('#2a2a50')로 대체한다. `dark` 토큰이 '#1a1a2e'인지 '#0a0a18'인지 반드시 파일에서 확인하고 맞는 토큰 이름을 선택할 것.

---

## 2. ExploreScreen.js — 장르 필터 추가

### 2-1 와이어프레임

```
[모바일 ExploreScreen]
┌──────────────────────────────────────────────────────┐
│ bg: COLORS.darkDeep (#0a0a18)                        │
│                                                      │
│ ┌── 검색바 ──────────────────────────────────────┐   │
│ │ bg:#1e1e3a, radius:24, 🔍 placeholder:"검색"   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                      │
│ ┌── 장르 탭 (HorizontalFlatList) ────────────────┐   │
│ │  [전체]  [👤인물]  [💍웨딩]  [🏔풍경] → scroll │   │
│ │                                                 │   │
│ │  탭 스타일:                                      │   │
│ │  활성: bg:#E8121A, color:#fff, radius:20         │   │
│ │  비활성: bg:transparent, color:#8888cc            │   │
│ │  하단 언더라인 방식 아님 — pill 방식 (모바일 최적) │   │
│ └─────────────────────────────────────────────────┘   │
│                                                      │
│ ┌── 기존 무드 필터 (2순위로 하단 이동) ──────────┐   │
│ │  [따뜻함] [시원함] [로맨틱] ... (컬러 도트)     │   │
│ └─────────────────────────────────────────────────┘   │
│                                                      │
│ ┌── 마소닉 2컬럼 그리드 ───────────────────────────┐   │
│ │ ┌────────┐  ┌──────────────────┐              │   │
│ │ │ 사진 A  │  │ 사진 B (tallcard) │              │   │
│ │ └────────┘  └──────────────────┘              │   │
│ │ ┌──────────────────┐  ┌────────┐              │   │
│ │ │ 사진 C (wide)    │  │ 사진 D  │              │   │
│ │ └──────────────────┘  └────────┘              │   │
│ └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 2-2 컴포넌트 스펙

#### 장르 탭 바
```javascript
// GENRE_LIST (mobile/constants/colors.js 또는 별도 파일에서)
const GENRE_LIST = [
  { code: null,           label: '전체',         emoji: '✦' },
  { code: 'PORTRAIT',     label: '인물',         emoji: '👤' },
  { code: 'WEDDING',      label: '웨딩',         emoji: '💍' },
  { code: 'LANDSCAPE',    label: '풍경',         emoji: '🏔' },
  { code: 'NATURE',       label: '자연',         emoji: '🌿' },
  { code: 'STREET',       label: '스트리트',     emoji: '🚶' },
  { code: 'ARCHITECTURE', label: '건축',         emoji: '🏛' },
  { code: 'FOOD',         label: '음식',         emoji: '🍽' },
  { code: 'TRAVEL',       label: '여행',         emoji: '✈️' },
  { code: 'FASHION',      label: '패션',         emoji: '👗' },
  { code: 'LIFESTYLE',    label: '라이프스타일', emoji: '☀️' },
  { code: 'COMMERCIAL',   label: '상업',         emoji: '📦' },
  { code: 'FINE_ART',     label: '파인아트',     emoji: '🎨' },
];

// FlatList 탭 렌더
<FlatList
  data={GENRE_LIST}
  horizontal
  showsHorizontalScrollIndicator={false}
  keyExtractor={item => item.code ?? 'all'}
  contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
  renderItem={({ item }) => (
    <TouchableOpacity
      onPress={() => setGenre(item.code)}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: genre === item.code
          ? COLORS.primary            // '#E8121A' 활성
          : 'rgba(255,255,255,0.07)', // 비활성 — 다크 배경 위
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
      <Text style={{
        fontSize: 13,
        fontWeight: genre === item.code ? '700' : '400',
        color: genre === item.code
          ? '#fff'
          : COLORS.textSub,           // '#8888cc'
      }}>
        {item.label}
      </Text>
    </TouchableOpacity>
  )}
/>
```

#### API 연동
```javascript
// 장르 필터 상태 추가
const [genre, setGenre] = useState(null);

// 기존 검색 API 호출에 genre 파라미터 추가
// photoApi.search({ keyword, colorMood, genre })
// 웹 서비스 레이어와 동일한 파라미터명 사용

// genre 변경 시 리페치
useEffect(() => {
  fetchPhotos();
}, [genre, keyword, colorMood]);
```

#### 무드 필터와의 관계
장르 필터(주 축)와 무드 필터(colorMood, 부 축)는 AND 조건으로 함께 적용된다. UI 배치: 장르 탭 바가 검색바 바로 아래, 무드 칩은 장르 탭 아래에 두어 위계를 명확히 한다.

---

## 3. SeriesScreen.js — 3장 콜라주 보드 카드

### 3-1 와이어프레임

```
[SeriesScreen 보드 카드]
┌──────────────────────────────────────────────────────┐
│  ┌── 보드 카드 (SeriesCard) ─────────────────────┐   │
│  │ bg: COLORS.surface (#12122a)                   │   │
│  │ border-radius: 12                              │   │
│  │ overflow: hidden                               │   │
│  │                                                │   │
│  │  ┌── 콜라주 섹션 (height:160px) ─────────────┐ │   │
│  │  │ display:flex, flexDirection:'row'           │ │   │
│  │  │                                            │ │   │
│  │  │  ┌── 왼쪽 (flex:0.6) ─┐  ┌─ 오른쪽(0.4) ─┐ │ │   │
│  │  │  │                    │  │ ┌─────────────┐ │ │ │   │
│  │  │  │   사진 A           │  │ │  사진 B     │ │ │ │   │
│  │  │  │   (전체 높이)       │  │ └─────────────┘ │ │ │   │
│  │  │  │                    │  │ ┌─────────────┐ │ │ │   │
│  │  │  │                    │  │ │  사진 C     │ │ │ │   │
│  │  │  │                    │  │ └─────────────┘ │ │ │   │
│  │  │  └────────────────────┘  └─────────────────┘ │ │   │
│  │  └────────────────────────────────────────────┘ │   │
│  │                                                │   │
│  │  ┌── 메타 섹션 (padding:12px) ──────────────┐  │   │
│  │  │  시리즈 제목  14px 700 COLORS.text        │  │   │
│  │  │  @profileName 12px COLORS.textSub         │  │   │
│  │  │  사진 N장 · 저장 M회  12px COLORS.textMuted│  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘

[previewPhotos가 1~2장인 경우]
사진 1장: 전체 너비 단일 이미지 (콜라주 없음)
사진 2장: 왼쪽 하나, 오른쪽 하나 50:50 분할
사진 3장: 위 와이어프레임 기준 60:40 콜라주

[previewPhotos가 없는 경우]
bg:rgba(255,255,255,0.04) 플레이스홀더 + 📷 아이콘 중앙
```

### 3-2 컴포넌트 스펙

```javascript
function SeriesCollage({ previewPhotos, height = 160 }) {
  const photos = previewPhotos || [];

  if (photos.length === 0) {
    return (
      <View style={{
        height,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 32 }}>📷</Text>
      </View>
    );
  }

  if (photos.length === 1) {
    return (
      <Image
        source={{ uri: photos[0].thumbnailUrl || photos[0].imageUrl }}
        style={{ width: '100%', height }}
        resizeMode="cover"
      />
    );
  }

  if (photos.length === 2) {
    return (
      <View style={{ flexDirection: 'row', height }}>
        {photos.map((p, i) => (
          <Image
            key={i}
            source={{ uri: p.thumbnailUrl || p.imageUrl }}
            style={{ flex: 1, height, marginLeft: i > 0 ? 1 : 0 }}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  }

  // 3장 이상 — 60/40 콜라주
  return (
    <View style={{ flexDirection: 'row', height }}>
      {/* 왼쪽: 첫 번째 사진 (60%) */}
      <Image
        source={{ uri: photos[0].thumbnailUrl || photos[0].imageUrl }}
        style={{ flex: 0.6, height }}
        resizeMode="cover"
      />
      {/* 오른쪽: 두 번째, 세 번째 사진 (40%, 상하 2분할) */}
      <View style={{ flex: 0.4, flexDirection: 'column', marginLeft: 1 }}>
        <Image
          source={{ uri: photos[1].thumbnailUrl || photos[1].imageUrl }}
          style={{ flex: 1, marginBottom: 1 }}
          resizeMode="cover"
        />
        <Image
          source={{ uri: photos[2].thumbnailUrl || photos[2].imageUrl }}
          style={{ flex: 1 }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

// SeriesCard 컴포넌트
function SeriesCard({ series, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: COLORS.surface,   // '#12122a'
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <SeriesCollage previewPhotos={series.previewPhotos} />
      <View style={{ padding: 12 }}>
        <Text style={{
          fontSize: 14, fontWeight: '700',
          color: COLORS.text,    // '#eeeeff'
          marginBottom: 2,
        }}>
          {series.title}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textSub }}>
          @{series.memberProfileName}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
          사진 {series.photoCount}장
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

---

## 4. Meets 화면 추가 (MeetsScreen + MeetDetailScreen)

### 4-1 디자인 방향

웹 MeetsPage는 카드 리스트 + 3탭 DetailPage(달력/장소/채팅) 구조다. 모바일은 동일 API를 사용하되 네이티브 UX로 재구성한다.

모바일 Meets 핵심 차별화:
- 채팅 탭이 기본(첫 번째) 탭 — 모바일에서 메시지가 가장 자주 사용됨
- 채팅 입력창이 키보드에 고정되는 네이티브 패턴 (KeyboardAvoidingView)
- 달력/장소는 "세부 설정" 탭으로 후순위

### 4-2 와이어프레임

```
[MeetsScreen — 목록]
┌──────────────────────────────────────────────────────┐
│ 헤더: "약속"  [+ 새 약속] 버튼                        │
│ bg: COLORS.darkDeep (#0a0a18)                        │
│                                                      │
│ ┌── 상태 탭 필터 ──────────────────────────────────┐  │
│ │ [전체] [대기중🔴N] [조율중] [확정] [완료]          │  │
│ │ pill style, 활성: COLORS.primary 배경             │  │
│ └───────────────────────────────────────────────────┘  │
│                                                      │
│ ┌── MeetCard ────────────────────────────────────┐   │
│ │ [AV 44px] 상대방 이름   14px 700 text          │   │
│ │           @프로필명      12px textSub           │   │
│ │  ─────────────────────────────────────────────  │   │
│ │  상태 배지: [대기중] [조율중] [확정] [완료]      │   │
│ │  "마지막 메시지 미리보기..."  12px textMuted     │   │
│ │  확정 날짜 (있는 경우): 📅 2026.09.01 14:00     │   │
│ │                                      N분 전    │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ (반복)                                               │
│                                                      │
│ [새 약속 요청] FAB 버튼 (우하단 고정, primary 레드)   │
└──────────────────────────────────────────────────────┘

[MeetDetailScreen — 채팅 화면 (기본 탭)]
┌──────────────────────────────────────────────────────┐
│ 헤더: ← 상대방이름  [💬채팅] [📅일정] [📍장소]       │
│ bg: COLORS.darkDeep                                  │
│ 탭 하단 선: COLORS.primary (활성), 투명 (비활성)      │
│                                                      │
│ ┌── 채팅 영역 (flex:1, KeyboardAvoidingView) ──────┐  │
│ │                                                  │  │
│ │  [날짜 구분선: ─── 2026.08.23 ───]               │  │
│ │                                                  │  │
│ │                     ┌─────────────────────────┐  │  │
│ │                     │ 내 메시지 (우측)           │  │  │
│ │                     │ bg: COLORS.primary       │  │  │
│ │                     │ color: #fff              │  │  │
│ │                     │ radius: 16 4 16 16       │  │  │
│ │                     └─────────────────────────┘  │  │
│ │                                                  │  │
│ │  ┌─────────────────────────┐                     │  │
│ │  │ 상대방 메시지 (좌측)     │                     │  │
│ │  │ bg: COLORS.surface      │                     │  │
│ │  │ color: COLORS.text      │                     │  │
│ │  │ radius: 4 16 16 16      │                     │  │
│ │  └─────────────────────────┘                     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                      │
│ ┌── 입력창 (하단 고정, keyboard-avoid) ──────────┐   │
│ │  ┌──────────────────────────────┐  [전송]     │   │
│ │  │  메시지를 입력하세요...        │  bg:primary│   │
│ │  └──────────────────────────────┘            │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘

[MeetDetailScreen — 일정 탭]
┌──────────────────────────────────────────────────────┐
│ 헤더: ← 상대방이름  [💬채팅] [📅일정] [📍장소]       │
│                                                      │
│ 상태가 NEGOTIATING이면:                              │
│ ┌── 달력 (MeetCalendar RN 버전) ────────────────┐   │
│ │ < 2026년 8월 >                                │   │
│ │  일 월 화 수 목 금 토                           │   │
│ │  [날짜 셀: 내 선택=primary, 상대=accent(시안)]  │   │
│ │  [겹치는 날: 연두색 배경]                       │   │
│ └───────────────────────────────────────────────┘   │
│                                                      │
│ 상태가 CONFIRMED이면:                               │
│ ✅ 확정된 날짜: 2026.09.01 (목) 14:00              │
└──────────────────────────────────────────────────────┘
```

### 4-3 컴포넌트 스펙

#### 상태 배지 색상 시스템
```javascript
const MEET_STATUS_STYLE = {
  PENDING:      { label: '대기중',   bg: 'rgba(232,18,26,0.15)', color: '#E8121A' },
  NEGOTIATING:  { label: '날짜조율', bg: 'rgba(34,211,238,0.12)', color: '#22D3EE' },
  CONFIRMED:    { label: '확정',    bg: 'rgba(46,164,79,0.15)', color: '#2ea44f'  },
  COMPLETED:    { label: '완료',    bg: 'rgba(144,144,176,0.15)', color: '#9090b0' },
  CANCELLED:    { label: '취소',    bg: 'rgba(229,62,62,0.10)', color: '#e53e3e' },
};
```

#### MeetCard
```javascript
{
  backgroundColor: COLORS.surface,   // '#12122a'
  borderRadius: 12,
  padding: 14,
  marginBottom: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}
// 아바타: 44x44, radius:22, bg:gradient(primary→accent)
// 이름: 14px 700 COLORS.text
// 프로필명: 12px COLORS.textSub
// 상태 배지: borderRadius:6, paddingH:8, paddingV:3, fontSize:11
// 메시지 미리보기: 12px COLORS.textMuted, numberOfLines:1
```

#### 채팅 버블
```javascript
// 내 메시지 (오른쪽)
{
  alignSelf: 'flex-end',
  backgroundColor: COLORS.primary,    // '#E8121A'
  borderRadius: 16,
  borderBottomRightRadius: 4,
  padding: '10px 14px',
  maxWidth: '75%',
  marginBottom: 4,
}
// 텍스트: fontSize:14, color:'#fff'

// 상대방 메시지 (왼쪽)
{
  alignSelf: 'flex-start',
  backgroundColor: COLORS.surface,    // '#12122a'
  borderRadius: 16,
  borderBottomLeftRadius: 4,
  padding: '10px 14px',
  maxWidth: '75%',
  marginBottom: 4,
}
// 텍스트: fontSize:14, color:COLORS.text
```

#### 날짜 구분선
```javascript
// "─── 2026.08.23 ───"
{
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 12,
  marginHorizontal: 16,
}
// 선: flex:1, height:1, backgroundColor:'rgba(255,255,255,0.08)'
// 날짜 텍스트: fontSize:11, color:COLORS.textMuted, marginHorizontal:8
```

#### 메시지 입력창 (KeyboardAvoidingView)
```javascript
// 입력 영역 컨테이너
{
  flexDirection: 'row',
  alignItems: 'flex-end',
  gap: 8,
  padding: 12,
  backgroundColor: COLORS.dark,       // '#1a1a2e'
  borderTopWidth: 1,
  borderTopColor: COLORS.border,      // '#2a2a50'
}

// TextInput
{
  flex: 1,
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 8,
  color: COLORS.text,
  fontSize: 14,
  maxHeight: 100,           // 다줄 입력 허용
  minHeight: 38,
}

// 전송 버튼
{
  width: 38, height: 38,
  borderRadius: 19,
  backgroundColor: COLORS.primary,    // '#E8121A'
  alignItems: 'center',
  justifyContent: 'center',
}
// 아이콘: '▶' 또는 '→'  fontSize:16 color:'#fff'
```

#### 달력 (MeetCalendar RN 버전)
```javascript
// 달력 컨테이너
{
  backgroundColor: COLORS.surface,
  borderRadius: 12,
  padding: 16,
  margin: 16,
}

// 날짜 셀 상태
const DAY_STYLE = {
  normal:     { bg: 'transparent',               text: COLORS.textSub },
  mine:       { bg: COLORS.primary,              text: '#fff' },       // 내 가용일: 레드
  theirs:     { bg: COLORS.accent,               text: '#000' },       // 상대 가용일: 시안
  overlap:    { bg: '#2ea44f',                   text: '#fff' },       // 겹치는 날: 초록
  past:       { bg: 'transparent',               text: 'rgba(255,255,255,0.2)' },
};
```

#### 새 약속 요청 모달 (MeetRequestModal)
웹의 3단계 위저드와 동일 흐름이지만 RN Modal로 구현:
- 1단계: 회원 검색 TextInput + FlatList 결과
- 2단계: 날짜 선택 (SimpleDatePicker)
- 3단계: 초기 메시지 작성 + 요약 확인

---

## 5. 반응형 고려사항 (React Native)

React Native는 CSS 미디어쿼리가 없고 `Dimensions.get('window')`를 사용한다.

```javascript
import { Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 폰/태블릿 분기 기준
const IS_TABLET = SCREEN_WIDTH >= 768;

// 그리드 컬럼 수
const GRID_COLS = IS_TABLET ? 3 : 2;

// 카드 너비
const CARD_WIDTH = (SCREEN_WIDTH - (GRID_COLS + 1) * 8) / GRID_COLS;
```

---

## 6. 상태 정의 (각 화면)

### MeetsScreen 상태
| 상태 | UI |
|------|----|
| 로딩 | skeleton rows × 4 (shimmer, surface 배경) |
| 빈 목록 | 🤝 "아직 약속이 없어요" + [새 약속 요청] 버튼 |
| 에러 | "약속 목록을 불러오지 못했어요" + 재시도 |
| 정상 | MeetCard FlatList |

### MeetDetailScreen 상태
| 상태 | UI |
|------|----|
| 로딩 | 채팅 영역 3개 skeleton bubble |
| PENDING (수신자) | 상단 고정 바: "수락" (primary) / "거절" (danger) 버튼 |
| NEGOTIATING | 달력 탭에서 가용일 선택 가능 |
| CONFIRMED | 확정 날짜 표시, 완료 처리 버튼 |

### ExploreScreen 장르 필터 상태
| 상태 | UI |
|------|----|
| 전체 (genre=null) | 모든 사진 표시 |
| 장르 선택 | 해당 장르만 필터링, 선택된 탭 primary 배경 |
| 로딩 중 | 기존 skeleton 유지 |

---

## 7. Claude.ai 아티팩트 요청 프롬프트

### ExploreScreen 장르 필터 탭

```
[시스템 컨텍스트]
앱: Happiness (React Native + Expo 49)
아이콘: 이모지/유니코드만 사용
컬러: primary '#E8121A', accent '#22D3EE', darkDeep '#0a0a18',
      surface '#12122a', text '#eeeeff', textSub '#8888cc', textMuted '#5555aa'
외부 라이브러리 없음, 한국어 텍스트

FlatList 기반 수평 스크롤 장르 탭 바 컴포넌트를 작성해줘.
- 13개 탭: [전체, 인물👤, 웨딩💍, 풍경🏔, 자연🌿, 스트리트🚶, 건축🏛, 음식🍽, 여행✈️, 패션👗, 라이프스타일☀️, 상업📦, 파인아트🎨]
- 활성 탭: backgroundColor '#E8121A', color '#fff', fontWeight '700'
- 비활성 탭: backgroundColor 'rgba(255,255,255,0.07)', color '#8888cc', fontWeight '400'
- 탭 높이: 36px, borderRadius: 20, paddingHorizontal: 14
- 탭 간격: gap 8, contentContainerStyle paddingHorizontal:12
- showsHorizontalScrollIndicator: false
- onSelectGenre 콜백 props 포함
```

### SeriesCollage 컴포넌트 (React Native)

```
[시스템 컨텍스트]
앱: Happiness (React Native + Expo 49)
컬러: primary '#E8121A', surface '#12122a', text '#eeeeff', textSub '#8888cc'
외부 라이브러리 없음, 한국어 텍스트

시리즈 보드 카드의 3장 콜라주 컴포넌트를 작성해줘.
- props: previewPhotos (최대 3장 배열, 각 { imageUrl, thumbnailUrl }), height=160
- 0장: 회색 bg + 📷 중앙 (bg: rgba(255,255,255,0.04))
- 1장: 단일 이미지 전체 width
- 2장: 50:50 좌우 분할
- 3장: 60:40 콜라주 (왼쪽 60% 첫 번째, 오른쪽 40% 위아래 2장)
- 이미지 사이 gap: 1px (배경색 darkDeep '#0a0a18'으로 시각적 구분)
- 아래 SeriesCard 전체도 작성 (제목/프로필명/사진수 포함)
- TouchableOpacity activeOpacity:0.85
```

---

## 수용 기준 (AC)

- [ ] AppNavigator.js에서 `'#0a0a18'` 하드코딩이 COLORS 토큰으로 교체
- [ ] AppNavigator.js에서 `'#1e1e3a'` 하드코딩이 COLORS 토큰으로 교체
- [ ] ExploreScreen에 수평 스크롤 장르 탭 바 추가 (13개 탭)
- [ ] ExploreScreen의 genre 상태가 photoApi 호출 시 파라미터로 전달
- [ ] SeriesScreen 카드가 previewPhotos 수에 따라 0/1/2/3장 콜라주 분기 렌더링
- [ ] MeetsScreen 추가: 약속 목록, 상태별 탭 필터, MeetCard 컴포넌트
- [ ] MeetDetailScreen 추가: 채팅 탭(기본), 일정 탭, 장소 탭
- [ ] MeetsScreen/MeetDetailScreen이 TabNavigator 또는 Stack에 연결됨
- [ ] `npx expo export --platform web` 성공 (JS 번들 에러 없음)
