import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";
import { stripe }    from "@/lib/stripe";
import { db }        from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/titan/kyc
 * Lista las sesiones de verificación de identidad (Stripe Identity) de este merchant.
 */
export async function GET(req: NextRequest) {
  try {
    const { user }     = await requireAuth(req);
    const accountIds   = await getUserAccountIds(user.id);
    if (!accountIds.length) return NextResponse.json({ sessions: [] });

    const account = await db.connectedAccount.findFirst({
      where:  { id: accountIds[0] },
      select: { stripeAccountId: true },
    });

    const sessions = await stripe.identity.verificationSessions.list({ limit: 20 });

    const mapped = sessions.data.map((s) => ({
      id:         s.id,
      status:     s.status,
      type:       s.type,
      created:    s.created,
      url:        s.url,
      lastError:  s.last_error?.reason ?? null,
      metadata:   s.metadata,
    }));

    return NextResponse.json({ sessions: mapped, stripeAccountId: account?.stripeAccountId });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[kyc GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST /api/titan/kyc
 * Crea una nueva sesión de verificación de identidad (Stripe Identity).
 * Body: { customerEmail?: string; customerName?: string; returnUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    await getUserAccountIds(user.id);

    const body = await req.json() as {
      customerEmail?: string;
      customerName?:  string;
      returnUrl:      string;
    };

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        customerEmail: body.customerEmail ?? "",
        customerName:  body.customerName  ?? "",
        createdBy:     user.id,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: body.returnUrl,
    });

    return NextResponse.json({
      id:     session.id,
      url:    session.url,
      status: session.status,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[kyc POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
