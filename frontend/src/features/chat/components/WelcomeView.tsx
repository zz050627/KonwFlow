import * as React from "react";
import { ArrowUpRight, Bot, Lightbulb, BookOpen, Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { PromptInput } from "@/features/chat/components/PromptInput";
import { listSampleQuestions } from "@/features/admin/services/sampleQuestionService";

type PromptPreset = {
  id?: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRESET_ICONS = [BookOpen, Check, Lightbulb];

const DEFAULT_PRESETS: PromptPreset[] = [
  {
    title: "制度查询",
    description: "快速查找公司制度、流程与规范",
    prompt: "请帮我查找以下制度相关的规定：",
    icon: BookOpen
  },
  {
    title: "技术答疑",
    description: "针对技术栈与架构问题给出参考方案",
    prompt: "请针对以下技术问题给出分析与建议：",
    icon: Check
  },
  {
    title: "会议纪要",
    description: "自动提炼会议要点与待办事项",
    prompt: "请提炼以下会议内容的关键要点与待办事项：",
    icon: Lightbulb
  }
];

interface WelcomeViewProps {
  onSubmit: (content: string) => void;
  isStreaming: boolean;
  onCancel?: () => void;
  deepThinkingEnabled?: boolean;
  onDeepThinkingChange?: (enabled: boolean) => void;
}

export function WelcomeView({
  onSubmit,
  isStreaming,
  onCancel,
  deepThinkingEnabled = false,
  onDeepThinkingChange
}: WelcomeViewProps) {
  const [promptPresets, setPromptPresets] = React.useState<PromptPreset[]>(DEFAULT_PRESETS);

  React.useEffect(() => {
    let active = true;
    const loadPresets = async () => {
      const data = await listSampleQuestions().catch(() => null);
      if (!active || !data || data.length === 0) return;
      const mapped = data
        .filter((item) => item.question?.trim())
        .slice(0, 3)
        .map((item, index) => {
          const question = item.question!.trim();
          const title =
            item.title?.trim() ||
            (question.length > 12 ? `${question.slice(0, 12)}...` : question) ||
            `推荐问法 ${index + 1}`;
          return {
            id: item.id,
            title,
            description: item.description?.trim() || "直接点选即可开始对话",
            prompt: question,
            icon: PRESET_ICONS[index % PRESET_ICONS.length]
          };
        });
      if (mapped.length > 0) setPromptPresets(mapped);
    };
    loadPresets();
    return () => { active = false; };
  }, []);

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      {/* Dark base */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#080b14] via-[#0a0e1a] to-[#0d1020]"
      />
      {/* Grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-60 [background-size:40px_40px]"
      />
      {/* Gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-40px] h-72 w-72 rounded-full bg-gradient-radial from-violet-500/20 via-transparent to-transparent blur-3xl animate-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 left-[-80px] h-80 w-80 rounded-full bg-gradient-radial from-cyan-500/15 via-transparent to-transparent blur-3xl animate-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-radial from-indigo-500/8 via-transparent to-transparent blur-3xl"
      />

      <div className="relative w-full max-w-[860px]">
        <div
          className="text-center opacity-0 animate-fade-up"
          style={{ animationFillMode: "both" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 backdrop-blur-sm">
            <Bot className="h-3.5 w-3.5" />
            KnowFlow · 知流
          </span>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-slate-100 sm:text-5xl md:text-6xl">
            让企业知识，
            <span className="text-gradient">随问随答</span>
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            连接文档、数据库与业务系统，构建团队专属的 AI 问答中枢
          </p>
        </div>

        <div
          className="mt-10 opacity-0 animate-fade-up"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <PromptInput
            onSubmit={onSubmit}
            onCancel={onCancel}
            isStreaming={isStreaming}
            showDeepThinking
            deepThinkingEnabled={deepThinkingEnabled}
            onDeepThinkingChange={onDeepThinkingChange}
            autoFocus
            placeholder="问我任何问题..."
          />
        </div>

        <div
          className="mt-10 opacity-0 animate-fade-up"
          style={{ animationDelay: "160ms", animationFillMode: "both" }}
        >
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-600">
            <span className="h-px w-8 bg-white/[0.08]" />
            快速开始
            <span className="h-px w-8 bg-white/[0.08]" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promptPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id ?? preset.title}
                  type="button"
                  onClick={() => {
                    if (isStreaming) return;
                    onSubmit(preset.prompt);
                  }}
                  disabled={isStreaming}
                  className={cn(
                    "group rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/25 hover:bg-white/[0.06] hover:shadow-glow-sm",
                    isStreaming && "cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/12 text-violet-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{preset.title}</p>
                      <p className="text-xs text-slate-500">{preset.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-600">
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition-colors group-hover:text-violet-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
