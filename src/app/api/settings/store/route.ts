import { NextRequest, NextResponse } from "next/server";
import { requireAuth }               from "@/lib/auth";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

const slugRe  = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const colorRe = /^#[0-9a-fA-F]{6}$/;

interface StoreBody {
  slug?:             string;
  storeDescription?: string;
  primaryColor?:     string;
  logoUrl?:          string;
  storeEnabled?:     boolean;
}

function validate(body: unknown): { data: StoreBody } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Body inválido" };
  const b = body as Record<string, unknown>;

  if ("slug" in b && typeof b.slug === "string" && b.slug !== "") {
    if (!slugRe.test(b.slug)) {
      return { error: "Slug inválido: solo minúsculas, números y guiones, 3-63 caracteres" };
    }
  }
  if ("storeDescription" in b && typeof b.storeDescription === "string") {
    if (b.storeDescription.length > 300) return { error: "Descripción demasiado larga (máx. 300 caracteres)" };
  }
  if ("primaryColor" in b && typeof b.primaryColor === "string") {
    if (!colorRe.test(b.primaryColor)) return { error: "Color inválido (debe ser #rrggbb)" };
  }
  if ("storeEnabled" in b && typeof b.storeEnabled !== "boolean") {
    return { error: "storeEnabled debe ser boolean" };
  }
  if ("logoUrl" in b && typeof b.logoUrl === "string" && b.logoUrl !== "") {
    try { new URL(b.logoUrl); } catch {
      return { error: "logoUrl debe ser una URL válida" };
    }
  }

  return {
    data: {
      slug:             typeof b.slug             === "string"  ? b.slug             : undefined,
      storeDescription: typeof b.storeDescription === "string"  ? b.storeDescription : undefined,
      primaryColor:     typeof b.primaryColor     === "string"  ? b.primaryColor     : undefined,
      logoUrl:          typeof b.logoUrl          === "string"  ? b.logoUrl          : undefined,
      storeEnabled:     typeof b.storeEnabled     === "boolean" ? b.storeEnabled     : undefined,
    },
  };
}

// ─── GET: obtener configuración actual ────────────────────────────────────────

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    const session = await requireAuth(req);
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const account = await db.connectedAccount.findFirst({
    where: { userId },
    select: {
      slug:             true,
      storeDescription: true,
      primaryColor:     true,
      logoUrl:          true,
      storeEnabled:     true,
      businessName:     true,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "No tienes una cuenta conectada" }, { status: 404 });
  }

  return NextResponse.json(account);
}

// ─── PATCH: actualizar configuración de la tienda ─────────────────────────────

export async function PATCH(req: NextRequest) {
  let userId: string;
  try {
    const session = await requireAuth(req);
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body   = await req.json().catch(() => ({}));
  const result = validate(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const { slug, storeDescription, primaryColor, logoUrl, storeEnabled } = result.data;

  // Verificar que la cuenta pertenece al usuario
  const account = await db.connectedAccount.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ error: "No tienes una cuenta conectada" }, { status: 404 });
  }

  // Verificar unicidad del slug (si se cambia)
  if (slug) {
    const existing = await db.connectedAccount.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing && existing.id !== account.id) {
      return NextResponse.json(
        { error: "Ese slug ya está en uso. Elige otro." },
        { status: 409 },
      );
    }
  }

  const updated = await db.connectedAccount.update({
    where: { id: account.id },
    data: {
      ...(slug !== undefined            && { slug: slug || null }),
      ...(storeDescription !== undefined && { storeDescription: storeDescription || null }),
      ...(primaryColor !== undefined    && { primaryColor }),
      ...(logoUrl !== undefined         && { logoUrl: logoUrl || null }),
      ...(storeEnabled !== undefined    && { storeEnabled }),
    },
    select: {
      slug:             true,
      storeDescription: true,
      primaryColor:     true,
      logoUrl:          true,
      storeEnabled:     true,
      businessName:     true,
    },
  });

  return NextResponse.json(updated);
}
