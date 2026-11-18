# Деплой серверной части phase AM-DRM (проект лицензий wutlprjaizmenquganid)

Новое в этом архиве — всё остальное в этом сайте не менялось:

- `supabase/migrations/20260001000000_core_dll_sessions.sql` — таблица
  `core_dll_sessions` + функция `rotate_core_dll_session(...)`.
- `supabase/functions/issue-core-dll/index.ts` — выдаёт короткоживущую ссылку
  на подписанную `dispatcher_core_<platform>.dll` + её подпись + сессионный
  токен (TTL 10 минут) — только пользователю с лицензией `pro`/`cloud`.
- `supabase/functions/heartbeat-core-dll/index.ts` — продлевает сессию на
  ещё 10 минут, только если лицензия всё ещё `pro`/`cloud`.

Ничего из этого ни разу не деплоилось и не тестировалось против реального
проекта — только синтаксис-проверен (TypeScript — вручную, без `deno`/`tsc`
в песочнице, где это писалось; SQL — вручную прочитан).

## Шаги

1. **Установить Supabase CLI**, если ещё не стоит:
   ```
   npm install -g supabase
   ```
2. **Залогиниться и привязать проект** (если это ещё не сделано на вашей
   машине):
   ```
   supabase login
   supabase link --project-ref wutlprjaizmenquganid
   ```
3. **Накатить миграцию**:
   ```
   supabase db push
   ```
   Проверить после: в Table Editor дашборда должна появиться таблица
   `core_dll_sessions` (пустая — заполнится при первом реальном запросе
   `issue-core-dll`).
4. **Задеплоить обе функции**:
   ```
   supabase functions deploy issue-core-dll
   supabase functions deploy heartbeat-core-dll
   ```
5. **Создать приватный bucket `core-dll` в Storage** (через дашборд:
   Storage → New bucket → имя `core-dll`, **Public bucket — выключено**).
6. **Собрать и подписать DLL** (на стороне клиентских проектов — см.
   `BUILD_DLL_phaseAM-DRM.md` и `CHECKLIST_phaseAM-DRM.md` в архивах
   `PLUGIN_phaseAM-DRM_integration.zip`/`QT_phaseAM-DRM_integration.zip`),
   затем загрузить в bucket `core-dll` ровно 4 файла:
   - `dispatcher_core_qt.dll`
   - `dispatcher_core_qt.dll.sig`
   - `dispatcher_core_plugin.dll`
   - `dispatcher_core_plugin.dll.sig`
7. **Проверить вручную** (`curl`) до того, как тестировать через само
   приложение — с реальным access-токеном залогиненного pro/cloud-аккаунта:
   ```
   curl -H "Authorization: Bearer <access_token>" \
        "https://wutlprjaizmenquganid.supabase.co/functions/v1/issue-core-dll?platform=qt"
   ```
   Ожидаемый ответ (200): JSON с полями `dllUrl`, `sigHex`, `expiresAt`.
   Частые причины ошибок:
   - `403 license_required` — у аккаунта не `pro`/`cloud` лицензия.
   - `503 dll_not_published` / `signature_not_published` — файл(ы) ещё не
     загружены в bucket под точным именем.
   - `500 signature_malformed` — `.sig`-файл не ровно 64 байта (значит, это
     не raw r‖s, а, например, DER-подпись OpenSSL по умолчанию — см.
     `signature_verify_win.h` в клиентских архивах, там расписано, как
     достать именно raw r‖s).
8. Аналогично проверить `heartbeat-core-dll` (`POST`, тот же заголовок) —
   должен вернуть новый `expiresAt`, позже текущего.
9. Только после того как оба `curl`-вызова отрабатывают как ожидается —
   переходить к сборке/тестированию самих Qt/плагин-приложений
   (`CHECKLIST_phaseAM-DRM.md`).

## Переменные окружения функций

Обе функции читают `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` — Supabase подставляет их автоматически для
Edge Functions этого же проекта, отдельно задавать не нужно (если только вы
не меняли это поведение раньше).

## Ключ подписи

Приватный ключ ECDSA P-256, которым подписываются сами DLL, **не хранится
нигде в этом сайте и не нужен серверу Supabase** — подписывание происходит
у вас локально при сборке DLL (`openssl dgst -sha256 -sign ...`), на сервер
загружается только результат (`.dll` + `.dll.sig`). Публичный ключ (для
проверки) зашит в код клиента (`critical_core_client_win.cpp`), на сервере
его тоже не нужно хранить.
