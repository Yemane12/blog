-- Admin management functions: list (incl. drafts), get full post, delete, and
-- toggle published state. All are token-gated the same way as publish_post():
-- the admin token is verified in-database against the private settings table,
-- so the public anon key cannot manage posts without it.

-- Shared token check (private; only callable by SECURITY DEFINER functions).
create or replace function private.verify_admin(p_token text)
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select exists (
    select 1 from private.settings
    where key = 'admin_token'
      and p_token is not null
      and length(p_token) > 0
      and value = p_token
  );
$$;
revoke all on function private.verify_admin(text) from public, anon, authenticated;

-- List every post, including unpublished drafts (no content, for a table view).
create or replace function public.admin_list_posts(p_token text)
returns table (
  slug text,
  title text,
  dek text,
  category text,
  tags text[],
  read_minutes integer,
  published_at timestamptz,
  is_published boolean
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.verify_admin(p_token) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  return query
    select p.slug, p.title, p.dek, p.category, p.tags,
           p.read_minutes, p.published_at, p.is_published
    from public.posts p
    order by p.published_at desc;
end;
$$;

-- Fetch one full post (including content and draft state) for editing.
create or replace function public.admin_get_post(p_token text, p_slug text)
returns public.posts
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  r public.posts;
begin
  if not private.verify_admin(p_token) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select * into r from public.posts where slug = p_slug;
  return r;
end;
$$;

-- Delete a post by slug.
create or replace function public.delete_post(p_token text, p_slug text)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v text;
begin
  if not private.verify_admin(p_token) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  delete from public.posts where slug = p_slug returning slug into v;
  return v;
end;
$$;

-- Toggle / set the published state of a post.
create or replace function public.set_post_published(p_token text, p_slug text, p_is_published boolean)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v boolean;
begin
  if not private.verify_admin(p_token) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  update public.posts set is_published = coalesce(p_is_published, is_published)
    where slug = p_slug
    returning is_published into v;
  return v;
end;
$$;

revoke all on function public.admin_list_posts(text) from public;
revoke all on function public.admin_get_post(text, text) from public;
revoke all on function public.delete_post(text, text) from public;
revoke all on function public.set_post_published(text, text, boolean) from public;

grant execute on function public.admin_list_posts(text) to anon, authenticated;
grant execute on function public.admin_get_post(text, text) to anon, authenticated;
grant execute on function public.delete_post(text, text) to anon, authenticated;
grant execute on function public.set_post_published(text, text, boolean) to anon, authenticated;
