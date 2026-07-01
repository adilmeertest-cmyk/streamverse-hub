# StreamFlix — Android & Desktop Build Guide

The same React codebase runs on the web, Android (Capacitor), and Windows/macOS/Linux (Electron). This guide is the one-time setup needed to produce installable binaries. Everything below runs on your own machine — Lovable's sandbox cannot ship signed store binaries.

> Both wrappers load a **client-only SPA build** of the site. The website itself continues to run as a full TanStack Start SSR app in production — the SPA build is only used to package the shell.

## 1. Build the client bundle

```bash
# Standard SSR build for the website
bun run build

# Client bundle (index.html + JS/CSS in dist/public) — used by Capacitor & Electron
bun run build
```

The Vite build already outputs `dist/public/`. Both wrappers point at that folder.

## 2. Android (Capacitor → APK / AAB)

```bash
# One-time: add the Android platform
bunx cap add android

# Every build: refresh the native project with the latest web assets
bun run build
bunx cap copy android
bunx cap sync android

# Open in Android Studio to build a signed APK or AAB
bunx cap open android
```

In Android Studio: `Build → Generate Signed Bundle / APK` → pick **Android App Bundle** for Play Store, or **APK** for direct install. Sign with your keystore.

App identity is defined in `capacitor.config.ts` (`appId: app.streamflix.mobile`, `appName: StreamFlix`).

## 3. Windows / macOS / Linux (Electron)

```bash
# Build the web bundle
bun run build

# Package for the current OS
bunx @electron/packager . "StreamFlix" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='^/src' --ignore='^/public' \
  --ignore='^/electron-release' --ignore='^/android'
```

Change `--platform` to `darwin` (macOS) or `linux`. The main process entry is `electron/main.cjs`.

> Electron loads files via `file://`. If you see a blank window, ensure Vite is producing relative asset paths in `dist/public/index.html`.

## 4. Shared backend

All three targets talk to the same Lovable Cloud backend (auth, database, storage) using the credentials in `.env`. No changes required — sign-in state, watchlist, and playback are automatically synchronised across web, mobile, and desktop.