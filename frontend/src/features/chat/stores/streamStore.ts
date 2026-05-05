import { create } from "zustand";

interface StreamState {
  isStreaming: boolean;
  streamTaskId: string | null;
  streamAbort: (() => void) | null;
  streamingMessageId: string | null;
  cancelRequested: boolean;
  deepThinkingEnabled: boolean;
  thinkingStartAt: number | null;
  selectedModelId: string | null;
  inputFocusKey: number;

  setDeepThinkingEnabled: (enabled: boolean) => void;
  setSelectedModelId: (modelId: string | null) => void;
  startStream: (messageId: string) => void;
  setStreamTaskId: (taskId: string) => void;
  setStreamAbort: (abort: (() => void) | null) => void;
  setCancelRequested: (requested: boolean) => void;
  startThinking: () => void;
  endThinking: () => void;
  reset: () => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  isStreaming: false,
  streamTaskId: null,
  streamAbort: null,
  streamingMessageId: null,
  cancelRequested: false,
  deepThinkingEnabled: false,
  thinkingStartAt: null,
  selectedModelId: null,
  inputFocusKey: 0,

  setDeepThinkingEnabled: (enabled) => set({ deepThinkingEnabled: enabled }),
  setSelectedModelId: (modelId) => set({ selectedModelId: modelId }),

  startStream: (messageId) =>
    set({
      isStreaming: true,
      streamingMessageId: messageId,
      streamTaskId: null,
      cancelRequested: false,
      thinkingStartAt: get().deepThinkingEnabled ? Date.now() : null,
      inputFocusKey: Date.now()
    }),

  setStreamTaskId: (taskId) => set({ streamTaskId: taskId }),
  setStreamAbort: (abort) => set({ streamAbort: abort }),
  setCancelRequested: (requested) => set({ cancelRequested: requested }),
  startThinking: () => set({ thinkingStartAt: get().thinkingStartAt ?? Date.now() }),
  endThinking: () => set({ thinkingStartAt: null }),

  reset: () =>
    set({
      isStreaming: false,
      streamTaskId: null,
      streamAbort: null,
      streamingMessageId: null,
      cancelRequested: false,
      thinkingStartAt: null
    })
}));

export function computeThinkingDuration(startAt?: number | null): number | undefined {
  if (!startAt) return undefined;
  const seconds = Math.round((Date.now() - startAt) / 1000);
  return Math.max(1, seconds);
}
