import * as React from "react";
import { Eye, EyeOff, Lock, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useAuthStore } from "@/features/auth/stores/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [form, setForm] = React.useState({ username: "admin", password: "admin" });
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.username.trim() || !form.password.trim()) {
      setError("请输入用户名和密码。");
      return;
    }
    try {
      await login(form.username.trim(), form.password.trim());
      if (!remember) {
        // 如需仅在内存中保存登录态，可在此扩展。
      }
      navigate("/chat");
    } catch (err) {
      setError((err as Error).message || "登录失败，请稍后重试。");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Dark background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#080b14] via-[#0a0e1a] to-[#0d1020]" />
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 [background-size:40px_40px]" />
      {/* Gradient orbs */}
      <div className="absolute -top-32 right-[-40px] h-72 w-72 rounded-full bg-gradient-radial from-violet-500/20 via-transparent to-transparent blur-3xl" />
      <div className="absolute -bottom-36 left-[-80px] h-80 w-80 rounded-full bg-gradient-radial from-cyan-500/15 via-transparent to-transparent blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-glass backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            KnowFlow · 知流
          </div>
          <p className="font-display text-2xl font-semibold text-slate-100">登录 KnowFlow</p>
          <p className="mt-1 text-sm text-slate-500">
            企业知识库智能问答平台
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              用户名
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="请输入用户名"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                className="pl-10 border-white/[0.1] bg-white/[0.04] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/40 focus:ring-violet-500/20"
                autoComplete="username"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="pl-10 pr-10 border-white/[0.1] bg-white/[0.04] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/40 focus:ring-violet-500/20"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="显示或隐藏密码"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-400">
              <Checkbox checked={remember} onCheckedChange={(value) => setRemember(Boolean(value))} />
              记住我
            </label>
            <span className="text-xs text-slate-600">KnowFlow · 企业知识库</span>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full bg-gradient-to-r from-violet-500 to-teal-500 hover:from-violet-400 hover:to-teal-400 text-white border-0" disabled={isLoading}>
            {isLoading ? "正在登录..." : "登录"}
          </Button>
        </form>
      </div>
    </div>
  );
}
