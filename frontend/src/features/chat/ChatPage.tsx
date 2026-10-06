import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Sparkles } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { useChatStream } from "../../hooks/useChatStream";
import { useConversationMessages, useConversations } from "../../hooks/useConversations";
import { useDocuments } from "../../hooks/useDocuments";
import { useViewerStore } from "../../hooks/useViewerStore";
import { PdfViewer } from "../viewer/PdfViewer";
import { Composer } from "./Composer";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageList } from "./MessageList";
import { ScopePicker } from "./ScopePicker";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const { documents } = useDocuments();
  const { conversations, createConversation, deleteConversation } = useConversations();
  const { messages, isLoading: messagesLoading, submitFeedback } = useConversationMessages(conversationId);
  const { send, stop, state, draft, sources, citations, errorMessage } = useChatStream(conversationId);

  const viewerOpen = useViewerStore((s) => s.open);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const readyDocs = documents.filter((d) => d.status === "ready");

  const handleNewChat = async () => {
    const newConv = await createConversation({
      title: "New Chat",
      doc_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
    });
    navigate(`/chat/${newConv.id}`);
  };

  const handleSelectConv = (id: string) => {
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

  const handleSendMessage = (text: string, mode: string) => {
    send(text, { mode, docIds: selectedDocIds });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-bg-light dark:bg-bg-dark">
      {/* 1. Left Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConv}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConv}
      />

      {/* 2. Center Chat Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border-light dark:border-border-dark">
        {/* Top bar with Scope Picker */}
        <div className="px-4 py-2 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-surface-light/30 dark:bg-surface-dark/30">
          <div className="flex items-center gap-2">
            <ScopePicker
              documents={documents}
              selectedDocIds={selectedDocIds}
              onChange={setSelectedDocIds}
            />
            <span className="text-xs text-muted-light dark:text-muted-dark">
              {readyDocs.length} {readyDocs.length === 1 ? "document" : "documents"} indexed
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={Sparkles}
                title="Ask anything across your PDFs"
                description="DocChat uses hybrid search, cross-encoder reranking, and strict page-level citations to answer your questions accurately."
                action={
                  <button
                    onClick={handleNewChat}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors"
                  >
                    Start a New Chat
                  </button>
                }
              />
            </div>
          ) : messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner className="w-8 h-8" />
            </div>
          ) : messages.length === 0 && !draft ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
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
                      className="w-full p-2.5 text-left text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 text-text-light dark:text-text-dark transition-colors"
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
              onFeedback={(val) => {
                const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
                if (lastAssistant) {
                  return submitFeedback({ messageId: lastAssistant.id, value: val });
                }
                return Promise.resolve();
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
          disabled={!conversationId || readyDocs.length === 0}
        />
      </div>

      {/* 3. Right Split Pane: PDF Viewer */}
      {viewerOpen && (
        <div className="w-[45%] max-w-2xl h-full hidden md:block">
          <PdfViewer />
        </div>
      )}
    </div>
  );
}
