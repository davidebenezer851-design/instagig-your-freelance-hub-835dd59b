
REVOKE EXECUTE ON FUNCTION public.tg_message_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_gig_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_gig_saves_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_job_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_job_saves_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_reviews_aggregate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
