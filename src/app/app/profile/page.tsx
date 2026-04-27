"use client";

import { useEffect, useState } from "react";
import { User, Mail, Building2, Globe, KeyRound, CheckCircle2, Loader2 } from "lucide-react";

interface ProfileData {
  name:         string;
  email:        string;
  businessName: string;
  country:      string;
}

const COUNTRY_NAMES: Record<string, string> = {
  ES: "España", FR: "Francia", DE: "Alemania", IT: "Italia",
  PT: "Portugal", GB: "Reino Unido", US: "Estados Unidos", MX: "México",
  AR: "Argentina", CO: "Colombia", CL: "Chile", PE: "Perú",
};

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className="text-[14px] font-medium text-slate-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile,        setProfile]        = useState<ProfileData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [pwdLoading,     setPwdLoading]     = useState(false);
  const [pwdMsg,         setPwdMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.connect) return;
        setProfile({
          name:         d.connect.businessName ?? "",
          email:        d.connect.email        ?? "",
          businessName: d.connect.businessName ?? "",
          country:      d.connect.country      ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePasswordReset() {
    if (!profile?.email) return;
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      if (r.ok) {
        setPwdMsg({ ok: true, text: `Enlace de restablecimiento enviado a ${profile.email}` });
      } else {
        const d = await r.json().catch(() => ({}));
        setPwdMsg({ ok: false, text: d.error ?? "Error al enviar el enlace" });
      }
    } catch {
      setPwdMsg({ ok: false, text: "Error de red. Inténtalo de nuevo." });
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="mx-auto max-w-lg space-y-5">

        {/* Cabecera */}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">Mi perfil</h1>
          <p className="mt-1 text-[13px] text-[#6e6e73]">Información de tu cuenta PayForce</p>
        </div>

        {/* Datos */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 overflow-hidden">
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              <Field
                icon={<User className="h-4 w-4" />}
                label="Nombre del negocio"
                value={profile?.businessName ?? ""}
              />
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={profile?.email ?? ""}
              />
              <Field
                icon={<Building2 className="h-4 w-4" />}
                label="Empresa"
                value={profile?.name ?? ""}
              />
              <Field
                icon={<Globe className="h-4 w-4" />}
                label="País"
                value={COUNTRY_NAMES[profile?.country ?? ""] ?? (profile?.country ?? "")}
              />
            </>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-800">Contraseña</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Te enviaremos un enlace de restablecimiento a tu email.
            </p>
          </div>

          {pwdMsg && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium"
              style={{
                background: pwdMsg.ok ? "#F0FDF4" : "#FEF2F2",
                color:      pwdMsg.ok ? "#166534" : "#991B1B",
                border:     `1px solid ${pwdMsg.ok ? "#BBF7D0" : "#FECACA"}`,
              }}
            >
              {pwdMsg.ok && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
              {pwdMsg.text}
            </div>
          )}

          <button
            onClick={handlePasswordReset}
            disabled={pwdLoading || loading}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {pwdLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <KeyRound className="h-3.5 w-3.5" />
            }
            Cambiar contraseña
          </button>
        </div>

      </div>
    </div>
  );
}
