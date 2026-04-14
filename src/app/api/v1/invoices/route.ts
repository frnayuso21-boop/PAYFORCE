import { NextRequest }            from "next/server";
import { db }                     from "@/lib/db";
import { requireApiKey, apiOk, apiError, ApiAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/invoices — Lista facturas manuales del merchant */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiKey(req);
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const invoices = await db.manualInvoice.findMany({
      where: {
        connectedAccountId: ctx.accountId,
        ...(status && { status: status.toUpperCase() }),
      },
      orderBy: { issueDate: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { lines: { orderBy: { position: "asc" } } },
    });

    const hasMore = invoices.length > limit;
    const data    = hasMore ? invoices.slice(0, -1) : invoices;
    return apiOk({ object: "list", data, has_more: hasMore, next_cursor: hasMore ? data[data.length - 1]?.id : null });
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, "authentication_error", e.message);
    return apiError(500, "internal_error", "Error interno.");
  }
}
