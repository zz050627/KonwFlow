import { create } from "zustand";
import { toast } from "sonner";

import type { CompletionPayload, FeedbackValue, Message, MessageDeltaPayload, Session } from "@/shared/types";
import {
  listMessages,
  listSessions,
  deleteSession as deleteSessionRequest,
  renameSession as renameSessionRequest
} from "@/features/chat/services/sessionService";
import { stopTask, submitFeedback } from "@/features/chat/services/chatService";
import { buildQuery } from "@/shared/lib/helpers";
import { createStreamResponse } from "@/features/chat/utils/sseParser";
import { computeThinkingDuration, useStreamStore } from "@/features/chat/stores/streamStore";
import { storage } from "@/shared/lib/storage";

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  sessionsLoaded: boolean;
  isCreatingNew: boolean;
  inputFocusKey: number;

  fetchSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => void;
  sendMessage: (content: string) => Promise<void>;
  cancelGeneration: () => void;
  appendStreamContent: (delta: string) => void;
  appendThinkingContent: (delta: string) => void;
  submitFeedback: (messageId: string, feedback: FeedbackValue) => Promise<void>;
  reset: () => void;
}

function mapVoteToFeedback(vote?: number | null): FeedbackValue {
  if (vote === 1) return "like";
  if (vote === -1) return "dislike";
  return null;
}

