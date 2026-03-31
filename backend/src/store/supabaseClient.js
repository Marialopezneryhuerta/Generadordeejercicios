let createClientFn = null;

try {
  ({ createClient: createClientFn } = require("@supabase/supabase-js"));
} catch (_err) {
  createClientFn = null;
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(createClientFn && url && serviceKey);
const client = enabled ? createClientFn(url, serviceKey, { auth: { persistSession: false } }) : null;

async function checkSupabaseConnection() {
  if (!createClientFn) {
    return { enabled: false, ok: false, reason: "module_missing" };
  }

  if (!url || !serviceKey) {
    return { enabled: false, ok: false, reason: "missing_env" };
  }

  try {
    const { count, error } = await client
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) {
      return {
        enabled: true,
        ok: false,
        reason: "query_error",
        message: String(error.message || "").slice(0, 200)
      };
    }

    return { enabled: true, ok: true, usersCount: count ?? 0 };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      reason: "unexpected_error",
      message: String(error?.message || error || "").slice(0, 200)
    };
  }
}

module.exports = {
  supabase: client,
  isSupabaseEnabled: enabled,
  checkSupabaseConnection
};
