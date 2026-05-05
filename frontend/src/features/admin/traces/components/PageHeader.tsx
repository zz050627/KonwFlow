import type { ReactNode } from "react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

export type TraceHeaderKpi = {
  key: string;
  icon: ReactNode;
  label: string;
  value: string;
};

const kpiVariants: Record<string, {
  accent: string;
  bg: string;
  border: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  labelColor: string;
}> = {
  runs: {
    accent: "before:bg-blue-600",
    bg: "bg-gradient-to-b from-white to-blue-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    iconBorder: "border-blue-200",
    iconColor: "text-blue-700",
    labelColor: "text-blue-500",
  },
  p95: {
    accent: "before:bg-amber-600",
    bg: "bg-gradient-to-b from-white to-amber-50",
    border: "border-amber-300",
    iconBg: "bg-amber-100",
    iconBorder: "border-amber-300",
    iconColor: "text-amber-700",
    labelColor: "text-amber-600",
  },
  successrate: {
    accent: "before:bg-emerald-600",
    bg: "bg-gradient-to-b from-white to-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    iconBorder: "border-emerald-200",
    iconColor: "text-emerald-700",
    labelColor: "text-teal-700",
  },
};

const kpiDefault = {
  accent: "before:bg-slate-500",
  bg: "bg-gradient-to-b from-white to-slate-50",
  border: "border-slate-300",
  iconBg: "bg-slate-100",
  iconBorder: "border-slate-200",
  iconColor: "text-slate-500",
  labelColor: "text-slate-500",
};

interface PageHeaderProps {
  tag: string;
  title: string;
  description: string;
  kpis?: TraceHeaderKpi[];
  actions?: ReactNode;
  meta?: ReactNode;
}

export function TracePageHeader({ tag, title, description, kpis = [], actions, meta }: PageHeaderProps) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <CardContent className="flex min-h-[84px] items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-normal">{tag}</p>
          <h1 className="text-[22px] font-semibold leading-tight text-slate-900">{title}</h1>
          <p className="max-w-[720px] text-sm text-slate-500 leading-normal">{description}</p>
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : kpis.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {kpis.map((kpi) => {
              const v = kpiVariants[kpi.key.toLowerCase()] ?? kpiDefault;
              return (
                <div
                  key={kpi.key}
                  className={cn(
                    "inline-flex min-h-[32px] items-center gap-2 rounded-lg border py-1 pl-2 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
                    "before:content-[''] before:w-[3px] before:h-5 before:rounded-full before:flex-shrink-0",
                    v.accent, v.bg, v.border
                  )}
                >
                  <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md border text-sm", v.iconBg, v.iconBorder, v.iconColor)}>
                    {kpi.icon}
                  </span>
                  <div className="truncate">
                    <p className={cn("text-[11px] font-medium leading-none", v.labelColor)}>{kpi.label}</p>
                    <p className="text-sm font-semibold text-slate-900 leading-normal">{kpi.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
