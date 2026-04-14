"use client";

import { cn, formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  label:    string;
  sublabel: string;
  amount:   number; // céntimos
  currency: string;
  variant?: "available" | "pending";
}

export function BalanceCard({
  label,
  sublabel,
  amount,
  currency,
  variant = "available",
}: BalanceCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
      variant === "available"
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-100 bg-white"
    )}>
      <p className={cn(
        "text-[11px] font-semibold uppercase tracking-widest",
        variant === "available" ? "text-slate-400" : "text-slate-400"
      )}>
        {label}
      </p>
      <p className={cn(
        "mt-2 text-[26px] font-semibold tracking-tight tabular-nums",
        variant === "available" ? "text-white" : "text-slate-900"
      )}>
        {formatCurrency(amount / 100, currency)}
      </p>
      <p className={cn(
        "mt-1.5 text-[11px]",
        variant === "available" ? "text-slate-400" : "text-slate-400"
      )}>
        {sublabel}
      </p>
    </div>
  );
}
