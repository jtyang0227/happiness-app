# Expo SDK 49 → 58 업그레이드 계획 (2026-11-13)

> `expo-upgrade` 스킬 기준으로 이 저장소의 `mobile/`을 대조해 쓴 계획이다. **아직 실행하지 않았다** — 실기기(또는 EAS) 빌드로만
> 확인되는 변경이 대부분이라, 클라우드 세션에서는 웹 번들 export까지만 검증할 수 있다.
> 버전 숫자는 npm 레지스트리의 `expo@58.0.25`(`latest`)와 그 안의 `bundledNativeModules.json`에서 읽었다.
> "확인 필요"라고 적은 항목은 릴리스 노트를 직접 읽지 못한 것이다(이 세션에서 expo.dev 접속 불가).

## 1. 왜 해야 하나

- Google Play: 새 앱·업데이트는 targetSdk 35 이상을 요구한다. 지금은 `app.json`에 34 고정(SDK 49 한계).
- App Store: 최신 Xcode·iOS SDK 빌드 요구. SDK 49는 EAS의 현재 빌드 이미지에서 빌드되지 않을 가능성이 높다(확인 필요).
- 그래서 **스토어 제출 전에 반드시 끝나야 하는 작업**이고, 기능 작업보다 먼저다.

## 2. 현재 → 목표

| 패키지 | 지금 | SDK 58 |
|---|---|---|
| expo | ~49.0.14 | ~58.0.25 |
| react-native | 0.72.6 | 0.88.1 |
| react / react-dom | 18.3.1 / 18.2.0 | 19.3.0 |
| react-native-web | ~0.19.6 | ~0.21.4 |
| react-native-screens | ~3.22.0 | ~4.30.1 |
| react-native-safe-area-context | ^4.6.3 | ~5.11.1 |
| @react-native-async-storage/async-storage | 1.18.2 | 2.2.0 |
| react-native-view-shot | ^3.8.0 | 6.1.1 |
| expo-blur · clipboard · file-system · image-picker · secure-store · status-bar | 12~15대 | ~58.x |
| react-native-share | ^9.4.1 | Expo 관리 목록에 없음 — 최신 12.x가 RN 0.88·New Architecture를 지원하는지 확인 필요 |
| Node | — | 22.13 이상 (`expo` engines) |

한 번에 49 → 58로 간다. 스킬 지침: SDK 55~57 초반에는 Hermes V1 메모리 문제가 있어 중간 버전에 머물지 않는다.

## 3. 이 저장소에서 실제로 바뀌는 곳

코드를 grep해 확인한 것만 적었다.

1. **내비게이션 import** — SDK 56부터 앱 코드가 `@react-navigation/*`를 직접 import하면 안 된다(스킬 `references/react-navigation-to-expo-router.md`).
   `src/navigation/AppNavigator.js`가 `@react-navigation/native`·`native-stack`·`bottom-tabs`를 쓴다.
   `npx expo-codemod sdk-56-expo-router-react-navigation-replace '**/*.{js,jsx}'`로 import 경로만 `expo-router/react-navigation` 계열로 바꾼다.
   런타임 API는 같다고 되어 있으나, v6 → v7 차이(예: `navigation.navigate`의 중첩 화면 동작)는 화면을 직접 눌러 확인해야 한다.
   `package.json`의 `main`(`node_modules/expo/AppEntry.js`)이 expo-router 도입 후에도 유효한지 확인 필요.
2. **New Architecture** — SDK 53부터 기본, RN 0.88에는 옛 구조가 없다. 네이티브 모듈 두 개가 관건:
   `react-native-view-shot`·`react-native-share`(모임 Instagram 공유, `src/utils/instagramShare.js`). 안 되면 이 기능만 일시 비활성화할 수 있게 이미 래퍼로 분리돼 있다.
3. **`expo-file-system`** — `utils/uploadImage.js`가 `FileSystem.uploadAsync`·`FileSystemUploadType`을 쓴다. SDK 54부터 이 API는 `expo-file-system/legacy`로 옮겨졌다(확인 필요).
   import 한 줄 변경이거나, `fetch` + `FormData` 업로드로 바꿔 의존을 없앤다(후자가 단순하다).
