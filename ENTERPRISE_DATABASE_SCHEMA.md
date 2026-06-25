# Enterprise Database Schema for StreamFlix Platform

## Overview
This document describes the complete enterprise-grade database schema for a Netflix-style streaming platform capable of supporting millions of concurrent users.

## Current Schema Analysis
The existing schema includes:
- User management (profiles, account_profiles, user_roles)
- Content management (titles, seasons, episodes, categories, genres)
- Subscription system (subscription_plans, subscriptions)
- User engagement (watchlist, watch_history, reviews)
- Licensing (territories, licenses)
- Notifications and audit logs
- Device management

## Enhanced Enterprise Schema

### 1. Enhanced User Management

```sql
-- Add to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT,
ADD COLUMN date_of_birth DATE,
ADD COLUMN preferred_language TEXT DEFAULT 'en',
ADD COLUMN timezone TEXT DEFAULT 'UTC',
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN two_factor_secret TEXT,
ADD COLUMN backup_codes TEXT[],
ADD COLUMN last_login_at TIMESTAMPTZ,
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN locked_until TIMESTAMPTZ;

-- Profile preferences
CREATE TABLE public.profile_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_profile_id UUID REFERENCES public.account_profiles(id) ON DELETE CASCADE,
  autoplay_next BOOLEAN DEFAULT true,
  autoplay_previews BOOLEAN DEFAULT true,
  default_video_quality TEXT DEFAULT 'auto',
  default_audio_language TEXT DEFAULT 'en',
  default_subtitle_language TEXT,
  maturity_rating TEXT DEFAULT 'adult',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_profile_id)
);
CREATE INDEX ON public.profile_preferences(user_id);

-- Parental controls
CREATE TABLE public.parental_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_profile_id UUID NOT NULL REFERENCES public.account_profiles(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  max_maturity_rating TEXT DEFAULT 'adult',
  blocked_titles TEXT[],
  allowed_hours_start TIME,
  allowed_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.parental_controls(account_profile_id);
```

### 2. Enhanced Content Management

```sql
-- Add to existing titles table
ALTER TABLE public.titles
ADD COLUMN content_rating TEXT,
ADD COLUMN original_language TEXT DEFAULT 'en',
ADD COLUMN original_title TEXT,
ADD COLUMN popularity_score INTEGER DEFAULT 0,
ADD COLUMN vote_average NUMERIC(3,1),
ADD COLUMN vote_count INTEGER DEFAULT 0,
ADD COLUMN imdb_id TEXT,
ADD COLUMN tmdb_id INTEGER,
ADD COLUMN backdrop_path TEXT,
ADD COLUMN poster_path TEXT,
ADD COLUMN is_exclusive BOOLEAN DEFAULT false,
ADD COLUMN is_original BOOLEAN DEFAULT false,
ADD COLUMN production_countries TEXT[],
ADD COLUMN spoken_languages TEXT[],
ADD COLUMN budget BIGINT,
ADD COLUMN revenue BIGINT,
ADD COLUMN keywords TEXT[];

-- Subtitle tracks
CREATE TABLE public.subtitle_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  subtitle_url TEXT NOT NULL,
  format TEXT DEFAULT 'vtt',
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.subtitle_tracks(title_id);
CREATE INDEX ON public.subtitle_tracks(episode_id);

-- Video quality variants
CREATE TABLE public.video_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  quality TEXT NOT NULL,
  video_url TEXT NOT NULL,
  bandwidth INTEGER,
  resolution TEXT,
  codec TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.video_variants(title_id);
CREATE INDEX ON public.video_variants(episode_id);

-- Live streams
CREATE TABLE public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_url TEXT NOT NULL,
  stream_key TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_live BOOLEAN DEFAULT false,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  viewer_count INTEGER DEFAULT 0,
  max_viewers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.live_streams(is_live, scheduled_start);

-- Anime-specific metadata
CREATE TABLE public.anime_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  studio TEXT,
  source_material TEXT,
  episodes_count INTEGER,
  airing_status TEXT,
  aired_from DATE,
  aired_to DATE,
  rating TEXT,
  themes TEXT[],
  UNIQUE(title_id)
);

-- Content bundles/collections
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collection_items (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, title_id)
);
```