function upsertSession(sessions: Session[], next: Session) {
  const index = sessions.findIndex((session) => session.id === next.id);
  const updated = [...sessions];
  if (index >= 0) {
    updated[index] = { ...sessions[index], ...next };
  } else {
    updated.unshift(next);
  }
  return updated.sort((a, b) => {
    const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
    const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
    return timeB - timeA;
  });
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  sessionsLoaded: false,
  isCreatingNew: false,
  inputFocusKey: 0,

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const data = await listSessions();
      const sessions = data
        .map((item) => ({
          id: item.conversationId,
          title: item.title || "新对话",
          lastTime: item.lastTime
        }))
        .sort((a, b) => {
          const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
          const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
          return timeB - timeA;
        });
      set({ sessions });
    } catch (error) {
      toast.error((error as Error).message || "加载会话失败");
    } finally {
      set({ isLoading: false, sessionsLoaded: true });
    }
  },

  createSession: async () => {
    const state = get();
    if (state.messages.length === 0 && !state.currentSessionId) {
      set({
        isCreatingNew: true,
        isLoading: false
      });
      useStreamStore.getState().reset();
      useStreamStore.getState().setDeepThinkingEnabled(false);
      return "";
    }
    if (useStreamStore.getState().isStreaming) {
      get().cancelGeneration();
    }
    set({
      currentSessionId: null,
      messages: [],
      isLoading: false,
      isCreatingNew: true
    });
    useStreamStore.getState().reset();
    useStreamStore.getState().setDeepThinkingEnabled(false);
    return "";
  },

  deleteSession: async (sessionId) => {
    try {
      await deleteSessionRequest(sessionId);
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== sessionId),
        messages: state.currentSessionId === sessionId ? [] : state.messages,
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
      }));
      toast.success("删除成功");
    } catch (error) {
      toast.error((error as Error).message || "删除会话失败");
    }
  },

  renameSession: async (sessionId, title) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    try {
      await renameSessionRequest(sessionId, nextTitle);
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId ? { ...session, title: nextTitle } : session
        )
      }));
      toast.success("已重命名");
    } catch (error) {
      toast.error((error as Error).message || "重命名失败");
    }
  },

  selectSession: async (sessionId) => {
    if (!sessionId) return;
    if (get().currentSessionId === sessionId && get().messages.length > 0) return;
    if (useStreamStore.getState().isStreaming) {
      get().cancelGeneration();
    }
    set({
      isLoading: true,
      currentSessionId: sessionId,
      isCreatingNew: false
    });
    useStreamStore.setState({ thinkingStartAt: null });
    try {
      const data = await listMessages(sessionId);
      if (get().currentSessionId !== sessionId) return;
      const mapped: Message[] = data.map((item) => ({
        id: String(item.id),
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content,
        createdAt: item.createTime,
        feedback: mapVoteToFeedback(item.vote),
        status: "done"
      }));
      set({ messages: mapped });
    } catch (error) {
      toast.error((error as Error).message || "加载消息失败");
    } finally {
      if (get().currentSessionId !== sessionId) {
        set({ isLoading: false });
        return;
      }
      set({ isLoading: false });
      useStreamStore.getState().reset();
    }
  },

  updateSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, title } : session
      )
    }));
  },

  sendMessage: async (content) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const stream = useStreamStore.getState();
    if (stream.isStreaming) return;

    const deepThinkingEnabled = stream.deepThinkingEnabled;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      status: "done",
      createdAt: new Date().toISOString()
    };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      thinking: deepThinkingEnabled ? "" : undefined,
      isDeepThinking: deepThinkingEnabled,
      isThinking: deepThinkingEnabled,
      status: "streaming",
      feedback: null,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage]
    }));
    useStreamStore.getState().startStream(assistantId);

    const conversationId = get().currentSessionId;
    const selectedModelId = stream.selectedModelId;
    const query = buildQuery({
      question: trimmed,
      conversationId: conversationId || undefined,
      deepThinking: deepThinkingEnabled ? true : undefined,
      modelId: selectedModelId || undefined
    });
    const url = `${API_BASE_URL}/rag/v3/chat${query}`;
    const token = storage.getToken();

    const handlers = {
      onMeta: (payload: { conversationId: string; taskId: string }) => {
        if (useStreamStore.getState().streamingMessageId !== assistantId) return;
        const nextId = payload.conversationId || get().currentSessionId;
        if (!nextId) return;
        const lastTime = new Date().toISOString();
        const existing = get().sessions.find((session) => session.id === nextId);
        set((state) => ({
          currentSessionId: nextId,
          isCreatingNew: false,
          sessions: upsertSession(state.sessions, {
            id: nextId,
            title: existing?.title || "新对话",
            lastTime
          })
        }));
        useStreamStore.setState({ streamTaskId: payload.taskId });
        if (useStreamStore.getState().cancelRequested) {
          stopTask(payload.taskId).catch(() => null);
        }
      },
      onMessage: (payload: MessageDeltaPayload) => {
        if (!payload || typeof payload !== "object") return;
        if (payload.type !== "response") return;
        get().appendStreamContent(payload.delta);
      },
      onThinking: (payload: MessageDeltaPayload) => {
        if (!payload || typeof payload !== "object") return;
        if (payload.type !== "think") return;
        get().appendThinkingContent(payload.delta);
      },
      onReject: (payload: MessageDeltaPayload) => {
        if (!payload || typeof payload !== "object") return;
        get().appendStreamContent(payload.delta);
      },
      onFinish: (payload: CompletionPayload) => {
        if (useStreamStore.getState().streamingMessageId !== assistantId) return;
        if (!payload) return;
        if (payload.title && get().currentSessionId) {
          get().updateSessionTitle(get().currentSessionId as string, payload.title);
        }
        const currentId = get().currentSessionId;
        if (currentId) {
          const lastTime = new Date().toISOString();
          const existingTitle =
            get().sessions.find((session) => session.id === currentId)?.title || "新对话";
          const nextTitle = payload.title || existingTitle;
          set((state) => ({
            sessions: upsertSession(state.sessions, {
              id: currentId,
              title: nextTitle,
              lastTime
            })
          }));
        }
        const newId = payload.messageId ? String(payload.messageId) : undefined;
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === useStreamStore.getState().streamingMessageId
              ? {
                  ...message,
                  ...(newId ? { id: newId } : {}),
                  status: "done" as const,
                  isThinking: false,
                  thinkingDuration:
                    message.thinkingDuration ?? computeThinkingDuration(useStreamStore.getState().thinkingStartAt)
                }
              : message
          )
        }));
      },
      onCancel: (payload: CompletionPayload) => {
        if (useStreamStore.getState().streamingMessageId !== assistantId) return;
        if (payload?.title && get().currentSessionId) {
          get().updateSessionTitle(get().currentSessionId as string, payload.title);
        }
        set((state) => ({
          messages: state.messages.map((message) => {
            if (message.id !== useStreamStore.getState().streamingMessageId) return message;
            const suffix = message.content.includes("（已停止生成）")
              ? ""
              : "\n\n（已停止生成）";
            const nextId = payload?.messageId ? String(payload.messageId) : message.id;
            return {
              ...message,
              id: nextId,
              content: message.content + suffix,
              status: "cancelled" as const,
              isThinking: false,
              thinkingDuration:
                message.thinkingDuration ?? computeThinkingDuration(useStreamStore.getState().thinkingStartAt)
            };
          })
        }));
        useStreamStore.getState().reset();
      },
      onDone: () => {
        if (useStreamStore.getState().streamingMessageId !== assistantId) return;
        useStreamStore.getState().reset();
      },
      onTitle: (payload: { title: string }) => {
        if (useStreamStore.getState().streamingMessageId !== assistantId) return;
        if (payload?.title && get().currentSessionId) {
          get().updateSessionTitle(get().currentSessionId as string, payload.title);
        }
      },
      onError: (error: Error) => {
        if (useStreamStore.getState().streamingMessageId !== assistantId) return;
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === useStreamStore.getState().streamingMessageId
              ? {
                  ...message,
                  status: "error" as const,
                  isThinking: false,
                  thinkingDuration:
                    message.thinkingDuration ?? computeThinkingDuration(useStreamStore.getState().thinkingStartAt)
                }
              : message
          )
        }));
        useStreamStore.getState().reset();
        toast.error(error.message || "生成失败");
      }
    };

    const { start, cancel } = createStreamResponse(
      {
        url,
        headers: token ? { Authorization: token, satoken: token } : undefined,
        retryCount: 1
      },
      handlers
    );

    useStreamStore.setState({ streamAbort: cancel });

    try {
      await start();
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      handlers.onError?.(error as Error);
    } finally {
      if (useStreamStore.getState().streamingMessageId === assistantId) {
        useStreamStore.getState().reset();
      }
    }
  },

  cancelGeneration: () => {
    const { isStreaming, streamTaskId, streamAbort } = useStreamStore.getState();
    if (!isStreaming) return;
    useStreamStore.setState({ cancelRequested: true });
    if (streamAbort) {
      streamAbort();
    }
    if (streamTaskId) {
      stopTask(streamTaskId).catch(() => null);
    }
  },

  appendStreamContent: (delta) => {
    if (!delta) return;
    const stream = useStreamStore.getState();
    const shouldFinalizeThinking = stream.thinkingStartAt != null;
    const duration = computeThinkingDuration(stream.thinkingStartAt);
    if (shouldFinalizeThinking) {
      useStreamStore.setState({ thinkingStartAt: null });
    }
    set((state) => ({
      messages: state.messages.map((message) => {
        if (message.id !== stream.streamingMessageId) return message;
        if (message.status === "cancelled" || message.status === "error") return message;
        return {
          ...message,
          content: message.content + delta,
          isThinking: shouldFinalizeThinking ? false : message.isThinking,
          thinkingDuration:
            shouldFinalizeThinking && !message.thinkingDuration ? duration : message.thinkingDuration
        };
      })
    }));
  },

  appendThinkingContent: (delta) => {
    if (!delta) return;
    const stream = useStreamStore.getState();
    useStreamStore.setState({ thinkingStartAt: stream.thinkingStartAt ?? Date.now() });
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === stream.streamingMessageId &&
        message.status !== "cancelled" &&
        message.status !== "error"
          ? {
              ...message,
              thinking: `${message.thinking ?? ""}${delta}`,
              isThinking: true
            }
          : message
      )
    }));
  },

  submitFeedback: async (messageId, feedback) => {
    const vote = feedback === "like" ? 1 : feedback === "dislike" ? -1 : null;
    const prev = get().messages.find((message) => message.id === messageId)?.feedback ?? null;
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId ? { ...message, feedback } : message
      )
    }));
    if (vote === null) {
      toast.success("取消成功");
      return;
    }
    try {
      await submitFeedback(messageId, vote);
      toast.success(feedback === "like" ? "点赞成功" : "点踩成功");
    } catch (error) {
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === messageId ? { ...message, feedback: prev } : message
        )
      }));
      toast.error((error as Error).message || "反馈保存失败");
    }
  },

  reset: () => {
    set({
      sessions: [],
      currentSessionId: null,
      messages: [],
      isLoading: false,
      isCreatingNew: false
    });
    useStreamStore.getState().reset();
    useStreamStore.getState().setDeepThinkingEnabled(false);
  }
}));
