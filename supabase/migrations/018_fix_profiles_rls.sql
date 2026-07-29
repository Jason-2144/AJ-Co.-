-- 018_fix_profiles_rls.sql
-- Ensure authenticated users can read staff profiles and roles for UI selectors & task assignments.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Auth profiles select access" ON public.profiles;
CREATE POLICY "Auth profiles select access" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth roles select access" ON public.roles;
CREATE POLICY "Auth roles select access" ON public.roles FOR SELECT TO authenticated USING (true);
