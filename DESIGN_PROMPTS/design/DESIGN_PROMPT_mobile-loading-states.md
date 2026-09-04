# DESIGN_PROMPT — 모바일 Skeleton 로딩 / EmptyState 컴포넌트
> Feature 38-B1, B3 | 2026-09-04 | Toss 디자인 시스템

기획 원문: `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` — 섹션 B-1, B-3

---

## 시스템 컨텍스트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (모바일 = React Native 0.72 + Expo 49)
기술 스택: React Native, StyleSheet 또는 inline style 객체
아이콘: 이모지 또는 유니코드 기호 사용 (react-native-vector-icons 등 외부 라이브러리 없음)

모바일 컬러 시스템 (Toss 디자인 시스템, mobile/constants/colors.js):
  primary:       '#3182F6'
  primaryLight:  '#E8F3FF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'
  success:       '#00C471'

모바일 규칙:
- 외부 UI/애니메이션 라이브러리 추가 금지 (react-native-skeleton-placeholder 등)
- RN 기본 API만 사용: Animated, FlatList, RefreshControl, TouchableOpacity
- 한국어 UI 텍스트
- 그림자: elevation(Android) + shadowColor/Offset/Opacity/Radius(iOS), rgba 중립 회색 기반
- blur/glassmorphism 금지
```

> **주의**: 이 파일의 컴포넌트 스펙은 React Native 코드가 아니라 **"이렇게 보여야 한다"는 시각 디자인 스펙**이다.
> Claude.ai 아티팩트 프롬프트는 모바일 UI를 **웹 React로 근사 렌더링**하는 방식으로 작성되어 있다 (모바일 에뮬레이터 없이
> 브라우저에서 시각 검증 가능하도록). 실제 RN 구현 시에는 StyleSheet + RN Animated API를 사용한다.

---

## 배경 및 목적

모바일 앱 전체 화면이 `ActivityIndicator` 스피너만 사용하여 로딩 중 레이아웃 점프가 심하고
체감 대기 시간이 길다. Shimmer 대신 RN `Animated` API의 opacity 펄스로 skeleton 카드를 구현하고,
빈 화면의 단순 텍스트를 시각적 EmptyState 컴포넌트로 교체한다.

---

## 1. SkeletonCard 컴포넌트 (B-1)

### 시각 목표

```
ExploreScreen / GalleryScreen — SkeletonPhotoCard (2컬럼)

┌────────────┐  ┌────────────┐
│            │  │            │  ← 이미지 영역 bg #E5E8EB
│  ░░░░░░░░  │  │  ░░░░░░░░  │    height 150px, borderRadius 8px
│  ░░░░░░░░  │  │  ░░░░░░░░  │    opacity 펄스 0.4→1→0.4
│            │  │            │
└────────────┘  └────────────┘
─────────── 8px gap ───────────

FeedScreen — SkeletonFeedCard (1컬럼)

┌─────────────────────────────────────────┐
│  [아바타 32px] ░░░░░░░░░    ░░░░░░░░░   │  ← 헤더 행
├─────────────────────────────────────────┤
│                                         │  ← 이미지 영역
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │    height 240px, bg #E5E8EB
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                         │
├─────────────────────────────────────────┤
│  ░░░░░░░░░░░░░░░   ░░░░░░░░           │  ← 텍스트 행 1 (height 14px)
│  ░░░░░░░░░░░░░░░░░░░░░░░░             │  ← 텍스트 행 2 (height 12px)
└─────────────────────────────────────────┘

GatheringsScreen — SkeletonGatheringCard (1컬럼)

┌─────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← 이미지 영역 height 180px
├─────────────────────────────────────────┤
│  ░░░░░░░░░░   (제목)                    │  ← height 16px
│  ░░░░░░░       (날짜)                   │  ← height 12px, marginTop 8px
│  ░░░░░░░░░░░  ░░░░░          (배지들)   │  ← height 22px, marginTop 12px
└─────────────────────────────────────────┘
```

### 컴포넌트 스펙

#### SkeletonPhotoCard (ExploreScreen 2컬럼용)

| 속성              | 값                                          |
|-------------------|---------------------------------------------|
| 컨테이너 width    | `(화면 너비 - 32px) / 2` (16px 양쪽 패딩, 8px gap) |
| 이미지 영역 height| 150px                                       |
| 이미지 bg         | `#E5E8EB` (COLORS.border)                  |
| borderRadius      | 8px                                         |
| 텍스트 행 1       | height 12px, width 80%, bg `#E5E8EB`, borderRadius 4px, marginTop 8px |
| 텍스트 행 2       | height 10px, width 60%, bg `#E5E8EB`, borderRadius 4px, marginTop 4px |
| 컨테이너 bg       | `#ffffff`                                   |
| 컨테이너 padding  | 0 0 12px 0                                  |

