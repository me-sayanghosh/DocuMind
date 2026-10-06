import { Activity, X } from "lucide-react";
import { MessageTrace } from "../../types/api";

export interface RetrievalInspectorProps {
  trace?: MessageTrace | null;
  mode?: string | null;
  open: boolean;
  onClose: () => void;
}

export function RetrievalInspector({ trace, mode, open, onClose }: RetrievalInspectorProps) {
  if (!open || !trace) return null;

  const stages = [
    { label: "Query Rewrite", ms: trace.rewrite_ms },
    { label: "Dense Retrieval", ms: trace.dense_ms },
    { label: "FTS Lexical Search", ms: trace.fts_ms },
    { label: "RRF Fusion", ms: trace.fuse_ms },
    { label: "Cross-Encoder Rerank", ms: trace.rerank_ms },
    { label: "First Token Latency", ms: trace.first_token_ms },
    { label: "Total Latency", ms: trace.total_ms, bold: true },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-bg-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark shadow-2xl p-6 z-40 flex flex-col justify-between animate-in slide-in-from-right duration-200">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-light dark:text-text-dark">
              Retrieval Inspector
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-light dark:hover:bg-border-dark text-muted-light dark:text-muted-dark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Execution Mode
          </span>
          <p className="text-sm font-semibold text-text-light dark:text-text-dark capitalize mt-0.5">
            {mode?.replace("_", " ") || "Hybrid Rerank"}
          </p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Metrics & Scores
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-surface-light dark:bg-border-dark/30 border border-border-light dark:border-border-dark">
              <span className="text-muted-light dark:text-muted-dark block">Candidates</span>
              <span className="font-semibold text-text-light dark:text-text-dark">{trace.candidates}</span>
            </div>
            <div className="p-2 rounded bg-surface-light dark:bg-border-dark/30 border border-border-light dark:border-border-dark">
              <span className="text-muted-light dark:text-muted-dark block">Top Score</span>
              <span className="font-semibold text-text-light dark:text-text-dark">
                {trace.top_score.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Pipeline Latency Breakdown
          </span>
          <div className="mt-2 space-y-2 text-xs">
            {stages.map((stg) => (
              <div
                key={stg.label}
                className={`flex justify-between items-center py-1 border-b border-border-light/40 dark:border-border-dark/40 ${
                  stg.bold ? "font-bold text-primary pt-2 border-t" : "text-muted-light dark:text-muted-dark"
                }`}
              >
                <span>{stg.label}</span>
                <span className="font-mono">{stg.ms} ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted-light dark:text-muted-dark text-center pt-4 border-t border-border-light dark:border-border-dark">
        Audit log per NFR-7 Observability
      </div>
    </div>
  );
}
