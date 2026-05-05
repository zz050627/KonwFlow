import type { CompletionPayload, MessageDeltaPayload, StreamMetaPayload } from "@/shared/types";

export interface StreamHandlers {
  onMeta?: (payload: StreamMetaPayload) => void;
  onMessage?: (payload: MessageDeltaPayload) => void;
  onThinking?: (payload: MessageDeltaPayload) => void;
  onFinish?: (payload: CompletionPayload) => void;
  onDone?: () => void;
  onCancel?: (payload: CompletionPayload) => void;
  onReject?: (payload: MessageDeltaPayload) => void;
  onTitle?: (payload: { title: string }) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: string, payload: unknown) => void;
}

export interface StreamOptions {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  retryCount?: number;
  retryDelayMs?: number;
}

function parseData(raw: string): unknown {
  if (!raw) return "";
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalizeStreamError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return error;
    }
    const message = error.message || "";
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return new Error("网络连接失败，请检查后端服务是否可用");
    }
    if (/timeout|timed out/i.test(message)) {
      return new Error("请求超时，请稍后重试");
    }
    return error;
  }
  return new Error("流式请求失败");
}

async function buildHttpError(response: Response): Promise<Error> {
  const statusMessage = `SSE 请求失败（HTTP ${response.status}）`;
  try {
    const raw = await response.text();
    if (!raw.trim()) return new Error(statusMessage);
    const payload = parseData(raw);
    if (typeof payload === "string" && payload.trim()) {
      return new Error(payload.trim());
    }
    if (payload && typeof payload === "object") {
      const message = (payload as { message?: unknown; error?: unknown }).message
        ?? (payload as { message?: unknown; error?: unknown }).error;
      if (typeof message === "string" && message.trim()) {
        return new Error(message.trim());
      }
    }
    return new Error(statusMessage);
  } catch {
    return new Error(statusMessage);
  }
}

/**
 * Pure SSE stream reader — parses event/data lines and dispatches to typed handlers.
 * No React or Zustand dependency; testable with a mock ReadableStream.
 */
export async function consumeSSEStream(
  response: Response,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  if (!response.body) {
    throw new Error("流式响应为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];

  const dispatchEvent = () => {
    if (dataLines.length === 0) {
      eventName = "message";
      return;
    }
    const raw = dataLines.join("\n");
    const payload = parseData(raw);
    handlers.onEvent?.(eventName, payload);

    switch (eventName) {
      case "meta":
        handlers.onMeta?.(payload as StreamMetaPayload);
        break;
      case "message":
        {
          const messagePayload = payload as MessageDeltaPayload;
          if (messagePayload?.type === "think") {
            handlers.onThinking?.(messagePayload);
          }
          handlers.onMessage?.(messagePayload);
        }
        break;
      case "finish":
        handlers.onFinish?.(payload as CompletionPayload);
        break;
      case "done":
        handlers.onDone?.();
        break;
      case "cancel":
        handlers.onCancel?.(payload as CompletionPayload);
        break;
      case "reject":
        handlers.onReject?.(payload as MessageDeltaPayload);
        break;
      case "title":
        handlers.onTitle?.(payload as { title: string });
        break;
      case "error":
        handlers.onError?.(new Error(String((payload as { error?: string })?.error || payload)));
        break;
      default:
        break;
    }

    eventName = "message";
    dataLines = [];
  };

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }
      const { value, done } = await reader.read();
      if (done) {
        dispatchEvent();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) {
          dispatchEvent();
          continue;
        }
        if (line.startsWith(":")) {
          continue;
        }
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Full SSE stream lifecycle: fetch → parse → retry with exponential backoff.
 * Returns { start, cancel } for external control.
 */
export function createStreamResponse(options: StreamOptions, handlers: StreamHandlers) {
  const controller = new AbortController();
  const signal = options.signal ?? controller.signal;
  const retryCount = options.retryCount ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 600;

  const start = async (): Promise<void> => {
    let attempt = 0;
    while (attempt <= retryCount) {
      try {
        let completed = false;
        const trackedHandlers: StreamHandlers = {
          ...handlers,
          onFinish: (payload) => {
            completed = true;
            handlers.onFinish?.(payload);
          },
          onDone: () => {
            completed = true;
            handlers.onDone?.();
          },
          onCancel: (payload) => {
            completed = true;
            handlers.onCancel?.(payload);
          }
        };

        const response = await fetch(options.url, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            ...options.headers
          },
          signal
        });

        if (!response.ok) {
          throw await buildHttpError(response);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/event-stream")) {
          throw new Error("流式响应格式异常");
        }

        await consumeSSEStream(response, trackedHandlers, signal);
        if (!signal.aborted && !completed) {
          throw new Error("流式连接异常中断");
        }
        return;
      } catch (error) {
        if (signal.aborted) {
          throw error as Error;
        }
        const normalizedError = normalizeStreamError(error);
        if (attempt >= retryCount) {
          throw normalizedError;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs * Math.pow(2, attempt))
        );
        attempt += 1;
      }
    }
  };

  return {
    start,
    cancel: () => controller.abort()
  };
}
