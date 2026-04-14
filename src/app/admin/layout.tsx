import { redirect }   from "next/navigation";
import Link           from "next/link";
import { HexLogo }   from "@/components/icons/HexLogo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db }        from "@/lib/db";
import {
  LayoutDashboard, Users, CreditCard, Zap,
  AlertTriangle, Webhook, RefreshCw, Settings, LogOut,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { label: "Overview",       href: "/admin",               icon: LayoutDashboard, exact: true },
  { label: "Merchants",      href: "/admin/merchants",      icon: Users          },
  { label: "Pagos",          href: "/admin/payments",       icon: CreditCard     },
  { label: "Instant Payouts",href: "/admin/payouts",        icon: Zap            },
  { label: "Suscripciones",  href: "/admin/subscriptions",  icon: RefreshCw      },
  { label: "Disputas",       href: "/admin/disputes",       icon: AlertTriangle  },
  { label: "Webhooks",       href: "/admin/webhooks",       icon: Webhook        },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=/admin");

  const dbUser = await db.user.findUnique({
    where:  { supabaseId: user.id },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") redirect("/app/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f14] text-white">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/8">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <HexLogo size={24} className="text-white shrink-0" />
          <div>
            <span className="text-[14px] font-bold tracking-tight text-white">PayForce</span>
            <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wide">admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/50 hover:bg-white/8 hover:text-white transition-all duration-150"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 px-3 py-3 space-y-0.5">
          <Link href="/app/dashboard"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] text-white/30 hover:text-white/60 transition">
            <Settings className="h-3.5 w-3.5" />
            Volver al app
          </Link>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/60 truncate">{dbUser.name || dbUser.email}</p>
              <p className="text-[9px] text-red-400/70 uppercase tracking-wide">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#f8f9fb]">
        {children}
      </main>
    </div>
  );
}
