import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export type StatCardTone = "cyan" | "emerald" | "indigo" | "amber";

const toneIconClasses: Record<StatCardTone, string> = {
  cyan: "bg-sky-50 text-sky-600 border-sky-200",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
  amber: "bg-amber-50 text-amber-600 border-amber-200",
};

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  tone: StatCardTone;
}

export function StatCard({ title, value, unit, icon, tone }: StatCardProps) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[84px]">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border text-sm", toneIconClasses[tone])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 truncate">
        <p className="text-xs text-slate-500 leading-normal">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg font-semibold text-slate-900 leading-tight">{value}</p>
          {unit ? <span className="text-xs text-slate-400">{unit}</span> : null}
        </div>
      </div>
    </article>
  );
}
