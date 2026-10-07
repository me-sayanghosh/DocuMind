import { useState } from "react";
import { Activity, Bot, FileQuestion, User } from "lucide-react";
import { Message } from "../../types/api";
import { FeedbackButtons } from "./FeedbackButtons";
import { Markdown } from "./Markdown";
import { RetrievalInspector } from "./RetrievalInspector";
import { SourcesList } from "./SourcesList";

export interface MessageBubbleProps {
  message: Message;
  previousUserMessage?: Message;
  hasScopedFilter?: boolean;
  onRetry?: (text: string, mode: string) => void;
  onExpandScopeAndRetry?: (text: string, mode: string) => void;
  onPopulateComposer?: (text: string) => void;
  onFeedback?: (val: number) => Promise<any>;
}

export function MessageBubble({
  message,
  previousUserMessage: _previousUserMessage,
  hasScopedFilter: _hasScopedFilter = false,
  onRetry: _onRetry,
  onExpandScopeAndRetry: _onExpandScopeAndRetry,
  onPopulateComposer: _onPopulateComposer,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isRefused = message.status === "refused";
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <>
      <div className={`flex gap-3 py-4 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isRefused
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isRefused ? <FileQuestion className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3.5 shadow-xs transition-all ${
            isUser
              ? "bg-primary text-white rounded-br-xs"
              : isRefused
              ? "bg-surface-light dark:bg-surface-dark border border-amber-500/30 dark:border-amber-500/25 text-text-light dark:text-text-dark rounded-bl-xs ring-1 ring-amber-500/10"
              : "bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-bl-xs"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : isRefused ? (
            <div className="space-y-2.5">
              {/* Header: Status badge & Score / Diagnostics */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border-light/50 dark:border-border-dark/50">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <FileQuestion className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    Unanswerable from documents
                  </span>
                  {message.trace?.top_score !== undefined && (
                    <span
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/5 text-amber-700/80 dark:text-amber-400/80 border border-amber-500/15"
                      title="Top candidate score fell below relevance threshold (0.35)"
                    >
                      Score: {message.trace.top_score.toFixed(2)} &lt; 0.35
                    </span>
                  )}
                </div>

                {message.trace && (
                  <button
                    type="button"
                    onClick={() => setInspectorOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-light dark:text-muted-dark hover:text-primary transition-colors cursor-pointer"
                    title="Open retrieval inspector"
                  >
                    <Activity className="w-3 h-3 text-primary" />
                    <span>{message.trace.total_ms}ms</span>
                  </button>
                )}
              </div>

              {/* Message content */}
              <div className="text-sm font-medium text-text-light dark:text-text-dark">
                <Markdown content={message.content} citations={message.citations} />
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-between text-xs text-muted-light dark:text-muted-dark border-t border-border-light/50 dark:border-border-dark/50">
                <div className="flex items-center gap-2">
                  {message.retrieval_mode && (
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                      {message.retrieval_mode}
                    </span>
                  )}
                </div>

                {onFeedback && (
                  <FeedbackButtons
                    messageId={message.id}
                    initialFeedback={message.feedback}
                    onFeedback={onFeedback}
                  />
                )}
              </div>
            </div>
          ) : (
            <div>
              <Markdown content={message.content} citations={message.citations} />

              {message.citations && message.citations.length > 0 && (
                <SourcesList citations={message.citations} />
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-light dark:text-muted-dark border-t border-border-light/40 dark:border-border-dark/40 pt-2">
                <div className="flex items-center gap-2">
                  {message.trace && (
                    <button
                      type="button"
                      onClick={() => setInspectorOpen(true)}
                      className="flex items-center gap-1 text-[11px] hover:text-primary transition-colors cursor-pointer"
                      title="Inspect retrieval latency and scores"
                    >
                      <Activity className="w-3 h-3 text-primary" />
                      <span>{message.trace.total_ms}ms</span>
                    </button>
                  )}
                  {message.retrieval_mode && (
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                      {message.retrieval_mode}
                    </span>
                  )}
                </div>

                {onFeedback && (
                  <FeedbackButtons
                    messageId={message.id}
                    initialFeedback={message.feedback}
                    onFeedback={onFeedback}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-lg bg-surface-light dark:bg-surface-dark text-muted-light dark:text-muted-dark flex items-center justify-center shrink-0 border border-border-light dark:border-border-dark">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>

      <RetrievalInspector
        trace={message.trace}
        mode={message.retrieval_mode}
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
      />
    </>
  );
}
