export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: 'owner' | 'member';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MeResponse {
  user: User;
  workspaces: Workspace[];
}

export interface Document {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  page_count: number;
  chunks_done: number;
  chunks_total: number;
  size_bytes: number;
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BBox {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Citation {
  n: number;
  document_id: string;
  filename: string;
  page: number;
  chunk_id?: string | null;
  snippet: string;
  bboxes: BBox[];
  rerank_score?: number;
}

export interface MessageTrace {
  rewrite_ms: number;
  dense_ms: number;
  fts_ms: number;
  fuse_ms: number;
  rerank_ms: number;
  first_token_ms: number;
  total_ms: number;
  candidates: number;
  top_score: number;
  cache_hit: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  standalone_query?: string | null;
  retrieval_mode?: string | null;
  status: 'complete' | 'refused' | 'error' | 'stopped';
  feedback?: number | null;
  citations: Citation[];
  trace?: MessageTrace | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  title: string;
  doc_scope?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SearchCandidate {
  n: number;
  chunk_id: string;
  document_id: string;
  filename: string;
  page: number;
  snippet: string;
  score: number;
  bboxes: BBox[];
}

export interface EvalRun {
  id: string;
  workspace_id: string;
  created_by: string;
  config: Record<string, any>;
  n_questions: number;
  created_at: string;
  finished_at?: string | null;
  summary?: {
    error?: string;
    modes?: Record<
      string,
      {
        'hit@5': number;
        mrr: number;
        faithfulness: number;
        citation_acc: number;
        refusal_correct: number;
        avg_latency_ms: number;
      }
    >;
  } | null;
}

export interface EvalResultRow {
  id: string;
  question: string;
  mode: string;
  answerable: boolean;
  hit_at_k: Record<string, number>;
  rr: number;
  answer: string;
  faithfulness: number;
  citation_accuracy: number;
  refused: boolean;
  latency_ms: number;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface MetricsResponse {
  query_volume: number;
  failure_rate: number;
  stages: Record<string, LatencyPercentiles>;
}

export interface UserUsage {
  user_id: string;
  email: string;
  total_queries: number;
  total_tokens_in: number;
  total_tokens_out: number;
}
