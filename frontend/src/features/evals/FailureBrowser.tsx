import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { EvalResultRow } from "../../types/api";

export interface FailureBrowserProps {
  results: EvalResultRow[];
}

export function FailureBrowser({ results }: FailureBrowserProps) {
  const [filterMode, setFilterMode] = useState("all");
  const [onlyMisses, setOnlyMisses] = useState(false);

  const filtered = results.filter((r) => {
    if (filterMode !== "all" && r.mode !== filterMode) return false;
    if (onlyMisses && r.answerable && r.hit_at_k?.["hit@5"] === 1) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-1.5 text-xs text-text-light dark:text-text-dark"
          >
            <option value="all">All Modes</option>
            <option value="hybrid_rerank">Hybrid Rerank</option>
            <option value="hybrid">Hybrid</option>
            <option value="vector">Vector</option>
            <option value="fts">FTS</option>
          </select>

          <label className="flex items-center gap-2 text-xs text-muted-light dark:text-muted-dark cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMisses}
              onChange={(e) => setOnlyMisses(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span>Show retrieval misses only</span>
          </label>
        </div>

        <span className="text-xs text-muted-light dark:text-muted-dark">
          Showing {filtered.length} of {results.length} results
        </span>
      </div>

      <div className="space-y-3">
        {filtered.slice(0, 25).map((row, idx) => {
          const hit5 = row.hit_at_k?.["hit@5"] === 1;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark text-xs space-y-2 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-text-light dark:text-text-dark">
                  Q: {row.question}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-surface-light dark:bg-border-dark">
                    {row.mode}
                  </span>
                  {hit5 ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Hit@5
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <XCircle className="w-3.5 h-3.5" />
                      Miss
                    </span>
                  )}
                </div>
              </div>

              <div className="text-muted-light dark:text-muted-dark bg-surface-light/50 dark:bg-border-dark/20 p-2.5 rounded-lg">
                <span className="font-medium text-text-light dark:text-text-dark block mb-1">
                  Generated Answer:
                </span>
                <p className="line-clamp-3 italic">"{row.answer}"</p>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-muted-light dark:text-muted-dark pt-1 border-t border-border-light/40 dark:border-border-dark/40">
                <span>Faithfulness: {(row.faithfulness * 100).toFixed(0)}%</span>
                <span>Citation Acc: {(row.citation_accuracy * 100).toFixed(0)}%</span>
                <span>MRR: {row.rr.toFixed(2)}</span>
                <span>Latency: {row.latency_ms} ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