### 3. Enhanced Subscription System

```sql
-- Add to existing subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN max_devices INTEGER DEFAULT 1,
ADD COLUMN download_quality TEXT DEFAULT '720p',
ADD COLUMN offline_downloads BOOLEAN DEFAULT false,
ADD COLUMN max_downloads INTEGER DEFAULT 0,
ADD COLUMN includes_anime BOOLEAN DEFAULT false,
ADD COLUMN includes_live BOOLEAN DEFAULT false,
ADD COLUMN ad_free BOOLEAN DEFAULT true;

-- Coupons and promotions
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  applicable_plans TEXT[], -- plan tiers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.coupons(code);

-- Coupon usage tracking
CREATE TABLE public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

-- Payment methods
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payment_methods(user_id);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.invoices(user_id);
CREATE INDEX ON public.invoices(subscription_id);
```

### 4. Analytics and Tracking

```sql
-- Content analytics
CREATE TABLE public.content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  total_watch_time_seconds BIGINT DEFAULT 0,
  avg_completion_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(title_id, episode_id, date)
);
CREATE INDEX ON public.content_analytics(title_id, date);
CREATE INDEX ON public.content_analytics(episode_id, date);

-- User analytics events
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  device_type TEXT,
  browser TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX ON public.analytics_events(session_id);

-- A/B testing
CREATE TABLE public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  variant_a JSONB,
  variant_b JSONB,
  traffic_split INTEGER DEFAULT 50, -- percentage
  is_active BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public_ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);
```

### 5. Enhanced Security

```sql
-- Login attempts tracking
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  attempt_type TEXT, -- 'password', 'oauth', '2fa'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.login_attempts(user_id, created_at DESC);
CREATE INDEX ON public_login_attempts(ip_address, created_at DESC);

-- Session management
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  location_country TEXT,
  location_city TEXT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sessions(user_id);
CREATE INDEX ON public.sessions(token_hash);

-- Security audit logs (enhanced)
ALTER TABLE public.audit_logs
ADD COLUMN ip_address TEXT,
ADD COLUMN user_agent TEXT,
ADD COLUMN severity TEXT DEFAULT 'info',
ADD COLUMN risk_score INTEGER DEFAULT 0;

-- API rate limiting
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- user_id or ip_address
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_duration_seconds INTEGER DEFAULT 60,
  blocked_until TIMESTAMPTZ,
  UNIQUE(identifier, endpoint, window_start)
);
CREATE INDEX ON public.rate_limits(identifier, endpoint);
```

### 6. Notification System

```sql
-- Enhanced notifications
ALTER TABLE public.notifications
ADD COLUMN priority TEXT DEFAULT 'normal',
ADD COLUMN delivery_method TEXT[], -- ['email', 'push', 'in_app']
ADD COLUMN delivery_status JSONB,
ADD COLUMN scheduled_for TIMESTAMPTZ,
ADD COLUMN sent_at TIMESTAMPTZ,
ADD COLUMN read_at TIMESTAMPTZ;

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  new_content BOOLEAN DEFAULT true,
  recommendations BOOLEAN DEFAULT true,
  account_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Push notification tokens
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);
CREATE INDEX ON public.push_tokens(user_id);
```

### 7. Content Moderation and Reporting

```sql
-- User reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID REFERENCES public.titles(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reports(title_id);
CREATE INDEX ON public.reports(review_id);
CREATE INDEX ON public.reports(status);

-- Content flags
CREATE TABLE public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL, -- 'copyright', 'inappropriate', 'quality', 'other'
  description TEXT,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.content_flags(title_id);
```

