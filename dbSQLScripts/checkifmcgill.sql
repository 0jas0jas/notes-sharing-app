-- Blocks sign-ups that don't use a McGill email.
-- Used as the "Before User Created" auth hook.
create or replace function public.hook_mcgill_email_only(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email text;
begin
  email := lower(trim(event->'user'->>'email'));

  if email is null
     or not (email like '%@mail.mcgill.ca' or email like '%@mcgill.ca') then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Please sign up with your McGill email (@mail.mcgill.ca or @mcgill.ca).'
      )
    );
  end if;

  return '{}'::jsonb;  -- allow the sign-up
end;
$$;

-- Only Supabase Auth may run this function, not regular users.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_mcgill_email_only(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_mcgill_email_only(jsonb) from authenticated, anon, public;