#### SkeletonFeedCard (FeedScreen용)

| 속성              | 값                                          |
|-------------------|---------------------------------------------|
| 전체 width        | 100%                                        |
| bg                | `#ffffff`                                   |
| borderRadius      | 12px                                        |
| marginBottom      | 12px                                        |
| 헤더 padding      | 12px 16px                                   |
| 헤더 아바타       | 32px × 32px, borderRadius 16px, bg `#E5E8EB` |
| 헤더 텍스트 행 1  | height 12px, width 100px, bg `#E5E8EB`, borderRadius 4px, marginLeft 10px |
| 헤더 텍스트 행 2  | height 10px, width 60px, bg `#E5E8EB`, borderRadius 4px, marginTop 4px, marginLeft 10px |
| 이미지 영역       | width 100%, height 240px, bg `#E5E8EB`      |
| 텍스트 padding    | 12px 16px                                   |
| 텍스트 행 1       | height 14px, width 70%, bg `#E5E8EB`, borderRadius 4px |
| 텍스트 행 2       | height 12px, width 90%, bg `#E5E8EB`, borderRadius 4px, marginTop 6px |

#### SkeletonGatheringCard (GatheringsScreen용)

| 속성              | 값                                          |
|-------------------|---------------------------------------------|
| 이미지 영역       | width 100%, height 180px, bg `#E5E8EB`      |
| borderRadius      | 12px (상단)                                  |
| 내부 padding      | 14px 16px                                   |
| 제목 행           | height 16px, width 60%, bg `#E5E8EB`, borderRadius 4px |
| 날짜 행           | height 12px, width 40%, bg `#E5E8EB`, borderRadius 4px, marginTop 8px |
| 배지 행           | height 22px, width 120px, bg `#E5E8EB`, borderRadius 11px, marginTop 12px |

### 애니메이션 (RN Animated API)

```javascript
// React Native 구현 패턴 (실제 코드 아닌 스펙 설명)

// 1. Animated.Value 생성: new Animated.Value(0)
// 2. Animated.loop(
//      Animated.sequence([
//        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
//        Animated.timing(fadeAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
//      ])
//    ).start()
// 3. skeleton 요소에 <Animated.View style={{ opacity: fadeAnim }}>

// 타이밍 스펙:
//   - 시작 opacity: 0.4
//   - 피크 opacity: 1.0
//   - 반복 주기: 1200ms (각 방향 600ms)
//   - easing: 선형 (Easing.linear) — 자연스러운 호흡 효과

// 로딩 완료 후 실제 콘텐츠로 교체:
//   - 조건부 렌더링: { loading ? <SkeletonCard /> : <ActualCard /> }
//   - opacity 교체 fade: 별도 transition 없이 즉시 교체 (RN에서 opacity fade는
//     추가 Animated.Value가 필요해 복잡도 증가 — 빠른 즉시 교체가 UX상 더 깔끔)
```

### 화면별 배치 수량

| 화면             | skeleton 종류        | 초기 표시 수 |
|------------------|----------------------|-------------|
| ExploreScreen    | SkeletonPhotoCard    | 6개 (2컬럼 3행) |
| GalleryScreen    | SkeletonPhotoCard    | 4개 (2컬럼 2행) |
| FeedScreen       | SkeletonFeedCard     | 3개           |
| GatheringsScreen | SkeletonGatheringCard| 2개           |

---

## 2. EmptyState 컴포넌트 (B-3)

### 시각 목표

