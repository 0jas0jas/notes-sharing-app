-- 01_schema.sql — tables, constraints, triggers
-- Author: <your name>  (drafted with Claude: list in THIRD_PARTY.md)
-- Run in Supabase Dashboard → SQL Editor. Run 01, then 02, then 03.

-- ============================================================
-- PROFILES: one row per user, created automatically on sign-up
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- COURSES: seeded by us (03_seed.sql); users can't create them
-- ============================================================
create table public.courses (
  id         bigint generated always as identity primary key,
  code       text not null unique
             check (code ~ '^[A-Z]{4} [0-9]{3}[A-Z0-9]{0,2}$'),   -- e.g. 'COMP 307', 'MATH 262D1'
  title      text not null check (char_length(btrim(title)) between 1 and 150),
  subject    text generated always as (left(code, 4)) stored,    -- 'COMP', 'MATH'
  created_at timestamptz not null default now()
);

-- ============================================================
-- ENROLLMENTS: which courses a user follows ("My courses")
-- ============================================================
create table public.enrollments (
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  course_id  bigint not null references public.courses (id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index enrollments_course_idx on public.enrollments (course_id);

-- ============================================================
-- RESOURCES: a shared link (Drive file, doc, etc.) for a course
-- ============================================================
create table public.resources (
  id            bigint generated always as identity primary key,
  course_id     bigint not null references public.courses (id) on delete cascade,
  uploader_id   uuid   not null default auth.uid()
                references public.profiles (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  description   text not null default '' check (char_length(description) <= 1000),
  url           text not null
                check (url ~* '^https?://' and char_length(url) <= 2048),
  link_type     text not null default 'other'
                check (link_type in ('drive_file', 'drive_folder', 'google_doc',
                                     'google_slides', 'google_sheet', 'other')),
  preview_title text check (char_length(preview_title) <= 300),   -- from Microlink
  preview_image text check (char_length(preview_image) <= 2048),  -- from Microlink
  created_at    timestamptz not null default now(),
  unique (course_id, url)   -- same link can't be posted twice to one course
);

create index resources_course_recent_idx on public.resources (course_id, created_at desc);
create index resources_uploader_idx      on public.resources (uploader_id);

-- ============================================================
-- VOTES: like (+1) / dislike (-1); one per user per resource
-- "Remove vote" = delete the row
-- ============================================================
create table public.votes (
  user_id     uuid   not null references public.profiles (id)  on delete cascade,
  resource_id bigint not null references public.resources (id) on delete cascade,
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create index votes_resource_idx on public.votes (resource_id);

-- ============================================================
-- RESOURCE_VIEWS: each user counted once per resource
-- (named resource_views so it isn't confused with an SQL VIEW)
-- ============================================================
create table public.resource_views (
  user_id     uuid   not null references public.profiles (id)  on delete cascade,
  resource_id bigint not null references public.resources (id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create index resource_views_resource_idx on public.resource_views (resource_id);

-- ============================================================
-- RESOURCES_WITH_STATS: what the course board + resource page read
-- security_invoker = the caller's RLS still applies
-- ============================================================
create view public.resources_with_stats
with (security_invoker = true) as
select
  r.*,
  c.code                      as course_code,
  p.display_name              as uploader_name,
  coalesce(v.likes, 0)        as likes,
  coalesce(v.dislikes, 0)     as dislikes,
  coalesce(rv.view_count, 0)  as view_count
from public.resources r
join public.courses  c on c.id = r.course_id
join public.profiles p on p.id = r.uploader_id
left join (
  select resource_id,
         count(*) filter (where value =  1) as likes,
         count(*) filter (where value = -1) as dislikes
  from public.votes
  group by resource_id
) v on v.resource_id = r.id
left join (
  select resource_id, count(*) as view_count
  from public.resource_views
  group by resource_id
) rv on rv.resource_id = r.id;

-- ============================================================
-- SIGN-UP TRIGGERS on auth.users
-- ============================================================

-- 1) Block non-McGill emails at the database level (the form check alone can be bypassed)
create function public.enforce_mcgill_email()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email is null
     or lower(new.email) !~ '@(mail\.)?mcgill\.ca$' then
    raise exception 'Only @mail.mcgill.ca or @mcgill.ca emails can register';
  end if;
  return new;
end;
$$;

create trigger enforce_mcgill_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_mcgill_email();

-- 2) Create the profile row automatically.
--    Sign-up form can pass options.data.display_name; falls back to the email prefix.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(new.email, '@', 1)), 50)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
