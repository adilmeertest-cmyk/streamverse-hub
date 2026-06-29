
REVOKE EXECUTE ON FUNCTION public.recompute_title_rating(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reviews_rating_trigger() FROM anon, authenticated, public;
