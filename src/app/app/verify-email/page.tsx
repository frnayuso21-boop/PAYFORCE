"use client";

import { useState, useEffect } from "react";
import { Mail, RefreshCw, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

// Pantalla de verificación de email 
export default function VerifyEmailPage() {
 const [email, setEmail] = useState<string | null>(null);
 const [resent, setResent] = useState(false);
 const [resending, setResending] = useState(false);
 const [verified, setVerified] = useState(false);
 const [cooldown, setCooldown] = useState(0);

 const supabase = createSupabaseClient();
 const isGmail = email?.endsWith("@gmail.com") ?? false;

 // Obtener el email del usuario autenticado
 useEffect(() => {
 supabase.auth.getUser().then(({ data }) => {
 if (data.user?.email) setEmail(data.user.email);
 if (data.user?.email_confirmed_at) setVerified(true);
 });
 }, [supabase]);

 // Cooldown countdown
 useEffect(() => {
 if (cooldown <= 0) return;
 const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
 return () => clearInterval(timer);
 }, [cooldown]);

 async function handleResend() {
 if (!email || cooldown > 0) return;
 setResending(true);
 try {
 const origin = typeof window !== "undefined"? window.location.origin : "";
 const callbackUrl = `${origin}/auth/callback?next=/app/dashboard`;
 await supabase.auth.resend({
 type: "signup",
 email: email,
 options: { emailRedirectTo: callbackUrl },
 });
 setResent(true);
 setCooldown(60);
 } catch {
 // silencioso
 } finally {
 setResending(false);
 }
 }

 if (verified) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
 <div className="w-full max-w-sm text-center space-y-5">
 <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 mx-auto">
 <CheckCircle2 className="h-7 w-7 text-emerald-500"/>
 </div>
 <div>
 <h1 className="text-xl font-bold text-slate-900">Email verificado</h1>
 <p className="mt-1.5 text-sm text-slate-500">Tu cuenta está activa y lista.</p>
 </div>
 <Link
 href="/app/dashboard"className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
 Ir al dashboard
 </Link>
 </div>
 </main>
 );
 }

 return (
 <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
 <div className="w-full max-w-sm space-y-6">
 {/* Logo */}
 <div className="flex flex-col items-center gap-2">
 <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
 <Zap className="h-6 w-6 text-white"/>
 </div>
 <span className="text-lg font-bold text-slate-900">PayForce</span>
 </div>

 {/* Card principal */}
 <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm space-y-5">
 <div className="flex flex-col items-center text-center gap-3">
 <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
 <Mail className="h-7 w-7 text-blue-500"/>
 </div>
 <div>
 <h1 className="text-[20px] font-bold text-slate-900">Verifica tu correo electrónico</h1>
 {email && (
 <p className="mt-1.5 text-sm text-slate-500">
 Enviamos un enlace de verificación a{""}
 <span className="font-semibold text-slate-700 break-all">{email}</span>
 </p>
 )}
 </div>
 </div>

 {/* Instrucciones */}
 <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3.5 text-sm text-slate-600 leading-relaxed">
 Abre el email y pulsa el enlace de verificación para activar tu cuenta.
 Hasta que no verifiques, solo podrás usar el entorno de prueba.
 </div>

 {/* Estado de reenvío */}
 {resent && (
 <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
 <CheckCircle2 className="h-4 w-4 shrink-0"/>
 Correo reenviado. Revisa tu bandeja de entrada.
 </div>
 )}

 {/* Botones */}
 <div className="space-y-2.5">
 {isGmail && (
 <a
 href="https://mail.google.com"target="_blank"rel="noopener noreferrer"className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
 <svg width="16"height="16"viewBox="0 0 18 18"aria-hidden="true">
 <path fill="#fff"fillOpacity=".9"d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.124 17.64 11.816 17.64 9.2z"/>
 <path fill="#fff"fillOpacity=".7"d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
 <path fill="#fff"fillOpacity=".5"d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
 <path fill="#fff"fillOpacity=".3"d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
 </svg>
 Abrir Gmail
 </a>
 )}

 <button
 onClick={handleResend}
 disabled={resending || cooldown > 0}
 className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
 <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin": ""}`} />
 {resending
 ? "Enviando…": cooldown > 0
 ? `Reenviar en ${cooldown}s`: "Reenviar correo"}
 </button>
 </div>
 </div>

 {/* Información de entorno de prueba */}
 <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3.5 text-[13px] text-amber-800 leading-relaxed">
 <strong className="font-semibold">Mientras tanto:</strong> puedes explorar el entorno de
 prueba sin restricciones. Los cobros reales se activan tras la verificación.
 </div>

 <div className="flex items-center justify-center gap-4">
 <Link
 href="/app/dashboard"className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
 Ir al entorno de prueba →
 </Link>
 </div>
 </div>
 </main>
 );
}
