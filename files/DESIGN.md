# DESIGN

Visual and UX design guide. Engineering-facing component specs live in UI-COMPONENTS.md.

## 1. Principles
1. **Trust through evidence.** Every answer shows where it came from; citations are first-class UI, not footnotes.
2. **Show the system working.** Ingestion progress, retrieval stages, and "not found" are visible and honest.
3. **Calm and dense.** A reading/work tool: low chroma, high legibility, minimal chrome.
4. **Keyboard first.** Everything in chat and library reachable without a mouse.
5. **Accessible by default.** WCAG 2.1 AA contrast, focus rings, reduced-motion support, screen-reader labels.

## 2. Information architecture

```
/login  /register
/app
 ├─ /library                 documents list + upload
 ├─ /chat                    conversations list (sidebar) + empty state
 │    └─ /chat/:conversationId   chat pane + PDF viewer pane
 ├─ /evals                   (owner/admin) runs, compare
 ├─ /admin                   (admin) latency and usage
 └─ /settings                profile, workspace, danger zone
```
Persistent shell: left sidebar (workspace switcher, nav, conversations), top bar (scope picker, user menu).

## 3. Key screens

### Library
- Header with "Upload PDF" button; whole page is a drop zone.
- Table/cards: filename, pages, size, status badge, uploaded date, actions (open, re-ingest, delete).
- Row states: queued (grey), processing (blue with progress bar x/y), ready (green), failed (red, error message + retry).

### Chat (split view)
```
┌───────────────┬────────────────────────────┬──────────────────────┐
│ Sidebar       │ Chat                       │ PDF viewer           │
│ conversations │  messages (streaming)      │  page N, highlight   │
│               │  citation chips [1][2]     │  doc tabs / sources  │
│               │  composer + scope + mode   │                      │
└───────────────┴────────────────────────────┴──────────────────────┘
```
- Viewer opens on first citation click; collapsible on narrow screens (becomes a drawer).
- Sources list under each answer: filename · p.7 · snippet preview.
- Refusal answers use a distinct neutral style with suggestions ("Try rephrasing or select another document").

### Evals
- Run list; run detail with metrics table per mode, bar chart (hit@5, MRR), failure browser (question, expected chunk, what was retrieved).
- "Copy as Markdown" button for README tables.

### Admin
- p50/p95 per stage, queries/day, failure rate, top error codes.

## 4. Visual language

| Token | Value (light) | Value (dark) |
|---|---|---|
| bg | #FFFFFF | #0F1115 |
| surface | #F6F7F9 | #171A21 |
| border | #E4E7EC | #2A2F3A |
| text | #101828 | #E6E8EC |
| muted | #667085 | #98A2B3 |
| primary | #4F46E5 (indigo) | #818CF8 |
| success / warn / danger | #12B76A / #F79009 / #F04438 | adjusted for contrast |
| highlight (PDF) | rgba(250, 204, 21, 0.45) | same |

- Type: Inter (UI), JetBrains Mono (code/ids). Scale 12/14/16/20/24/32; body 14–16px, line-height 1.5.
- Spacing: 4px base grid. Radius 8px cards, 6px inputs. Shadows minimal.
- Icons: lucide-react.
- Motion: 120–200 ms ease-out; streaming text appears without jitter (append, no re-layout); respect `prefers-reduced-motion`.

## 5. Interaction details
- **Streaming:** show "Searching documents…" → "Reading sources…" → tokens. A Stop button replaces Send during generation.
- **Citation chips:** numbered `[1]`; hover shows filename + page + snippet; click scrolls viewer and pulses the highlight 1.5 s.
- **Upload:** drag-over state, per-file progress, duplicate notice ("Already uploaded") instead of an error.
- **Empty states:** library (explain + CTA), chat (3 example questions drawn from the doc titles), evals (explain what it measures).
- **Errors:** inline, actionable, with a retry; never raw stack traces. Toasts only for transient confirmations.
- **Confirmation:** destructive actions (delete document/workspace) require typed or explicit confirmation stating what is removed.

## 6. Responsive behavior
- ≥1280: three panes. 768–1279: sidebar collapses to icons, viewer as right drawer. <768: single pane with bottom tab/drawer; citations open viewer full-screen.

## 7. Accessibility checklist
- Focus order matches visual order; visible focus ring (2 px primary).
- Streaming region `aria-live="polite"`, completion announced once.
- Status badges have text, not color only.
- PDF viewer provides page number controls and text-layer selection.
- Contrast ≥ 4.5:1 for text; test with axe in CI.

## 8. Content and tone
Plain, direct microcopy. Refusal: "I couldn't find this in your documents." Never imply certainty the retrieval doesn't support.
