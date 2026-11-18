// =============================================================================
// heartbeat-core-dll — продлевает сессию модуля рендер-ядра ещё на TTL секунд,
// только пока лицензия пользователя всё ещё pro/cloud (не отозвана/не истекла).
// Клиент вызывает это раз в ~8 минут, пока приложение запущено и залогинено.
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const TTL_SECONDS = 600;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
    const userId = userRes.user.id;

    const { data: licRow } = await userClient.rpc("get_my_license").maybeSingle();
    if (!licRow || (licRow.edition !== "pro" && licRow.edition !== "cloud")) {
      // Лицензия отозвана/истекла/бан: НЕ продлеваем — сессия сама протухнет по старому expires_at,
      // и сторожевой поток внутри DLL (core_facade.cpp) сам остановит активный рендер.
      return new Response(JSON.stringify({ error: "license_lost", edition: licRow?.edition ?? null }), { status: 403 });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: exp, error: rotErr } = await admin.rpc("rotate_core_dll_session", {
      p_user_id: userId, p_ttl_seconds: TTL_SECONDS,
    });
    if (rotErr) {
      return new Response(JSON.stringify({ error: "rotate_failed" }), { status: 500 });
    }
    return new Response(JSON.stringify({
      expiresAt: Math.floor(new Date(exp as string).getTime() / 1000),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal", detail: String(e) }), { status: 500 });
  }
});
