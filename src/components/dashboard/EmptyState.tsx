import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon:        string;
  title:       string;
  description: string;
  compact?:    boolean;
}

export function EmptyState({ icon, title, description, compact }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 px-6" : "py-14 px-6"
    )}>
      <span className={cn(
        "flex items-center justify-center rounded-full bg-slate-100 text-slate-400",
        compact ? "h-8 w-8 text-base" : "h-10 w-10 text-lg"
      )}>
        {icon}
      </span>
      <p className="mt-3 text-[13px] font-medium text-slate-700">{title}</p>
      <p className="mt-1 max-w-[280px] text-[12px] text-slate-400">{description}</p>
    </div>
  );
}
