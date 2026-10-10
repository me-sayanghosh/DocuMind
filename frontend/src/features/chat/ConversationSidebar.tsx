import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { SidebarSkeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/cn";
import { Conversation } from "../../types/api";

export interface ConversationSidebarProps {
  conversations: Conversation[];
  isLoading?: boolean;
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ConversationSidebar({
  conversations,
  isLoading,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onClose,
  className,
}: ConversationSidebarProps) {
  const handleSelect = (id: string) => {
    onSelect(id);
    onClose?.();
  };

  const handleNew = () => {
    onNewChat();
    onClose?.();
  };

  return (
    <div
      className={cn(
        "w-64 flex flex-col border-r border-border-light dark:border-border-dark bg-surface-light/40 dark:bg-bg-dark h-full shrink-0",
        className
      )}
    >
      <div className="p-3 border-b border-border-light dark:border-border-dark flex items-center gap-2">
        <Button onClick={handleNew} className="flex-1 gap-2 shadow-2xs" size="sm">
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </Button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-light dark:text-muted-dark hover:bg-border-light/50 dark:hover:bg-border-dark"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <SidebarSkeleton items={6} />
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-light dark:text-muted-dark">
            No chats yet. Start a new conversation!
          </div>
        ) : (

        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          return (
            <div
              key={conv.id}
              className={`group flex items-center justify-between px-2.5 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive
                  ? "bg-black/10 dark:bg-white/10 text-black dark:text-white font-semibold"
                  : "text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark"
              }`}
              onClick={() => handleSelect(conv.id)}
            >
              <div className="flex items-center gap-2 truncate pr-1">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{conv.title || "New Chat"}</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-70 sm:opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded transition-opacity"
                title="Delete chat"
                aria-label="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
