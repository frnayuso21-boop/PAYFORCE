"use client";

import Link            from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, Wallet, Users, Smartphone } from "lucide-react";
import { useBrand }    from "@/context/BrandContext";

const tabs = [
  { label: "Inicio",   href: "/app/dashboard",    icon: Home       },
  { label: "Pagos",    href: "/app/payouts",       icon: CreditCard },
  { label: "Cobrar",   href: "/app/payment-methods", icon: Smartphone },
  { label: "Clientes", href: "/app/customers",     icon: Users      },
  { label: "Saldos",   href: "/app/balances",      icon: Wallet     },
];

export function BottomNav() {
  const pathname    = usePathname();
  const { theme }   = useBrand();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div
        className="flex items-stretch"
        style={{
          background:    theme.mobileNavBg,
          borderTop:     `1px solid ${theme.mobileNavBorder}`,
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
      >
        {tabs.map((tab) => {
          const Icon   = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition-opacity active:opacity-50"
            >
              <div className="flex h-6 w-6 items-center justify-center">
                <Icon
                  className="h-[22px] w-[22px] transition-colors"
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{ color: active ? theme.mobileNavActive : theme.mobileNavInactive }}
                />
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? theme.mobileNavActive : theme.mobileNavInactive }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
