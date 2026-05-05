import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { ChevronRight, Eye } from "lucide-react";
import type { RagTraceRun } from "@/features/admin/services/ragTraceService";
import {
  formatDateTime,
  formatDuration,
  statusBadgeVariant,
  statusLabel
} from "@/features/admin/traces/traceUtils";

const headClass = "h-[44px] px-3 text-xs font-semibold text-slate-500 bg-slate-50/60 border-b border-slate-200";
const cellClass = "h-12 px-3 text-sm text-slate-700";

const statusChipClasses: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-rose-50 text-rose-600 border-rose-200",
  running: "bg-blue-50 text-blue-600 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

interface RunsTableProps {
  runs: RagTraceRun[];
  loading: boolean;
  current: number;
  pages: number;
  total: number;
  onOpenRun: (traceId: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function RunsTable({
  runs,
  loading,
  current,
  pages,
  total,
  onOpenRun,
  onPrevPage,
  onNextPage
}: RunsTableProps) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="border-b border-slate-200 px-4 pt-4 pb-3">
        <h2 className="text-base font-semibold text-slate-900">运行列表</h2>
        <p className="mt-0.5 text-xs text-slate-500">按时间倒序查看运行记录，通过操作按钮进入独立详情页</p>
      </div>
      <CardContent className="px-4 pt-0 pb-4">
        {loading ? (
          <div className="flex min-h-[140px] items-center justify-center text-sm text-slate-400">加载中...</div>
        ) : runs.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center text-sm text-slate-400">暂无链路数据</div>
        ) : (
          <div className="min-h-0 overflow-x-auto overflow-y-visible">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className={headClass + " w-[200px]"}>Trace Name</TableHead>
                  <TableHead className={headClass + " w-[180px]"}>Trace Id</TableHead>
                  <TableHead className={headClass + " w-[220px]"}>会话ID / TaskID</TableHead>
                  <TableHead className={headClass + " w-[110px]"}>用户名</TableHead>
                  <TableHead className={headClass + " w-[90px]"}>耗时</TableHead>
                  <TableHead className={headClass + " w-[90px]"}>状态</TableHead>
                  <TableHead className={headClass}>执行时间</TableHead>
                  <TableHead className={headClass + " w-[130px] text-center"}>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.traceId} className="border-slate-100 transition hover:bg-slate-50/60">
                    <TableCell className={cellClass + " w-[200px]"}>
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900" title={run.traceName || "-"}>
                          {run.traceName || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className={cellClass + " w-[180px]"}>
                      <span className="block max-w-[160px] truncate font-mono text-xs text-slate-500" title={run.traceId}>
                        {run.traceId}
                      </span>
                    </TableCell>
                    <TableCell className={cellClass + " w-[220px]"}>
                      <p className="truncate text-xs text-slate-600" title={`会话ID: ${run.conversationId || "-"}`}>
                        {run.conversationId || "-"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400" title={`TaskID: ${run.taskId || "-"}`}>
                        {run.taskId || "-"}
                      </p>
                    </TableCell>
                    <TableCell className={cellClass + " w-[110px]"}>
                      <span
                        className="block max-w-[100px] truncate text-sm text-slate-700"
                        title={run.userName || run.username || run.userId || "-"}
                      >
                        {run.userName || run.username || run.userId || "-"}
                      </span>
                    </TableCell>
                    <TableCell className={cellClass + " w-[90px] text-xs text-slate-500 tabular-nums"}>
                      {formatDuration(run.durationMs ?? undefined)}
                    </TableCell>
                    <TableCell className={cellClass + " w-[90px]"}>
                      <Badge
                        className={
                          "rounded-md border px-2 py-0.5 text-[11px] font-semibold " +
                          (statusChipClasses[run.status ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200")
                        }
                        variant="outline"
                      >
                        {statusLabel(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className={cellClass + " text-xs text-slate-500"}>
                      {formatDateTime(run.startTime ?? undefined)}
                    </TableCell>
                    <TableCell className={cellClass + " w-[130px] text-center"}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        onClick={() => onOpenRun(run.traceId)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        查看链路
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <span className="text-xs text-slate-500">
            第 {current} / {pages} 页，共 {total.toLocaleString("zh-CN")} 条
          </span>
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 min-w-[82px]"
              variant="outline"
              disabled={current <= 1 || loading}
              onClick={onPrevPage}
            >
              上一页
            </Button>
            <Button
              className="rounded-full border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 min-w-[82px]"
              variant="outline"
              disabled={current >= pages || loading}
              onClick={onNextPage}
            >
              下一页
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
