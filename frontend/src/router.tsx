import { Navigate, createBrowserRouter } from "react-router-dom";

import { LoginPage } from "@/features/auth/components/LoginPage";
import { ChatView as ChatPage } from "@/features/chat/components/ChatView";
import { NotFoundPage } from "@/shared/pages/NotFoundPage";
import { AdminShell as AdminLayout } from "@/features/admin/components/layout/AdminShell";
import { DashboardPage } from "@/features/admin/pages/dashboard/DashboardPage";
import { KnowledgeListPage } from "@/features/admin/pages/knowledge/KnowledgeListPage";
import { KnowledgeDocumentsPage } from "@/features/admin/pages/knowledge/KnowledgeDocumentsPage";
import { KnowledgeChunksPage } from "@/features/admin/pages/knowledge/KnowledgeChunksPage";
import { IntentTreePage } from "@/features/admin/pages/intent-tree/IntentTreePage";
import { IntentListPage } from "@/features/admin/pages/intent-tree/IntentListPage";
import { IntentEditPage } from "@/features/admin/pages/intent-tree/IntentEditPage";
import { IngestionPage } from "@/features/admin/pages/ingestion/IngestionPage";
import { RagTracePage } from "@/features/admin/traces/RagTracePage";
import { RagTraceDetailPage } from "@/features/admin/traces/RagTraceDetailPage";
import { SystemSettingsPage } from "@/features/admin/pages/settings/SystemSettingsPage";
import { SampleQuestionPage } from "@/features/admin/pages/sample-questions/SampleQuestionPage";
import { QueryTermMappingPage } from "@/features/admin/pages/query-term-mapping/QueryTermMappingPage";
import { UserListPage } from "@/features/admin/pages/users/UserListPage";
import { useAuthStore } from "@/features/auth/stores/authStore";

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

function RedirectIfAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }
  return children;
}

function HomeRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeRedirect />
  },
  {
    path: "/login",
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    )
  },
  {
    path: "/chat",
    element: (
      <RequireAuth>
        <ChatPage />
      </RequireAuth>
    )
  },
  {
    path: "/chat/:sessionId",
    element: (
      <RequireAuth>
        <ChatPage />
      </RequireAuth>
    )
  },
  {
    path: "/admin",
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />
      },
      {
        path: "dashboard",
        element: <DashboardPage />
      },
      {
        path: "knowledge",
        element: <KnowledgeListPage />
      },
      {
        path: "knowledge/:kbId",
        element: <KnowledgeDocumentsPage />
      },
      {
        path: "knowledge/:kbId/docs/:docId",
        element: <KnowledgeChunksPage />
      },
      {
        path: "intent-tree",
        element: <IntentTreePage />
      },
      {
        path: "intent-list",
        element: <IntentListPage />
      },
      {
        path: "intent-list/:id/edit",
        element: <IntentEditPage />
      },
      {
        path: "ingestion",
        element: <IngestionPage />
      },
      {
        path: "traces",
        element: <RagTracePage />
      },
      {
        path: "traces/:traceId",
        element: <RagTraceDetailPage />
      },
      {
        path: "settings",
        element: <SystemSettingsPage />
      },
      {
        path: "sample-questions",
        element: <SampleQuestionPage />
      },
      {
        path: "mappings",
        element: <QueryTermMappingPage />
      },
      {
        path: "users",
        element: <UserListPage />
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
