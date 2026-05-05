import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { MessageList } from "@/features/chat/components/MessageList";
import { MainLayout } from "@/features/chat/components/layout/MainLayout";
import { PromptInput } from "@/features/chat/components/PromptInput";
import { WelcomeView } from "@/features/chat/components/WelcomeView";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { useStreamStore } from "@/features/chat/stores/streamStore";

export function ChatView() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    messages,
    isLoading,
    currentSessionId,
    sessions,
    isCreatingNew,
    fetchSessions,
    selectSession,
    createSession,
    sendMessage,
    cancelGeneration
  } = useChatStore();
  const isStreaming = useStreamStore((s) => s.isStreaming);
  const deepThinkingEnabled = useStreamStore((s) => s.deepThinkingEnabled);
  const setDeepThinkingEnabled = useStreamStore((s) => s.setDeepThinkingEnabled);
  const inputFocusKey = useStreamStore((s) => s.inputFocusKey);

  const showWelcome = messages.length === 0 && !isLoading;
  const [sessionsReady, setSessionsReady] = React.useState(false);
  const sessionExists = React.useMemo(() => {
    if (!sessionId) return false;
    return sessions.some((session) => session.id === sessionId);
  }, [sessionId, sessions]);

  React.useEffect(() => {
    let active = true;
    fetchSessions()
      .catch(() => null)
      .finally(() => {
        if (active) setSessionsReady(true);
      });
    return () => { active = false; };
  }, [fetchSessions]);

  React.useEffect(() => {
    if (sessionId) {
      if (sessionsReady && !sessionExists) {
        createSession().catch(() => null);
        navigate("/chat", { replace: true });
        return;
      }
      selectSession(sessionId).catch(() => null);
      return;
    }
    if (!sessionsReady || isCreatingNew || currentSessionId) return;
    createSession().catch(() => null);
  }, [sessionId, sessionsReady, sessionExists, isCreatingNew, currentSessionId, selectSession, createSession, navigate]);

  React.useEffect(() => {
    if (currentSessionId && currentSessionId !== sessionId) {
      navigate(`/chat/${currentSessionId}`, { replace: true });
    }
  }, [currentSessionId, sessionId, navigate]);

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <div className="flex-1 min-h-0">
          {showWelcome ? (
            <WelcomeView
              onSubmit={sendMessage}
              isStreaming={isStreaming}
              onCancel={cancelGeneration}
              deepThinkingEnabled={deepThinkingEnabled}
              onDeepThinkingChange={setDeepThinkingEnabled}
            />
          ) : (
            <MessageList
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              sessionKey={currentSessionId}
            />
          )}
        </div>
        {!showWelcome ? (
          <div className="relative z-20">
            <div className="mx-auto max-w-[800px] px-6 pt-1 pb-4">
              <PromptInput
                onSubmit={sendMessage}
                onCancel={cancelGeneration}
                isStreaming={isStreaming}
                showDeepThinking
                deepThinkingEnabled={deepThinkingEnabled}
                onDeepThinkingChange={setDeepThinkingEnabled}
                focusKey={inputFocusKey}
                placeholder="问我任何问题..."
              />
            </div>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
