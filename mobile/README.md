# Happiness App — Mobile (React Native)

React Native 0.72 + Expo 49 app for iOS and Android.

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 16+ (tested on v17.4.0) |
| npm | 8+ |
| Expo CLI | 49 (installed via npx) |
| iOS Simulator | Xcode 14+ (macOS only) |
| Android Emulator | Android Studio |

## Local Setup

```bash
cd mobile
npm install
npm start        # opens Expo Metro bundler
```

Then press:
- `i` — open iOS simulator
- `a` — open Android emulator
- `w` — open in web browser (limited support)
- Scan QR code with Expo Go on a physical device

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

> Android emulator uses `10.0.2.2:8080` instead of `localhost:8080` to reach the host machine. This is handled automatically in `services/api.js`.

## Backend Connection

The app connects to the Spring Boot backend. Start it before running the app:

```bash
cd ../backend
./gradlew bootRun   # http://localhost:8080
```

## Folder Structure

```
mobile/
├── assets/          # Images, fonts, static resources
├── components/      # Reusable UI (Header, TabBar, PhotoCard, GridSpanPicker, Toast)
├── constants/
│   ├── colors.js    # Color palette
│   └── layout.js    # SPACING, RADIUS, FONT constants
├── hooks/           # Custom hooks (usePhotos, useToast)
├── navigation/
│   └── AppNavigator.js   # Root navigator — owns all navigation state
├── screens/
│   ├── LoginScreen.js
│   ├── ExploreScreen.js
│   ├── GalleryScreen.js  # 12-column photo grid
│   ├── ListScreen.js
│   ├── DetailScreen.js
│   └── PhotoFormScreen.js  # Create / edit photo
├── services/
│   ├── api.js       # All HTTP calls to the backend
│   └── mockData.js  # Dev-time mock data
├── store/
│   └── AuthContext.js
└── utils/
```

**Rules:**
- Screen-level components → `screens/`
- Shared UI pieces → `components/`
- All API calls go through `services/api.js` (`photoApi`)
- No hardcoded colors or spacing — use `constants/colors.js` and `constants/layout.js`
- Reusable state logic → `hooks/`

## Key Features

- **Gallery** — 12-column grid; each photo occupies 1–12 columns (`gridColSpan`). Photos are packed into rows automatically.
- **Photo registration** — Title, image URL, description, and a visual column-width picker (`GridSpanPicker`).
- **Likes / Bookmarks** — tap icons on the detail screen.
- **Toast notifications** — global feedback via `useToast` hook.

## Gallery Grid System

Photos have a `gridColSpan` value (1–12, default 6 = half width). The gallery packs photos into rows that sum to 12 columns, using flex layout. The `GridSpanPicker` component in the form lets users choose from presets (좁게 4, 보통 6, 넓게 9, 전체 12) or tap individual cells.
