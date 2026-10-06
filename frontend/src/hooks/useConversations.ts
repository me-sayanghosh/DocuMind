import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../lib/auth";
import { Conversation, Message } from "../types/api";

export function useConversations() {
  const queryClient = useQueryClient();
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace);
  const wsId = currentWorkspace?.id;

  const conversationsQuery = useQuery({
    queryKey: ["conversations", wsId],
    queryFn: () => (wsId ? apiClient<Conversation[]>(`/workspaces/${wsId}/conversations`) : Promise.resolve([])),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title?: string; doc_ids?: string[] }) =>
      apiClient<Conversation>(`/workspaces/${wsId}/conversations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", wsId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiClient(`/conversations/${conversationId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", wsId] });
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    createConversation: createMutation.mutateAsync,
    deleteConversation: deleteMutation.mutateAsync,
  };
}

export function useConversationMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      conversationId ? apiClient<Message[]>(`/conversations/${conversationId}/messages`) : Promise.resolve([]),
    enabled: !!conversationId,
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, value }: { messageId: string; value: number }) =>
      apiClient(`/messages/${messageId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    refetch: messagesQuery.refetch,
    submitFeedback: feedbackMutation.mutateAsync,
  };
}
