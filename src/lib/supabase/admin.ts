/**
 * Cliente Supabase con service role — solo en servidor (Route Handlers).
 * Usado para inserts en tablas con RLS sin política de INSERT para el anon key.
 */
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
