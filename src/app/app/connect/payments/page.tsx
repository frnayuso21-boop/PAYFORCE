import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { EmbeddedPayments } from "@/components/connect/EmbeddedPayments";

export const metadata: Metadata = { title: "Pagos — PayForce"};
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
 const supabase = await createSupabaseServerClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/login");

 const dbUser = await db.user.findUnique({
 where: { supabaseId: user.id },
 include: { connectedAccounts: { orderBy: { createdAt: "asc"}, take: 1 } },
 });
 const account = dbUser?.connectedAccounts[0] ?? null;

 if (!account || account.stripeAccountId.startsWith("local_")) {
 redirect("/app/connect/onboarding");
 }

 if (account.status !== "ENABLED") {
 redirect("/app/connect");
 }

 return (
 <>
 <MobileHeader title="Pagos"/>
 <div className="w-full max-w-4xl mx-auto space-y-4 px-4 pt-3 pb-6 md:px-0 md:space-y-6 md:py-2">
 <div className="flex items-center gap-3">
 <Button variant="ghost"size="icon"asChild>
 <Link href="/app/connect"><ArrowLeft className="h-4 w-4"/></Link>
 </Button>
 <div>
 <h1 className="text-xl font-semibold text-slate-900">Pagos recibidos</h1>
 <p className="mt-0.5 text-sm text-slate-500">
 Historial completo de cobros, reembolsos y detalles de cada transacción
 </p>
 </div>
 </div>

 <EmbeddedPayments accountId={account.stripeAccountId} />
 </div>
 </>
 );
}
