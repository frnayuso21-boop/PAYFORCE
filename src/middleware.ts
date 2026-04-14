/**
 * src/middleware.ts
 *
 * Edge Runtime — protección de rutas con Supabase Auth + MFA (TOTP).
 *
 * Responsabilidades:
 *   1. Refrescar el token JWT de Supabase en cada request.
 *   2. Proteger /app/* — redirige a /login sin sesión, a /verify sin aal2 si MFA está activo.
 *   3. /verify — accesible solo con sesión aal1; si ya aal2, redirige al destino.
 *   4. /login y /signup — redirige al dashboard (o /verify) si ya hay sesión.
 *   5. APIs sensibles — 401 sin sesión.
 *   6. Libre: /api/stripe/webhook, /checkout, /pay/*.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient }        from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const { pathname } = req.nextUrl;

  // ── Subdominios: mi-negocio.payforce.io → /store/mi-negocio ──────────────
  const host = req.headers.get("host") ?? "";
  const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? "payforce.io";
  const isSubdomain =
    host !== appHost &&
    host !== `www.${appHost}` &&
    host.endsWith(`.${appHost}`) &&
    !host.startsWith("www.");
  if (isSubdomain) {
    const slug = host.replace(`.${appHost}`, "");
    // Reescritura interna — la URL del cliente no cambia
    return NextResponse.rewrite(new URL(`/store/${slug}${pathname}`, req.url));
  }

  // ── Rutas públicas: salir sin crear cliente Supabase ni llamadas de red ───
  // Estas rutas no tienen lógica de auth — ahorramos getUser() por completo.
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/home") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/solutions") ||
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/store/") ||
    pathname.startsWith("/api/store/") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/success") ||
    pathname.startsWith("/cancel") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/api/stripe/");

  if (isPublicPath) return res;

  // ── Bypass de desarrollo ─────────────────────────────────────────────────
  // Activa con NEXT_PUBLIC_DEV_BYPASS=true en .env.local para saltarte auth en local.
  // NUNCA pongas esto en producción.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true"
  ) {
    return res;
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si Supabase no está configurado (desarrollo sin credenciales), pasar sin auth.
  if (
    !supabaseUrl ||
    supabaseUrl.includes("TU_PROYECTO") ||
    !supabaseAnon ||
    supabaseAnon.includes("TU_ANON")
  ) {
    return res;
  }

  // ── Supabase: refrescar sesión JWT ────────────────────────────────────────
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el JWT contra Supabase (no confiar solo en cookie).
  const { data: { user } } = await supabase.auth.getUser();

  // ── Helper: comprobar si necesita MFA (aal2) ─────────────────────────────
  // Lee el AAL del JWT en local — sin llamada de red.
  async function needsMfa(): Promise<boolean> {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return (
      data != null &&
      data.nextLevel === "aal2" &&
      data.currentLevel !== "aal2"
    );
  }

  // ── 1. /admin/* ── solo acceso con sesión activa (role ADMIN se valida en layout) ──
  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login?from=/admin", req.url));
    return res;
  }

  // ── 2. /app/* ─────────────────────────────────────────────────────────────
  if (pathname.startsWith("/app/")) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    // Usuario autenticado en aal1 pero tiene MFA activo → pedir segundo factor
    if (await needsMfa()) {
      const url = req.nextUrl.clone();
      url.pathname = "/verify";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return res;
  }

  // ── 2. /verify ────────────────────────────────────────────────────────────
  if (pathname === "/verify") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Si ya está en aal2, no necesita estar aquí
    if (!(await needsMfa())) {
      const from = req.nextUrl.searchParams.get("from") ?? "/app/dashboard";
      // Evitar bucle si "from" es /verify
      const dest = from.startsWith("/verify") ? "/app/dashboard" : from;
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return res;
  }

  // ── 3. /login y /signup ───────────────────────────────────────────────────
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      if (await needsMfa()) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
      return NextResponse.redirect(new URL("/app/dashboard", req.url));
    }
    return res;
  }

  // ── 4. APIs sensibles → 401 sin sesión ───────────────────────────────────
  // /api/stripe/webhook es PÚBLICO (verificación de firma propia).
  if (!user) {
    const protectedApis = [
      "/api/payments/refund",
      "/api/payments",
      "/api/payment-links",
      "/api/dashboard",
      "/api/settlements",
      "/api/connect",
      "/api/auth/me",
      "/api/auth/logout",
    ];
    const isProtected = protectedApis.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    if (isProtected) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
