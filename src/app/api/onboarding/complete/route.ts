/**
 * POST /api/onboarding/complete
 *
 * Guarda el perfil de onboarding del merchant y actualiza su accountStatus.
 * Se llama al completar o saltar el modal de onboarding inicial.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const body = await req.json() as {
      companyName?:     string;
      companyCountry?:  string;
      companyCity?:     string;
      website?:         string;
      companyType?:     string;
      selectedFeatures?: string[];
      mode?:            "test" | "live";
    };

    const mode             = body.mode ?? "test";
    const selectedFeatures = JSON.stringify(body.selectedFeatures ?? []);
    const now              = new Date();

    // Upsert del perfil de onboarding
    await db.onboardingProfile.upsert({
      where:  { userId },
      create: {
        userId,
        companyName:     body.companyName     ?? "",
        companyCountry:  body.companyCountry  ?? "ES",
        companyCity:     body.companyCity     ?? "",
        website:         body.website         ?? null,
        companyType:     body.companyType     ?? "",
        selectedFeatures,
        mode,
        completedAt:     now,
      },
      update: {
        companyName:     body.companyName     ?? undefined,
        companyCountry:  body.companyCountry  ?? undefined,
        companyCity:     body.companyCity     ?? undefined,
        website:         body.website         ?? undefined,
        companyType:     body.companyType     ?? undefined,
        selectedFeatures,
        mode,
        completedAt:     now,
      },
    });

    // Determinar nuevo accountStatus
    // test  → TEST_MODE
    // live  → READY_FOR_PAYMENTS (pendiente de completar Connect/KYB)
    const newStatus = mode === "live" ? "READY_FOR_PAYMENTS" : "TEST_MODE";

    await db.user.update({
      where: { id: userId },
      data:  { accountStatus: newStatus },
    });

    // Actualizar businessName de la ConnectedAccount placeholder si hay nombre
    if (body.companyName) {
      await db.connectedAccount.updateMany({
        where: { userId, stripeAccountId: { startsWith: "local_" } },
        data:  {
          businessName:   body.companyName,
          country:        body.companyCountry ?? "ES",
        },
      });
    }

    return NextResponse.json({ ok: true, accountStatus: newStatus });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[onboarding/complete]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
