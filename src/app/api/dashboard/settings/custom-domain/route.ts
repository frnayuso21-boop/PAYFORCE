import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

const DNS_CNAME_VALUE = "cname.vercel-dns.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidDomain(domain: string): boolean {
  // Permite subdominio.dominio.tld (mínimo dos partes)
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain);
}

async function addDomainToVercel(domain: string): Promise<{ ok: boolean; error?: string }> {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token) {
    console.warn("[custom-domain] VERCEL_API_TOKEN no configurado — guardando sin registrar en Vercel");
    return { ok: true };
  }
  if (!projectId) {
    console.warn("[custom-domain] VERCEL_PROJECT_ID no configurado — guardando sin registrar en Vercel");
    return { ok: true };
  }

  try {
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      },
    );
    const vercelData = await vercelRes.json().catch(() => ({})) as { error?: { message?: string } };
    console.log("[Vercel API response]", vercelRes.status, vercelData);

    if (!vercelRes.ok) {
      // Dominio ya existe en el proyecto → OK
      if (vercelRes.status === 409) return { ok: true };
      return { ok: false, error: `Vercel API: ${vercelData?.error?.message ?? "Error desconocido"}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[custom-domain] Error llamando a Vercel API:", err);
    // Si Vercel API falla guardamos igualmente y mostramos DNS manual
    return { ok: true };
  }
}

async function removeDomainFromVercel(domain: string): Promise<void> {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return;

  try {
    await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
      {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  } catch { /* best-effort */ }
}

async function verifyDomainOnVercel(
  domain: string,
): Promise<{ verified: boolean; error?: string }> {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return { verified: false, error: "VERCEL_API_TOKEN o VERCEL_PROJECT_ID no configurados" };
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains/${domain}/verify`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const body = await res.json().catch(() => ({})) as { verified?: boolean };
    return { verified: body.verified === true };
  } catch {
    return { verified: false, error: "Error al contactar Vercel API" };
  }
}

// ─── GET — obtener estado del dominio ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({
      where:  { userId: user.id },
      select: {
        customDomain:         true,
        customDomainVerified: true,
        customDomainAddedAt:  true,
      },
    });

    return NextResponse.json({
      customDomain:         account?.customDomain         ?? null,
      customDomainVerified: account?.customDomainVerified ?? false,
      customDomainAddedAt:  account?.customDomainAddedAt  ?? null,
      dnsRecord: {
        type:  "CNAME",
        name:  "checkout",
        value: DNS_CNAME_VALUE,
      },
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST — añadir dominio ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const body = (await req.json()) as { domain?: string };
    const domain = (body.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "");

    if (!domain) {
      return NextResponse.json({ error: "El dominio es obligatorio." }, { status: 400 });
    }
    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: "Formato de dominio inválido. Ejemplo: checkout.tuempresa.com" },
        { status: 400 },
      );
    }

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
    }

    // Intentar registrar en Vercel (si falla seguimos igualmente)
    await addDomainToVercel(domain);

    await db.connectedAccount.update({
      where: { id: account.id },
      data: {
        customDomain:         domain,
        customDomainVerified: false,
        customDomainAddedAt:  new Date(),
      },
    });

    return NextResponse.json({
      ok:     true,
      domain,
      verified: false,
      dnsRecord: {
        type:  "CNAME",
        name:  "checkout",
        value: DNS_CNAME_VALUE,
      },
      note: "Se cobrarán 15€/mes en tu próxima factura una vez el dominio esté verificado.",
    });
  } catch (err) {
    console.error("[custom-domain POST]", err);
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}

// ─── PATCH — verificar dominio ────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({
      where:  { userId: user.id },
      select: { id: true, customDomain: true },
    });
    if (!account?.customDomain) {
      return NextResponse.json({ error: "No tienes un dominio configurado." }, { status: 400 });
    }

    const { verified, error } = await verifyDomainOnVercel(account.customDomain);

    if (verified) {
      await db.connectedAccount.update({
        where: { id: account.id },
        data:  { customDomainVerified: true },
      });
    }

    return NextResponse.json({
      verified,
      domain: account.customDomain,
      ...(error ? { error } : {}),
      ...(!verified && !error
        ? { hint: "El registro DNS aún no se ha propagado. Suele tardar 5-30 minutos." }
        : {}),
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── DELETE — eliminar dominio ────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({
      where:  { userId: user.id },
      select: { id: true, customDomain: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
    }

    if (account.customDomain) {
      await removeDomainFromVercel(account.customDomain);
    }

    await db.connectedAccount.update({
      where: { id: account.id },
      data: {
        customDomain:         null,
        customDomainVerified: false,
        customDomainAddedAt:  null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
