import React, { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "../../components/ui/Button";

export interface ComposerProps {
  onSend: (text: string, mode: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  text?: string;
  onTextChange?: (val: string) => void;
  mode?: string;
  onModeChange?: (val: string) => void;
}

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder,
  text: controlledText,
  onTextChange,
  mode: controlledMode,
  onModeChange,
}: ComposerProps) {
  const [internalText, setInternalText] = useState("");
  const [internalMode, setInternalMode] = useState("hybrid_rerank");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = controlledText !== undefined ? controlledText : internalText;
  const mode = controlledMode !== undefined ? controlledMode : internalMode;

  const handleTextChange = (newVal: string) => {
    if (onTextChange) onTextChange(newVal);
    if (controlledText === undefined) setInternalText(newVal);
  };

  const handleModeChange = (newVal: string) => {
    if (onModeChange) onModeChange(newVal);
    if (controlledMode === undefined) setInternalMode(newVal);
  };

  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming || disabled) return;
    onSend(text.trim(), mode);
    handleTextChange("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextChange(e.target.value);
  };

  return (
    <div className="p-4 border-t border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
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

        {text.length > 3800 && (
          <span className="text-[11px] text-amber-500 font-mono font-medium self-center px-1 shrink-0">
            {text.length}/4000
          </span>
        )}

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
