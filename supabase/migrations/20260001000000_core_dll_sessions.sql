-- =============================================================================
-- core_dll_sessions — сессии защищённого модуля рендер-ядра (phase AM-DRM).
-- Строка создаётся при issue-core-dll, продлевается (expires_at += TTL) при
-- каждом heartbeat-core-dll; без продления протухает через TTL (10 минут).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.core_dll_sessions (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.core_dll_sessions ENABLE ROW LEVEL SECURITY;
-- Таблицу трогают только Edge Functions через service-role ключ (обходит RLS) —
-- обычным пользователям нет смысла давать прямой доступ ни на чтение, ни на запись.
REVOKE ALL ON public.core_dll_sessions FROM PUBLIC, anon, authenticated;

-- SECURITY DEFINER-функция продления — вызывается из heartbeat-core-dll под service-role,
-- но пишет логику в одном месте (а не дублирует её в коде Edge Function).
CREATE OR REPLACE FUNCTION public.rotate_core_dll_session(p_user_id uuid, p_ttl_seconds int)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exp timestamptz := now() + make_interval(secs => p_ttl_seconds);
BEGIN
  INSERT INTO public.core_dll_sessions (user_id, expires_at, updated_at)
  VALUES (p_user_id, v_exp, now())
  ON CONFLICT (user_id) DO UPDATE SET expires_at = v_exp, updated_at = now();
  RETURN v_exp;
END;
$$;
REVOKE ALL ON FUNCTION public.rotate_core_dll_session(uuid, int) FROM PUBLIC, anon, authenticated;
