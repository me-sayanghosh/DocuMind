import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export interface FeedbackButtonsProps {
  messageId?: string;
  initialFeedback?: number | null;
  onFeedback: (val: number) => Promise<any>;
}

export function FeedbackButtons({
  messageId: _messageId,
  initialFeedback = null,
  onFeedback,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<number | null>(initialFeedback);
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async (val: number) => {
    if (submitting) return;
    const newVal = feedback === val ? 0 : val;
    setSubmitting(true);
    try {
      await onFeedback(newVal);
      setFeedback(newVal);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 text-muted-light dark:text-muted-dark">
      <button
        onClick={() => handleClick(1)}
        className={`p-1 rounded hover:bg-surface-light dark:hover:bg-border-dark transition-colors ${
          feedback === 1 ? "text-primary font-bold" : ""
        }`}
        title="Good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleClick(-1)}
        className={`p-1 rounded hover:bg-surface-light dark:hover:bg-border-dark transition-colors ${
          feedback === -1 ? "text-red-500 font-bold" : ""
        }`}
        title="Bad response"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
