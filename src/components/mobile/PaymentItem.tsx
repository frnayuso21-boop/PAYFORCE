import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type PayStatus = "SUCCEEDED" | "FAILED" | "CANCELED" | "PROCESSING" | string;

function StatusIcon({ status }: { status: string }) {
  if (status === "SUCCEEDED")
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
      </div>
    );
  if (status === "FAILED" || status === "CANCELED")
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
        <XCircle className="h-5 w-5 text-red-500" strokeWidth={2} />
      </div>
    );
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
      <Clock className="h-5 w-5 text-slate-400" strokeWidth={1.8} />
    </div>
  );
}

const statusLabel: Record<string, string> = {
  SUCCEEDED: "efectuado correctamente",
  FAILED:    "fallido",
  CANCELED:  "cancelado",
  PROCESSING:"procesando",
};

interface PaymentItemProps {
  amount:       number;
  currency:     string;
  status:       PayStatus;
  name?:        string | null;
  email?:       string | null;
  date?:        string | null;
  description?: string | null;
  onClick?:     () => void;
}

export function PaymentItem({
  amount, currency, status, name, email, date, description, onClick,
}: PaymentItemProps) {
  const label  = statusLabel[status] ?? "incompleto";
  const failed = status === "FAILED" || status === "CANCELED";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50"
    >
      <StatusIcon status={status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(
            "text-[15px] font-semibold tabular-nums leading-tight",
            failed ? "text-red-500 line-through" : "text-slate-900",
          )}>
            {formatCurrency(amount / 100, currency)}
          </span>
          {date && (
            <span className="shrink-0 text-[11px] text-slate-400">
              {formatDate(date)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-slate-700 leading-tight">
          {name ?? description ?? "Sin descripción"}{" "}
          <span className="text-slate-400">{label}</span>
        </p>
        {email && (
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{email}</p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}
