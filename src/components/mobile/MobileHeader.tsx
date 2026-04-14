"use client";

import Link              from "next/link";
import { Bell, Settings } from "lucide-react";
import { useBrand }       from "@/context/BrandContext";

interface MobileHeaderProps {
  title:        string;
  showActions?: boolean;
}

export function MobileHeader({ title, showActions = true }: MobileHeaderProps) {
  const { theme } = useBrand();

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 md:hidden"
      style={{
        background:    theme.mobileHeaderBg,
        borderBottom:  `1px solid ${theme.mobileHeaderBorder}`,
        paddingTop:    "calc(env(safe-area-inset-top, 0px) + 14px)",
        paddingBottom: "14px",
      }}
    >
      <span className="text-[17px] font-semibold tracking-tight"
        style={{ color: theme.mobileHeaderText }}>
        {title}
      </span>

      {showActions && (
        <div className="flex items-center gap-1">
          <button className="relative flex h-8 w-8 items-center justify-center rounded-full active:opacity-60"
            style={{ color: theme.mobileHeaderText }}>
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="absolute right-[7px] top-[7px] h-[5px] w-[5px] rounded-full"
              style={{ background: theme.accentBg }} />
          </button>
          <Link
            href="/app/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full active:opacity-60"
            style={{ color: theme.mobileHeaderText }}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
        </div>
      )}
    </header>
  );
}
