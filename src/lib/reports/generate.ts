import { db } from "@/lib/db";

export interface ReportPeriod {
  from: Date;
  to: Date;
  label: string;
}

export interface ReportData {
  period: ReportPeriod;
  totalAmount: number;
  transactionCount: number;
  avgTicket: number;
  successRate: number;
  changeVsPrev: number | null;
  rows: ReportRow[];
  csvContent: string;
  summary: string;
  businessName: string;
}

export interface ReportRow {
  date: string;
  customer: string;
  amount: number;
  status: string;
  commission: number;
  net: number;
  description: string;
}

function fmt(amount: number): string {
  return (amount / 100).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "€";
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getWeeklyPeriod(offsetWeeks = 0): ReportPeriod {
  const now = new Date();
  // Ajustar al último lunes
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - dayOfWeek - offsetWeeks * 7);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return {
    from: lastMonday,
    to: lastSunday,
    label: `${fmtDate(lastMonday)} al ${fmtDate(lastSunday)}`,
  };
}

export async function generateReport(
  accountId: string,
  period?: ReportPeriod,
): Promise<ReportData> {
  const currentPeriod = period ?? getWeeklyPeriod(1); // semana pasada por defecto

  const account = await db.connectedAccount.findUnique({
    where: { id: accountId },
    select: { businessName: true },
  });

  const payments = await db.payment.findMany({
    where: {
      connectedAccountId: accountId,
      createdAt: { gte: currentPeriod.from, lte: currentPeriod.to },
    },
    orderBy: { createdAt: "desc" },
  });

  const succeeded = payments.filter((p) => p.status === "succeeded");
  const totalAmount = succeeded.reduce((acc, p) => acc + p.amount, 0);
  const successRate = payments.length > 0
    ? Math.round((succeeded.length / payments.length) * 1000) / 10
    : 0;
  const avgTicket = succeeded.length > 0
    ? Math.round(totalAmount / succeeded.length)
    : 0;

  // Período anterior para la comparativa
  const prevPeriod = getWeeklyPeriod(
    currentPeriod === period ? 1 : 2,
  );
  const prevPayments = await db.payment.findMany({
    where: {
      connectedAccountId: accountId,
      status: "succeeded",
      createdAt: { gte: prevPeriod.from, lte: prevPeriod.to },
    },
    select: { amount: true },
  });
  const prevTotal = prevPayments.reduce((acc, p) => acc + p.amount, 0);
  const changeVsPrev = prevTotal > 0
    ? Math.round(((totalAmount - prevTotal) / prevTotal) * 1000) / 10
    : null;

  const rows: ReportRow[] = payments.map((p) => {
    const commission = Math.round(p.amount * 0.014 + 25);
    return {
      date: fmtDate(new Date(p.createdAt)),
      customer: p.customerEmail ?? "—",
      amount: p.amount,
      status: p.status,
      commission,
      net: p.amount - commission,
      description: p.description ?? "",
    };
  });

  const csvLines = [
    "Fecha,Cliente,Importe,Estado,Comisión,Neto,Concepto",
    ...rows.map((r) =>
      [
        r.date,
        `"${r.customer}"`,
        (r.amount / 100).toFixed(2),
        r.status,
        (r.commission / 100).toFixed(2),
        (r.net / 100).toFixed(2),
        `"${r.description}"`,
      ].join(","),
    ),
  ];
  const csvContent = csvLines.join("\n");

  const changeStr = changeVsPrev !== null
    ? `${changeVsPrev >= 0 ? "+" : ""}${changeVsPrev}%`
    : "—";

  const summary = [
    `Resumen semana del ${currentPeriod.label}:`,
    `- Total cobrado: ${fmt(totalAmount)}`,
    `- Transacciones: ${succeeded.length}`,
    `- Ticket medio: ${fmt(avgTicket)}`,
    `- Tasa de éxito: ${successRate}%`,
    `- vs semana anterior: ${changeStr}`,
  ].join("\n");

  return {
    period: currentPeriod,
    totalAmount,
    transactionCount: succeeded.length,
    avgTicket,
    successRate,
    changeVsPrev,
    rows,
    csvContent,
    summary,
    businessName: account?.businessName ?? "Tu negocio",
  };
}
