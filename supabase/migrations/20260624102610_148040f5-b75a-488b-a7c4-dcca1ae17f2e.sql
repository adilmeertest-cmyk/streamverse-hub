
-- Trigger to keep titles.avg_rating + add rating_count
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recompute_title_rating(_title_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.titles
  SET avg_rating = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.reviews WHERE title_id = _title_id AND is_approved = true), 0),
      rating_count = COALESCE((SELECT count(*) FROM public.reviews WHERE title_id = _title_id AND is_approved = true), 0)
  WHERE id = _title_id;
$$;

CREATE OR REPLACE FUNCTION public.reviews_rating_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_title_rating(OLD.title_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_title_rating(NEW.title_id);
    IF TG_OP = 'UPDATE' AND OLD.title_id <> NEW.title_id THEN
      PERFORM public.recompute_title_rating(OLD.title_id);
    END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS reviews_rating_aiud ON public.reviews;
CREATE TRIGGER reviews_rating_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_rating_trigger();

-- Ensure anon can read approved reviews and aggregate
GRANT SELECT ON public.reviews TO anon;

-- Reviews: users can read their own pending/rejected reviews
DROP POLICY IF EXISTS "own reviews read" ON public.reviews;
CREATE POLICY "own reviews read" ON public.reviews
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Public read of subscription_plans for pricing page
GRANT SELECT ON public.subscription_plans TO anon;

-- Allow webhook (service role) full access already via GRANT ALL service_role.
-- Add stripe_customer_id column to profiles for fast lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Allow finance/super_admin to update subscriptions (already via admin policy) - no-op.

-- Add unique constraint to prevent duplicate review per user/title
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_user_title_unique') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_title_unique UNIQUE (user_id, title_id);
  END IF;
END $$;
