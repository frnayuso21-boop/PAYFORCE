"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Helpers 

const DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS_ES = [
 "Enero","Febrero","Marzo","Abril","Mayo","Junio",
 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function toYMD(d: Date) {
 return d.toISOString().slice(0, 10);
}
function fromYMD(s: string) {
 const [y, m, d] = s.split("-").map(Number);
 return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) {
 const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function addMonths(d: Date, n: number) {
 const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
// Monday-based weekday (0=Mon, 6=Sun)
function weekday(d: Date) { return (d.getDay() + 6) % 7; }

export type DateRange = { from: string; to: string };

interface Props {
 value: DateRange | null;
 onChange: (r: DateRange) => void;
 align?: "left"| "right";
}

// Presets 

const PRESETS = [
 { label: "Hoy", days: 0 },
 { label: "7 días", days: 7 },
 { label: "30 días", days: 30 },
 { label: "3 meses", days: 90 },
 { label: "12 meses", days: 365 },
];

function presetRange(days: number): DateRange {
 const to = new Date();
 const from = days === 0 ? new Date() : addDays(to, -days);
 return { from: toYMD(from), to: toYMD(to) };
}

function formatRange(r: DateRange | null): string {
 if (!r) return "Seleccionar período";
 const fmt = (s: string) =>
 fromYMD(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric"});
 if (r.from === r.to) return `Hoy · ${fmt(r.from)}`;
 return `${fmt(r.from)} – ${fmt(r.to)}`;
}

// Month calendar grid 

function MonthCalendar({
 month, // first day of the month to render
 from, to, // selected range (YMD strings or null)
 hover, // hover date for preview
 onDay,
 onHover,
}: {
 month: Date;
 from: string | null;
 to: string | null;
 hover: string | null;
 onDay: (ymd: string) => void;
 onHover: (ymd: string | null) => void;
}) {
 const start = startOfMonth(month);
 const numDays = daysInMonth(month);
 const offset = weekday(start); // blanks before day 1
 const cells: (number | null)[] = [
 ...Array(offset).fill(null),
 ...Array.from({ length: numDays }, (_, i) => i + 1),
 ];
 // pad to full weeks
 while (cells.length % 7 !== 0) cells.push(null);

 const today = toYMD(new Date());

 return (
 <div className="w-full">
 <p className="mb-3 text-center text-[13px] font-semibold text-slate-800">
 {MONTHS_ES[month.getMonth()]} {month.getFullYear()}
 </p>
 <div className="grid grid-cols-7 gap-y-0.5">
 {DAYS_ES.map((d) => (
 <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
 {d}
 </div>
 ))}
 {cells.map((day, idx) => {
 if (day === null) return <div key={`b-${idx}`} />;
 const ymd = toYMD(new Date(month.getFullYear(), month.getMonth(), day));

 // Range logic
 const effectiveTo = from && !to && hover ? (hover > from ? hover : from) : to;
 const isFrom = ymd === from;
 const isTo = ymd === (effectiveTo ?? from);
 const inRange = from && effectiveTo && ymd > from && ymd < effectiveTo;
 const isToday = ymd === today;

 return (
 <button
 key={ymd}
 type="button"onClick={() => onDay(ymd)}
 onMouseEnter={() => onHover(ymd)}
 onMouseLeave={() => onHover(null)}
 className={cn(
 "relative h-8 w-full rounded-md text-[12px] font-medium transition-all",
 isFrom || isTo
 ? "bg-slate-900 text-white z-10 font-semibold": inRange
 ? "bg-slate-100 text-slate-800 rounded-none": "text-slate-700 hover:bg-slate-100",
 isFrom && (effectiveTo && effectiveTo !== from) && "rounded-r-none",
 isTo && from && from !== ymd && "rounded-l-none",
 )}
 >
 {day}
 {isToday && !isFrom && !isTo && (
 <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-400"/>
 )}
 </button>
 );
 })}
 </div>
 </div>
 );
}

// Main picker 

export function DateRangePicker({ value, onChange, align = "right"}: Props) {
 const [open, setOpen] = useState(false);
 const [from, setFrom] = useState<string | null>(value?.from ?? null);
 const [to, setTo] = useState<string | null>(value?.to ?? null);
 const [hover, setHover] = useState<string | null>(null);
 const [month, setMonth] = useState<Date>(() => {
 if (value?.from) return startOfMonth(fromYMD(value.from));
 const d = new Date(); d.setDate(1); return d;
 });

 const ref = useRef<HTMLDivElement>(null);

 // Close on outside click
 useEffect(() => {
 if (!open) return;
 function handle(e: MouseEvent) {
 if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
 }
 document.addEventListener("mousedown", handle);
 return () => document.removeEventListener("mousedown", handle);
 }, [open]);

 // Sync when value changes externally
 useEffect(() => {
 setFrom(value?.from ?? null);
 setTo(value?.to ?? null);
 }, [value]);

 const handleDay = useCallback((ymd: string) => {
 if (!from || (from && to)) {
 // Start new selection
 setFrom(ymd); setTo(null);
 } else {
 // Complete selection
 const finalFrom = ymd < from ? ymd : from;
 const finalTo = ymd < from ? from : ymd;
 setFrom(finalFrom); setTo(finalTo);
 onChange({ from: finalFrom, to: finalTo });
 setTimeout(() => setOpen(false), 120);
 }
 }, [from, to, onChange]);

 const applyPreset = (days: number) => {
 const r = presetRange(days);
 setFrom(r.from); setTo(r.to);
 setMonth(startOfMonth(fromYMD(r.from)));
 onChange(r);
 setTimeout(() => setOpen(false), 120);
 };

 const clear = (e: React.MouseEvent) => {
 e.stopPropagation();
 setFrom(null); setTo(null);
 onChange(presetRange(30));
 };

 const nextMonth = startOfMonth(addMonths(month, 1));

 return (
 <div ref={ref} className="relative">
 {/* Trigger */}
 <button
 type="button"onClick={() => setOpen((v) => !v)}
 className={cn(
 "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-medium transition-all",
 open
 ? "border-slate-300 bg-white text-slate-900 shadow-md": "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
 )}
 >
 <CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-500"/>
 <span>{formatRange(from && to ? { from, to } : null)}</span>
 {from && to && (
 <span
 role="button"onClick={clear}
 className="ml-0.5 rounded-full p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer">
 <X className="h-3 w-3"/>
 </span>
 )}
 </button>

 {/* Dropdown */}
 {open && (
 <div
 className={cn(
 "absolute top-full mt-2 z-50 rounded-2xl border border-slate-200 bg-white shadow-xl",
 align === "right"? "right-0": "left-0",
 )}
 style={{ minWidth: 580 }}
 >
 <div className="flex">
 {/* Presets sidebar */}
 <div className="w-32 shrink-0 border-r border-slate-100 p-3 space-y-0.5">
 <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
 Rápido
 </p>
 {PRESETS.map(({ label, days }) => {
 const r = presetRange(days);
 const active = from === r.from && to === r.to;
 return (
 <button
 key={label}
 type="button"onClick={() => applyPreset(days)}
 className={cn(
 "w-full rounded-lg px-3 py-1.5 text-left text-[12px] font-medium transition-colors",
 active
 ? "bg-slate-900 text-white": "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
 )}
 >
 {label}
 </button>
 );
 })}
 </div>

 {/* Two-month calendar */}
 <div className="flex flex-1 flex-col">
 {/* Month nav */}
 <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
 <button
 type="button"onClick={() => setMonth((m) => startOfMonth(addMonths(m, -1)))}
 className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition">
 <ChevronLeft className="h-4 w-4"/>
 </button>
 <span className="text-[11px] text-slate-400">
 {!from
 ? "Selecciona el inicio": !to
 ? "Selecciona el fin": <span className="font-medium text-slate-700">{formatRange({ from, to })}</span>
 }
 </span>
 <button
 type="button"onClick={() => setMonth((m) => startOfMonth(addMonths(m, 1)))}
 className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition">
 <ChevronRight className="h-4 w-4"/>
 </button>
 </div>

 {/* Calendars */}
 <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100 p-4">
 <div className="pr-4">
 <MonthCalendar
 month={month} from={from} to={to} hover={hover}
 onDay={handleDay} onHover={setHover}
 />
 </div>
 <div className="pl-4">
 <MonthCalendar
 month={nextMonth} from={from} to={to} hover={hover}
 onDay={handleDay} onHover={setHover}
 />
 </div>
 </div>

 {/* Footer */}
 <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
 <span className="text-[11px] text-slate-400">
 {from && !to ? "Haz clic en otra fecha para completar el rango": ""}
 </span>
 <button
 type="button"onClick={() => setOpen(false)}
 className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-slate-800 transition">
 Aplicar
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
