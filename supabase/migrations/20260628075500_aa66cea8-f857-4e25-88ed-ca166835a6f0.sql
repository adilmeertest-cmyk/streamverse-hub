
REVOKE EXECUTE ON FUNCTION public.increment_download_count(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_download_count(UUID) TO service_role;
