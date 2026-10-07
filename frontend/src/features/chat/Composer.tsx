import React, { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "../../components/ui/Button";

export interface ComposerProps {
  onSend: (text: string, mode: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, onStop, isStreaming, disabled = false, placeholder }: ComposerProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("hybrid_rerank");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming || disabled) return;
    onSend(text.trim(), mode);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return (
    <div className="p-4 border-t border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
      <div className="flex items-center justify-between mb-2 text-xs text-muted-light dark:text-muted-dark">
        <div className="flex items-center gap-2">
          <span className="font-medium">Mode:</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={isStreaming}
            className="bg-surface-light dark:bg-border-dark/50 border border-border-light dark:border-border-dark rounded px-2 py-0.5 text-xs text-text-light dark:text-text-dark focus:outline-none"
          >
            <option value="hybrid_rerank">Hybrid + Rerank (Recommended)</option>
            <option value="hybrid">Hybrid (RRF)</option>
            <option value="vector">Vector Only</option>
            <option value="fts">FTS Lexical Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className={text.length > 3800 ? "text-amber-500 font-bold" : ""}>
            {text.length}/4000
          </span>
        </div>
      </div>

      <div className="relative flex items-end gap-2 bg-surface-light dark:bg-border-dark/30 rounded-xl border border-border-light dark:border-border-dark p-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={4000}
          placeholder={
            placeholder ??
            (disabled
              ? "Upload and index documents to start asking questions..."
              : "Ask a question about your documents... (Enter to send, Shift+Enter for newline)")
          }
          className="flex-1 bg-transparent border-0 resize-none focus:outline-none text-sm text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark max-h-44 py-1.5 px-2"
        />

        {isStreaming ? (
          <Button
            size="sm"
            variant="danger"
            onClick={onStop}
            className="shrink-0 h-9 px-3 gap-1 rounded-lg"
            title="Stop generating"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || disabled}
            className="shrink-0 h-9 w-9 p-0 rounded-lg"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
