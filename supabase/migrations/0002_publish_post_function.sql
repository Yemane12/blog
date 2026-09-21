-- Secure publishing path: a token-gated SECURITY DEFINER function so the
-- public anon key can create/update posts only when it presents the admin
-- token, which is stored in a private table the anon role cannot read.
--
-- After applying, set the token (kept OUT of source control):
--   insert into private.settings (key, value) values ('admin_token', '<secret>')
--   on conflict (key) do update set value = excluded.value;

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.settings (
  key text primary key,
  value text not null
);

create or replace function public.publish_post(
  p_token         text,
  p_slug          text,
  p_title         text,
  p_dek           text default null,
  p_excerpt       text default null,
  p_category      text default 'Essay',
  p_content       text default '',
  p_read_minutes  integer default 5,
  p_tags          text[] default '{}',
  p_author_name   text default 'Alex Chen',
  p_author_bio    text default 'Writer, reader, occasional builder of things.',
  p_published_at  timestamptz default now(),
  p_is_published  boolean default true
) returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_expected text;
begin
  select value into v_expected from private.settings where key = 'admin_token';
  if v_expected is null or p_token is null or length(p_token) = 0 or p_token <> v_expected then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'slug is required' using errcode = '22023';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'title is required' using errcode = '22023';
  end if;

  insert into public.posts as t
    (slug, title, dek, excerpt, category, content, read_minutes, tags,
     author_name, author_bio, published_at, is_published)
  values
    (trim(p_slug), p_title, p_dek, p_excerpt, coalesce(nullif(trim(p_category), ''), 'Essay'),
     coalesce(p_content, ''), coalesce(p_read_minutes, 5), coalesce(p_tags, '{}'),
     coalesce(nullif(trim(p_author_name), ''), 'Alex Chen'),
     coalesce(p_author_bio, ''), coalesce(p_published_at, now()), coalesce(p_is_published, true))
  on conflict (slug) do update set
    title = excluded.title,
    dek = excluded.dek,
    excerpt = excluded.excerpt,
    category = excluded.category,
    content = excluded.content,
    read_minutes = excluded.read_minutes,
    tags = excluded.tags,
    author_name = excluded.author_name,
    author_bio = excluded.author_bio,
    published_at = excluded.published_at,
    is_published = excluded.is_published;

  return trim(p_slug);
end;
$$;

revoke all on function public.publish_post(
  text, text, text, text, text, text, text, integer, text[], text, text, timestamptz, boolean
) from public;
grant execute on function public.publish_post(
  text, text, text, text, text, text, text, integer, text[], text, text, timestamptz, boolean
) to anon, authenticated;
