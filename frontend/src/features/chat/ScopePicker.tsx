import { useState } from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { Document } from "../../types/api";

export interface ScopePickerProps {
  documents: Document[];
  selectedDocIds: string[];
  onChange: (docIds: string[]) => void;
}

export function ScopePicker({ documents, selectedDocIds, onChange }: ScopePickerProps) {
  const [open, setOpen] = useState(false);

  const readyDocs = documents.filter((d) => d.status === "ready");

  const toggleDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      onChange(selectedDocIds.filter((d) => d !== id));
    } else {
      onChange([...selectedDocIds, id]);
    }
  };

  const selectAll = () => {
    onChange([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:bg-border-light/50 text-text-light dark:text-text-dark transition-colors"
      >
        <Filter className="w-3.5 h-3.5 text-text-light dark:text-text-dark shrink-0" />
        <span className="truncate max-w-[130px]">
          {selectedDocIds.length === 0
            ? "All Documents"
            : `${selectedDocIds.length} Document${selectedDocIds.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-light dark:text-muted-dark" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-60 bg-bg-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl z-30 p-2 text-xs space-y-1">
            <button
              onClick={selectAll}
              className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-light dark:hover:bg-border-dark text-left"
            >
              <span>Search across all documents</span>
              {selectedDocIds.length === 0 && <Check className="w-4 h-4 text-black dark:text-white" />}
            </button>

            <div className="border-t border-border-light dark:border-border-dark my-1" />

            <div className="max-h-48 overflow-y-auto space-y-1">
              {readyDocs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-light dark:hover:bg-border-dark text-left truncate"
                  >
                    <span className="truncate pr-2">{doc.filename}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
