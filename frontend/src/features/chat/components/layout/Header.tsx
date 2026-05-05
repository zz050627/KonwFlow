import * as React from "react";
import { Menu, Moon, Sun } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { useThemeStore } from "@/shared/stores/themeStore";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { currentSessionId, sessions } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();

  const currentSession = React.useMemo(
    () => sessions.find((session) => session.id === currentSessionId),
    [sessions, currentSessionId]
  );

  return (
    <header className="sticky top-0 z-20 glass">
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label="切换侧边栏"
            className="text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <p className="text-base font-medium text-slate-100">
            {currentSession?.title || "新对话"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