```
GalleryScreen 빈 갤러리:
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              🖼                         │  ← fontSize 48pt, marginBottom 16px
│                                         │
│       아직 사진이 없어요               │  ← fontSize 16px, fontWeight 600
│                                         │     color #4E5968
│   포트폴리오를 채울 첫 사진을 올려보세요  │  ← fontSize 14px, color #8B95A1
│                                         │     marginTop 8px, lineHeight 1.5
│      ┌───────────────────────┐          │
│      │   + 사진 등록하기      │          │  ← primary 버튼, height 44px
│      └───────────────────────┘          │
│                                         │
└─────────────────────────────────────────┘

FeedScreen 팔로우 없을 때:
┌─────────────────────────────────────────┐
│              📡                         │
│    팔로우한 작가가 없어요               │
│  탐색 화면에서 마음에 드는 작가를        │
│  팔로우해보세요                          │
│  ┌────────────────────────────────┐     │
│  │   탐색하러 가기                 │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘

MeetsScreen 약속 없을 때:
┌─────────────────────────────────────────┐
│              🤝                         │
│    아직 약속이 없어요                   │
│  작가 또는 모델을 검색해                 │
│  첫 약속을 요청해보세요                  │
│  ┌────────────────────────────────┐     │
│  │   + 약속 요청하기               │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### 컴포넌트 스펙

#### 컨테이너 레이아웃

| 속성                | 값                                             |
|---------------------|------------------------------------------------|
| 전체 bg             | `#F2F4F6` (앱 배경 — 별도 카드 없음)           |
| flex                | 1 (화면 중앙 채우기)                           |
| justifyContent      | center                                         |
| alignItems          | center                                         |
| paddingHorizontal   | 32px                                           |
| paddingVertical     | 60px                                           |

#### 각 요소

| 요소              | 스타일                                          |
|-------------------|-------------------------------------------------|
| 아이콘 이모지     | fontSize 48, marginBottom 16px                  |
| 제목 텍스트       | fontSize 16px, fontWeight 600, color `#4E5968`, textAlign center |
| 설명 텍스트       | fontSize 14px, color `#8B95A1`, textAlign center, marginTop 8px, lineHeight 22px |
| CTA 버튼         | marginTop 24px, height 44px, paddingHorizontal 24px, bg `#3182F6`, color `#ffffff`, borderRadius 10px, fontSize 15px, fontWeight 600 |
| CTA 버튼 pressed | bg `#1B64DA` (pressIn → Animated.Value 또는 TouchableOpacity activeOpacity 0.75) |

#### 화면별 콘텐츠 정의

| 화면              | 아이콘 | 제목                    | 설명                                            | CTA 버튼 라벨       |
|-------------------|--------|-------------------------|-------------------------------------------------|---------------------|
| GalleryScreen     | 🖼     | 아직 사진이 없어요       | 포트폴리오를 채울 첫 사진을 올려보세요           | + 사진 등록하기     |
| FeedScreen        | 📡     | 팔로우한 작가가 없어요   | 탐색 화면에서 마음에 드는 작가를 팔로우해보세요  | 탐색하러 가기       |
| MeetsScreen       | 🤝     | 아직 약속이 없어요       | 작가 또는 모델을 검색해 첫 약속을 요청해보세요   | + 약속 요청하기     |
| ExploreScreen     | 🔍     | 검색 결과가 없습니다     | 다른 키워드나 필터로 다시 검색해보세요           | 필터 초기화         |
| GatheringsScreen  | 📸     | 모집 중인 모임이 없어요  | 잠시 후 다시 확인하거나 모임을 직접 만들어보세요  | + 모임 만들기       |

> CTA 버튼이 필요 없는 화면(ExploreScreen 검색 결과 없음)은 action 없이 icon+title+description만 표시.

---

## 3. Pull-to-refresh 스펙 (B-2) — 참고

B-2는 별도 컴포넌트가 아니라 기존 FlatList에 props 추가이므로 시각 스펙은 간단하다.

```javascript
// RN RefreshControl 스펙
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}         // boolean state
      onRefresh={handleRefresh}        // async function
      tintColor="#3182F6"             // iOS 스피너 색상
      colors={["#3182F6"]}            // Android 스피너 색상
      progressBackgroundColor="#ffffff" // Android 배경색
    />
  }
/>

// 최소 표시 시간: handleRefresh 내부에서 await Promise.all([fetch, sleep(500)])
// → 너무 빠른 완료로 RefreshControl이 깜빡이는 UX 방지
```

---

## 반응형