4. **React 19** — `store/AuthContext.js`의 `Context.Provider`·`useContext`는 그대로 동작한다(지원 중단 예고일 뿐). `forwardRef` 사용처는 없다. 바꿀 필요 없음.
5. **`app.json`** — `sdkVersion`·`privacy` 삭제, `android.compileSdkVersion`/`targetSdkVersion`(34 고정) 삭제해 SDK 기본값(35 이상)을 쓴다.
   `blockedPermissions`·image-picker 플러그인 설정은 유지하고, 업그레이드 후 `npx expo config --type introspect`로 권한 목록을 다시 확인한다.
6. **Android edge-to-edge** — targetSdk 35부터 강제. 자체 상단바 화면(사진 상세·약속 상세·가용 시간·슬라이드쇼)과 하단 탭바의 safe-area 여백을 실기기에서 다시 본다.
7. **AsyncStorage 1 → 2** — `src/storage/secureStorage.js`·`store/AuthContext.js`. API는 같지만 저장 위치가 유지되는지(업데이트 후 로그인 유지) 확인.
8. **정리** — `babel.config.js`는 `babel-preset-expo`만 있어 삭제 가능. `mobile/navigation/AppNavigator.js`(쓰이지 않는 옛 파일)는 코드모드 대상에서 빼거나 이때 지운다(삭제는 사용자 확인 후).
9. **웹 번들 검증 경로** — `*.web.js` 스텁(`instagramShare.web.js`, `secureStorage.web.js`)은 Metro 기본 동작이라 그대로일 것. `npx expo export --platform web`이 계속 통과해야 한다.

## 4. 순서

| 단계 | 할 일 | 통과 기준 | 어디서 |
|---|---|---|---|
| 0 | 별도 브랜치(`chore/expo-58`), master에는 끝날 때까지 올리지 않음 | — | 어디서나 |
| 1 | `npx expo install expo@latest` → `npx expo install --fix` → `npx expo-doctor` | doctor 오류 0 | 클라우드 가능 |
| 2 | 코드모드(3-1), `uploadImage.js`(3-3), `app.json`(3-5), babel 정리 | `npx expo export --platform web` 통과 | 클라우드 가능 |
| 3 | 웹 번들 + 로컬 서버로 로그인·둘러보기·피드·프로필·예약 화면 열기 | 페이지 오류 0 | 클라우드 가능 |
| 4 | `eas.json` 만들고 `eas build --profile development` (Android 먼저) | 빌드 성공, 앱 실행 | **사용자 — Expo 계정 필요** |
| 5 | 실기기 체크: 로그인 유지, 사진 선택·촬영·업로드, 탭·뒤로 가기, safe-area, Instagram 공유, 링크 복사, 슬라이드쇼 blur | CLAUDE.md "모바일 테스트" 체크리스트 전부 | **사용자** |
| 6 | iOS 빌드 → TestFlight, Play 내부 테스트 | 스토어 업로드 성공 | **사용자** (`eas-app-stores` 스킬) |

1~3단계는 요청하시면 이 세션에서 바로 진행할 수 있다. 4단계부터는 Expo 계정 로그인과 실기기가 필요하다.

## 5. 위험과 되돌리기

- 가장 큰 위험: `react-native-share`가 RN 0.88에서 빌드되지 않는 경우 → Instagram 공유만 `Share.share`(기본 공유 시트)로 대체하고 나머지를 먼저 출시.
- 내비게이션 동작 차이로 화면 이동이 깨지는 경우 → 3단계 웹 번들에서 대부분 드러난다.
- 되돌리기: 브랜치를 버리면 끝. master·운영 웹·API에는 영향이 없다(모바일 앱은 아직 스토어에 없다).

## 6. 하지 않는 것

- 화면을 expo-router 파일 기반 라우팅으로 옮기는 것(import 경로만 바꾼다).
- React Compiler 켜기, `expo-image` 도입 같은 선택 개선 — 업그레이드가 실기기에서 확인된 뒤 별도로.
