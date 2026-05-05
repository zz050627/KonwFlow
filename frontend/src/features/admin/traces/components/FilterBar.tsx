import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { STATUS_OPTIONS, type TraceFilters, type TraceStatus } from "@/features/admin/traces/traceUtils";

interface TraceFilterBarProps {
  filters: TraceFilters;
  onFiltersChange: (next: Partial<TraceFilters>) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onReset: () => void;
}

const controlClass = "h-9 rounded-lg border-slate-200 bg-white text-sm placeholder:text-slate-400";

export function TraceFilterBar({ filters, onFiltersChange, onSearch, onRefresh, onReset }: TraceFilterBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          <Input
            className={controlClass}
            value={filters.traceId}
            onChange={(event) => onFiltersChange({ traceId: event.target.value })}
            placeholder="按 Trace Id 过滤"
          />
          <Input
            className={controlClass}
            value={filters.conversationId}
            onChange={(event) => onFiltersChange({ conversationId: event.target.value })}
            placeholder="按会话 ID 过滤"
          />
          <Input
            className={controlClass}
            value={filters.taskId}
            onChange={(event) => onFiltersChange({ taskId: event.target.value })}
            placeholder="按 Task ID 过滤"
          />
          <Select
            value={filters.status || "__all__"}
            onValueChange={(value) => {
              const nextStatus = value === "__all__" ? "" : (value as TraceStatus);
              onFiltersChange({ status: nextStatus });
            }}
          >
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value || "__all__"} value={option.value || "__all__"}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <Button className="rounded-lg px-3 text-sm text-slate-500 hover:text-slate-700" variant="ghost" onClick={onReset}>
                重置
              </Button>
              <Button className="rounded-lg px-3 text-sm" variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
              <Button className="rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-3 text-sm text-white hover:from-[#4338CA] hover:to-[#6D28D9]" onClick={onSearch}>
                <Search className="h-4 w-4" />
                查询
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
