import * as React from "react";
import { Search, MessageSquare, Settings, Moon, Sun, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { useThemeStore } from "@/shared/stores/themeStore";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = React.useState("");
  const navigate = useNavigate();
  const { sessions, createSession, selectSession } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();

  const commands = React.useMemo(() => {
    const base = [
      {
        id: "new-chat",
        label: "新建对话",
        icon: MessageSquare,
        action: () => {
          createSession();
          onOpenChange(false);
        }
      },
      {
        id: "toggle-theme",
        label: theme === "dark" ? "切换到浅色模式" : "切换到深色模式",
        icon: theme === "dark" ? Sun : Moon,
        action: () => {
          toggleTheme();
          onOpenChange(false);
        }
      },
      {
        id: "settings",
        label: "系统设置",
        icon: Settings,
        action: () => {
          navigate("/admin/settings");
          onOpenChange(false);
        }
      }
    ];

    const sessionCommands = sessions.slice(0, 5).map(session => ({
      id: `session-${session.id}`,
      label: session.title || "未命名对话",
      icon: FileText,
      action: () => {
        selectSession(session.id);
        navigate(`/chat/${session.id}`);
        onOpenChange(false);
      }
    }));

    return [...base, ...sessionCommands];
  }, [sessions, theme, toggleTheme, createSession, selectSession, navigate, onOpenChange]);

  const filtered = React.useMemo(() => {
    if (!search) return commands;
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [commands, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] p-0 gap-0">
        <div className="flex items-center border-b border-white/[0.06] px-4 py-3">
          <Search className="h-5 w-5 text-slate-500 mr-3" />
          <input
            type="text"
            placeholder="搜索命令..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent text-slate-200 placeholder:text-slate-600"
            autoFocus
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={cmd.action}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] text-left transition text-slate-300"
            >
              <cmd.icon className="h-4 w-4 text-slate-500" />
              <span className="text-sm">{cmd.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-600">
              未找到匹配的命令
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
