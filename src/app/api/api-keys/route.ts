// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError, getUserPrimaryAccount } from "@/lib/auth";
import { generateApiToken, hashApiToken, getKeyPrefix }  from "@/lib/api-key";
import { checkRateLimit }            from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ─── GET /api/api-keys — listar keys del merchant ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await getUserPrimaryAccount(user.id);
    if (!account) {
      return NextResponse.json({ error: "No tienes una cuenta activa." }, { status: 422 });
    }

    const keys = await db.apiKey.findMany({
      where:   { connectedAccountId: account.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, label: true, keyPrefix: true, isActive: true,
        lastUsedAt: true, expiresAt: true, createdAt: true,
      },
    });

    return NextResponse.json({ data: keys });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/api-keys — crear nueva key ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const rl = checkRateLimit(`api-keys-create:${user.id}`, { windowMs: 60_000, max: 10 });
    if (!rl.success) {
      return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
    }

    const account = await getUserPrimaryAccount(user.id);
    if (!account) {
      return NextResponse.json({ error: "No tienes una cuenta activa." }, { status: 422 });
    }

    const { label = "Mi integración", expiresAt } = (await req.json()) as {
      label?: string; expiresAt?: string;
    };

    if (!label.trim() || label.length > 80) {
      return NextResponse.json({ error: "El nombre debe tener entre 1 y 80 caracteres." }, { status: 400 });
    }

    // Límite: 20 keys activas por merchant
    const active = await db.apiKey.count({
      where: { connectedAccountId: account.id, isActive: true },
    });
    if (active >= 20) {
      return NextResponse.json({ error: "Límite de 20 API keys activas por cuenta." }, { status: 400 });
    }

    const token = generateApiToken();

    const key = await db.apiKey.create({
      data: {
        label,
        keyPrefix:         getKeyPrefix(token),
        keyHash:           hashApiToken(token),
        connectedAccountId: account.id,
        expiresAt:         expiresAt ? new Date(expiresAt) : null,
      },
    });

    // El token completo SOLO se devuelve aquí — no se puede recuperar después
    return NextResponse.json(
      { id: key.id, token, keyPrefix: key.keyPrefix, label: key.label, createdAt: key.createdAt },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api-keys POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
