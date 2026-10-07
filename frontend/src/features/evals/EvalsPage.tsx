import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, Play, TestTube2, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { EvalRun } from "../../types/api";
import { FailureBrowser } from "./FailureBrowser";
import { MetricsTable } from "./MetricsTable";

export function EvalsPage() {
  const queryClient = useQueryClient();
  const wsId = useAuthStore((s) => s.currentWorkspace?.id);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [nQuestions, setNQuestions] = useState(10);
  const [copied, setCopied] = useState(false);

  // 1. Fetch runs
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["evals", wsId],
    queryFn: () => (wsId ? apiClient<EvalRun[]>(`/workspaces/${wsId}/evals`) : Promise.resolve([])),
    enabled: !!wsId,
    refetchInterval: (query) => {
      // Auto-poll if any run is running without summary
      const hasPending = query.state.data?.some((r) => !r.finished_at);
      return hasPending ? 3000 : false;
    },
  });

  // Default select first run if none selected
  const activeRunId = selectedRunId || (runs.length > 0 ? runs[0].id : null);

  // 2. Fetch detail for selected run
  const { data: runDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["evalDetail", wsId, activeRunId],
    queryFn: () =>
      wsId && activeRunId
        ? apiClient<{ run: EvalRun; results: any[] }>(`/workspaces/${wsId}/evals/${activeRunId}`)
        : Promise.resolve(null),
    enabled: !!wsId && !!activeRunId,
  });

  // 3. Trigger run mutation
  const triggerMutation = useMutation({
    mutationFn: () =>
      apiClient(`/workspaces/${wsId}/evals`, {
        method: "POST",
        body: JSON.stringify({
          n_questions: nQuestions,
          modes: ["vector", "fts", "hybrid", "hybrid_rerank"],
          k: 5,
          include_unanswerable: true,
        }),
      }),
    onSuccess: (data) => {
      setTriggerModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["evals", wsId] });
      setSelectedRunId(data.run_id);
    },
  });

  // 4. Delete run mutation
  const deleteMutation = useMutation({
    mutationFn: (runId: string) =>
      apiClient(`/workspaces/${wsId}/evals/${runId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["evals", wsId] });
      if (selectedRunId === deletedId) {
        setSelectedRunId(null);
      }
    },
  });

  const handleCopyMarkdown = async () => {
    if (!wsId || !activeRunId) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${wsId}/evals/${activeRunId}/export?format=md`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
      const md = await res.text();
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
            Evaluation Harness
          </h1>
          <p className="mt-1 text-sm text-muted-light dark:text-muted-dark">
            Measure retrieval quality and answer faithfulness across vector, FTS, hybrid, and rerank strategies.
          </p>
        </div>

        <Button onClick={() => setTriggerModalOpen(true)} className="gap-2">
          <Play className="w-4 h-4" />
          <span>New Evaluation</span>
        </Button>
      </div>

      {runsLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={TestTube2}
          title="No evaluations yet"
          description="Run your first evaluation to generate synthetic questions, benchmark retrieval strategies, and evaluate citation accuracy."
          action={
            <Button onClick={() => setTriggerModalOpen(true)} className="gap-2">
              <Play className="w-4 h-4" />
              <span>Run First Evaluation</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Runs Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2">
              Evaluation Runs
            </h3>
            <div className="space-y-1">
              {runs.map((r) => {
                const isSelected = r.id === activeRunId;
                const hasError = !!r.summary?.error;
                return (
                  <div
                    key={r.id}
                    className={`group relative flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-black/5 dark:bg-white/10 border-black dark:border-white text-black dark:text-white font-semibold"
                        : "bg-bg-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-black/40 dark:hover:border-white/40"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedRunId(r.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span>{r.n_questions} Questions</span>
                        <span className="opacity-75">{formatDate(r.created_at)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-light dark:text-muted-dark">
                        {r.finished_at ? (
                          hasError ? (
                            <span className="text-rose-500 font-medium">Interrupted / Failed</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Completed</span>
                          )
                        ) : (
                          <span className="text-amber-600 font-medium animate-pulse">Running...</span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(r.id);
                      }}
                      title="Delete evaluation run"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-light dark:text-muted-dark hover:text-rose-500 transition-opacity ml-2 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Run Results View */}
          <div className="lg:col-span-3 space-y-6">
            {detailLoading ? (
              <div className="flex justify-center p-12">
                <Spinner className="w-8 h-8" />
              </div>
            ) : runDetail?.run.summary ? (
              <>
                {runDetail.run.summary.error && (
                  <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm">
                    <div className="font-semibold flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Evaluation Notice</span>
                    </div>
                    <p>{runDetail.run.summary.error}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-light dark:text-text-dark">
                    Benchmark Comparison
                  </h3>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      className="gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied Markdown" : "Copy as Markdown"}</span>
                    </Button>
                  </div>
                </div>

                <MetricsTable summary={runDetail.run.summary} />

                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                  <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4">
                    Question Failure & Retrieval Browser
                  </h3>
                  <FailureBrowser results={runDetail.results} />
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-sm text-muted-light dark:text-muted-dark border rounded-xl border-dashed">
                Evaluation is running in background. Metrics will appear here upon completion...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trigger Modal */}
      <Dialog
        open={triggerModalOpen}
        onClose={() => setTriggerModalOpen(false)}
        title="Trigger Evaluation Run"
        description="Generates synthetic evaluation questions and benchmarks hit@5, MRR, faithfulness, and citation accuracy."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Number of synthetic questions
            </label>
            <input
              type="number"
              min={5}
              max={50}
              value={nQuestions}
              onChange={(e) => setNQuestions(parseInt(e.target.value, 10))}
              className="w-full h-10 px-3 py-2 text-sm rounded-lg border bg-bg-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            />
          </div>

          <div className="text-xs text-muted-light dark:text-muted-dark bg-surface-light dark:bg-border-dark/30 p-3 rounded-lg border border-border-light dark:border-border-dark space-y-1">
            <p className="font-semibold text-text-light dark:text-text-dark">Evaluated Modes:</p>
            <p>1. Dense Vector (pgvector cosine similarity)</p>
            <p>2. FTS Lexical Search (Postgres tsvector + websearch_to_tsquery)</p>
            <p>3. Hybrid Search (Reciprocal Rank Fusion k=60)</p>
            <p>4. Hybrid + Cross-Encoder Reranking</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setTriggerModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => triggerMutation.mutate()}
              isLoading={triggerMutation.isPending}
            >
              Start Benchmark
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}
