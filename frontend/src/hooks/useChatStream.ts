import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../lib/auth";
import { readSSEStream } from "../lib/sse";
import { Citation } from "../types/api";

export type StreamState = "idle" | "rewriting" | "retrieving" | "reranking" | "generating" | "error";

export interface StreamSource {
  n: number;
  document_id: string;
  filename: string;
  page: number;
  chunk_id: string;
  snippet: string;
  score: number;
}

export function useChatStream(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamState>("idle");
  const [draft, setDraft] = useState<string>("");
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState("idle");
  };

  const send = async (
    content: string,
    opts: { mode?: string; docIds?: string[]; conversationId?: string } = {}
  ) => {
    const targetConvId = opts.conversationId || conversationId;
    if (!targetConvId) return;

    // Reset previous stream state
    stop();
    setState("retrieving");
    setDraft("");
    setSources([]);
    setCitations([]);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const token = useAuthStore.getState().accessToken;

    try {
      const response = await fetch(`/api/v1/conversations/${targetConvId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          content,
          mode: opts.mode || "hybrid_rerank",
          doc_ids: opts.docIds && opts.docIds.length > 0 ? opts.docIds : null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start chat generation");
      }

      let accumulated = "";

      await readSSEStream(
        response,
        (event) => {
          switch (event.event) {
            case "status":
              if (event.data?.stage) {
                setState(event.data.stage);
              }
              break;
            case "sources":
              if (event.data?.items) {
                setSources(event.data.items);
              }
              break;
            case "token":
              if (event.data?.text) {
                accumulated += event.data.text;
                setDraft(accumulated);
              }
              break;
            case "citations":
              if (event.data?.items) {
                setCitations(event.data.items);
              }
              break;
            case "done":
              setState("idle");
              queryClient.invalidateQueries({ queryKey: ["messages", targetConvId] });
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
              break;
            case "error":
              setState("error");
              setErrorMessage(event.data?.message || "An error occurred during generation");
              break;
          }
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setState("error");
        setErrorMessage(err.message || "Network error");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return {
    send,
    stop,
    state,
    draft,
    sources,
    citations,
    errorMessage,
    isStreaming: state !== "idle" && state !== "error",
  };
}
