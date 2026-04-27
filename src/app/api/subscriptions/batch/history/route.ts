/**
 * GET /api/subscriptions/batch/history
 * Lista los BatchJobs del merchant autenticado, ordenados por fecha desc.
 */
import { NextResponse }         from "next/server";
import { db }                   from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const jobs = await db.batchJob.findMany({
    where:   { connectedAccountId: account.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: jobs });
}
