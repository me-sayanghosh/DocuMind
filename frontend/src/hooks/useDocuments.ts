import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../lib/auth";
import { Document } from "../types/api";

export function useDocuments() {
  const queryClient = useQueryClient();
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace);
  const wsId = currentWorkspace?.id;

  const documentsQuery = useQuery({
    queryKey: ["documents", wsId],
    queryFn: () => (wsId ? apiClient<Document[]>(`/workspaces/${wsId}/documents`) : Promise.resolve([])),
    enabled: !!wsId,
    refetchInterval: (query) => {
      // Poll every 3 seconds if any document is in non-terminal state
      const docs = query.state.data;
      const hasPending = docs?.some((d) => d.status === "queued" || d.status === "processing");
      return hasPending ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiClient(`/workspaces/${wsId}/documents/${documentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", wsId] });
    },
  });

  const reingestMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiClient(`/workspaces/${wsId}/documents/${documentId}/reingest`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", wsId] });
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    isError: documentsQuery.isError,
    deleteDocument: deleteMutation.mutateAsync,
    reingestDocument: reingestMutation.mutateAsync,
    refetch: documentsQuery.refetch,
  };
}
