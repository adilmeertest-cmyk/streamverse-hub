# StreamFlix — Enterprise Architecture Blueprint

_Companion document to the MVP web app in this repository._

This document describes the **future, Netflix-scale** StreamFlix architecture.
The MVP shipping in this Lovable project is a deliberate subset (web only,
managed Postgres, mp4/HLS playback against a hosted source, Stripe billing,
no DRM, no transcoding pipeline). Everything below is what we would build
when scaling from MVP → 1M → 10M → 100M monthly users.

- [1. Product surface area](#1-product-surface-area)
- [2. High-level system architecture](#2-high-level-system-architecture)
- [3. Microservice topology](#3-microservice-topology)
- [4. Client applications](#4-client-applications)
- [5. Auth, identity & RBAC](#5-auth-identity--rbac)
- [6. Content management & ingestion](#6-content-management--ingestion)
- [7. Licensing & rights management](#7-licensing--rights-management)
- [8. Video processing pipeline](#8-video-processing-pipeline)
- [9. Streaming, CDN & DRM](#9-streaming-cdn--drm)
- [10. Live streaming](#10-live-streaming)
- [11. Player architecture](#11-player-architecture)
- [12. Subtitles & audio](#12-subtitles--audio)
- [13. Search engine](#13-search-engine)
- [14. Recommendation engine](#14-recommendation-engine)
- [15. Payments & subscriptions](#15-payments--subscriptions)
- [16. Advertising](#16-advertising)
- [17. Downloads](#17-downloads)
- [18. Notifications](#18-notifications)
- [19. Engagement (ratings, reviews, social)](#19-engagement-ratings-reviews-social)
- [20. Analytics & BI](#20-analytics--bi)
- [21. Customer support](#21-customer-support)
- [22. Security & threat model](#22-security--threat-model)
- [23. Device management](#23-device-management)
- [24. Marketing automation](#24-marketing-automation)
- [25. Compliance & legal](#25-compliance--legal)
- [26. Audit logging](#26-audit-logging)
- [27. API platform](#27-api-platform)
- [28. Observability](#28-observability)
- [29. Disaster recovery](#29-disaster-recovery)
- [30. DevOps & CI/CD](#30-devops--cicd)
- [31. AI modules](#31-ai-modules)
- [32. Database schema reference](#32-database-schema-reference)
- [33. Cloud cost & footprint](#33-cloud-cost--footprint)
- [34. Team structure & timeline](#34-team-structure--timeline)
- [35. Scaling playbooks](#35-scaling-playbooks)

---

## 1. Product surface area

| Layer | Surfaces |
| --- | --- |
| Catalog kinds | Movies, TV series, dramas, kids/animation, documentaries, educational, **live sports** |
| Monetization | SVOD (monthly/quarterly/yearly), AVOD (ad-supported free), TVOD (rent/buy), Premium / Family / Student plans, Free trial |
| Geo | Global, with per-territory catalogs and pricing |
| Clients | Web, Android, iOS, Android TV, Fire TV, Samsung Tizen, LG webOS, Apple TV, future: PS / Xbox |
| Languages (v1) | English, Urdu, Arabic, Hindi (UI + subs + audio) |

---

## 2. High-level system architecture

```
   ┌────────────────────────────────────────────────────────────┐
   │                       Clients (Web / Mobile / TV)          │
   └──────────────────────────────┬─────────────────────────────┘
                                  │ HTTPS
                                  ▼
               ┌───────────────────────────────────┐
               │    Edge / Anycast CDN + WAF       │  (Cloudflare / Akamai / Fastly)
               │  TLS, bot mgmt, DDoS, caching     │
               └────────┬──────────────────┬───────┘
                        │                  │
                        ▼                  ▼
              ┌───────────────────┐  ┌──────────────────────┐
              │  API Gateway      │  │ Video CDN (multi-CDN)│
              │ (Kong / Envoy)    │  │ HLS / DASH origin    │
              │ Auth, rate limit  │  │ Signed-URL token gate│
              └────────┬──────────┘  └──────────┬───────────┘
                       │                        │
        ┌──────────────┼─────────────────┐      │
        ▼              ▼                 ▼      ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────┐  origin storage
  │ identity │  │ catalog  │  │ playback     │  (S3 / GCS)
  │  svc     │  │  svc     │  │  svc / DRM   │
  └─────┬────┘  └────┬─────┘  └──────┬───────┘
        │           │                │
        ▼           ▼                ▼
   user store   catalog DB     license server (Widevine/FairPlay/PlayReady)
   (PG + Redis) (PG + ES)      + key vault

   side systems: search (Elastic/OpenSearch), recs (feature store + ML),
   subscriptions (Stripe + ledger), ads (VAST/VMAP server), notifications
   (FCM/APNs/SES/SNS), analytics (Kafka → Snowflake), CMS (Postgres + S3),
   QC pipeline (Airflow), live encoder (RTMP → packager → CDN), observability
   (OTel → Prometheus / Loki / Tempo / Grafana).
```

The control plane is Kubernetes (EKS/GKE/AKS) running in **≥3 regions**
(active-active). The data plane uses:
- **Postgres** (primary OLTP — Aurora / AlloyDB / Hyperscale)
- **Redis** (session, hot caches, rate limits)
- **Elasticsearch / OpenSearch** (catalog search + recommendation lookups)
- **Kafka** (event bus: plays, clicks, billing, ingest, audit)
- **Snowflake / BigQuery** (analytical warehouse)
- **S3 / GCS** (mezzanines, packaged assets, posters, subtitles)
- **Object storage with multi-region replication** for source masters
- **Multi-CDN** in front of the origin (Cloudflare + Akamai + Fastly), with
  per-request CDN selection driven by RUM + cost.

---

## 3. Microservice topology

| Service | Responsibility | Storage |
| --- | --- | --- |
| `identity-svc` | Sign-up, sign-in, OTP, OAuth (Google/Apple), JWT issuance, refresh, MFA, device list | Postgres + Redis |
| `profile-svc` | Account profiles (incl. Kids), avatars, preferences | Postgres |
| `catalog-svc` | Titles, seasons, episodes, categories, genres, banners, home rows | Postgres + Redis + ES |
| `licensing-svc` | Rights, territories, expiry, geo-gate | Postgres + cron |
| `ingest-svc` | Webhook/poll partner feeds, dispatch transcode jobs | Postgres + Kafka |
| `transcode-orchestrator` | Job graph, worker pool, retries | Postgres + S3 + workers |
| `packager-svc` | HLS/DASH packaging, DRM key fetch, manifest signing | S3 |
| `playback-svc` | Returns signed manifest + DRM license token; validates entitlement | Redis + DRM HSM |
| `subscription-svc` | Plans, checkout, Stripe webhooks, dunning, ledger | Postgres + Stripe |
| `entitlements-svc` | Read-optimized "can user X play title Y from country Z right now?" | Redis (denormalized) |
| `search-svc` | Type-ahead, fuzzy, voice query → text | Elasticsearch |
| `reco-svc` | Personalized rows, similar titles, ranking | Feature store + model server |
| `notification-svc` | FCM/APNs push, SES email, SMS via Twilio | Postgres + queue |
| `analytics-collector` | Event ingest from clients, fan-out to Kafka | Kafka |
| `cms-svc` | Admin operations, role-gated CRUD, review workflow | Postgres |
| `support-svc` | Tickets, FAQ, agent inbox | Postgres + ES |
| `ads-svc` | VAST/VMAP, ad selection, frequency capping, beaconing | Postgres + Redis |
| `live-svc` | Live event scheduling, DVR, low-latency HLS | Origin + CDN |
| `audit-svc` | Append-only audit log over Kafka | S3 + Athena |

All services are stateless and horizontally scaled; state lives in the data
plane. Inter-service traffic is gRPC + mTLS via Istio/Linkerd. Public traffic
is REST + GraphQL through Envoy.

---

## 4. Client applications

- **Web** — TanStack Start / Next-style SSR + ExoPlayer/Shaka Web Player.
- **Android** — Kotlin + Jetpack Compose + ExoPlayer + Widevine L1.
- **iOS / Apple TV (tvOS)** — Swift + SwiftUI + AVPlayer + FairPlay.
- **Android TV / Fire TV** — Kotlin + Leanback + ExoPlayer + Widevine L1.
- **Samsung Tizen / LG webOS** — Web-based runtime + Shaka Player + PlayReady.
- **Future: PS/Xbox** — UWP/WebView based shells reusing the web player.

Each client implements: launcher → profile picker → home rails → search →
title detail → player → downloads (mobile) → settings/account → ads (free tier).

---

## 5. Auth, identity & RBAC

- Methods: email+password, phone+OTP, Google, Apple, MFA/TOTP.
- Token model: short-lived (15 min) access JWT + 30-day rotating refresh token.
- Device binding: refresh tokens scoped to (user_id, device_id).
- MFA enforced for admin roles.
- Session list and device revocation per user.
- **RBAC**: roles are stored in a dedicated `user_roles` table (never on
  profiles). A `has_role(user_id, role)` SECURITY DEFINER function is the
  only path; all RLS policies call it. Roles: `super_admin`,
  `content_manager`, `moderator`, `finance_manager`, `support_agent`,
  `analytics_manager`, `user`.

| Role | Catalog | Billing | Users | Reports | Support |
| --- | --- | --- | --- | --- | --- |
| super_admin | CRUD | view | manage | all | manage |
| content_manager | CRUD | — | — | content | — |
| moderator | review | — | — | content | — |
| finance_manager | view | manage | view | finance | — |
| support_agent | view | view | reset | support | manage |
| analytics_manager | view | view | view | all | — |

---

## 6. Content management & ingestion

CMS is a first-class UI (the MVP ships a minimal version). Production CMS
supports bulk import, scheduling, content review workflow, multilingual
metadata, and a Banner Studio with A/B variants.

**Automated ingestion** comes from licensed sources only — partner studios,
distributors, official APIs, internal teams. The system never scrapes
pirated sources.

```
 Partner upload → Webhook/poll
   → Detection      (file hash, manifest)
   → Metadata import (TMDB-style spec the partner conforms to)
   → Poster / trailer import
   → Quality validation (resolution, bitrate, codec, audio loudness)
   → AI tagging      (genre, age, language, mood) — see §31
   → QC review queue
   → Approval        (4-eye review)
   → Publish (sets is_published + cache invalidation)
```

Coming-soon / countdown pages are auto-generated from `release_date`,
with optional "notify me" subscriptions.

---

## 7. Licensing & rights management

The `licenses` table records (title_id, licensor, territories[], starts_at,
ends_at, agreement_ref). `entitlements-svc` reads `licenses` denormalized
into Redis so playback decisions are O(1). A daily `pg_cron` sweep flips
`is_published=false` for titles whose every active license has expired and
writes to `audit_logs`. Geo-IP comes from MaxMind GeoIP2; VPN/proxy
detection runs at the WAF.

---

## 8. Video processing pipeline

```
upload (multipart to S3) → virus scan (clamav lambda) → mediainfo probe
  → transcoder (FFmpeg + per-title-encoding) producing
     240p/360p/480p/720p/1080p/1440p/4K + HDR variants
  → thumbnail sprite + 10-sec preview clip
  → packager (Shaka Packager) → HLS + MPEG-DASH (CMAF, fMP4)
  → DRM packaging:
       Widevine  (Google)  for Android/web
       FairPlay  (Apple)   for iOS/tvOS/Safari
       PlayReady (Microsoft) for Samsung/LG/Xbox
  → write manifests + key metadata to S3
  → mark `media_assets.ready=true` → publish
```

Workers run on a dedicated Kubernetes node pool with spot/preemptible
instances for the long tail. A priority queue keeps premieres ahead of
catalog backfill. Per-title encoding (Netflix-style) chooses a ladder
based on complexity so we don't waste bits.

---

## 9. Streaming, CDN & DRM

- Multi-CDN with per-session selection. RUM beacons feed a CDN selector
  in `playback-svc` that scores CDNs by region, ASN, and current cost/QoE.
- HLS LL + MPEG-DASH CMAF for low-latency live.
- Signed playback URLs (HMAC-SHA256, exp ≤ 5 min, single-IP-bound).
- DRM license requests authenticated with a one-time playback token
  bound to (user, title, device, session).
- Forensic watermarking (A/B variant frames at the segment level)
  for premium and pre-release content.

---

## 10. Live streaming

- Ingest: RTMP/SRT into a packaging pipeline (NGINX-RTMP / AWS MediaLive).
- Packaging: HLS LL / DASH LL at 1080p/720p/480p, ~3s glass-to-glass.
- DVR window: rolling 6 hours; per-event configurable.
- Companion features: live chat (separate WebSocket service), reactions,
  multi-cam, stats overlay.
- Health: per-segment ingest dashboards, automatic failover encoder.

---

## 11. Player architecture

Cross-platform feature parity:

- Play, pause, seek, speed (0.5–2.0x), keyboard shortcuts.
- Skip Intro / Skip Recap (chapter markers from QC).
- Next Episode autoplay.
- Subtitle picker (multi-language, styling).
- Audio track picker (multi-language, descriptive audio).
- Continue Watching resume.
- Chromecast / AirPlay / Picture-in-Picture.
- Quality picker with auto-ABR default.
- Per-event telemetry beacons (play, pause, seek, stall, bitrate switch,
  error, completion).

State machine: `idle → loading → buffering → playing ↔ paused → ended | error`.

---

## 12. Subtitles & audio

- Subtitle formats: WebVTT (HLS), TTML (DASH).
- Per-title `subtitles[]` records language, source, kind (sub/CC), URL.
- AI-generated drafts: ASR → MT → human review pipeline (Whisper +
  domain-tuned MT models behind a queue).
- Multi-audio tracks packaged as separate CMAF audio renditions.

---

## 13. Search engine

- Elasticsearch / OpenSearch cluster, sharded by language.
- Per-locale analyzers + edge n-grams for autocomplete.
- Fuzzy match for typos, synonyms (`movie` ≈ `film`).
- Search-by-actor/director uses dedicated person index joined at query time.
- Voice search: client uses Web Speech API or Whisper, then routes through
  the same Elastic query.
- Search analytics (zero-result queries, click-through) feeds back into
  catalog gaps.

---

## 14. Recommendation engine

- Offline: batch jobs build user/item embeddings from watch + click events
  (matrix factorization for cold-start, item2vec for similarity, sequence
  models for next-watch).
- Online: a feature store (Feast) serves user features to a TF Serving or
  Triton model at request time.
- Re-ranker combines model scores with business rules (new releases,
  premium prioritization, completion likelihood, license expiry pressure).
- A/B framework drives policy rollouts.
- Rows: Trending, Continue Watching, Because You Watched X, Top 10 in
  Your Country, Just For You, New Releases.

---

## 15. Payments & subscriptions

- **Stripe** for cards globally; **Easypaisa / JazzCash** for Pakistan;
  **Apple Pay**, **Google Pay**.
- Server-validated entitlements only. The client NEVER decides "premium
  granted" — we receive provider webhook → verify signature →
  subscription state → cache invalidation → ack.
- States: `trialing → active → past_due → canceled | paused`.
- Dunning: failed-payment retries (4-8-15 days), grace period 7 days,
  pause subscription, upgrade/downgrade with prorations.
- Ledger: every billing event is an append-only row used for finance
  reconciliation. Stripe is treated as the source of truth for cash, our
  ledger as the source of truth for entitlements.

---

## 16. Advertising

- Open standards: VAST 4 / VMAP for ad pods.
- Pre-roll, mid-roll, banner. Server-side ad insertion (SSAI) for live to
  defeat blockers.
- Targeting on coarse demographic + content category — never PII.
- Frequency capping per (user, campaign, hour).

---

## 17. Downloads

- Mobile-only.
- DRM-protected, device-bound (Widevine L1 persistent license).
- TTL set per title (typ. 7–30 days; 48 h after first play).
- Periodic license refresh required.
- No raw file exposure.

---

## 18. Notifications

- Channels: web/mobile push (FCM, APNs), email (SES/Resend), SMS (Twilio).
- Events: new content, new episode, expiring promo, payment failure,
  resume reminder, license countdown.
- User preferences per channel + per category.
- Templates are versioned and localized; sends pipeline through a
  rate-limited queue to avoid carrier blocks.

---

## 19. Engagement (ratings, reviews, social)

- 1–5 star ratings; one rating per (user, title).
- Text reviews with a moderation queue (auto + human).
- Likes / reactions on reviews.
- Share buttons (web link with OG metadata; the MVP already emits these).

---

## 20. Analytics & BI

- Client → analytics-collector → Kafka → S3 (raw) + Snowflake (modeled).
- Models: `fact_play`, `fact_billing`, `dim_title`, `dim_user`, etc.
- Dashboards (Looker / Metabase):
  - Executive: DAU, MAU, MRR, churn, ARPU, content ROI.
  - Content: most/least watched, completion rate, retention by title.
  - Marketing: campaign attribution, signup funnel.
  - Finance: revenue, refunds, chargebacks, taxes.

---

## 21. Customer support

- In-app contact form → `support_tickets`.
- Optional live chat via Intercom or in-house WebSocket.
- Knowledge base / FAQ in the CMS.
- Agent console with role-gated user lookup, refund tools, device revoke.

---

## 22. Security & threat model

Top threats: account takeover, payment fraud, scraping, piracy, DDoS,
credential stuffing, injection, IDOR, leaked secrets, supply-chain.
Mitigations:

- TLS 1.3 everywhere, HSTS, mTLS service-to-service.
- Argon2 password hashing; password breach checks (HIBP).
- WAF + bot management + DDoS scrubbing at the edge.
- Per-route rate limits (auth: 5/min/IP, search: 30/min/user).
- Signed playback URLs with short TTL; DRM for the actual bits.
- Strict per-user RLS in the DB; no service uses raw service-role keys
  outside dedicated admin paths.
- IAM + secrets in KMS / Vault; least privilege; secret scanning in CI.
- Pen-tests quarterly; bug bounty program.

---

## 23. Device management

- Limits: Basic=1, Standard=2, Premium=4, Family=6 concurrent streams.
- Tracks IP, device, ASN, geo per session.
- Anomaly detection on impossible-travel patterns.
- User can revoke devices from account settings.

---

## 24. Marketing automation

- Coupons / promo codes (percentage, fixed, free trial extension).
- Referral program with double-sided rewards.
- Affiliate tracking via signed click IDs.
- Campaign engine pushes scheduled emails/push notifications based on
  user segments.

---

## 25. Compliance & legal

- GDPR / CCPA: data export, right to be forgotten endpoints.
- COPPA: Kids profiles disable behavioral targeting and reviews.
- DMCA / copyright takedown intake form + audit trail.
- Age ratings shown per region; parental controls behind a PIN.
- Terms / Privacy / Cookie policy versioned in the CMS.

---

## 26. Audit logging

Every privileged action emits to `audit_logs` and Kafka. Append-only.
Tracked: admin CRUD, role grants, payment overrides, content publishes,
license edits, user data exports.

---

## 27. API platform

- Public REST API for select partners (rate-limited, API keys).
- GraphQL gateway for clients (aggregates catalog + entitlements + reco).
- Webhooks: `subscription.created/updated/canceled`, `content.published`,
  `license.expired`.
- All endpoints documented in OpenAPI; SDKs generated for partners.

---

## 28. Observability

- Metrics: Prometheus + Grafana.
- Logs: Loki / Elastic; structured JSON.
- Traces: OpenTelemetry → Tempo / Jaeger.
- RUM: web + mobile SDKs report startup, playback QoE.
- Alerts (PagerDuty): p95 startup > 4 s, stall rate > 0.5 %, 5xx > 1 %,
  payment success < 95 %, ingest backlog > 1 h.

---

## 29. Disaster recovery

- Multi-region active-active (≥3 regions per continent we serve).
- Postgres: synchronous standby in-region, async cross-region.
- S3 cross-region replication; CDN origins are regionally redundant.
- Daily snapshots + 30-day PITR.
- DR targets: **RPO ≤ 5 min, RTO ≤ 30 min**; uptime target 99.99 %.
- Quarterly chaos exercises (region kill, DB failover, CDN swap).

---

## 30. DevOps & CI/CD

- Environments: dev, staging, prod (per region).
- Branching: trunk-based with short-lived feature branches.
- Pipeline: lint → typecheck → unit → integration → build container →
  vulnerability scan → deploy to staging → smoke → canary in prod (5%) →
  progressive rollout.
- Kubernetes manifests via Helm; cluster bootstrap via Terraform.
- Secrets in Vault; never in YAML.

---

## 31. AI modules

- Auto metadata: vision model labels genre, mood, age rating drafts.
- Auto tagging: keyword extraction from synopsis + transcripts.
- Subtitle generation: Whisper-large for ASR; NMT for translation; human review.
- Voice search: Whisper → search-svc.
- Smart recommendations: see §14.
- Content moderation: review text classifier + image NSFW classifier for
  user-submitted avatars and reviews.
- SEO automation: title-meta generator using a constrained LLM template.

---

## 32. Database schema reference

The MVP migration in this repo provisions: `profiles`, `user_roles`,
`account_profiles`, `devices`, `subscription_plans`, `subscriptions`,
`titles`, `seasons`, `episodes`, `categories`, `genres`, `title_genres`,
`banners`, `watchlist`, `watch_history`, `reviews`, `territories`,
`licenses`, `notifications`, `audit_logs`.

At enterprise scale we add: `payments`, `invoices`, `transactions`,
`coupons`, `referrals`, `cast_members`, `title_cast`, `tags`, `title_tags`,
`media_assets`, `subtitles`, `audio_tracks`, `trailers`, `home_sections`,
`downloads`, `notification_preferences`, `ad_campaigns`, `ad_impressions`,
`search_logs`, `system_logs`, `live_streams`, `watermarks`, `api_keys`,
`webhooks`, `backup_jobs`, `analytics_events`, `support_tickets`,
`ticket_messages`, `content_reviews`.

Indexing rules: btree on every FK; GIN tsvector on every text field that
powers search; partial indexes on `is_published`, `is_featured`,
`is_trending`; BRIN on time-series tables (`watch_history`, `analytics_events`).

---

## 33. Cloud cost & footprint

Order-of-magnitude estimates for 10M MAU (2.5M DAU), ~2 h average daily
watch time, 4 Mbps average bitrate (mix of 720p/1080p/4K):

| Bucket | AWS | GCP | Azure |
| --- | --- | --- | --- |
| CDN egress (~200 PB/mo) | $1.5–2.5M/mo | $1.4–2.3M/mo | $1.6–2.6M/mo |
| Origin storage (5 PB) | $115k/mo | $100k/mo | $120k/mo |
| Compute (EKS) | $80–150k/mo | $80–150k/mo | $80–150k/mo |
| Postgres (Aurora) | $40–80k/mo | $40–80k/mo | $40–80k/mo |
| Kafka + Snowflake | $50–120k/mo | $50–120k/mo | $50–120k/mo |
| Encoding / DRM | $30–60k/mo | $30–60k/mo | $30–60k/mo |

Egress (CDN) dominates the bill; this is why multi-CDN auctions and
per-title-encoding pay back fast.

---

## 34. Team structure & timeline

- **MVP (this repo)** — 4 engineers, 1 designer, 1 PM, 8–10 weeks.
- **Public beta** — add: mobile (2), TV (2), data eng (1), QA (1).
- **GA** — full org:
  - Platform: 6
  - Catalog & search: 5
  - Playback & DRM: 6
  - Billing: 4
  - Mobile (Android/iOS): 8
  - TV (Android TV / tvOS / Tizen / webOS): 6
  - Web: 4
  - Data & ML: 6
  - SRE: 6
  - Security: 3
  - QA: 6
  - Design: 4
  - Product: 4
  - Support & content ops: 10

Timeline: MVP → Beta 4 mo → GA 12 mo → International expansion 18–24 mo.

---

## 35. Scaling playbooks

### 1M users
- Single region, 3 AZs.
- Postgres r6g.4xlarge primary + 2 read replicas.
- 1 ES cluster, 1 Kafka cluster.
- 1 CDN.
- Cost: ~$80–150k/mo.

### 10M users
- 3 regions, active-active for reads.
- Postgres per region; cross-region async replication for catalog.
- Multi-CDN (≥2) with RUM-driven selector.
- Kafka mirrored across regions; Snowflake single global.
- Aggressive caching: Redis for entitlements + manifests.

### 100M users
- Continent-level cells; each cell is fully independent (DB, cache, ES).
- Sharded Postgres (Citus / Vitess) on user_id and title_id.
- 3+ CDNs with real-time bidding for egress.
- Pre-positioning of popular titles at edge POPs.
- Per-title-encoding becomes mandatory.
- Dedicated playback edge ("Open Connect"-style appliances) hosted with ISPs.
- SRE on-call rotation per cell; chaos engineering as part of release process.

---

_End of blueprint. The MVP in this repo is the seed — everything above is
the tree it grows into._