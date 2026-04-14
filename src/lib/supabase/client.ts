/**
 * src/lib/supabase/client.ts
 *
 * Cliente Supabase para componentes "use client".
 * Usa @supabase/ssr createBrowserClient para que las cookies de sesión
 * sean accesibles tanto en el servidor como en el cliente sin desincronías.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
