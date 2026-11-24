-- (c) The-Dispatcher
-- =============================================================================
-- get_my_license() — единая точка проверки редакции The Dispatcher (Qt-клиент)
--
-- Схема license_tier уже существует и используется на сайте
-- (profiles.license_tier). Здесь мы просто добавляем RPC, которую сможет
-- безопасно вызвать сам десктоп-клиент после логина через Supabase Auth: он
-- получает JWT пользователя и спрашивает "какая у меня редакция", а не тянет
-- данные напрямую из таблицы profiles.
--
-- ОБНОВЛЕНО 2026-11-24 (см. миграцию 20261124120000_add_license_tiers.sql):
-- раньше license_tier имел только 3 значения ('trial'|'pro'|'cloud'), где
-- 'cloud' означало текущую Premium-редакцию клиента. После той миграции
-- значений 5, и маппинг такой:
--   trial   -> Free edition
--   base    -> Base edition
--   pro     -> Pro edition
--   premium -> Premium edition
--   cloud   -> Cloud edition  (НОВАЯ верхняя редакция — раньше этого значения
--                               со смыслом "Cloud" не было вообще, не путать
--                               со старым смыслом 'cloud' = Premium)
--
-- Сама эта функция ничего не меняла — текст тела функции ниже не трогался,
-- она просто отдаёт p.license_tier как есть, и новые значения проходят
-- через неё автоматически после применения миграции выше.
--
-- Функция сама учитывает бан (is_banned) и истёкший срок действия лицензии
-- (license_expires_at) — в обоих случаях отдаёт 'trial', то есть Free.
-- Клиенту не нужно повторять эту логику у себя.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_license()
RETURNS TABLE(edition public.license_tier, expires_at timestamptz, banned boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.is_banned THEN 'trial'::public.license_tier
      WHEN p.license_expires_at IS NOT NULL AND p.license_expires_at < now()
        THEN 'trial'::public.license_tier
      ELSE p.license_tier
    END AS edition,
    p.license_expires_at,
    p.is_banned
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Доступна только авторизованному пользователю, и только для его own row
-- (auth.uid() внутри тела функции — не параметр, подделать чужой id нельзя).
REVOKE ALL ON FUNCTION public.get_my_license() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_license() TO authenticated;
