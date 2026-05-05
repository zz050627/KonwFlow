import type { ReactNode } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface FilterBarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  placeholder?: string;
  children?: ReactNode;
}

export function FilterBar({
  keyword,
  onKeywordChange,
  onSearch,
  onRefresh,
  placeholder = "搜索...",
  children
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder={placeholder}
          className="w-56 pl-9"
        />
      </div>
      <Button variant="outline" size="sm" onClick={onSearch}>
        搜索
      </Button>
      <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="刷新">
        <RefreshCw className="h-4 w-4" />
      </Button>
      {children}
    </div>
  );
}
