import { useState } from "react";
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  Copy,
  FileQuestion,
  Globe,
  HelpCircle,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
  User,
} from "lucide-react";
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
  previousUserMessage,
  hasScopedFilter = false,
  onRetry,
  onExpandScopeAndRetry,
  onPopulateComposer,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isRefused = message.status === "refused";
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [copied, setCopied] = useState(false);

  const userQuestion = previousUserMessage?.content || message.standalone_query || "";
  const currentMode = message.retrieval_mode || "hybrid_rerank";

  const handleCopyQuestion = async () => {
    if (!userQuestion) return;
    try {
      await navigator.clipboard.writeText(userQuestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy query", err);
    }
  };

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
            <div className="space-y-3">
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
              <div>
                <div className="text-sm font-medium text-text-light dark:text-text-dark">
                  <Markdown content={message.content} citations={message.citations} />
                </div>
                <p className="mt-1 text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                  DocuMind enforces a strict relevance threshold to prevent hallucinated answers when sources don't explicitly contain the information.
                </p>
              </div>

              {/* Quick Action Suggestions */}
              {userQuestion && (
                <div className="pt-2 border-t border-border-light/50 dark:border-border-dark/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                      Suggested Actions
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyQuestion}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors cursor-pointer"
                      title="Copy question to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy query</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Expand Document Scope */}
                    {hasScopedFilter && onExpandScopeAndRetry && (
                      <button
                        type="button"
                        onClick={() => onExpandScopeAndRetry(userQuestion, currentMode)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-all shadow-2xs cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Search Across All Documents</span>
                      </button>
                    )}

                    {/* Retry with Keyword Search (FTS) */}
                    {onRetry && currentMode !== "fts" && (
                      <button
                        type="button"
                        onClick={() => onRetry(userQuestion, "fts")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-light dark:bg-border-dark/40 hover:bg-amber-500/10 hover:border-amber-500/30 text-text-light dark:text-text-dark border border-border-light dark:border-border-dark transition-all cursor-pointer"
                        title="Search exact words and codes using BM25 full-text index"
                      >
                        <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Try Keyword Search (FTS)</span>
                      </button>
                    )}

                    {/* Retry with Vector Search */}
                    {onRetry && currentMode !== "vector" && (
                      <button
                        type="button"
                        onClick={() => onRetry(userQuestion, "vector")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-light dark:bg-border-dark/40 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-text-light dark:text-text-dark border border-border-light dark:border-border-dark transition-all cursor-pointer"
                        title="Search semantic meaning using dense vector embeddings"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Try Vector Search</span>
                      </button>
                    )}

                    {/* Retry with Hybrid + Rerank if currently on single-retriever mode */}
                    {onRetry && currentMode !== "hybrid_rerank" && (
                      <button
                        type="button"
                        onClick={() => onRetry(userQuestion, "hybrid_rerank")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-light dark:bg-border-dark/40 hover:bg-primary/10 hover:border-primary/30 text-text-light dark:text-text-dark border border-border-light dark:border-border-dark transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-primary" />
                        <span>Try Hybrid + Rerank</span>
                      </button>
                    )}

                    {/* Rephrase in composer */}
                    {onPopulateComposer && (
                      <button
                        type="button"
                        onClick={() => onPopulateComposer(userQuestion)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-light dark:bg-border-dark/40 hover:bg-surface-light/80 dark:hover:bg-border-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark transition-all cursor-pointer"
                        title="Place question into input for editing"
                      >
                        <PenLine className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
                        <span>Rephrase Question</span>
                      </button>
                    )}

                    {/* Open Inspector */}
                    {message.trace && (
                      <button
                        type="button"
                        onClick={() => setInspectorOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-light dark:bg-border-dark/40 hover:bg-surface-light/80 dark:hover:bg-border-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark transition-all cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span>Inspect Retrieval Trace</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Collapsible search tips */}
              <div className="pt-2 border-t border-border-light/50 dark:border-border-dark/50">
                <button
                  type="button"
                  onClick={() => setShowTips(!showTips)}
                  className="flex items-center justify-between w-full text-xs text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
                    How to get better results
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showTips ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showTips && (
                  <div className="mt-2 p-3 rounded-lg bg-surface-light/70 dark:bg-border-dark/25 border border-border-light/60 dark:border-border-dark/40 text-xs text-muted-light dark:text-muted-dark space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <p>
                        <strong className="text-text-light dark:text-text-dark">Try specific terminology:</strong> Use exact keywords, clause numbers, headings, or abbreviations found directly in the document.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <p>
                        <strong className="text-text-light dark:text-text-dark">Check document scope:</strong> If you restricted search to specific files in the top bar, expand the scope to all documents.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <p>
                        <strong className="text-text-light dark:text-text-dark">Scanned PDFs:</strong> Verify text is selectable in the PDF viewer. Scanned images without OCR cannot be searched.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <p>
                        <strong className="text-text-light dark:text-text-dark">Strict threshold:</strong> DocuMind enforces a 0.35 relevance threshold to guarantee zero hallucinated citations.
                      </p>
                    </div>
                  </div>
                )}
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
