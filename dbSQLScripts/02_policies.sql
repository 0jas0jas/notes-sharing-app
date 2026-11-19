-- 02_policies.sql — Row Level Security
-- Author: <your name>  (drafted with Claude: list in THIRD_PARTY.md)
-- Rule: logged-in users can read everything; they can only change their own rows.
-- Logged-out users (anon) get nothing, because every policy is "to authenticated".

alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.enrollments    enable row level security;
alter table public.resources      enable row level security;
alter table public.votes          enable row level security;
alter table public.resource_views enable row level security;

-- ---------- profiles ----------
create policy "profiles: read" on public.profiles
  for select to authenticated using (true);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
-- no insert policy: the sign-up trigger creates profiles
-- no delete policy: deleting the auth user cascades

-- ---------- courses (read-only for users; we seed them) ----------
create policy "courses: read" on public.courses
  for select to authenticated using (true);

-- ---------- enrollments ----------
create policy "enrollments: read" on public.enrollments
  for select to authenticated using (true);

create policy "enrollments: follow" on public.enrollments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "enrollments: unfollow" on public.enrollments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- resources ----------
create policy "resources: read" on public.resources
  for select to authenticated using (true);

create policy "resources: create own" on public.resources
  for insert to authenticated
  with check ((select auth.uid()) = uploader_id);

create policy "resources: update own" on public.resources
  for update to authenticated
  using ((select auth.uid()) = uploader_id)
  with check ((select auth.uid()) = uploader_id);

create policy "resources: delete own" on public.resources
  for delete to authenticated
  using ((select auth.uid()) = uploader_id);

-- ---------- votes ----------
create policy "votes: read" on public.votes
  for select to authenticated using (true);

create policy "votes: create own" on public.votes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "votes: change own" on public.votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "votes: remove own" on public.votes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- resource_views ----------
create policy "resource_views: read" on public.resource_views
  for select to authenticated using (true);

create policy "resource_views: record own" on public.resource_views
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
