/**
 * GET /api/dashboard/terminal/history?limit=30
 * Cobros registrados desde el terminal virtual (metadata terminal_moto).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isTerminalMoto(metadata: string | null): boolean {
  if (!metadata) return false;
  try {
    const m = JSON.parse(metadata) as { source?: string };
    return m.source === "terminal_moto";
  } catch {
    return metadata.includes("terminal_moto");
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const account = await getUserPrimaryAccount(session.user.id);
    if (!account) {
      return NextResponse.json({ error: "Sin cuenta" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10) || 30, 100);

    const rows = await db.payment.findMany({
      where:   { connectedAccountId: account.id },
      orderBy: { createdAt: "desc" },
      take:    limit * 3,
      select: {
        id:          true,
        amount:      true,
        currency:    true,
        status:      true,
        description: true,
        customerName:  true,
        customerEmail: true,
        metadata:    true,
        createdAt:   true,
      },
    });

    const terminal = rows.filter((r) => isTerminalMoto(r.metadata)).slice(0, limit);

    return NextResponse.json({
      data: terminal.map((r) => ({
        id:          r.id,
        date:        r.createdAt.toISOString(),
        customer:    r.customerName || r.customerEmail || "—",
        amount:      r.amount,
        currency:    r.currency,
        status:      r.status,
        description: r.description ?? "—",
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[terminal history]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
