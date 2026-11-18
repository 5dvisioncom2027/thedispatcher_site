# Интеграция редакций (Free / Pro / Premium) с The Dispatcher Qt

## Что уже было в проекте

В `supabase/migrations/20260714145958_...sql` уже есть всё необходимое:

- `public.license_tier` enum: `'trial' | 'pro' | 'cloud'`
- `profiles.license_tier`, `profiles.license_expires_at`, `profiles.is_banned`
- RLS-политика `"own profile select"` — пользователь может читать свой профиль
- Admin Panel → вкладка **Users** — там уже можно вручную выставлять тариф,
  дату истечения и банить пользователей.

## Что добавлено этим патчем

**`supabase/migrations/20260719120000_get_my_license.sql`** — новая RPC-функция
`public.get_my_license()`. Она:

1. Возвращает `edition`, `expires_at`, `banned` для **текущего** авторизованного
   пользователя (`auth.uid()` внутри функции — не параметр, подделать нельзя).
2. Сама понижает редакцию до `'trial'` (Free), если пользователь забанен или
   у него истёк `license_expires_at` — Qt-клиенту не нужно дублировать эту
   логику у себя.
3. Закрыта от `anon`/`public` — вызвать её может только вошедший пользователь,
   и только про самого себя.

Это именно то, что дёргает десктопное приложение The Dispatcher после логина
(см. `LicenseClient::fetchLicense()` в Qt-проекте).

**`src/routes/_authenticated/admin.tsx`** — косметика: в выпадающем списке тарифа
в Users-панели подписи заменены с `Trial / Pro / Cloud` на понятные
`Free edition / Pro edition / Premium edition`. Значения в базе (`trial`,
`pro`, `cloud`) не менялись — переименование чисто визуальное.

## Маппинг редакций

| В базе (`license_tier`) | В программе (`Edition`) | Что открыто |
|---|---|---|
| `trial` | Free   | всё, кроме Distribute Render / Cloud* / Activate/Deactivate Cloud |
| `pro`   | Pro    | + Distribute Render, Cloud Rendering, Activate/Deactivate Cloud |
| `cloud` | Premium| + Cloud Ateme, Cloud Dolby, Blu-Ray, DCP, Stream |

## Как выдать пользователю Pro/Premium

Сейчас — вручную через **Admin Panel → Users → Tier**. Когда подключите приём
оплаты (крипто-эквайринг, Stripe и т.п.), добавьте Supabase Edge Function —
webhook, который по факту оплаты делает:

```sql
UPDATE public.profiles
SET license_tier = 'pro',            -- или 'cloud'
    license_expires_at = now() + interval '1 year'
WHERE id = '<user_id>';
```

(Это уже работает через `service_role` ключ на бэкенде — тот же паттерн,
что и обновление через Users-панель, только автоматически.)

## Применение миграции

Если проект уже подключён к Supabase через Lovable Cloud — миграция
подхватится автоматически при следующем деплое/синхронизации. Вручную:

```bash
supabase db push
```

или примените SQL из файла напрямую в SQL Editor вашего Supabase-проекта.
