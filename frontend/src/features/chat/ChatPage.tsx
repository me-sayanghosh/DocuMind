import { Suspense, lazy, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { MessageSkeleton, PdfViewerSkeleton } from "../../components/ui/Skeleton";
import { Spinner } from "../../components/ui/Spinner";
import { useChatStream } from "../../hooks/useChatStream";
import { useConversationMessages, useConversations } from "../../hooks/useConversations";
import { useDocuments } from "../../hooks/useDocuments";
import { useViewerStore } from "../../hooks/useViewerStore";
import { Composer } from "./Composer";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageList } from "./MessageList";
import { ScopePicker } from "./ScopePicker";

const PdfViewer = lazy(() => import("../viewer/PdfViewer").then((m) => ({ default: m.PdfViewer })));

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const { documents } = useDocuments();
  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
  } = useConversations();
  const { messages, isLoading: messagesLoading, submitFeedback } = useConversationMessages(conversationId);
  const { send, stop, state, draft, sources, citations, errorMessage } = useChatStream(conversationId);

  const viewerOpen = useViewerStore((s) => s.open);
  const closeViewer = useViewerStore((s) => s.closeViewer);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [composerText, setComposerText] = useState("");
  const [composerMode, setComposerMode] = useState("hybrid_rerank");
  const [mobileConvOpen, setMobileConvOpen] = useState(false);

  const readyDocs = documents.filter((d) => d.status === "ready");
  const indexingDocs = documents.filter((d) => d.status === "queued" || d.status === "processing");
  const hasReady = readyDocs.length > 0;
  const hasIndexing = indexingDocs.length > 0;

  const handleNewChat = async () => {
    const newConv = await createConversation({
      title: "New Chat",
      doc_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
    });
    setMobileConvOpen(false);
    navigate(`/chat/${newConv.id}`);
  };

  const handleSelectConv = (id: string) => {
    setMobileConvOpen(false);
    navigate(`/chat/${id}`);
  };

  const handleDeleteConv = async (id: string) => {
    await deleteConversation(id);
    if (conversationId === id) {
      if (conversations.length > 1) {
        const next = conversations.find((c) => c.id !== id);
        if (next) navigate(`/chat/${next.id}`);
      } else {
        navigate("/chat");
      }
    }
  };

  const handleSendMessage = async (text: string, mode: string) => {
    let targetConvId = conversationId;
    if (!targetConvId) {
      try {
        const title = text.length > 36 ? text.slice(0, 36) + "..." : text;
        const newConv = await createConversation({
          title,
          doc_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        });
        targetConvId = newConv.id;
        navigate(`/chat/${newConv.id}`);
      } catch (err) {
        console.error("Failed to create conversation", err);
        return;
      }
    }
    setComposerMode(mode);
    send(text, { mode, docIds: selectedDocIds, conversationId: targetConvId });
  };

  const handleRetry = async (text: string, mode: string) => {
    await handleSendMessage(text, mode);
  };

  const handleExpandScopeAndRetry = async (text: string, mode: string) => {
    setSelectedDocIds([]);
    setComposerMode(mode);
    let targetConvId = conversationId;
    if (!targetConvId) {
      try {
        const title = text.length > 36 ? text.slice(0, 36) + "..." : text;
        const newConv = await createConversation({
          title,
          doc_ids: undefined,
        });
        targetConvId = newConv.id;
        navigate(`/chat/${newConv.id}`);
      } catch (err) {
        console.error("Failed to create conversation", err);
        return;
      }
    }
    send(text, { mode, docIds: [], conversationId: targetConvId });
  };

  const handlePopulateComposer = (questionText: string) => {
    setComposerText(questionText);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg-light dark:bg-bg-dark relative">
      {/* 1. Desktop Left Sidebar (>= md) */}
      <div className="hidden md:flex h-full shrink-0">
        <ConversationSidebar
          conversations={conversations}
          isLoading={conversationsLoading}
          activeId={conversationId}
          onSelect={handleSelectConv}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConv}
        />
      </div>

      {/* 1b. Mobile Conversation Drawer (< md) */}
      {mobileConvOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileConvOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl bg-surface-light dark:bg-surface-dark">
            <ConversationSidebar
              conversations={conversations}
              isLoading={conversationsLoading}
              activeId={conversationId}
              onSelect={handleSelectConv}
              onNewChat={handleNewChat}
              onDelete={handleDeleteConv}
              onClose={() => setMobileConvOpen(false)}
              className="w-full border-r-0"
            />
          </div>
        </div>
      )}

      {/* 2. Center Chat Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border-light dark:border-border-dark min-w-0">
        {/* Top bar with Scope Picker & Mobile Conversation Trigger */}
        <div className="px-3 sm:px-4 py-2 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-surface-light/30 dark:bg-surface-dark/30 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Chat List Button */}
            <button
              onClick={() => setMobileConvOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:bg-border-light/50 text-text-light dark:text-text-dark shrink-0 font-medium active:scale-95 transition"
              aria-label="Open chat history"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats ({conversations.length})</span>
            </button>

            <ScopePicker
              documents={documents}
              selectedDocIds={selectedDocIds}
              onChange={setSelectedDocIds}
            />

            {hasIndexing ? (
              <span className="hidden sm:flex text-xs text-text-light dark:text-text-dark items-center gap-1.5 font-medium truncate">
                <Spinner className="w-3 h-3 text-black dark:text-white shrink-0" />
                <span className="truncate">Indexing {indexingDocs.length} docs...</span>
              </span>
            ) : (
              <span className="hidden sm:inline text-xs text-muted-light dark:text-muted-dark truncate">
                {readyDocs.length} {readyDocs.length === 1 ? "doc" : "docs"} indexed
              </span>
            )}
          </div>

          {/* Quick status pill for mobile */}
          {hasIndexing && (
            <span className="sm:hidden flex items-center gap-1 text-[11px] text-muted-light dark:text-muted-dark">
              <Spinner className="w-2.5 h-2.5" />
              <span>Indexing</span>
            </span>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {!conversationId ? (
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-8 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-white flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-text-light dark:text-text-dark">
                Ask anything across your PDFs
              </h3>
              <p className="mt-1 text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                DocuMind uses hybrid search, cross-encoder reranking, and strict page-level citations to answer your questions accurately.
              </p>

              {documents.length === 0 ? (
                <div className="mt-6">
                  <Link
                    to="/library"
                    className="px-4 py-2 bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-lg text-sm font-medium shadow-sm transition-colors inline-block"
                  >
                    Go to Library to Upload PDFs
                  </Link>
                </div>
              ) : hasIndexing && !hasReady ? (
                <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-light dark:text-muted-dark">
                  <Spinner className="w-5 h-5 text-black dark:text-white" />
                  <span>Processing documents ({indexingDocs.length} indexing)...</span>
                  <span>You can ask questions as soon as indexing finishes.</span>
                </div>
              ) : (
                <div className="mt-6 w-full space-y-2">
                  <p className="text-[11px] font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider text-left">
                    Example questions:
                  </p>
                  {[
                    `What are the termination and notice terms in ${readyDocs[0]?.filename}?`,
                    `Summarize the key deliverables and timelines mentioned.`,
                    `What payment obligations or penalties are specified?`,
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q, "hybrid_rerank")}
                      className="w-full p-2.5 text-left text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-black/40 dark:hover:border-white/40 text-text-light dark:text-text-dark transition-colors shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : messagesLoading ? (
            <MessageSkeleton count={3} />
          ) : messages.length === 0 && !draft ? (
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-8 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-white flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-text-light dark:text-text-dark">
                How can I help you today?
              </h3>
              <p className="mt-1 text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Try asking a question about specific numbers, clauses, dates, or summaries in your uploaded PDFs.
              </p>

              {readyDocs.length > 0 && (
                <div className="mt-6 w-full space-y-2">
                  <p className="text-[11px] font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider text-left">
                    Example questions:
                  </p>
                  {[
                    `What are the termination and notice terms in ${readyDocs[0]?.filename}?`,
                    `Summarize the key deliverables and timelines mentioned.`,
                    `What payment obligations or penalties are specified?`,
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q, "hybrid_rerank")}
                      className="w-full p-2.5 text-left text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-black/40 dark:hover:border-white/40 text-text-light dark:text-text-dark transition-colors shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <MessageList
              messages={messages}
              streamingState={state}
              streamingDraft={draft}
              streamingSources={sources}
              streamingCitations={citations}
              hasScopedFilter={selectedDocIds.length > 0}
              onRetry={handleRetry}
              onExpandScopeAndRetry={handleExpandScopeAndRetry}
              onPopulateComposer={handlePopulateComposer}
              onFeedback={async (messageId, val) => {
                await submitFeedback({ messageId, value: val });
              }}
            />
          )}

          {errorMessage && (
            <div className="mx-4 mb-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Composer */}
        <Composer
          onSend={handleSendMessage}
          onStop={stop}
          isStreaming={state !== "idle" && state !== "error"}
          disabled={!hasReady}
          text={composerText}
          onTextChange={setComposerText}
          mode={composerMode}
          onModeChange={setComposerMode}
          placeholder={
            !hasReady
              ? hasIndexing
                ? "Documents are indexing... Please wait a moment."
                : "Upload and index documents to start asking questions..."
              : "Ask a question about your documents... (Enter to send, Shift+Enter for newline)"
          }
        />
      </div>

      {/* 3. Right Split Pane: PDF Viewer (Desktop >= md) */}
      {viewerOpen && (
        <div className="w-[45%] max-w-2xl h-full hidden md:block border-l border-border-light dark:border-border-dark shrink-0">
          <Suspense fallback={<PdfViewerSkeleton />}>
            <PdfViewer />
          </Suspense>
        </div>
      )}

      {/* 4. Mobile PDF Viewer Modal / Overlay (< md) */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden bg-bg-light dark:bg-bg-dark animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shrink-0">
            <span className="text-xs font-semibold text-text-light dark:text-text-dark">
              Document Citation Inspector
            </span>
            <button
              onClick={closeViewer}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-xs active:scale-95 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<PdfViewerSkeleton />}>
              <PdfViewer />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