### 8. Search and Recommendations

```sql
-- Search history
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER,
  clicked_title_id UUID REFERENCES public.titles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.search_history(user_id, created_at DESC);

-- Recommendation scores
CREATE TABLE public.recommendation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  reason TEXT,
  algorithm TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_id)
);
CREATE INDEX ON public.recommendation_scores(user_id, score DESC);

-- Trending content cache
CREATE TABLE public.trending_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  category TEXT,
  time_window TEXT, -- 'daily', 'weekly', 'monthly'
  score NUMERIC(10,2) NOT NULL,
  rank INTEGER,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(title_id, category, time_window)
);
CREATE INDEX ON public.trending_cache(category, time_window, score DESC);
```

### 9. Background Jobs and Queue System

```sql
-- Job queue
CREATE TABLE public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.background_jobs(status, scheduled_for);
CREATE INDEX ON public.background_jobs(job_type, status);

-- Scheduled tasks
CREATE TABLE public.scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  task_type TEXT NOT NULL,
  schedule TEXT NOT NULL, -- cron expression
  payload JSONB,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 10. CDN and Asset Management

```sql
-- CDN assets
CREATE TABLE public.cdn_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL, -- 'poster', 'backdrop', 'video', 'subtitle', 'thumbnail'
  title_id UUID REFERENCES public.titles(id) ON DELETE SET NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  original_url TEXT,
  cdn_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  quality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cdn_assets(title_id);
CREATE INDEX ON public.cdn_assets(episode_id);
CREATE INDEX ON public.cdn_assets(asset_type);

-- CDN usage tracking
CREATE TABLE public.cdn_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.cdn_assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bytes_transferred BIGINT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cdn_usage(asset_id, created_at);
CREATE INDEX ON public_cdn_usage(user_id, created_at);
```

## Database Optimization Indexes

```sql
-- Composite indexes for common queries
CREATE INDEX idx_titles_published_kind ON public.titles(is_published, kind) WHERE is_published = true;
CREATE INDEX idx_titles_trending ON public.titles(is_trending, popularity_score DESC) WHERE is_trending = true;
CREATE INDEX idx_titles_featured ON public.titles(is_featured, created_at DESC) WHERE is_featured = true;
CREATE INDEX idx_watch_history_user_title ON public.watch_history(user_id, title_id, watched_at DESC);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(status, current_period_end) WHERE status IN ('active', 'trialing');
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read, created_at DESC) WHERE is_read = false;

-- Full-text search indexes
CREATE INDEX idx_titles_search ON public.titles USING GIN(to_tsvector('english', title || ' ' || COALESCE(synopsis, '')));
CREATE INDEX idx_titles_search_simple ON public.titles USING GIN(search_tsv);

-- Partitioning strategy for large tables (example for analytics_events)
-- This would be implemented in production with proper partitioning
```

## Row Level Security Policies

```sql
-- Enhanced RLS policies would be added for all new tables
-- Following the pattern: user-specific data is accessible only to the user
-- Admin-specific data is accessible only to users with appropriate roles
-- Public data is accessible to anonymous and authenticated users
```

## Migration Strategy

1. **Phase 1**: Add new tables without modifying existing structure
2. **Phase 2**: Add columns to existing tables with default values
3. **Phase 3**: Create indexes in batches to avoid locking
4. **Phase 4**: Update RLS policies
5. **Phase 5**: Backfill data where needed
6. **Phase 6**: Remove deprecated columns/tables

## Performance Considerations

1. **Connection Pooling**: Use PgBouncer for connection pooling
2. **Read Replicas**: Set up read replicas for analytics queries
3. **Partitioning**: Partition large tables by date (analytics_events, watch_history)
4. **Materialized Views**: Create materialized views for dashboard analytics
5. **Caching**: Implement Redis caching for frequently accessed data
6. **Archiving**: Archive old data to cold storage (watch_history > 1 year)