모바일 컴포넌트는 `Dimensions.get('window').width`를 사용해 기기 너비에 맞춰 계산한다.
SkeletonPhotoCard의 width 계산식:
```
cardWidth = (screenWidth - 32 - 8) / 2
// 32 = 양쪽 paddingHorizontal 16px
// 8  = 컬럼 간 gap
```

태블릿(iPad, 768px+)에서는 `Dimensions.width >= 768` 조건으로 컬럼 수를 3으로 늘리는 것을 고려할 수 있으나
이번 스펙 범위 밖(모바일 전용 스펙).

---

## Claude.ai 아티팩트 요청 프롬프트

> **주의**: 아래 프롬프트는 React Native가 아닌 **웹 React**로 모바일 UI를 근사 렌더링하는 프롬프트다.
> 실제 모바일 구현 시에는 RN Animated + StyleSheet로 재작성해야 한다.

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (모바일 UI 웹 근사 렌더링)
기술 스택: React 18, inline style (모바일 UI를 웹으로 시각 검증하는 목적)
아이콘: 이모지/유니코드만 사용

컬러 토큰 (Toss 디자인 시스템):
  primary:      '#3182F6'
  primaryDark:  '#1B64DA'
  bg:           '#F2F4F6'
  surface:      '#ffffff'
  border:       '#E5E8EB'
  text:         '#191F28'
  textSecondary:'#4E5968'
  textMuted:    '#8B95A1'

규칙: export default 컴포넌트 1개, inline style, 외부 라이브러리 없음, 한국어 UI,
blur/glassmorphism/그라디언트 오브 금지.

모바일 앱 화면 3개를 375px 너비 디바이스 프레임 안에 나란히 보여주는 데모를 만들어줘.
(실제 모바일 구현이 아닌 시각 검증용 웹 렌더링)

── 화면 1: ExploreScreen 로딩 상태 (SkeletonPhotoCard) ──
- 전체 bg #F2F4F6, 너비 375px
- 2컬럼 그리드 (gap 8px, padding 16px)
- SkeletonPhotoCard 6개:
  * 각 카드 너비 (375 - 32 - 8) / 2 = 167.5px
  * 이미지 영역: height 150px, bg #E5E8EB, borderRadius 8px
  * 텍스트 행 1: height 10px, width 80%, bg #E5E8EB, borderRadius 4px, marginTop 8px
  * 텍스트 행 2: height 8px, width 60%, bg #E5E8EB, borderRadius 4px, marginTop 4px
  * opacity 펄스 애니메이션: @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
    animation: pulse 1.2s ease-in-out infinite
    각 카드 animation-delay를 0ms, 100ms, 200ms, ... 순차 적용 (stagger)

── 화면 2: FeedScreen 빈 상태 (EmptyState) ──
- 전체 bg #F2F4F6, 너비 375px, 세로 중앙 정렬 (flex, justifyContent center)
- paddingHorizontal 32px, paddingVertical 60px
- 아이콘: 📡, fontSize 48px, marginBottom 16px, textAlign center
- 제목: "팔로우한 작가가 없어요", fontSize 16px, fontWeight 600, color #4E5968, textAlign center
- 설명: "탐색 화면에서 마음에 드는 작가를 팔로우해보세요", fontSize 14px, color #8B95A1, textAlign center, marginTop 8px, lineHeight 1.6
- CTA 버튼: "탐색하러 가기", marginTop 24px, height 44px, padding 0 24px, bg #3182F6, color #fff, borderRadius 10px, fontSize 15px, fontWeight 600
  hover: bg #1B64DA (onMouseEnter/Leave)
  border: none

── 화면 3: GalleryScreen 빈 상태 (EmptyState) ──
- 전체 bg #F2F4F6, 너비 375px, 세로 중앙 정렬
- 아이콘: 🖼, fontSize 48px
- 제목: "아직 사진이 없어요"
- 설명: "포트폴리오를 채울 첫 사진을 올려보세요"
- CTA 버튼: "+ 사진 등록하기"

세 화면 옆에 각 화면의 제목 라벨("로딩 중", "빈 피드", "빈 갤러리")을 표시.
전체 배경 #191F28으로 설정해 스마트폰 느낌으로 프레이밍.
각 화면은 흰 프레임(border 2px solid #333, borderRadius 20px, overflow hidden)으로 감싸기.
```
