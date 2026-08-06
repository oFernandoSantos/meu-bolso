import { createClient } from "@supabase/supabase-js";
import { ambiente } from "./ambiente.js";

export const supabaseAnon = createClient(ambiente.SUPABASE_URL, ambiente.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAdmin = createClient(
  ambiente.SUPABASE_URL,
  ambiente.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
