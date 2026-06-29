-- ============ APPS SYSTEM ============

-- Platform enum for apps
CREATE TYPE public.app_platform AS ENUM ('android', 'windows', 'macos', 'linux', 'ios', 'smart_tv');

-- Apps table
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  developer TEXT,
  category TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.apps(is_published);
CREATE INDEX ON public.apps(is_featured) WHERE is_featured = true;
GRANT SELECT ON public.apps TO anon, authenticated;
GRANT ALL ON public.apps TO service_role;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apps public read" ON public.apps FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "admin apps all" ON public.apps FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- App platforms table (stores different platform files for each app)
CREATE TABLE public.app_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  platform public.app_platform NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL,
  file_name TEXT NOT NULL,
  version TEXT NOT NULL,
  min_os_version TEXT,
  changelog TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(app_id, platform)
);
CREATE INDEX ON public.app_platforms(app_id);
CREATE INDEX ON public.app_platforms(platform);
GRANT SELECT ON public.app_platforms TO anon, authenticated;
GRANT ALL ON public.app_platforms TO service_role;
ALTER TABLE public.app_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_platforms public read" ON public.app_platforms FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin app_platforms all" ON public.app_platforms FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager'));

-- App downloads table (tracks user downloads)
CREATE TABLE public.app_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.app_platforms(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_fingerprint TEXT,
  UNIQUE(user_id, app_id, platform_id)
);
CREATE INDEX ON public.app_downloads(user_id);
CREATE INDEX ON public.app_downloads(app_id);
CREATE INDEX ON public.app_downloads(downloaded_at DESC);
GRANT SELECT, INSERT ON public.app_downloads TO authenticated;
GRANT ALL ON public.app_downloads TO service_role;
ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own app_downloads" ON public.app_downloads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update trigger for apps
CREATE OR REPLACE FUNCTION public.apps_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;$$;
CREATE TRIGGER apps_update_trigger BEFORE INSERT OR UPDATE ON public.apps FOR EACH ROW EXECUTE FUNCTION public.apps_update();

-- Function to increment download count
CREATE OR REPLACE FUNCTION public.increment_app_download(_app_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.apps SET download_count = download_count + 1 WHERE id = _app_id;
$$;

-- ============ DEVICE FINGERPRINTING ============

-- Add device fingerprint to profiles
ALTER TABLE public.profiles ADD COLUMN device_fingerprint TEXT;
ALTER TABLE public.profiles ADD COLUMN is_primary_device BOOLEAN NOT NULL DEFAULT true;

-- Create unique constraint for device fingerprint per email
CREATE UNIQUE INDEX ON public.profiles(device_fingerprint) WHERE device_fingerprint IS NOT NULL AND is_primary_device = true;

-- Update policy to allow device fingerprint check
CREATE POLICY "device fingerprint check" ON public.profiles FOR SELECT TO authenticated USING (true);
