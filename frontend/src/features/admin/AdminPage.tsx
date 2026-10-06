import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Users } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";
import { apiClient } from "../../lib/apiClient";
import { MetricsResponse, UserUsage } from "../../types/api";

export function AdminPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["adminMetrics"],
    queryFn: () => apiClient<MetricsResponse>("/admin/metrics"),
  });

  const { data: usage = [], isLoading: usageLoading } = useQuery({
    queryKey: ["adminUsage"],
    queryFn: () => apiClient<UserUsage[]>("/admin/usage"),
  });

  if (metricsLoading || usageLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
          System Administration & Telemetry
        </h1>
        <p className="mt-1 text-sm text-muted-light dark:text-muted-dark">
          Pipeline stage latency percentiles, error rates, and user usage quotas.
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
          <div className="flex items-center justify-between text-muted-light dark:text-muted-dark">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Queries</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-text-light dark:text-text-dark">
            {metrics?.query_volume || 0}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
          <div className="flex items-center justify-between text-muted-light dark:text-muted-dark">
            <span className="text-xs font-semibold uppercase tracking-wider">Failure Rate</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-text-light dark:text-text-dark">
            {((metrics?.failure_rate || 0) * 100).toFixed(2)}%
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
          <div className="flex items-center justify-between text-muted-light dark:text-muted-dark">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-text-light dark:text-text-dark">
            {usage.length}
          </p>
        </div>
      </div>

      {/* Stage Latency Table */}
      <div className="p-6 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-4">
        <h3 className="text-base font-bold text-text-light dark:text-text-dark">
          Stage Latency Percentiles (ms)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-light dark:bg-border-dark/30 border-b border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark">
              <tr>
                <th className="py-2.5 px-4 font-medium">Stage</th>
                <th className="py-2.5 px-4 font-medium">p50</th>
                <th className="py-2.5 px-4 font-medium">p90</th>
                <th className="py-2.5 px-4 font-medium">p95</th>
                <th className="py-2.5 px-4 font-medium">p99</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark font-mono text-xs">
              {metrics?.stages &&
                Object.entries(metrics.stages).map(([stage, p]) => (
                  <tr key={stage} className="hover:bg-surface-light/40">
                    <td className="py-2.5 px-4 font-sans font-medium capitalize text-text-light dark:text-text-dark">
                      {stage.replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-4">{p.p50} ms</td>
                    <td className="py-2.5 px-4">{p.p90} ms</td>
                    <td className="py-2.5 px-4">{p.p95} ms</td>
                    <td className="py-2.5 px-4">{p.p99} ms</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Usage Table */}
      <div className="p-6 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-4">
        <h3 className="text-base font-bold text-text-light dark:text-text-dark">
          User Activity & Token Quotas
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-light dark:bg-border-dark/30 border-b border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark">
              <tr>
                <th className="py-2.5 px-4 font-medium">User</th>
                <th className="py-2.5 px-4 font-medium">Total Queries</th>
                <th className="py-2.5 px-4 font-medium">Prompt Tokens</th>
                <th className="py-2.5 px-4 font-medium">Completion Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark text-xs">
              {usage.map((u) => (
                <tr key={u.user_id} className="hover:bg-surface-light/40">
                  <td className="py-2.5 px-4 font-medium text-text-light dark:text-text-dark">
                    {u.email}
                  </td>
                  <td className="py-2.5 px-4 font-mono">{u.total_queries}</td>
                  <td className="py-2.5 px-4 font-mono">{u.total_tokens_in}</td>
                  <td className="py-2.5 px-4 font-mono">{u.total_tokens_out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
