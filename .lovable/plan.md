All four picks are sizable. I'll deliver them in this order so each is testable before the next, and so the heaviest (Electron) lands last.

## 1. Email verification + branded password reset
- Turn ON email confirmations in Supabase auth config (signups must verify).
- Update `/auth` signup flow: stop auto-signing-in; show "Check your inbox to verify" state. Login already blocks unverified users.
- Add `/auth/callback` route to handle the verification + recovery redirects cleanly.
- Set up Lovable email domain + infra, then scaffold the 6 branded auth email templates (signup confirm, recovery, magiclink, invite, email-change, reauth) styled to StreamFlix dark/red brand.
- Password-reset emails already only go to the account's email (Supabase behavior); reset page already exists.

## 2. PWA install
- Add `public/manifest.webmanifest` (name, short_name, theme `#e50914`, bg `#0a0a0a`, `display: standalone`, icon set).
- Generate 192/512 maskable icons + apple-touch-icon.
- Wire `<link rel="manifest">` + theme-color in `__root.tsx` head.
- Add an "Install app" button in the header that listens for `beforeinstallprompt`, shows when installable, hides after install. No service worker (manifest-only — per skill/pwa, offline wasn't requested).

## 3. Netflix-style polish
- Hero: autoplay muted trailer on hover/after 2s delay using existing `trailer_url` (YouTube embed fallback to backdrop).
- Skeleton loaders for `TitleRow` and grids while queries load.
- Lazy-load poster images (`loading="lazy"`, `decoding="async"`, blur-up).
- Infinite scroll on `/browse/*` grids using `useInfiniteQuery` + IntersectionObserver.
- Smooth row scroll buttons + edge fades on `TitleRow`.
- TanStack Query `staleTime: 60_000` defaults for catalog queries.

## 4. Electron desktop builds + Download App page
- New `/download` route with three buttons (Windows/macOS/Linux) and install instructions.
- Add `electron/main.cjs` (BrowserWindow loading the published site URL — simplest, always up-to-date; no need to bundle the SSR app).
- Add `package.json` scripts using `@electron/packager` to build Linux .tar.gz, macOS .zip, Windows portable .zip into `/mnt/documents/`.
- Host the artifacts via the project's Supabase Storage public bucket; `/download` links to them.
- Set Vite `base: './'` only matters when bundling the app inside Electron — we're loading the hosted URL so no Vite change needed.

## Technical notes
- Auth callback uses `supabase.auth.exchangeCodeForSession` on mount, then routes to `/` or `/reset-password` based on `type`.
- Manifest icons generated via the image tool at 512x512 then downscaled.
- Electron app points at `https://<project>.lovable.app` by default; user can rebuild after publishing custom domain.
- No service worker → no PWA stale-cache risk in Lovable preview.

## Risks / asks
- Email infra needs a Lovable email domain — I'll trigger the setup dialog if none exists.
- Electron packaging runs in the sandbox; artifacts land in `/mnt/documents/` and I'll upload them to a public `downloads` storage bucket.
- Enabling email confirmation will immediately require new signups to verify — existing users unaffected.

Approve and I'll build straight through in this order.