-- (c) The-Dispatcher
CREATE SCHEMA IF NOT EXISTS authz;
REVOKE ALL ON SCHEMA authz FROM public;
GRANT USAGE ON SCHEMA authz TO authenticated;
GRANT USAGE ON SCHEMA authz TO service_role;

CREATE OR REPLACE FUNCTION authz.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION authz.has_role(uuid, public.app_role) FROM public;
REVOKE ALL ON FUNCTION authz.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION authz.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION authz.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "admin read audit" ON public.audit_logs;
CREATE POLICY "admin read audit" ON public.audit_logs
FOR SELECT TO authenticated
USING (authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "read own or admin logs" ON public.download_logs;
CREATE POLICY "read own or admin logs" ON public.download_logs
FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write files" ON public.files;
CREATE POLICY "admin write files" ON public.files
FOR ALL TO authenticated
USING (authz.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write pricing" ON public.pricing_tiers;
CREATE POLICY "admin write pricing" ON public.pricing_tiers
FOR ALL TO authenticated
USING (authz.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin delete profile" ON public.profiles;
CREATE POLICY "admin delete profile" ON public.profiles
FOR DELETE TO authenticated
USING (authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin insert profile" ON public.profiles;
CREATE POLICY "admin insert profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = id) OR authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles
FOR SELECT TO authenticated
USING ((auth.uid() = id) OR authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
FOR UPDATE TO authenticated
USING ((auth.uid() = id) OR authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write content" ON public.site_content;
CREATE POLICY "admin write content" ON public.site_content
FOR ALL TO authenticated
USING (authz.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write translations" ON public.translations;
CREATE POLICY "admin write translations" ON public.translations
FOR ALL TO authenticated
USING (authz.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (authz.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "roles self read" ON public.user_roles;
CREATE POLICY "roles self read" ON public.user_roles
FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR authz.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM service_role;