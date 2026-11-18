// =============================================================================
// issue-core-dll — выдаёт авторизованному пользователю с действующей лицензией
// (pro/cloud, см. get_my_license) короткоживущую ссылку на подписанный модуль
// рендер-ядра + его подпись (hex) + начальный сессионный токен (TTL).
//
// DLL и файл подписи (.sig, raw 64 байта r||s) кладутся вручную в приватный
// bucket core-dll хранилища этого проекта (см. BUILD_DLL.md на стороне
// клиента): core-dll/dispatcher_core_qt.dll(.sig), core-dll/dispatcher_core_plugin.dll(.sig).
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const TTL_SECONDS = 600; // 10 минут — должно совпадать с ожиданием клиента (heartbeat раз в ~8 мин)
const SIGNED_URL_TTL = 120; // ссылка на сам файл живёт 2 минуты — достаточно, чтобы скачать

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Проверяем JWT пользователя (не service-role) — тот же токен, что уже есть у LicenseClient.
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
    const userId = userRes.user.id;

    // get_my_license() — SECURITY DEFINER, сама читает auth.uid() из JWT в заголовке; вызываем
    // от имени ПОЛЬЗОВАТЕЛЯ (userClient), не service-role — иначе auth.uid() внутри будет NULL.
    const { data: licRow, error: licErr } = await userClient.rpc("get_my_license").maybeSingle();
    if (licErr || !licRow || (licRow.edition !== "pro" && licRow.edition !== "cloud")) {
      return new Response(JSON.stringify({ error: "license_required", edition: licRow?.edition ?? null }), { status: 403 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Какой файл отдавать — клиент сообщает платформу (qt | plugin) query-параметром.
    const platform = new URL(req.url).searchParams.get("platform") === "plugin" ? "plugin" : "qt";
    const dllPath = `dispatcher_core_${platform}.dll`;
    const sigPath = `dispatcher_core_${platform}.dll.sig`;

    const { data: signedDll, error: signErr } = await admin
      .storage.from("core-dll").createSignedUrl(dllPath, SIGNED_URL_TTL);
    if (signErr || !signedDll) {
      return new Response(JSON.stringify({ error: "dll_not_published" }), { status: 503 });
    }
    const { data: sigBytes, error: sigErr } = await admin.storage.from("core-dll").download(sigPath);
    if (sigErr || !sigBytes) {
      return new Response(JSON.stringify({ error: "signature_not_published" }), { status: 503 });
    }
    const sigBuf = new Uint8Array(await sigBytes.arrayBuffer());
    if (sigBuf.length !== 64) {
      return new Response(JSON.stringify({ error: "signature_malformed" }), { status: 500 });
    }
    const sigHex = Array.from(sigBuf).map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: exp, error: rotErr } = await admin.rpc("rotate_core_dll_session", {
      p_user_id: userId, p_ttl_seconds: TTL_SECONDS,
    });
    if (rotErr) {
      return new Response(JSON.stringify({ error: "session_create_failed" }), { status: 500 });
    }

    return new Response(JSON.stringify({
      dllUrl: signedDll.signedUrl,
      sigHex,
      expiresAt: Math.floor(new Date(exp as string).getTime() / 1000),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal", detail: String(e) }), { status: 500 });
  }
});
