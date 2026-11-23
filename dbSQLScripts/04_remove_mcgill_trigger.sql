-- 04_remove_mcgill_trigger.sql: keep a single McGill email check
-- Run after 01–03, in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- 01_schema.sql added a trigger on auth.users that blocks non-McGill emails.
-- The "Before User Created" auth hook (checkifmcgill.sql) does the same check
-- and shows users a clear message, while the trigger only produces
-- "Database error saving new user". This removes the trigger so the hook is
-- the only check.

drop trigger if exists enforce_mcgill_email on auth.users;
drop function if exists public.enforce_mcgill_email();
