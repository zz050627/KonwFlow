import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { menuGroups } from "@/features/admin/config/menuConfig";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ingestion: true,
    intent: true
  });

  const isIngestionActive = location.pathname.startsWith("/admin/ingestion");
  const isIntentActive =
    location.pathname.startsWith("/admin/intent-tree") ||
    location.pathname.startsWith("/admin/intent-list");

  useEffect(() => {
    setOpenGroups((prev) => ({
      ...prev,
      ingestion: prev.ingestion || isIngestionActive,
      intent: prev.intent || isIntentActive
    }));
  }, [isIngestionActive, isIntentActive]);

  const isLeafActive = (path: string, search?: string) => {
    if (location.pathname !== path && !location.pathname.startsWith(`${path}/`)) {
      return false;
    }
    if (search) return location.search === search;
    return true;
  };

  return (
    <aside className={cn("flex w-64 flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-xl text-slate-400 transition-[width] duration-200", collapsed && "w-16")}>
      <div className="px-5 pb-4 pt-6">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-teal-500 text-sm font-semibold text-white shadow-glow-sm">K</div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-slate-100">KnowFlow 管理后台</h1>
              <p className="text-xs text-slate-500">Admin Console</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-4 px-2 pb-4">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {!collapsed && (
              <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">{group.title}</p>
            )}
            <div className="space-y-1">
              {group.items.flatMap((item) => {
                if (!item.children || item.children.length === 0) {
                  const Icon = item.icon;
                  const isActive = isLeafActive(item.path, item.search);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06] hover:text-slate-200",
                        isActive && "bg-violet-500/12 text-slate-100 border border-violet-500/20",
                        collapsed && "justify-center"
                      )}
                    >
                      <span className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-transparent transition-colors", isActive && "bg-violet-400")} />
                      <Icon className={cn("h-4 w-4 text-slate-500 group-hover:text-slate-400", isActive && "text-violet-300")} />
                      {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
                    </Link>
                  );
                }

                const isGroupActive = item.children.some((c) => isLeafActive(c.path, c.search));
                const groupId = item.id as string;
                const isOpen = openGroups[groupId];

                if (collapsed) {
                  return item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isActive = isLeafActive(child.path, child.search);
                    return (
                      <Link
                        key={child.label}
                        to={`${child.path}${child.search || ""}`}
                        title={child.label}
                        className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06] hover:text-slate-200", isActive && "bg-violet-500/12 text-slate-100 border border-violet-500/20", "justify-center")}
                      >
                        <span className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-transparent", isActive && "bg-violet-400")} />
                        <ChildIcon className={cn("h-4 w-4 text-slate-500 group-hover:text-slate-400", isActive && "text-violet-300")} />
                        <span className="sr-only">{child.label}</span>
                      </Link>
                    );
                  });
                }

                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200",
                        isGroupActive && "bg-white/[0.04] text-slate-200"
                      )}
                    >
                      <span className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-transparent", isGroupActive && "bg-white/20")} />
                      <item.icon className={cn("h-4 w-4 text-slate-500 group-hover:text-slate-400", isGroupActive && "text-slate-300")} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                    {isOpen ? (
                      <div className="ml-6 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isActive = isLeafActive(child.path, child.search);
                          return (
                            <Link
                              key={child.label}
                              to={`${child.path}${child.search || ""}`}
                              className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/[0.06] hover:text-slate-200", isActive && "bg-violet-500/12 text-slate-100 border border-violet-500/20")}
                            >
                              <span className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-transparent", isActive && "bg-violet-400")} />
                              <ChildIcon className={cn("h-4 w-4 text-slate-500 group-hover:text-slate-400", isActive && "text-violet-300")} />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-2 px-4 pb-5">
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] py-2 text-xs text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300" onClick={onToggleCollapse}>
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span>收起侧边栏</span>}
        </button>
      </div>
    </aside>
  );
}
