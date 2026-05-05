import * as React from "react";
import { Sparkles, Upload } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useStreamStore } from "@/features/chat/stores/streamStore";

interface FunctionPanelProps {
  onUpload?: () => void;
}

export function FunctionPanel({ onUpload }: FunctionPanelProps) {
  const deepThinkingEnabled = useStreamStore((s) => s.deepThinkingEnabled);
  const setDeepThinkingEnabled = useStreamStore((s) => s.setDeepThinkingEnabled);
  const selectedModelId = useStreamStore((s) => s.selectedModelId);
  const setSelectedModelId = useStreamStore((s) => s.setSelectedModelId);
  const [localSelectedModel, setLocalSelectedModel] = React.useState("qwen2.5-ollama");

  React.useEffect(() => {
    if (localSelectedModel !== selectedModelId) {
      setSelectedModelId(localSelectedModel);
    }
  }, [localSelectedModel, selectedModelId, setSelectedModelId]);

  const models = [{ id: "qwen2.5-ollama", name: "Qwen 2.5 (本地)", description: "本地默认" }];

  return (
    <aside className="hidden lg:flex w-[280px] flex-shrink-0 flex-col border-l border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">功能面板</h3>
        <p className="mt-1 text-xs text-slate-500">快速操作与设置</p>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={onUpload}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] p-4 text-left transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/12">
            <Upload className="h-5 w-5 text-violet-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">上传文件</p>
            <p className="text-xs text-slate-500">PDF, TXT, Java...</p>
          </div>
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-slate-400">选择模型</label>
        <div className="space-y-2">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => setLocalSelectedModel(model.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-all",
                localSelectedModel === model.id
                  ? "border-violet-500/30 bg-violet-500/12"
                  : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.12]"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2",
                  localSelectedModel === model.id ? "border-violet-400" : "border-slate-600"
                )}
              >
                {localSelectedModel === model.id && <div className="h-2 w-2 rounded-full bg-violet-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">{model.name}</p>
                <p className="text-xs text-slate-500">{model.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-slate-400">高级选项</label>
        <button
          type="button"
          onClick={() => setDeepThinkingEnabled(!deepThinkingEnabled)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border p-3 transition-all",
            deepThinkingEnabled ? "border-violet-500/30 bg-violet-500/12" : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.12]"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={cn("h-4 w-4", deepThinkingEnabled ? "text-violet-300" : "text-slate-500")} />
            <span className="text-sm font-medium text-slate-200">深度思考</span>
          </div>
          <div
            className={cn(
              "h-5 w-9 rounded-full transition-colors",
              deepThinkingEnabled ? "bg-violet-500" : "bg-white/[0.1]"
            )}
          >
            <div
              className={cn(
                "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                deepThinkingEnabled ? "translate-x-4" : "translate-x-0"
              )}
            />
          </div>
        </button>
      </div>

      <div className="mt-auto rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        <p className="mb-2 text-xs font-medium text-slate-400">快捷指令</p>
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <code className="rounded bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 text-slate-400">/upload</code>
            <span>上传文件</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 text-slate-400">#关键字</code>
            <span>关键字搜索</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 text-slate-400">@模型</code>
            <span>切换模型</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
