import type { Metadata }  from "next";
import Link               from "next/link";
import { redirect }       from "next/navigation";
import {
  ArrowLeft, CheckCircle2, XCircle, ArrowRight, Zap, Building2,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db }        from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi cuenta — PayForce" };
export const dynamic = "force-dynamic";

export default async function ConnectStatusPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await db.user.findUnique({
    where:   { supabaseId: user.id },
    include: { connectedAccounts: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const account = dbUser?.connectedAccounts[0] ?? null;

  if (!account) redirect("/app/connect/onboarding");

  const isEnabled = account.status === "ENABLED";
  let ibanDisplay = "—";
  try {
    const meta = account.stripeMetadata ? JSON.parse(account.stripeMetadata as string) : null;
    if (meta?.iban) {
      const iban = meta.iban as string;
      ibanDisplay = iban.slice(0, 4) + " •••• •••• •••• " + iban.slice(-4);
    }
  } catch { /* ignore */ }

  const capabilities = [
    { label: "Cobros habilitados",  enabled: account.chargesEnabled,   description: "Puede recibir pagos de clientes" },
    { label: "Cuenta bancaria",     enabled: account.detailsSubmitted,  description: "IBAN registrado en el sistema" },
    { label: "Liquidaciones",       enabled: account.payoutsEnabled,    description: "PayForce te transfiere el neto" },
    { label: "Cuenta verificada",   enabled: isEnabled,                 description: "Cuenta activa y lista para cobrar" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/connect"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi cuenta de cobros</h1>
          <p className="text-muted-foreground">Estado y datos bancarios</p>
        </div>
      </div>

      {isEnabled && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">Cuenta activa — lista para cobrar</p>
              <p className="mt-0.5 text-sm text-emerald-700">
                Crea un enlace de pago y compártelo con tus clientes.
              </p>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5" asChild>
              <Link href="/app/payment-links">
                Crear cobro
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" />
              <CardTitle>{account.businessName || account.email || "Mi negocio"}</CardTitle>
            </div>
            <Badge variant={isEnabled ? "success" : "warning"}>
              {isEnabled ? "Activa" : "Pendiente"}
            </Badge>
          </div>
          {account.email && <CardDescription>{account.email}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">IBAN</p>
              <p className="mt-0.5 text-sm font-medium font-mono">{ibanDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">País</p>
              <p className="mt-0.5 text-sm font-medium">{account.country}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Moneda</p>
              <p className="mt-0.5 text-sm font-medium">{(account.defaultCurrency ?? "eur").toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alta el</p>
              <p className="mt-0.5 text-sm font-medium">{formatDate(account.createdAt.toISOString())}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/app/connect/onboarding">Actualizar datos bancarios</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacidades</CardTitle>
          <CardDescription>Estado de tu cuenta de cobros</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {capabilities.map((cap, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {cap.enabled
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                : <XCircle      className="h-5 w-5 shrink-0 text-muted-foreground" />
              }
              <div className="flex-1">
                <p className="text-sm font-medium">{cap.label}</p>
                <p className="text-xs text-muted-foreground">{cap.description}</p>
              </div>
              <Badge variant={cap.enabled ? "success" : "secondary"} className="shrink-0">
                {cap.enabled ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
