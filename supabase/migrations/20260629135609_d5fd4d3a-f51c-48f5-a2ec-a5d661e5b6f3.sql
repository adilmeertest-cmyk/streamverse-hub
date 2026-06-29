ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_primary_device BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_device_fingerprint_unique
  ON public.profiles(device_fingerprint)
  WHERE device_fingerprint IS NOT NULL AND is_primary_device = true;