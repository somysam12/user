# TuneBaby — Build Instructions

Ye ek Expo (bare workflow) React Native app hai. Seedha build karne ke liye:

## Requirements
- Node.js 18+ and npm
- Java JDK 17
- Android SDK (via Android Studio) — SDK 35, NDK, build-tools
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` environment variable set

## Steps

```bash
# 1. Dependencies install karo (patches apne aap lag jaate hain postinstall se)
npm install

# 2. Debug build + device/emulator pe run
npx expo run:android

# 3. Release APK banane ke liye
cd android
./gradlew assembleRelease
```

Release APK yahan milega:
`android/app/build/outputs/apk/release/app-release.apk`

## Patched modules (important)

`node_modules` zip mein nahi hai (3GB+). `npm install` use regenerate karega.
3 native files patch kiye gaye hain — ye `patches/` folder mein hain aur
`npm install` ke baad `postinstall` hook se **apne aap** lag jaate hain:

1. `react-native-webview+13.12.5.patch` — buildscript block hataya (AGP conflict fix)
2. `react-native-track-player+4.1.1.patch` — buildscript block hataya
3. `expo-av+14.0.7.patch` — CMakeLists target `reactnativejni` → `reactnative` (RN 0.76 fix, launch crash fix)

Agar patches na lage to manually: `npx patch-package`

## APK size
- `android/app/build.gradle` mein `abiFilters "arm64-v8a"` set hai (size kam rakhne ke liye).
- R8 full mode on hai.

## Note
- Music data: iTunes API (no key needed) + YouTube in-app WebView playback.
- YouTube se audio/video extract/rip/download/convert NAHI hota — sirf
  YouTube ki apni page WebView mein stream hoti hai.
