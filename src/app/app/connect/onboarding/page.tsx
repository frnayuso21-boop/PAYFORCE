"use client";

import { useState, useEffect, FormEvent } from "react";
import { ArrowLeft, Building2, Loader2, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import Link         from "next/link";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { EmbeddedOnboarding } from "@/components/connect/EmbeddedOnboarding";

type Phase =
  | "loading"
  | "form"           // formulario inicial (nombre + país)
  | "creating"       // creando cuenta en Stripe via API
  | "onboarding"     // embedded onboarding component activo
  | "complete"       // onboarding completado
  | "error";

const COUNTRY_OPTIONS = [
  { value: "ES", label: "España" },
  { value: "DE", label: "Alemania" },
  { value: "FR", label: "Francia" },
  { value: "IT", label: "Italia" },
  { value: "PT", label: "Portugal" },
  { value: "GB", label: "Reino Unido" },
  { value: "NL", label: "Países Bajos" },
  { value: "BE", label: "Bélgica" },
  { value: "AT", label: "Austria" },
  { value: "US", label: "Estados Unidos" },
  { value: "CA", label: "Canadá" },
  { value: "AU", label: "Australia" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [phase,      setPhase]      = useState<Phase>("loading");
  const [error,      setError]      = useState("");
  const [bizName,    setBizName]    = useState("");
  const [country,    setCountry]    = useState("ES");
  const [userEmail,  setUserEmail]  = useState("");
  const [accountId,  setAccountId]  = useState<string | undefined>();

  useEffect(() => {
    // Comprobar si ya tiene cuenta activa
    fetch("/api/connect/account")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          window.location.replace("/login");
          return;
        }
        const data = await r.json() as { accounts?: { status: string; stripeAccountId?: string }[] };
        const realAccount = data.accounts?.find(
          (a) => a.stripeAccountId && !a.stripeAccountId.startsWith("local_"),
        );
        if (realAccount) {
          // Ya tiene cuenta — ir directo al onboarding embebido para completar requisitos
          setAccountId(realAccount.stripeAccountId);
          setPhase("onboarding");
          return;
        }
        setPhase("form");
      })
      .catch(() => setPhase("form"));

    // Pre-rellenar email — la respuesta es { user: { email, ... } }
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const email = d?.user?.email ?? d?.email;
        if (email) setUserEmail(email);
      })
      .catch(() => null);
  }, []);

  async function handleActivate(e: FormEvent) {
    e.preventDefault();
    if (!bizName.trim()) { setError("El nombre del negocio es obligatorio."); return; }
    setError("");
    setPhase("creating");

    try {
      // Crear cuenta con controller properties (white-label, sin Express Dashboard)
      const accountRes = await fetch("/api/connect/account", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:        userEmail,
          country,
          businessType: "individual",
        }),
      });

      let accountData: { accountId?: string; error?: string; code?: string } = {};
      try { accountData = await accountRes.json(); } catch { /* sin body */ }

      if (!accountRes.ok || !accountData.accountId) {
        const msg = accountData.error ?? `Error ${accountRes.status}: no se pudo preparar tu cuenta de cobros.`;
        setError(msg);
        setPhase("form");
        return;
      }

      // Guardar nombre del negocio
      await fetch("/api/connect/setup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ businessName: bizName.trim() }),
      }).catch(() => null);

      // Lanzar embedded onboarding — sin redirect a Stripe
      setAccountId(accountData.accountId);
      setPhase("onboarding");
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
      setPhase("form");
    }
  }

  function handleOnboardingComplete() {
    setPhase("complete");
    // Redirigir al estado de cuenta tras 2s
    setTimeout(() => router.push("/app/connect"), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/connect"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activa tus cobros</h1>
          <p className="text-muted-foreground">
            Configura tu cuenta de cobros para empezar a recibir pagos
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {phase === "loading" && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Comprobando estado de tu cuenta…
          </CardContent>
        </Card>
      )}

      {/* Formulario inicial */}
      {(phase === "form" || phase === "creating") && (
        <div className="space-y-4">
          <Card className="border-blue-100 bg-blue-50/60">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-700" />
                <p className="text-sm text-blue-800 font-medium">Proceso 100% seguro en PayForce</p>
              </div>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Introduce el nombre de tu negocio</li>
                <li>Completa la verificación de identidad (DNI o pasaporte)</li>
                <li>Añade tu cuenta bancaria para recibir pagos</li>
                <li>Empieza a cobrar</li>
              </ol>
              <p className="text-xs text-blue-600 mt-2">
                Todo el proceso se completa aquí en PayForce, sin salir a plataformas externas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Building2 className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Datos del negocio</CardTitle>
                  <CardDescription>
                    Información básica para preparar tu cuenta de cobros
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bizName">Nombre del negocio *</Label>
                  <Input
                    id="bizName"
                    placeholder="Mi Tienda S.L. o Juan García"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    required
                    disabled={phase === "creating"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Aparecerá en los recibos de tus clientes.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País de actividad *</Label>
                  <select
                    id="country"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={phase === "creating"}
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
                  <p>Al continuar, aceptas los <a href="#" className="underline">términos del servicio</a> de PayForce.</p>
                  <p>Se te pedirá verificar tu identidad con un documento oficial en el siguiente paso.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={phase === "creating"}
                >
                  {phase === "creating" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Preparando cuenta…</>
                  ) : (
                    "Continuar con la verificación"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Embedded onboarding — sin redirect a Stripe */}
      {phase === "onboarding" && (
        <div className="space-y-4">
          <Card className="border-emerald-100 bg-emerald-50/50">
            <CardContent className="flex items-center gap-3 py-3">
              <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700">
                Completa tu verificación de identidad y datos bancarios para empezar a cobrar.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-xl">
              <EmbeddedOnboarding
                accountId={accountId}
                onComplete={handleOnboardingComplete}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completado */}
      {phase === "complete" && (
        <Card className="border-emerald-100 bg-emerald-50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold text-emerald-800">¡Cuenta de cobros configurada!</p>
              <p className="text-sm text-emerald-700 mt-1">
                Redirigiendo a tu panel de cobros…
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
