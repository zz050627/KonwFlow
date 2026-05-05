import {
  ClipboardList,
  Database,
  GitBranch,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Settings,
  Upload,
  Users,
  FolderKanban,
  KeyRound,
  Workflow
} from "lucide-react";

export type MenuChild = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  search?: string;
};

export type MenuItem = {
  id?: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  search?: string;
  children?: MenuChild[];
};

export type MenuGroup = {
  title: string;
  items: MenuItem[];
};

export const menuGroups: MenuGroup[] = [
  {
    title: "知识管理",
    items: [
      { path: "/admin/knowledge", label: "知识库管理", icon: Database },
      {
        id: "ingestion",
        path: "/admin/ingestion",
        label: "数据管道",
        icon: Upload,
        children: [
          { path: "/admin/ingestion", label: "流水线管理", icon: FolderKanban, search: "?tab=pipelines" },
          { path: "/admin/ingestion", label: "流水线任务", icon: ClipboardList, search: "?tab=tasks" }
        ]
      },
      { path: "/admin/mappings", label: "关键词映射", icon: KeyRound }
    ]
  },
  {
    title: "智能配置",
    items: [
      {
        id: "intent",
        path: "/admin/intent-tree",
        label: "意图管理",
        icon: Layers,
        children: [
          { path: "/admin/intent-tree", label: "意图树配置", icon: GitBranch },
          { path: "/admin/intent-list", label: "意图列表", icon: ClipboardList }
        ]
      },
      { path: "/admin/sample-questions", label: "推荐问答", icon: Lightbulb }
    ]
  },
  {
    title: "运维监控",
    items: [
      { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/admin/traces", label: "RAG 链路追踪", icon: Workflow }
    ]
  },
  {
    title: "系统管理",
    items: [
      { path: "/admin/users", label: "用户管理", icon: Users },
      { path: "/admin/settings", label: "系统设置", icon: Settings }
    ]
  }
];

export const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  knowledge: "知识库管理",
  "intent-tree": "意图树配置",
  "intent-list": "意图列表",
  ingestion: "数据通道",
  traces: "链路追踪",
  "sample-questions": "示例问题",
  mappings: "关键词映射",
  settings: "系统设置",
  users: "用户管理"
};
