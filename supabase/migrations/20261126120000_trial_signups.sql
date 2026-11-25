-- (c) The-Dispatcher
-- =============================================================================
-- Форма "Start Free Trial" на странице цен (под каждой кнопкой "Get License").
-- Сама учётная запись (auth.users + profiles) создаётся обычным
-- supabase.auth.signUp() с клиента — ровно так же, как на странице /auth.
-- handle_new_user() (см. миграцию 20260714145958_fda1d4e5-...sql) уже
-- создаёт строку profiles автоматически по триггеру на auth.users, как и
-- для обычной регистрации.
--
-- Эта таблица хранит только ДОПОЛНИТЕЛЬНЫЕ поля онбординга, которых в
-- profiles нет (страна/индустрия/источник) — 1:1 к profiles.id. Имя
-- пользователя (username) из формы также дублируется сюда для админ-списка,
-- хотя оно же уходит в profiles.full_name через raw_user_meta_data.
--
-- Как и остальные миграции в этом проекте — написано статически, не
-- выполнялось мной ни на одной реальной базе. Проверьте на staging/копии
-- перед продом.
-- =============================================================================
CREATE TABLE public.trial_signups (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  country TEXT NOT NULL,
  industry TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.trial_signups TO authenticated;
GRANT ALL ON public.trial_signups TO service_role;
ALTER TABLE public.trial_signups ENABLE ROW LEVEL SECURITY;

-- Пользователь может вставить и прочитать только свою собственную строку
-- (сразу после signUp(), пока ещё залогинен тем же запросом).
CREATE POLICY "Users can insert own trial signup" ON public.trial_signups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own trial signup" ON public.trial_signups
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Админ видит и может удалить любую строку — тот же паттерн, что и у
-- payment_requests (миграция 20260901052101_b81aa9d0-...sql).
CREATE POLICY "Admins can view all trial signups" ON public.trial_signups
  FOR SELECT TO authenticated USING (authz.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete trial signups" ON public.trial_signups
  FOR DELETE TO authenticated USING (authz.has_role(auth.uid(), 'admin'));
