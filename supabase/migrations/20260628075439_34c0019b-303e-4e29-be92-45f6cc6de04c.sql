
DO $$ BEGIN
  CREATE TYPE public.download_platform AS ENUM ('windows','macos','linux','android','ios','android_tv','smart_tv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.download_platform NOT NULL,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  filesize BIGINT,
  url TEXT NOT NULL,
  storage_path TEXT,
  checksum TEXT,
  release_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  release_notes TEXT,
  downloads_count BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, version)
);

CREATE INDEX IF NOT EXISTS downloads_platform_active_idx ON public.downloads (platform, is_active, release_date DESC);

GRANT SELECT ON public.downloads TO anon, authenticated;
GRANT ALL ON public.downloads TO service_role;

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active downloads" ON public.downloads;
CREATE POLICY "Public can view active downloads" ON public.downloads
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_manager'));

DROP POLICY IF EXISTS "Admins insert downloads" ON public.downloads;
CREATE POLICY "Admins insert downloads" ON public.downloads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_manager'));

DROP POLICY IF EXISTS "Admins update downloads" ON public.downloads;
CREATE POLICY "Admins update downloads" ON public.downloads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_manager'));

DROP POLICY IF EXISTS "Admins delete downloads" ON public.downloads;
CREATE POLICY "Admins delete downloads" ON public.downloads
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_manager'));

CREATE OR REPLACE FUNCTION public.increment_download_count(_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.downloads SET downloads_count = downloads_count + 1 WHERE id = _id AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_download_count(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_downloads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_downloads_updated_at ON public.downloads;
CREATE TRIGGER trg_downloads_updated_at BEFORE UPDATE ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION public.set_downloads_updated_at();
