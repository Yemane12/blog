-- Post cover images + a sponsor/advertisement board + a public media bucket.

alter table public.posts add column if not exists cover_image text;

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  link_url text,
  placement text not null default 'home',
  is_active boolean not null default true,
  weight integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

drop policy if exists "Public read active ads" on public.ads;
create policy "Public read active ads" on public.ads
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "Admin insert ads" on public.ads;
create policy "Admin insert ads" on public.ads
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admin update ads" on public.ads;
create policy "Admin update ads" on public.ads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admin delete ads" on public.ads;
create policy "Admin delete ads" on public.ads
  for delete to authenticated using (public.is_admin());

grant select on public.ads to anon;
grant select, insert, update, delete on public.ads to authenticated;

-- Public storage bucket for uploaded images (post covers, ad creatives).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "Authors upload media" on storage.objects;
create policy "Authors upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.can_author());

drop policy if exists "Public read media" on storage.objects;
create policy "Public read media" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "Authors update own media" on storage.objects;
create policy "Authors update own media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and owner = auth.uid())
  with check (bucket_id = 'media' and owner = auth.uid());

drop policy if exists "Authors delete own media" on storage.objects;
create policy "Authors delete own media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
