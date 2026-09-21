-- Real auth (Supabase Auth + RLS, see 0004) now governs publishing, so the
-- shared-admin-token path from 0002/0003 is removed along with its secret.
drop function if exists public.publish_post(text, text, text, text, text, text, text, integer, text[], text, text, timestamptz, boolean);
drop function if exists public.admin_list_posts(text);
drop function if exists public.admin_get_post(text, text);
drop function if exists public.delete_post(text, text);
drop function if exists public.set_post_published(text, text, boolean);
drop function if exists private.verify_admin(text);
drop table if exists private.settings;
