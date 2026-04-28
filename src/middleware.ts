/**
 * src/middleware.ts
 *
 * Edge Runtime — protección de rutas con Supabase Auth + MFA (AAL2) nativo.
 *
 *   1. Refrescar el token JWT de Supabase en cada request.
 *   2. Proteger /app/* y /dashboard/* — sin sesión → /login; MFA pendiente → /login/2fa.
 *   3. /login/2fa — solo con sesión y AAL1 cuando el siguiente nivel es AAL2.
 *   4. /verify — redirección legacy a /login/2fa.
 *   5. /login y /signup — con sesión completa → dashboard.
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
    return NextResponse.rewrite(new URL(`/store/${slug}${pathname}`, req.url));
  }

  // ── Rutas públicas ────────────────────────────────────────────────────────
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

  if (process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
    return res;
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    supabaseUrl.includes("TU_PROYECTO") ||
    !supabaseAnon ||
    supabaseAnon.includes("TU_ANON")
  ) {
    return res;
  }

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

  const { data: { user } } = await supabase.auth.getUser();

  async function needsMfa(): Promise<boolean> {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return (
      data != null &&
      data.nextLevel === "aal2" &&
      data.currentLevel !== "aal2"
    );
  }

  // ── Legacy /verify → /login/2fa ──────────────────────────────────────────
  if (pathname === "/verify") {
    const url = req.nextUrl.clone();
    url.pathname = "/login/2fa";
    return NextResponse.redirect(url);
  }

  // ── /admin/* ─────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login?from=/admin", req.url));
    return res;
  }

  // ── /app/* y /dashboard/* ───────────────────────────────────────────────
  const isProtectedApp =
    pathname.startsWith("/app/") || pathname.startsWith("/dashboard");

  if (isProtectedApp) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    if (await needsMfa()) {
      const url = req.nextUrl.clone();
      url.pathname = "/login/2fa";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/app/")) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-payforce-pathname", pathname);
      const out = NextResponse.next({ request: { headers: requestHeaders } });
      res.cookies.getAll().forEach((c) => {
        out.cookies.set(c.name, c.value);
      });
      return out;
    }
    return res;
  }

  // ── /login/2fa — completar MFA ────────────────────────────────────────────
  if (pathname === "/login/2fa") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!(await needsMfa())) {
      const from = req.nextUrl.searchParams.get("from") ?? "/app/dashboard";
      const dest = from.startsWith("/") ? from : "/app/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return res;
  }

  // ── /login y /signup ─────────────────────────────────────────────────────
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      if (await needsMfa()) {
        return NextResponse.redirect(
          new URL(`/login/2fa?from=${encodeURIComponent("/app/dashboard")}`, req.url),
        );
      }
      return NextResponse.redirect(new URL("/app/dashboard", req.url));
    }
    return res;
  }

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
