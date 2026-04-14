/**
 * GET /api/onboarding/status
 *
 * Devuelve el estado de onboarding del usuario autenticado.
 * El dashboard lo consume al montar para decidir si mostrar el modal.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const user = await db.user.findUnique({
      where:  { id: userId },
      select: {
        accountStatus: true,
        emailVerified: true,
        onboardingProfile: { select: { completedAt: true, mode: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const needsOnboarding = user.accountStatus === "ONBOARDING_PENDING";

    return NextResponse.json({
      accountStatus:      user.accountStatus,
      emailVerified:      user.emailVerified,
      needsOnboarding,
      onboardingCompleted: !!user.onboardingProfile?.completedAt,
      mode:               user.onboardingProfile?.mode ?? "test",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[onboarding/status]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
