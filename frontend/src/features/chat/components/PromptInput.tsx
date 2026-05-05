import * as React from "react";
import { Brain, Lightbulb, Send, Square } from "lucide-react";

import { cn } from "@/shared/lib/utils";

interface CommandDefinition {
  prefix: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  handler: (input: string) => void;
}

interface PromptInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  commands?: CommandDefinition[];
  showDeepThinking?: boolean;
  deepThinkingEnabled?: boolean;
  onDeepThinkingChange?: (enabled: boolean) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  minHeight?: number;
  focusKey?: number;
}

export function PromptInput({
  onSubmit,
  onCancel,
  isStreaming,
  commands = [],
  showDeepThinking = false,
  deepThinkingEnabled = false,
  onDeepThinkingChange,
  placeholder = "问我任何问题...",
  autoFocus = false,
  className,
  minHeight = 44,
  focusKey
}: PromptInputProps) {
  const [value, setValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const isComposingRef = React.useRef(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const focusInput = React.useCallback(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  React.useEffect(() => {
    if (focusKey) focusInput();
  }, [focusKey, focusInput]);

  React.useEffect(() => {
    if (autoFocus) focusInput();
  }, [autoFocus, focusInput]);

  const handleSubmit = () => {
    if (isStreaming) {
      onCancel?.();
      focusInput();
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) return;

    for (const cmd of commands) {
      if (trimmed.startsWith(cmd.prefix)) {
        setValue("");
        focusInput();
        cmd.handler(trimmed);
        return;
      }
    }

    setValue("");
    focusInput();
    onSubmit(trimmed);
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative flex flex-col rounded-2xl border bg-white/[0.04] backdrop-blur-xl px-4 pt-3 pb-2 transition-all duration-200",
          isFocused
            ? "border-violet-500/30 shadow-glow-sm bg-white/[0.06]"
            : "border-white/[0.08] hover:border-white/[0.12]"
        )}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={deepThinkingEnabled ? "输入需要深度推理的问题..." : placeholder}
            className="max-h-40 w-full resize-none border-0 bg-transparent px-2 pt-2 pb-2 pr-2 text-[15px] text-slate-200 shadow-none placeholder:text-slate-600 focus:outline-none"
            style={{ minHeight }}
            rows={1}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                const native = e.nativeEvent as KeyboardEvent;
                if (native.isComposing || isComposingRef.current || native.keyCode === 229) return;
                e.preventDefault();
                handleSubmit();
              }
            }}
            aria-label="聊天输入框"
          />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[10px] bg-gradient-to-b from-transparent via-[#080b14]/40 to-[#080b14]/80" />
        </div>
        <div className="relative mt-2 flex items-center">
          {showDeepThinking && onDeepThinkingChange ? (
            <button
              type="button"
              onClick={() => onDeepThinkingChange(!deepThinkingEnabled)}
              disabled={isStreaming}
              aria-pressed={deepThinkingEnabled}
              className={cn(
                "absolute left-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                deepThinkingEnabled
                  ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
                  : "border-transparent bg-white/[0.06] text-slate-500 hover:bg-white/[0.08] hover:text-slate-400",
                isStreaming && "cursor-not-allowed opacity-60"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Brain className={cn("h-3.5 w-3.5", deepThinkingEnabled && "text-violet-300")} />
                深度思考
                {deepThinkingEnabled ? (
                  <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                ) : null}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasContent && !isStreaming}
            aria-label={isStreaming ? "停止生成" : "发送消息"}
            className={cn(
              "ml-auto rounded-full p-2.5 transition-all duration-200",
              isStreaming
                ? "bg-red-500/15 text-red-400 hover:bg-red-500/20"
                : hasContent
                  ? "bg-gradient-to-r from-violet-500 to-teal-500 text-white hover:from-violet-400 hover:to-teal-400 shadow-glow-sm"
                  : "cursor-not-allowed bg-white/[0.06] text-slate-600"
            )}
          >
            {isStreaming ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {showDeepThinking && deepThinkingEnabled ? (
        <p className="text-xs text-violet-300">
          <span className="inline-flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            深度推理已开启，AI 将进行多步分析与推演
          </span>
        </p>
      ) : null}
      <p className="text-center text-xs text-slate-600">
        <kbd className="rounded bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 text-slate-400">Enter</kbd> 发送
        <span className="px-1.5">·</span>
        <kbd className="rounded bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 text-slate-400">Shift + Enter</kbd>{" "}
        换行
        {isStreaming ? <span className="ml-2 animate-pulse-soft text-violet-300">生成中...</span> : null}
      </p>
    </div>
  );
}
