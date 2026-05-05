import * as React from "react";
import { Brain, ChevronDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";

interface ThinkingCardProps {
  content?: string;
  duration?: number;
  isStreaming?: boolean;
}

export function ThinkingCard({ content, duration, isStreaming }: ThinkingCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const hasContent = Boolean(content && content.trim().length > 0);
  const durationLabel = duration ? `${duration}秒` : "";

  if (isStreaming) {
    return (
      <div className="thinking-card backdrop-blur-xl animate-[thinking-pulse_2s_ease-in-out_infinite] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
            <Brain className="h-4 w-4 text-violet-300 animate-pulse" />
          </div>
          <span className="text-sm font-medium text-violet-300">深度思考中...</span>
          {hasContent ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="ml-auto"
            >
              <ChevronDown
                className={cn("h-4 w-4 text-violet-400 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
        {expanded && hasContent ? (
          <div className="border-t border-violet-500/20 px-4 pb-4">
            <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-violet-200">
              {content}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (!hasContent) return null;

  return (
    <div className="thinking-card backdrop-blur-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-violet-500/8"
      >
        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
            <Brain className="h-4 w-4 text-violet-300" />
          </div>
          <span className="text-sm font-medium text-violet-300">深度思考</span>
          {durationLabel ? (
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
              {durationLabel}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-violet-400 transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded ? (
        <div className="border-t border-violet-500/20 px-4 pb-4">
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-violet-200">
            {content}
          </div>
        </div>
      ) : null}
    </div>
  );
}
