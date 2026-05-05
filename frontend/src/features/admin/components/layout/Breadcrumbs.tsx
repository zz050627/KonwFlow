import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import { breadcrumbMap } from "@/features/admin/config/menuConfig";

export function Breadcrumbs() {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const items: { label: string; to?: string }[] = [
      { label: "首页", to: "/admin/dashboard" }
    ];

    if (segments[0] !== "admin") return items;
    const section = segments[1];

    if (section) {
      if (section === "intent-tree" || section === "intent-list") {
        items.push({ label: "意图管理", to: "/admin/intent-tree" });
        if (section === "intent-list" && segments.includes("edit")) {
          items.push({ label: breadcrumbMap[section] || section, to: "/admin/intent-list" });
          items.push({ label: "编辑节点" });
        } else {
          items.push({ label: breadcrumbMap[section] || section });
        }
      } else {
        items.push({ label: breadcrumbMap[section] || section, to: `/admin/${section}` });
      }
    }

    if (section === "ingestion") {
      const tab = new URLSearchParams(location.search).get("tab");
      if (tab === "tasks") items.push({ label: "流水线任务" });
      else if (tab === "pipelines") items.push({ label: "流水线管理" });
    }
    if (section === "knowledge" && segments.length > 2) items.push({ label: "文档管理" });
    if (section === "knowledge" && segments.includes("docs")) items.push({ label: "切片管理" });
    if (section === "traces" && segments.length > 2) items.push({ label: "链路详情" });

    return items;
  }, [location.pathname, location.search]);

  return (
    <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500" aria-label="面包屑">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.to && !isLast ? (
              <Link to={item.to} className="transition-colors hover:text-slate-300">{item.label}</Link>
            ) : (
              <span className={isLast ? "text-slate-300" : undefined}>{item.label}</span>
            )}
            {!isLast && <span className="text-slate-700">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
