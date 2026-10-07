import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Conversation } from "../../types/api";

export interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationSidebarProps) {
  return (
    <div className="w-64 flex flex-col border-r border-border-light dark:border-border-dark bg-surface-light/40 dark:bg-bg-dark h-full">
      <div className="p-3 border-b border-border-light dark:border-border-dark">
        <Button onClick={onNewChat} className="w-full gap-2 shadow-2xs" size="sm">
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-light dark:text-muted-dark">
            No chats yet. Start a new conversation!
          </div>
        )}

        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          return (
            <div
              key={conv.id}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive
                  ? "bg-black/10 dark:bg-white/10 text-black dark:text-white font-semibold"
                  : "text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark"
              }`}
              onClick={() => onSelect(conv.id)}
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
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-opacity"
                title="Delete chat"
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
