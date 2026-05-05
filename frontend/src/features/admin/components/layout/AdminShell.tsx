import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { cn } from "@/shared/lib/utils";
import { AdminSidebar } from "@/features/admin/components/layout/AdminSidebar";
import { AdminTopbar } from "@/features/admin/components/layout/AdminTopbar";
import { Breadcrumbs } from "@/features/admin/components/layout/Breadcrumbs";

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith("/admin/dashboard");

  return (
    <div className="admin-layout flex h-screen">
      <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />
      <div
        className={cn(
          "flex-1 flex min-h-screen flex-col overflow-auto bg-[#080b14]",
          isDashboardRoute && "dashboard-scroll-shell"
        )}
      >
        <AdminTopbar onToggleSidebar={() => setCollapsed((prev) => !prev)} />
        <div className="mx-auto w-full max-w-[1600px] px-8 py-8">
          <Breadcrumbs />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
