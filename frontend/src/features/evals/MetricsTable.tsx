import React from "react";
import { formatPercent } from "../../lib/format";

export interface MetricsTableProps {
  summary: {
    modes: Record<
      string,
      {
        "hit@5": number;
        mrr: number;
        faithfulness: number;
        citation_acc: number;
        refusal_correct: number;
        avg_latency_ms: number;
      }
    >;
  };
}

export function MetricsTable({ summary }: MetricsTableProps) {
  const modes = Object.keys(summary.modes || {});

  // Find best values for highlighting
  const bestHit5 = modes.length > 0 ? Math.max(...modes.map((m) => summary.modes[m]?.["hit@5"] ?? 0)) : 0;
  const bestMrr = modes.length > 0 ? Math.max(...modes.map((m) => summary.modes[m]?.mrr ?? 0)) : 0;
  const bestFaith = modes.length > 0 ? Math.max(...modes.map((m) => summary.modes[m]?.faithfulness ?? 0)) : 0;
  const bestCite = modes.length > 0 ? Math.max(...modes.map((m) => summary.modes[m]?.citation_acc ?? 0)) : 0;
  const bestRefusal = modes.length > 0 ? Math.max(...modes.map((m) => summary.modes[m]?.refusal_correct ?? 0)) : 0;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-light dark:bg-border-dark/30 border-b border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark">
          <tr>
            <th className="py-3 px-4 font-medium">Retrieval Mode</th>
            <th className="py-3 px-4 font-medium">hit@5</th>
            <th className="py-3 px-4 font-medium">MRR</th>
            <th className="py-3 px-4 font-medium">Faithfulness</th>
            <th className="py-3 px-4 font-medium">Citation Acc</th>
            <th className="py-3 px-4 font-medium">Refusal Acc</th>
            <th className="py-3 px-4 font-medium">Latency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {modes.map((mode) => {
            const m = summary.modes[mode];
            if (!m) return null;
            const isHybridRerank = mode === "hybrid_rerank";
            return (
              <tr
                key={mode}
                className={`hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 transition-colors ${
                  isHybridRerank ? "font-semibold bg-primary/5" : ""
                }`}
              >
                <td className="py-3 px-4 capitalize">
                  {mode.replace("_", " ")}
                  {isHybridRerank && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                      Target
                    </span>
                  )}
                </td>
                <td
                  className={`py-3 px-4 ${
                    m["hit@5"] === bestHit5 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""
                  }`}
                >
                  {formatPercent(m["hit@5"])}
                </td>
                <td
                  className={`py-3 px-4 ${
                    m.mrr === bestMrr ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""
                  }`}
                >
                  {m.mrr.toFixed(3)}
                </td>
                <td
                  className={`py-3 px-4 ${
                    m.faithfulness === bestFaith ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""
                  }`}
                >
                  {formatPercent(m.faithfulness)}
                </td>
                <td
                  className={`py-3 px-4 ${
                    m.citation_acc === bestCite ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""
                  }`}
                >
                  {formatPercent(m.citation_acc)}
                </td>
                <td
                  className={`py-3 px-4 ${
                    m.refusal_correct === bestRefusal ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""
                  }`}
                >
                  {formatPercent(m.refusal_correct)}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-muted-light dark:text-muted-dark">
                  {m.avg_latency_ms} ms
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
