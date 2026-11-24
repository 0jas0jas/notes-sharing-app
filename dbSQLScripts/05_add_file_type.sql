-- 05_add_file_type.sql: store the file type picked on the share form (#15)
-- Run once, after 01–04, in Supabase Dashboard → SQL Editor.
--
-- link_type says where a link points (drive_file, google_doc, …). A PDF and a
-- ZIP can both be drive_file, so file_type stores what the file is, using the
-- exact values the API sends (see #3). Existing rows get 'OTHER'.
--
-- resources_with_stats selects r.*, which Postgres expands when the view is
-- created, so the view is dropped and rebuilt to pick up the new column.
-- (create or replace can't be used: file_type lands mid-column-list.)
-- The definition is copied from 01_schema.sql.

alter table public.resources
  add column file_type text not null default 'OTHER'
  check (file_type in ('PDF', 'DOCX', 'PPTX', 'ZIP', 'IMAGE', 'FOLDER', 'OTHER'));

drop view public.resources_with_stats;

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
