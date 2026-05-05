import * as React from "react";

import { MarkdownRenderer } from "@/features/chat/components/MarkdownRenderer";
import { ThinkingCard } from "@/features/chat/components/ThinkingCard";
import { FeedbackBar } from "@/features/chat/components/FeedbackBar";
import type { Message } from "@/shared/types";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isLast
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasThinking = Boolean(message.thinking && message.thinking.trim().length > 0);
  const hasContent = message.content.trim().length > 0;
  const isThinking = Boolean(message.isThinking);
  const isWaiting = message.status === "streaming" && !isThinking && !hasContent;

  const showFeedback =
    message.role === "assistant" &&
    message.status !== "streaming" &&
    message.id &&
    !message.id.startsWith("assistant-");

  if (isUser) {
    return (
      <div className="flex">
        <div className="animate-[message-slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex">
      <div className="assistant-message backdrop-blur-xl rounded-[18px_18px_18px_4px] p-4 px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.2)] animate-[message-slide-in_0.4s_cubic-bezier(0.16,1,0.3,1)] min-w-0 flex-1 space-y-4">
        {/* Thinking card: streaming or completed */}
        {isThinking || hasThinking ? (
          <ThinkingCard
            content={message.thinking}
            duration={message.thinkingDuration}
            isStreaming={isThinking}
          />
        ) : null}

        <div className="space-y-2">
          {/* Waiting dots */}
          {isWaiting ? (
            <div className="ai-wait" aria-label="思考中">
              <span className="ai-wait-dots" aria-hidden="true">
                <span className="ai-wait-dot" />
                <span className="ai-wait-dot" />
                <span className="ai-wait-dot" />
              </span>
            </div>
          ) : null}

          {/* Content */}
          {hasContent ? <MarkdownRenderer content={message.content} /> : null}

          {/* Error indicator */}
          {message.status === "error" ? (
            <p className="text-xs text-rose-500">生成已中断。</p>
          ) : null}

          {/* Feedback */}
          {showFeedback ? (
            <FeedbackBar
              messageId={message.id}
              feedback={message.feedback ?? null}
              content={message.content}
              alwaysVisible={Boolean(isLast)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
});
