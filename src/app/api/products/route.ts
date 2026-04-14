import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    if (!ids.length) return NextResponse.json({ products: [] });

    const { searchParams } = new URL(req.url);
    const q        = searchParams.get("q") ?? "";
    const category = searchParams.get("category") ?? "";
    const onlyActive = searchParams.get("active") !== "false";

    const products = await db.product.findMany({
      where: {
        connectedAccountId: { in: ids },
        ...(onlyActive && { active: true }),
        ...(category    && { category }),
        ...(q && {
          OR: [
            { name:        { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { sku:         { contains: q, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[GET /api/products]", e);
    return NextResponse.json({ error: "Internal server error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    if (!ids.length) return NextResponse.json({ error: "No account" }, { status: 400 });

    const body = await req.json();
    const { name, description, imageUrl, sku, category, price, currency, unit, taxRate, stock } = body;

    if (!name || price == null) {
      return NextResponse.json({ error: "name y price son obligatorios" }, { status: 422 });
    }

    const product = await db.product.create({
      data: {
        connectedAccountId: ids[0],
        name:        String(name),
        description: description ? String(description) : undefined,
        imageUrl:    imageUrl    ? String(imageUrl)    : undefined,
        sku:         sku         ? String(sku)         : undefined,
        category:    category    ? String(category)    : undefined,
        price:       Math.round(Number(price)),
        currency:    currency    ? String(currency).toLowerCase() : "eur",
        unit:        unit        ? String(unit)        : "unit",
        taxRate:     taxRate     ? Number(taxRate)     : 0,
        stock:       stock != null ? Number(stock)     : undefined,
        active:      true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/products]", e);
    return NextResponse.json({ error: "Internal server error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
