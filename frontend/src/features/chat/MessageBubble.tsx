import { useState } from "react";
import { Activity, AlertTriangle, Bot, User } from "lucide-react";
import { Message } from "../../types/api";
import { FeedbackButtons } from "./FeedbackButtons";
import { Markdown } from "./Markdown";
import { RetrievalInspector } from "./RetrievalInspector";
import { SourcesList } from "./SourcesList";

export interface MessageBubbleProps {
  message: Message;
  onFeedback?: (val: number) => Promise<any>;
}

export function MessageBubble({ message, onFeedback }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isRefused = message.status === "refused";
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <>
      <div className={`flex gap-3 py-4 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-2xs ${
            isUser
              ? "bg-primary text-white rounded-br-xs"
              : isRefused
              ? "bg-amber-500/10 border border-amber-500/20 text-text-light dark:text-text-dark rounded-bl-xs"
              : "bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-bl-xs"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div>
              {isRefused && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Unanswerable from documents</span>
                </div>
              )}

              <Markdown content={message.content} citations={message.citations} />

              {isRefused && (
                <p className="mt-2 text-xs text-muted-light dark:text-muted-dark border-t border-border-light/40 dark:border-border-dark/40 pt-2">
                  Tip: Try rephrasing your question or expand the document scope picker.
                </p>
              )}

              {message.citations && message.citations.length > 0 && (
                <SourcesList citations={message.citations} />
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-light dark:text-muted-dark border-t border-border-light/40 dark:border-border-dark/40 pt-2">
                <div className="flex items-center gap-2">
                  {message.trace && (
                    <button
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
