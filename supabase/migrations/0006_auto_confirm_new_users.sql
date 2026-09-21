-- Skip email confirmation: mark every new auth user as confirmed on insert,
-- so accounts are usable immediately (they still start as 'reader' and need
-- admin approval before they can publish).
--
-- Note: this trusts the email at sign-up without verifying ownership. New
-- accounts only gain read access until an admin approves them as an author,
-- so the blast radius is limited.
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists auto_confirm_user_trigger on auth.users;
create trigger auto_confirm_user_trigger
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- Confirm any users created before this change.
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
