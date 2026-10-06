import React, { useState } from "react";
import { useViewerStore } from "../../hooks/useViewerStore";
import { Citation } from "../../types/api";

export interface CitationChipProps {
  n: number;
  citation?: Citation;
}

export function CitationChip({ n, citation }: CitationChipProps) {
  const openViewer = useViewerStore((s) => s.openViewer);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (citation) {
      openViewer(
        citation.document_id,
        citation.filename,
        citation.page,
        citation.bboxes
      );
    }
  };

  return (
    <span className="relative inline-block mx-0.5 align-baseline">
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 transition-all cursor-pointer shadow-2xs"
        aria-label={`Citation ${n}`}
      >
        [{n}]
      </button>

      {showTooltip && citation && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 rounded-lg bg-bg-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-xl text-xs z-50 pointer-events-none text-left">
          <span className="block font-semibold text-text-light dark:text-text-dark truncate">
            {citation.filename}
          </span>
          <span className="block text-muted-light dark:text-muted-dark text-[11px] mb-1">
            Page {citation.page}
          </span>
          <span className="block text-text-light/80 dark:text-text-dark/80 line-clamp-3 text-[11px] italic">
            "{citation.snippet}"
          </span>
        </span>
      )}
    </span>
  );
}
