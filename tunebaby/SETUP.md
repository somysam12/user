# TuneBaby Music — Setup Guide

## Running on Android

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Android Studio with Android SDK (API 26+)
- Physical Android device or emulator

### Quick Start

```bash
cd tunebaby
npm install
npx expo start --android
```

---

## Online Music Search (Jamendo API)

TuneBaby uses the **Jamendo API** to stream millions of free, Creative Commons-licensed songs.
Online search is **disabled by default**. To enable it:

1. Register free at **https://devportal.jamendo.com/**
2. Copy your `client_id`
3. Open `src/constants/config.ts` and replace:
   ```ts
   export const JAMENDO_CLIENT_ID = 'YOUR_JAMENDO_CLIENT_ID';
   ```
   with your real key:
   ```ts
   export const JAMENDO_CLIENT_ID = 'abc123yourkey';
   ```
4. Rebuild the app

**Without a Jamendo key:** device file import and local playback work fully — no key needed.

---

## Audio Sources — What This App Does (and Does NOT Do)

| Source | Available | Notes |
|--------|-----------|-------|
| Jamendo online streaming | ✅ (needs API key) | Free Creative Commons music; legal streaming direct from Jamendo CDN |
| Device audio file import | ✅ | MP3, AAC, FLAC, OGG and other formats via system file picker |
| Download to device | ✅ (Jamendo tracks only) | Only when `audiodownload_allowed: true` on the track (Jamendo's permission) |
| YouTube audio | ❌ | Not supported — extracting/ripping YouTube audio violates YouTube ToS |
| Spotify / Apple Music | ❌ | DRM-protected streams — not supported |

---

## Features

- **Discover / Home** — featured, trending, popular artists, new releases (Jamendo)
- **Search** — songs, artists, albums + genre browsing; always searches device files too
- **Library** — playlists (create/rename/delete), liked songs, downloads, local files
- **Full Player** — seek bar, like, download, shuffle, repeat, queue
- **Mini-player** — persistent on all tabs; tap to open full player
- **Background playback** — continues when screen locks (Android)
- **Offline** — downloaded Jamendo tracks and imported device files play without internet

---

## Project Structure

```
tunebaby/
├── app/
│   ├── _layout.tsx          # Root layout (providers)
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar + mini-player
│   │   ├── index.tsx        # Discover / Home
│   │   ├── search.tsx       # Search + genre browse
│   │   └── library.tsx      # Library (playlists, downloads, local)
│   ├── player.tsx           # Full Now Playing screen
│   ├── artist/[id].tsx      # Artist profile
│   └── playlist/[id].tsx    # Playlist view
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # PlayerContext, LibraryContext
│   ├── services/            # jamendo.ts, storage.ts
│   └── constants/           # colors.ts, config.ts
└── types/index.ts           # Shared TypeScript types
```

---

## Building a release APK

```bash
# Using EAS Build (recommended)
npm install -g eas-cli
eas build --platform android --profile production

# Or local build (needs Android SDK + NDK)
npx expo run:android --variant release
```
