
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','content_manager','moderator','finance_manager','support_agent','analytics_manager','user');
CREATE TYPE public.title_kind AS ENUM ('movie','series','drama','cartoon','documentary');
CREATE TYPE public.review_state AS ENUM ('draft','pending','approved','published','rejected');
CREATE TYPE public.plan_tier AS ENUM ('basic','standard','premium','family');
CREATE TYPE public.plan_interval AS ENUM ('monthly','yearly');
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','canceled','paused');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- account_profiles (multiple viewer profiles per user, kids profiles)
CREATE TABLE public.account_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_kids BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.account_profiles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_profiles TO authenticated;
GRANT ALL ON public.account_profiles TO service_role;
ALTER TABLE public.account_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own account_profiles" ON public.account_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.account_profiles (user_id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier public.plan_tier NOT NULL,
  interval public.plan_interval NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_screens INTEGER NOT NULL DEFAULT 1,
  max_quality TEXT NOT NULL DEFAULT '720p',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tier, interval)
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.subscriptions(user_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'finance_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'finance_manager'));

-- ============ CATEGORIES / GENRES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin categories write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

CREATE TABLE public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
GRANT SELECT ON public.genres TO anon, authenticated;
GRANT ALL ON public.genres TO service_role;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "genres public read" ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin genres write" ON public.genres FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- ============ TITLES (movies + series) ============
CREATE TABLE public.titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  kind public.title_kind NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  synopsis TEXT,
  release_year INTEGER,
  release_date DATE,
  runtime_minutes INTEGER,
  age_rating TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,
  video_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_coming_soon BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  review_state public.review_state NOT NULL DEFAULT 'draft',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  cast_list TEXT[],
  directors TEXT[],
  search_tsv TSVECTOR,
  view_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.titles(kind, is_published);
CREATE INDEX ON public.titles(category_id);
CREATE INDEX ON public.titles(is_featured) WHERE is_featured = true;
CREATE INDEX ON public.titles(is_trending) WHERE is_trending = true;
CREATE INDEX titles_search_idx ON public.titles USING GIN (search_tsv);
GRANT SELECT ON public.titles TO anon, authenticated;
GRANT ALL ON public.titles TO service_role;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "titles public read" ON public.titles FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "admin titles all" ON public.titles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager') OR public.has_role(auth.uid(),'moderator')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

CREATE OR REPLACE FUNCTION public.titles_tsv_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_tsv := setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A')
                 || setweight(to_tsvector('simple', coalesce(NEW.tagline,'')), 'B')
                 || setweight(to_tsvector('simple', coalesce(array_to_string(NEW.cast_list,' '),'')), 'C')
                 || setweight(to_tsvector('simple', coalesce(NEW.synopsis,'')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;$$;
CREATE TRIGGER titles_tsv_trigger BEFORE INSERT OR UPDATE ON public.titles FOR EACH ROW EXECUTE FUNCTION public.titles_tsv_update();

-- title <-> genre
CREATE TABLE public.title_genres (
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, genre_id)
);
GRANT SELECT ON public.title_genres TO anon, authenticated;
GRANT ALL ON public.title_genres TO service_role;
ALTER TABLE public.title_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "title_genres public read" ON public.title_genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin title_genres write" ON public.title_genres FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- ============ SEASONS & EPISODES ============
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT,
  poster_url TEXT,
  release_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(title_id, season_number)
);
GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons public read" ON public.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin seasons write" ON public.seasons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  runtime_minutes INTEGER,
  thumbnail_url TEXT,
  video_url TEXT,
  air_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, episode_number)
);
CREATE INDEX ON public.episodes(season_id);
GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "episodes public read" ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin episodes write" ON public.episodes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- ============ BANNERS ============
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  subhead TEXT,
  image_url TEXT NOT NULL,
  cta_label TEXT,
  cta_href TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin banners write" ON public.banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- ============ WATCHLIST / HISTORY / REVIEWS ============
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_id)
);
CREATE INDEX ON public.watchlist(user_id);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlist" ON public.watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN NOT NULL DEFAULT false,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_id, episode_id)
);
CREATE INDEX ON public.watch_history(user_id, watched_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated;
GRANT ALL ON public.watch_history TO service_role;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history" ON public.watch_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_id)
);
CREATE INDEX ON public.reviews(title_id);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "own reviews write" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reviews update" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reviews delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "moderator reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'super_admin'));

-- ============ LICENSING ============
CREATE TABLE public.territories (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
GRANT SELECT ON public.territories TO anon, authenticated;
GRANT ALL ON public.territories TO service_role;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "territories read" ON public.territories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  licensor TEXT NOT NULL,
  agreement_ref TEXT,
  territory_codes TEXT[] NOT NULL DEFAULT ARRAY['GLOBAL'],
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.licenses(title_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin licenses" ON public.licenses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin audit read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'analytics_manager'));

-- ============ DEVICES ============
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.devices(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices" ON public.devices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SEED DATA ============
INSERT INTO public.territories(code,name) VALUES ('GLOBAL','Global'),('US','United States'),('PK','Pakistan'),('AE','UAE'),('IN','India'),('GB','United Kingdom');

INSERT INTO public.subscription_plans (tier,interval,name,price_cents,max_screens,max_quality,trial_days,features) VALUES
('basic','monthly','Basic',499,1,'720p',14,'["1 screen","HD 720p","Cancel anytime"]'),
('basic','yearly','Basic Yearly',4990,1,'720p',14,'["1 screen","HD 720p","2 months free"]'),
('standard','monthly','Standard',999,2,'1080p',14,'["2 screens","Full HD 1080p","Downloads"]'),
('standard','yearly','Standard Yearly',9990,2,'1080p',14,'["2 screens","Full HD 1080p","2 months free"]'),
('premium','monthly','Premium',1499,4,'4K',14,'["4 screens","4K Ultra HD + HDR","Spatial audio","Downloads"]'),
('premium','yearly','Premium Yearly',14990,4,'4K',14,'["4 screens","4K + HDR","2 months free"]'),
('family','monthly','Family',1999,6,'4K',14,'["6 screens","4K + HDR","Kids profiles","Parental controls"]'),
('family','yearly','Family Yearly',19990,6,'4K',14,'["6 screens","4K + HDR","Kids profiles","2 months free"]');

INSERT INTO public.categories(slug,name,description,display_order) VALUES
('movies','Movies','Blockbuster films and indie gems',1),
('series','TV Series','Binge-worthy series',2),
('dramas','Dramas','Powerful character stories',3),
('cartoons','Kids & Cartoons','Family-friendly animation',4),
('documentaries','Documentaries','Real stories, real impact',5),
('sports','Sports','Live and on-demand sports',6);

INSERT INTO public.genres(slug,name) VALUES
('action','Action'),('comedy','Comedy'),('horror','Horror'),('romance','Romance'),
('sci-fi','Sci-Fi'),('thriller','Thriller'),('drama','Drama'),('animation','Animation'),
('crime','Crime'),('adventure','Adventure'),('fantasy','Fantasy'),('documentary','Documentary'),
('family','Family'),('mystery','Mystery');
