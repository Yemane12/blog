-- Blog schema: posts + newsletter subscribers
-- Applied to the Supabase "blog" project.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  dek text,
  excerpt text,
  category text not null default 'Essay',
  content text not null default '',
  author_name text not null default 'Alex Chen',
  author_bio text not null default 'Writer, reader, occasional builder of things.',
  read_minutes integer not null default 5,
  tags text[] not null default '{}',
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists posts_published_idx
  on public.posts (is_published, published_at desc);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  confirmed boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.subscribers enable row level security;

-- Anyone (anon) may read published posts.
drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
  on public.posts for select
  to anon, authenticated
  using (is_published = true);

-- Anyone (anon) may subscribe, but rows are not readable by the public.
drop policy if exists "Public can subscribe" on public.subscribers;
create policy "Public can subscribe"
  on public.subscribers for insert
  to anon, authenticated
  with check (true);
