import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useViewerStore } from "../../hooks/useViewerStore";
import { Citation } from "../../types/api";

export interface SourcesListProps {
  citations: Citation[];
}

export function SourcesList({ citations }: SourcesListProps) {
  const [expanded, setExpanded] = useState(false);
  const openViewer = useViewerStore((s) => s.openViewer);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border-light/60 dark:border-border-dark/60 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 font-medium text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>Sources ({citations.length})</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-4">
          {citations.map((c) => (
            <div
              key={c.n}
              onClick={() => openViewer(c.document_id, c.filename, c.page, c.bboxes)}
              className="p-2 rounded-lg bg-surface-light dark:bg-border-dark/40 hover:bg-primary/5 border border-border-light dark:border-border-dark cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-text-light dark:text-text-dark">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                    {c.n}
                  </span>
                  <FileText className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark shrink-0" />
                  <span className="truncate">{c.filename}</span>
                </span>
                <span className="text-[11px] text-muted-light dark:text-muted-dark ml-2 shrink-0">
                  Page {c.page}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-light dark:text-muted-dark line-clamp-2 italic">
                "{c.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
