import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_TYPES   = ["AMOUNT_THRESHOLD", "VELOCITY", "COUNTRY_BLOCK", "NIGHT_HOURS", "EMAIL_DOMAIN", "CUSTOM"] as const;
const VALID_ACTIONS = ["FLAG", "BLOCK"] as const;

interface RuleBody {
  name?:       string;
  ruleType?:   string;
  params?:     Record<string, unknown>;
  riskPoints?: number;
  action?:     string;
  isActive?:   boolean;
}

/**
 * GET /api/titan/rules — lista las reglas del merchant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });
    if (!account) return NextResponse.json([]);

    const rules = await db.fraudRule.findMany({
      where:   { connectedAccountId: account.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(rules.map((r) => ({
      ...r,
      params: (() => { try { return JSON.parse(r.params); } catch { return {}; } })(),
    })));
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[titan/rules GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST /api/titan/rules — crea una nueva regla
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const body = await req.json() as RuleBody;
    const { name, ruleType, params = {}, riskPoints = 20, action = "FLAG", isActive = true } = body;

    if (!name || !ruleType) {
      return NextResponse.json({ error: "name y ruleType son obligatorios" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(ruleType as typeof VALID_TYPES[number])) {
      return NextResponse.json({ error: "ruleType inválido" }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
      return NextResponse.json({ error: "action inválida (FLAG|BLOCK)" }, { status: 400 });
    }
    if (riskPoints < 0 || riskPoints > 100) {
      return NextResponse.json({ error: "riskPoints debe estar entre 0 y 100" }, { status: 400 });
    }

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ error: "No tienes una cuenta conectada" }, { status: 404 });
    }

    // Límite de reglas por merchant
    const count = await db.fraudRule.count({ where: { connectedAccountId: account.id } });
    if (count >= 20) {
      return NextResponse.json({ error: "Límite de 20 reglas por cuenta" }, { status: 422 });
    }

    const rule = await db.fraudRule.create({
      data: {
        connectedAccountId: account.id,
        name:               name.trim(),
        ruleType,
        params:             JSON.stringify(params),
        riskPoints,
        action,
        isActive,
      },
    });

    return NextResponse.json({ ...rule, params: JSON.parse(rule.params) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[titan/rules POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * PATCH /api/titan/rules — actualiza una regla existente
 * Body: { id, ...fields }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const body = await req.json() as RuleBody & { id?: string };
    if (!body.id) return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });
    if (!account) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const existing = await db.fraudRule.findFirst({
      where: { id: body.id, connectedAccountId: account.id },
    });
    if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });

    const updated = await db.fraudRule.update({
      where: { id: body.id },
      data: {
        ...(body.name       !== undefined && { name:       body.name.trim() }),
        ...(body.ruleType   !== undefined && { ruleType:   body.ruleType   }),
        ...(body.params     !== undefined && { params:     JSON.stringify(body.params) }),
        ...(body.riskPoints !== undefined && { riskPoints: body.riskPoints }),
        ...(body.action     !== undefined && { action:     body.action     }),
        ...(body.isActive   !== undefined && { isActive:   body.isActive   }),
      },
    });

    return NextResponse.json({ ...updated, params: (() => { try { return JSON.parse(updated.params); } catch { return {}; } })() });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[titan/rules PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/titan/rules?id=xxx — elimina una regla
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });
    if (!account) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await db.fraudRule.deleteMany({
      where: { id, connectedAccountId: account.id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[titan/rules DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
