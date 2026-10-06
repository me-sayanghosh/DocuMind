# UI-COMPONENTS

React 18 + TypeScript + Vite + Tailwind. Server state via TanStack Query; light client state via Zustand. Types generated from OpenAPI (`openapi-typescript`).

## 1. Folder structure

```
src/
├─ app/            router, providers (QueryClient, Auth), layouts
├─ components/ui/  primitives: Button, Input, Badge, Dialog, Toast, Tooltip, Spinner, Progress, EmptyState, Tabs, Skeleton
├─ features/
│  ├─ auth/        LoginForm, RegisterForm, RequireAuth
│  ├─ workspace/   WorkspaceSwitcher, WorkspaceSettings
│  ├─ library/     UploadDropzone, DocumentTable, DocumentRow, StatusBadge
│  ├─ chat/        ChatPage, MessageList, MessageBubble, Composer, CitationChip, SourcesList, ScopePicker, ConversationSidebar
│  ├─ viewer/      PdfViewer, PageCanvas, HighlightLayer, ViewerToolbar
│  ├─ evals/       RunList, RunDetail, MetricsTable, MetricsChart, FailureBrowser
│  └─ admin/       LatencyChart, UsageTable
├─ lib/            apiClient, sse, auth, format, cn
└─ hooks/          useDocuments, useDocumentEvents, useChatStream, useConversations, useViewerStore
```

## 2. Core components (props and behavior)

### Layout
- `AppShell` — sidebar + top bar + `<Outlet/>`; handles responsive collapse.
- `RequireAuth` — redirects to `/login`; attempts silent refresh before redirect.

### Library
| Component | Props | Notes |
|---|---|---|
| `UploadDropzone` | `workspaceId`, `onUploaded(doc)` | Accepts PDF only, size check client-side, per-file progress via XHR/fetch upload events; shows duplicate notice |
| `DocumentTable` | `documents`, `onDelete`, `onOpen` | Polls or subscribes to SSE for non-terminal docs |
| `StatusBadge` | `status`, `progress?` | Text + icon + color |
| `DeleteDocumentDialog` | `doc`, `open`, `onConfirm` | States what will be removed |

### Chat
| Component | Props | States |
|---|---|---|
| `ChatPage` | route param `conversationId` | loading, empty, ready, error |
| `MessageList` | `messages`, `streamingMessage?` | auto-scroll unless user scrolled up; `aria-live` region |
| `MessageBubble` | `message`, `onCitationClick` | user, assistant, streaming, refused, error, stopped |
| `Markdown` | `text` | sanitized renderer; turns `[n]` into `CitationChip` |
| `CitationChip` | `n`, `citation`, `onClick` | hover card with filename · page · snippet |
| `SourcesList` | `citations` | collapsible; click opens viewer |
| `Composer` | `onSend`, `onStop`, `isStreaming`, `disabled` | Enter to send, Shift+Enter newline, char counter, disabled while no ready docs |
| `ScopePicker` | `documents`, `value`, `onChange` | all / selected docs |
| `RetrievalInspector` | `messageId` | drawer showing stage scores and timings (dev/power feature) |
| `FeedbackButtons` | `messageId` | thumbs up/down |

### Viewer
| Component | Props | Notes |
|---|---|---|
| `PdfViewer` | `documentId`, `target?: {page, bboxes}` | react-pdf; fetch with auth header → blob URL; lazy-render pages |
| `HighlightLayer` | `bboxes`, `scale`, `pageHeight` | converts PDF points (origin bottom-left) to CSS pixels; pulse animation on target change |
| `ViewerToolbar` | page, zoom, doc tabs | keyboard shortcuts (←/→ pages, +/−) |

### Evals/Admin
`MetricsTable` (modes × metrics, best value highlighted), `MetricsChart` (grouped bars), `FailureBrowser` (filter by mode, show expected vs retrieved chunk text), `LatencyChart` (p50/p95 per stage).

## 3. Streaming hook contract

```ts
useChatStream(conversationId) => {
  send(content: string, opts?: { mode?: Mode; docIds?: string[] }): void
  stop(): void
  state: 'idle' | 'rewriting' | 'retrieving' | 'reranking' | 'generating' | 'error'
  draft: string                 // accumulated tokens
  sources: Source[]             // from `sources` event
  citations: Citation[]         // final, from `citations` event
}
```
Implementation: `fetch` POST with `AbortController`, parse SSE frames from `ReadableStream`, batch token updates with `requestAnimationFrame` to avoid excessive re-renders, on `done` invalidate the messages query.

## 4. State management
- **TanStack Query:** documents, conversations, messages, eval runs (keys scoped by `workspaceId`).
- **Zustand `useViewerStore`:** `{ open, documentId, target, setTarget }` so any citation click can drive the viewer.
- **Auth store:** access token in memory; interceptor refreshes on 401 and retries once.

## 5. Forms and validation
`react-hook-form` + `zod` (email format, password ≥ 10 chars, message ≤ 4000). Server errors mapped to field errors via problem `code`.

## 6. Styling conventions
Tailwind utility classes with design tokens from DESIGN.md as CSS variables; `cn()` helper; dark mode via `class` strategy; no inline hex values.

## 7. Component quality bar
- Each feature component handles loading, empty, error, and success states.
- Storybook (optional) or Vitest + Testing Library for behavior; axe checks on main pages.
- No component fetches directly; use hooks in `hooks/` or `features/*/api`.

## 8. Highlight alignment notes
- Store bboxes in PDF user space at ingestion (PyMuPDF `page.get_text("blocks"/"dict")`).
- Viewer scale = rendered width / page.mediaBox width; y flipped: `top = (pageHeight - y1) * scale`.
- Fallback when bboxes are missing: highlight via text-layer search for the snippet's first/last 8 words.
