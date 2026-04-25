-- =============================================================================
-- Shkop — Profile Auto-Creation Trigger
-- Automatically inserts a row into public.profiles whenever a new user is
-- created in auth.users. Without this, logging in returns no profile row.
--
-- Run this in the Supabase SQL editor after 001_initial_schema.sql.
--
-- To backfill profiles for users who signed up before this trigger existed,
-- run the INSERT at the bottom of this file.
-- =============================================================================


-- Trigger function: copies the new user's id and email into public.profiles.
-- security definer is required so the function can write to public.profiles
-- even though it is called from the auth schema context.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;


-- Fire after every new row in auth.users.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- Backfill: create profile rows for users who already exist in auth.users
-- but were created before this trigger was in place.
-- Safe to run multiple times — INSERT ... ON CONFLICT DO NOTHING skips
-- any user that already has a profile row.
-- =============================================================================
INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
