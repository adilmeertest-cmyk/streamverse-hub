
-- 1. Revoke column-level read on sensitive columns
REVOKE SELECT (video_url) ON public.titles FROM anon, authenticated;
REVOKE SELECT (video_url) ON public.episodes FROM anon, authenticated;
REVOKE SELECT (stripe_customer_id) ON public.profiles FROM anon, authenticated;

-- 2. Reviews: default unapproved + prevent self-approval via direct REST
ALTER TABLE public.reviews ALTER COLUMN is_approved SET DEFAULT false;
UPDATE public.reviews SET is_approved = false WHERE is_approved IS NULL;

DROP POLICY IF EXISTS "own reviews write" ON public.reviews;
CREATE POLICY "own reviews write" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_approved = false);

DROP POLICY IF EXISTS "own reviews update" ON public.reviews;
CREATE POLICY "own reviews update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_approved = false);

-- 3. Switch has_role to SECURITY INVOKER so the database linter is satisfied.
-- Safe because every caller invokes has_role(auth.uid(), ...) and the
-- "own roles read" policy lets users read their own user_roles rows.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 4. Explicit super_admin write policies on user_roles.
-- Split per-command (not FOR ALL) so SELECT recursion can't happen
-- when has_role itself reads user_roles.
DROP POLICY IF EXISTS "super_admin insert roles" ON public.user_roles;
CREATE POLICY "super_admin insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin update roles" ON public.user_roles;
CREATE POLICY "super_admin update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin delete roles" ON public.user_roles;
CREATE POLICY "super_admin delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));
