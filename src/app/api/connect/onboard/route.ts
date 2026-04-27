import { NextRequest, NextResponse } from "next/server";
import { stripe }                   from "@/lib/stripe";
import { db }                       from "@/lib/db";
import { requireAuth, AuthError }   from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const body = await req.json() as {
      // Paso 1
      businessName:   string;
      businessType:   "individual" | "company";
      taxId:          string;
      sector:         string;
      // Paso 2
      firstName:      string;
      lastName:       string;
      dobDay:         number;
      dobMonth:       number;
      dobYear:        number;
      address:        string;
      city:           string;
      postalCode:     string;
      phone:          string;
      idNumber:       string;
      // Paso 3
      iban:           string;
      accountHolder:  string;
    };

    // Validaciones básicas
    if (!body.businessName?.trim()) return NextResponse.json({ error: "Nombre del negocio obligatorio" }, { status: 400 });
    if (!body.taxId?.trim())        return NextResponse.json({ error: "CIF/NIF obligatorio" }, { status: 400 });
    if (!body.firstName?.trim())    return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    if (!body.lastName?.trim())     return NextResponse.json({ error: "Apellidos obligatorios" }, { status: 400 });
    if (!body.iban?.trim())         return NextResponse.json({ error: "IBAN obligatorio" }, { status: 400 });

    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";

    // Crear cuenta Custom en Stripe
    const stripeAccount = await stripe.accounts.create({
      type:    "custom",
      country: "ES",
      email:   user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers:     { requested: true },
      },
      business_type: body.businessType ?? "individual",
      ...(body.businessType === "company"
        ? {
            company: {
              name:   body.businessName.trim(),
              tax_id: body.taxId.trim(),
              address: {
                line1:       body.address.trim(),
                city:        body.city.trim(),
                postal_code: body.postalCode.trim(),
                country:     "ES",
              },
              phone: body.phone.trim(),
            },
          }
        : {
            individual: {
              first_name:  body.firstName.trim(),
              last_name:   body.lastName.trim(),
              email:       user.email,
              phone:       body.phone.trim(),
              dob: {
                day:   body.dobDay,
                month: body.dobMonth,
                year:  body.dobYear,
              },
              address: {
                line1:       body.address.trim(),
                city:        body.city.trim(),
                postal_code: body.postalCode.trim(),
                country:     "ES",
              },
              id_number: body.idNumber.trim(),
            },
          }),
      external_account: {
        object:         "bank_account",
        country:        "ES",
        currency:       "eur",
        account_number: body.iban.replace(/\s/g, ""),
        account_holder_name: body.accountHolder.trim() || `${body.firstName} ${body.lastName}`,
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip,
      },
      metadata: {
        sector:    body.sector ?? "",
        payforceUserId: user.id,
      },
    });

    // Actualizar la cuenta local con el stripeAccountId real
    const existing = await db.connectedAccount.findFirst({ where: { userId: user.id } });

    if (existing) {
      await db.connectedAccount.update({
        where: { id: existing.id },
        data: {
          stripeAccountId:  stripeAccount.id,
          businessName:     body.businessName.trim(),
          status:           "PENDING",
          chargesEnabled:   stripeAccount.charges_enabled   ?? false,
          payoutsEnabled:   stripeAccount.payouts_enabled   ?? false,
          detailsSubmitted: stripeAccount.details_submitted ?? false,
          stripeMetadata: JSON.stringify({
            iban:          body.iban.replace(/\s/g, ""),
            accountHolder: body.accountHolder.trim() || `${body.firstName} ${body.lastName}`,
          }),
        },
      });
    } else {
      await db.connectedAccount.create({
        data: {
          stripeAccountId:  stripeAccount.id,
          userId:           user.id,
          email:            user.email,
          businessName:     body.businessName.trim(),
          country:          "ES",
          defaultCurrency:  "eur",
          status:           "PENDING",
          chargesEnabled:   false,
          payoutsEnabled:   false,
          detailsSubmitted: stripeAccount.details_submitted ?? false,
        },
      });
    }

    return NextResponse.json({ ok: true, accountId: stripeAccount.id });

  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Error específico de Stripe
    if (typeof err === "object" && err !== null && "message" in err) {
      const msg = (err as { message: string }).message;
      console.error("[connect/onboard] Stripe error:", msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[connect/onboard]", err);
    return NextResponse.json({ error: "Error interno al crear la cuenta" }, { status: 500 });
  }
}
