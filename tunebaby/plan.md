# TuneBaby UI Renewal Plan

## Goal
Existing Expo/React Native music app ko premium iOS-inspired glassmorphism UI mein renew karna, bina current playback, library, search, playlists, downloads aur theme behavior todhe.

## Design
- **Design movement:** iOS 17 translucent music player meets soft aurora glass.
- **Core principles:** hierarchy-first layouts, translucent layered surfaces, generous rounded geometry, tactile feedback.
- **Color philosophy:** deep midnight blue/indigo base with warm coral signature accent; light mode uses pearl surfaces and the same coral focus color.
- **Layout paradigm:** edge-to-edge content with floating cards and bottom floating controls instead of hard section boxes.
- **Signature elements:** aurora gradient washes, frosted glass surfaces, coral progress/active indicators.
- **Interaction philosophy:** every actionable surface has pressed scale/opacity feedback and clear active states.
- **Animation:** native Pressable feedback, subtle elevation/shadow, progress and player controls remain responsive; no heavy animation dependency added.
- **Typography system:** existing system sans with strong 28px display titles, 18–20px section titles, 14–15px body and muted 12px metadata.
- **Brand essence:** TuneBaby is a calm, expressive listening space for discovering and organizing music; warm, polished, personal.
- **Brand voice:** concise and inviting. Examples: “Make room for your next favorite.” and “Your sound, beautifully organized.”
- **Wordmark & logo:** preserve existing TuneBaby identity while giving it stronger spacing and coral highlight treatment.
- **Signature brand color:** coral `#FF6B4A`.

## Implementation
- Add a reusable frosted `GlassCard` surface using `expo-blur` with theme-aware fallback.
- Expand theme color tokens for glass, overlays, gradients and tab surfaces.
- Refresh tab bar, mini-player and reusable track rows first so all screens benefit.
- Refresh Discover, Search, Library and full Player screen layouts while preserving existing handlers and data flows.
- Keep feature addition out of scope until user provides its behavior.
- Validate TypeScript and Gradle release build, then deliver `android/app/build/outputs/apk/release/app-release.apk`.

## Project structure
- `src/constants/colors.ts`: theme tokens.
- `src/components/GlassCard.tsx`: shared frosted surface.
- `src/components/TrackCard.tsx`, `MiniPlayer.tsx`: reusable listening surfaces.
- `app/(tabs)/*`: refreshed primary screens.
- `app/player.tsx`: refreshed now-playing surface.
