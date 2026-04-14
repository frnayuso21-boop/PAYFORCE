interface SectionHeaderProps {
  title:    string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
