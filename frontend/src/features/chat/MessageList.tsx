import { useEffect, useRef } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Message } from "../../types/api";
import { Markdown } from "./Markdown";
import { MessageBubble } from "./MessageBubble";
import { SourcesList } from "./SourcesList";

export interface MessageListProps {
  messages: Message[];
  streamingState?: string;
  streamingDraft?: string;
  streamingSources?: any[];
  streamingCitations?: any[];
  hasScopedFilter?: boolean;
  onRetry?: (text: string, mode: string) => void;
  onExpandScopeAndRetry?: (text: string, mode: string) => void;
  onPopulateComposer?: (text: string) => void;
  onFeedback?: (messageId: string, val: number) => Promise<any>;
}

export function MessageList({
  messages,
  streamingState = "idle",
  streamingDraft = "",
  streamingSources: _streamingSources = [],
  streamingCitations = [],
  hasScopedFilter = false,
  onRetry,
  onExpandScopeAndRetry,
  onPopulateComposer,
  onFeedback,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = streamingState !== "idle" && streamingState !== "error";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingDraft, streamingState]);

  const getStatusText = (state: string) => {
    switch (state) {
      case "rewriting":
        return "Rewriting query with conversation context...";
      case "retrieving":
        return "Searching documents (dense + FTS)...";
      case "reranking":
        return "Cross-encoder reranking passages...";
      case "generating":
        return "Synthesizing answer with citations...";
      default:
        return "Thinking...";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2" aria-live="polite">
      {messages.map((m, idx) => {
        let previousUserMessage: Message | undefined;
        if (m.role === "assistant") {
          for (let i = idx - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
              previousUserMessage = messages[i];
              break;
            }
          }
        }

        return (
          <MessageBubble
            key={m.id}
            message={m}
            previousUserMessage={previousUserMessage}
            hasScopedFilter={hasScopedFilter}
            onRetry={onRetry}
            onExpandScopeAndRetry={onExpandScopeAndRetry}
            onPopulateComposer={onPopulateComposer}
            onFeedback={onFeedback ? (val) => onFeedback(m.id, val) : undefined}
          />
        );
      })}

      {/* Streaming bubble */}
      {isStreaming && (
        <div className="flex gap-3 py-4 justify-start animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>

          <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-xs px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-2xs">
            {!streamingDraft && (
              <div className="flex items-center gap-2 text-xs text-muted-light dark:text-muted-dark py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>{getStatusText(streamingState)}</span>
              </div>
            )}

            {streamingDraft && (
              <>
                <Markdown content={streamingDraft} citations={streamingCitations} />
                <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse" />
              </>
            )}

            {streamingCitations.length > 0 && (
              <SourcesList citations={streamingCitations} />
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
