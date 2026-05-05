import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, KeyRound, LogOut, Menu, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/shared/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Avatar } from "@/shared/components/Avatar";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { changePassword } from "@/features/admin/services/userService";
import {
  getKnowledgeBases, searchKnowledgeDocuments,
  type KnowledgeBase, type KnowledgeDocumentSearchItem
} from "@/features/admin/services/knowledgeService";

interface AdminTopbarProps {
  onToggleSidebar: () => void;
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "", newPassword: "", confirmPassword: ""
  });
  const [kbQuery, setKbQuery] = useState("");
  const [kbOptions, setKbOptions] = useState<KnowledgeBase[]>([]);
  const [docOptions, setDocOptions] = useState<KnowledgeDocumentSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const avatarUrl = user?.avatar?.trim();
  const showAvatar = Boolean(avatarUrl);
  const roleLabel = user?.role === "admin" ? "管理员" : "成员";
  const hasQuery = kbQuery.trim().length > 0;
  const showSuggest = searchFocused && hasQuery;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!searchFocused) return;
    const keyword = kbQuery.trim();
    if (!keyword) {
      setKbOptions([]);
      setDocOptions([]);
      setSearchLoading(false);
      return;
    }
    let active = true;
    const handle = window.setTimeout(() => {
      setSearchLoading(true);
      Promise.all([getKnowledgeBases(1, 6, keyword), searchKnowledgeDocuments(keyword, 6)])
        .then(([kbData, docData]) => {
          if (!active) return;
          setKbOptions(kbData || []);
          setDocOptions(docData || []);
        })
        .catch(() => {
          if (active) { setKbOptions([]); setDocOptions([]); }
        })
        .finally(() => { if (active) setSearchLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(handle); };
  }, [kbQuery, searchFocused]);

  const handleSearchSelect = (kb: KnowledgeBase) => {
    searchInputRef.current?.blur();
    navigate(`/admin/knowledge/${kb.id}`);
    setSearchFocused(false);
    setKbQuery("");
    setKbOptions([]);
    setDocOptions([]);
  };

  const handleDocumentSelect = (doc: KnowledgeDocumentSearchItem) => {
    searchInputRef.current?.blur();
    navigate(`/admin/knowledge/${doc.kbId}/docs/${doc.id}`);
    setSearchFocused(false);
    setKbQuery("");
    setKbOptions([]);
    setDocOptions([]);
  };

  const handleSearchFocus = () => {
    if (blurTimeoutRef.current) { window.clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    setSearchFocused(true);
  };

  const handleSearchBlur = () => {
    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = window.setTimeout(() => setSearchFocused(false), 150);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (kbOptions.length > 0) { handleSearchSelect(kbOptions[0]); return; }
      if (docOptions.length > 0) { handleDocumentSelect(docOptions[0]); return; }
      if (kbQuery.trim()) {
        searchInputRef.current?.blur();
        navigate(`/admin/knowledge?name=${encodeURIComponent(kbQuery.trim())}`);
        setSearchFocused(false);
        return;
      }
    }
    if (event.key === "Escape") { searchInputRef.current?.blur(); setSearchFocused(false); }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("请输入当前密码和新密码"); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入的新密码不一致"); return;
    }
    try {
      setPasswordSubmitting(true);
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success("密码已更新");
      setPasswordOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error((error as Error).message || "修改密码失败");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]" onClick={onToggleSidebar} aria-label="切换侧边栏">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative w-full max-w-[420px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                ref={searchInputRef}
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                name="kb-search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="筛选知识库..."
                className="pl-10 pr-16 border-white/[0.1] bg-white/[0.04] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/40 focus:ring-violet-500/20"
              />
              {showSuggest ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-white/[0.1] bg-[#0f1423]/95 p-1 shadow-lg backdrop-blur-xl" onMouseDown={(e) => e.preventDefault()}>
                  {searchLoading && kbOptions.length === 0 && docOptions.length === 0 ? (
                    <div className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/[0.06]">搜索中...</div>
                  ) : null}
                  {kbOptions.length > 0 ? (
                    <div className="[&+&]:mt-1 [&+&]:border-t [&+&]:border-white/[0.06] [&+&]:pt-1">
                      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-500">知识库</div>
                      {kbOptions.map((kb) => (
                        <button key={kb.id} type="button" onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(kb); }} className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/[0.06]">
                          <span className="font-medium text-slate-200">{kb.name}</span>
                          <span className="text-xs text-slate-500">{kb.collectionName || "未设置 Collection"}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {docOptions.length > 0 ? (
                    <div className="[&+&]:mt-1 [&+&]:border-t [&+&]:border-white/[0.06] [&+&]:pt-1">
                      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-500">文档</div>
                      {docOptions.map((doc) => (
                        <button key={doc.id} type="button" onMouseDown={(e) => { e.preventDefault(); handleDocumentSelect(doc); }} className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/[0.06]">
                          <span className="font-medium text-slate-200">{doc.docName}</span>
                          <span className="text-xs text-slate-500">{doc.kbName || `知识库 ${doc.kbId}`}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!searchLoading && kbOptions.length === 0 && docOptions.length === 0 ? (
                    <div className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/[0.06]">暂无匹配结果</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden items-center gap-2 sm:inline-flex border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-slate-100" onClick={() => navigate("/chat")}>
              <MessageSquare className="h-4 w-4" />
              返回聊天
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-sm text-slate-300 backdrop-blur-sm" aria-label="用户菜单">
                  <Avatar name={user?.username || "管理员"} src={showAvatar ? avatarUrl : undefined} className="h-8 w-8 border-violet-500/20 bg-violet-500/10 text-xs font-semibold text-violet-300" />
                  <span className="hidden sm:inline">{user?.username || "管理员"}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-44 border-white/[0.1] bg-[#0f1423]/95 backdrop-blur-xl">
                <div className="px-3 py-2 text-xs text-slate-500">{user?.username || "管理员"} · {roleLabel}</div>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={() => setPasswordOpen(true)} className="text-slate-300 focus:text-slate-100 focus:bg-white/[0.06]">
                  <KeyRound className="mr-2 h-4 w-4" />
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={passwordOpen} onOpenChange={(open) => {
        setPasswordOpen(open);
        if (!open) setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>请输入当前密码与新密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">当前密码</label>
              <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="请输入当前密码" name="current-password" autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">新密码</label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="请输入新密码" name="new-password" autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">确认新密码</label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="再次输入新密码" name="confirm-new-password" autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>取消</Button>
            <Button onClick={handlePasswordSubmit} disabled={passwordSubmitting}>{passwordSubmitting ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
