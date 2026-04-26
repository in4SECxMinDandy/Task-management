-- ============================================================================
-- Fix Supabase linter warning: SECURITY DEFINER view.
--
-- By default, views created in the `public` schema run with the privileges of
-- the view owner (postgres), which bypasses Row Level Security on the
-- underlying tables. Setting `security_invoker = true` makes the view run with
-- the privileges of the calling user, so RLS on `tasks` / `profiles` is honored.
-- ============================================================================

alter view public.employee_performance set (security_invoker = true);
