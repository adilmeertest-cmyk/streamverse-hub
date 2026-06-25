# Next Iteration Plan — Payments, Admin CMS, Reviews

Three workstreams built on the existing schema (`subscription_plans`, `subscriptions`, `titles/seasons/episodes`, `reviews`, `user_roles` + `has_role`). RLS and role gating are preserved; no destructive schema changes.

## 1. Stripe Checkout (Lovable-managed)

Use Lovable's built-in Stripe payments (no BYOK). Recommend → enable → create products → wire checkout.

- Run `recommend_payment_provider`, then `enable_stripe_payments`.
- Create 4 Stripe products mapped to existing `subscription_plans` rows (Basic, Standard, Premium, Family). Store Stripe `price_id` on each plan row (migration adds `stripe_price_id text`, `stripe_product_id text`).
- New server fns in `src/lib/billing.functions.ts`:
  - `createCheckoutSession({ planId })` — requires auth, returns Stripe Checkout URL with `success_url`/`cancel_url` to `/account?checkout=success|cancel`.
  - `createBillingPortalSession()` — returns Stripe Customer Portal URL.
  - `getMySubscription()` — reads `subscriptions` for current user.
- Webhook route `src/routes/api/public/stripe-webhook.ts` (signature-verified) handles `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.payment_failed`; upserts `subscriptions` via `supabaseAdmin` (loaded inside handler).
- Update `/pricing` to call `createCheckoutSession` (redirect to `/auth` if not signed in).
- Update `/_authenticated/account` with current plan badge, "Manage billing" button, renewal date.
- Update `watch.$slug` entitlement check to read `subscriptions.status in ('active','trialing')` plus plan tier vs `titles.required_plan`.

## 2. Admin CMS UI (`/_authenticated/admin/*`)

Role-gated via `has_role()`; a new pathless layout redirects non-admins. All mutations go through server fns that re-check role server-side.

Routes:
- `admin/route.tsx` — sidebar shell (shadcn sidebar), checks `has_role(uid, 'super_admin' | 'content_manager' | 'moderator' | 'finance_manager' | 'support_agent' | 'analytics_manager')`. Non-admin → redirect `/`.
- `admin/index.tsx` — dashboard: counts (titles, users, active subs, pending reviews), recent audit log.
- `admin/titles.tsx` — searchable/paginated table of titles; create/edit drawer (title, slug, kind, synopsis, hero/poster URL, HLS source, required_plan, genres, categories, publish state).
- `admin/titles.$id.tsx` — detail with seasons/episodes manager (series only), licensing windows, genre/category assignment.
- `admin/categories.tsx`, `admin/genres.tsx`, `admin/banners.tsx` — CRUD tables.
- `admin/reviews.tsx` — moderation queue (filter by `review_state`); approve/reject buttons.
- `admin/users.tsx` — user search, role grant/revoke (super_admin only), subscription view.
- `admin/plans.tsx` — list `subscription_plans` with Stripe price linkage (read-only Stripe IDs).
- `admin/audit.tsx` — audit log viewer.

Server fns in `src/lib/cms.functions.ts` (auth + role check + Zod validation):
- `cms.upsertTitle`, `cms.deleteTitle`, `cms.upsertSeason`, `cms.upsertEpisode`, `cms.upsertCategory`, `cms.upsertGenre`, `cms.upsertBanner`, `cms.assignTitleGenres`, `cms.moderateReview`, `cms.grantRole`, `cms.revokeRole`. Each writes an `audit_logs` row.

Header gets an "Admin" link visible only when `has_role` returns true (server fn `me.isAdmin`).

## 3. Ratings & Reviews

Schema already has `reviews` with `review_state`. UI additions:

- On `title.$slug`:
  - Show aggregate rating (avg + count) computed via server fn `catalog.getTitleRatings(titleId)`.
  - Reviews list (approved only) with pagination.
  - Auth-gated "Write a review" form (1–5 stars + text, Zod validated, max 2000 chars). Inserts with `review_state='pending'` (or `approved` if auto-approve flag in plan; default pending for moderation).
  - If user already reviewed, show their review with edit/delete.
- Server fns in `src/lib/reviews.functions.ts`: `submitReview`, `updateMyReview`, `deleteMyReview`, `listTitleReviews`, `getTitleRatings`. Moderation handled by `cms.moderateReview`.
- Notification: on approval, insert `notifications` row for the reviewer.

## Technical Details

- Migrations needed:
  1. `ALTER TABLE subscription_plans ADD COLUMN stripe_price_id text, stripe_product_id text;`
  2. (Optional) `ALTER TABLE titles ADD COLUMN avg_rating numeric(3,2), rating_count int DEFAULT 0;` updated via trigger on `reviews` state change — or compute on demand (simpler; use this).
  3. RLS: `reviews` insert policy already scoped to `auth.uid()`; add policy allowing `has_role(uid,'moderator')` to update `review_state`. Approved reviews readable by anon (`SELECT` policy `review_state='approved'`).
  4. `subscriptions` already has policies; ensure service_role can upsert from webhook (it can — `GRANT ALL ... TO service_role`).
- Stripe webhook: verify signature with `STRIPE_WEBHOOK_SECRET` (auto-provisioned by `enable_stripe_payments`).
- All server fns using `requireSupabaseAuth` already supported by `attachSupabaseAuth` in `src/start.ts`.
- Use TanStack Query everywhere (`ensureQueryData` + `useSuspenseQuery`).
- Dark cinematic styling preserved; admin uses subdued surface tokens + shadcn `sidebar`, `table`, `dialog`, `form`.

## Build Order

1. Migration: add `stripe_*` columns to plans + review moderation policy + anon read on approved reviews.
2. Enable Stripe payments → create 4 products → update plan rows with price IDs.
3. Billing server fns + webhook route + pricing/account UI.
4. Reviews server fns + UI on title detail.
5. Admin layout + role gate + dashboard.
6. Admin CRUD pages (titles → seasons/episodes → categories/genres/banners → reviews moderation → users/roles → plans → audit).
7. Header admin link, smoke test entitlements + checkout + review flow.

## Out of Scope (still future)

DRM, native apps, multi-CDN, AI recommendations, Easypaisa/JazzCash, transcoding pipeline — all remain in `docs/ARCHITECTURE.md`.