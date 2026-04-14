"use client";

/**
 * /verify — Segundo factor TOTP.
 *
 * Se muestra cuando el usuario tiene MFA TOTP activado y acaba de hacer
 * login con email OTP (sesión aal1). Para llegar al dashboard necesita
 * elevar la sesión a aal2 verificando el código de su Authenticator App.
 *
 * El middleware redirige aquí automáticamente cuando detecta
 * nextLevel === 'aal2' && currentLevel !== 'aal2'.
 */

import { Suspense, useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams }               from "next/navigation";
import { ShieldCheck, Zap }                         from "lucide-react";
import { Button }                                   from "@/components/ui/button";
import { Input }                                    from "@/components/ui/input";
import { Label }                                    from "@/components/ui/label";
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";

function VerifyForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/app/dashboard";

  const supabase = createSupabaseClient();

  const [code,       setCode]       = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  // factorId y challengeId se obtienen al montar el componente
  const [factorId,   setFactorId]   = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [initError,  setInitError]  = useState("");

  // Al montar: obtener el factor verificado y crear el challenge
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Listar factores TOTP verificados
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr || !factors) {
        if (!cancelled) setInitError("Error al cargar los factores MFA.");
        return;
      }

      const totp = factors.totp.find((f) => f.status === "verified");
      if (!totp) {
        // No hay factor verificado — redirigir al dashboard (no debería pasar)
        if (!cancelled) router.replace("/app/dashboard");
        return;
      }

      // Crear challenge para este factor
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      });
      if (challengeErr || !challenge) {
        if (!cancelled) setInitError("No se pudo iniciar la verificación MFA.");
        return;
      }

      if (!cancelled) {
        setFactorId(totp.id);
        setChallengeId(challenge.id);
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;

    setError("");
    setLoading(true);

    try {
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });

      if (verifyErr) {
        setError(
          verifyErr.message.includes("Invalid")
            ? "Código incorrecto. Comprueba tu app y vuelve a intentarlo."
            : verifyErr.message,
        );
        // El challenge puede haberse agotado — crear uno nuevo
        const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId });
        if (newChallenge) setChallengeId(newChallenge.id);
        setCode("");
      } else {
        // Sesión elevada a aal2 — ir al destino
        router.push(from.startsWith("/verify") ? "/app/dashboard" : from);
        router.refresh();
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (initError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {initError}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Verificación en dos pasos
        </CardTitle>
        <CardDescription>
          Abre tu app de autenticación (Google Authenticator, Authy, 1Password…)
          e introduce el código de 6 dígitos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp">Código de autenticación</Label>
            <Input
              id="totp"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={!factorId}
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !factorId || code.length < 6}
          >
            {loading ? "Verificando…" : "Verificar y acceder"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-xs text-muted-foreground">
          El código cambia cada 30 segundos. Si expira, introduce el nuevo.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PayForce</h1>
          <p className="text-sm text-muted-foreground">
            Segundo factor de autenticación
          </p>
        </div>

        <Suspense fallback={
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Cargando…
            </CardContent>
          </Card>
        }>
          <VerifyForm />
        </Suspense>
      </div>
    </main>
  );
}
