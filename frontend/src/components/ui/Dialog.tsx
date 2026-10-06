import { type ReactNode } from "react";
import { X } from "lucide-react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-bg-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div>
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-muted-light dark:text-muted-dark">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark rounded-md hover:bg-surface-light dark:hover:bg-border-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
