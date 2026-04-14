/**
 * src/lib/supabase/server.ts
 *
 * Cliente Supabase para uso en Server Components, Route Handlers y middleware.
 * Usa @supabase/ssr para gestionar cookies de sesión en el servidor.
 * NUNCA importes esto en componentes "use client".
 */
import { createServerClient } from "@supabase/ssr";
import { cookies }            from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // En Server Components read-only este bloque se ignora
          }
        },
      },
    },
  );
}
