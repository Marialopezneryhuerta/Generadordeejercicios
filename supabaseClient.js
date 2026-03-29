const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(url && serviceKey);
const client = enabled ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

module.exports = {
  supabase: client,
  isSupabaseEnabled: enabled
};
