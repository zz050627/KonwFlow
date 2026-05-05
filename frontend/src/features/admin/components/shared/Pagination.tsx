import { Button } from "@/shared/components/ui/button";

interface PaginationProps {
  current: number;
  pages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ current, pages, total, onPrev, onNext }: PaginationProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
      <span>共 {total} 条</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={current <= 1} onClick={onPrev}>
          上一页
        </Button>
        <span>
          {current} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={current >= pages} onClick={onNext}>
          下一页
        </Button>
      </div>
    </div>
  );
}
