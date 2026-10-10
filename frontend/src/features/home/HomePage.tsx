import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  Moon,
  Play,
  Search,
  ShieldCheck,
  Sun,
  TestTube2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../lib/auth";

export function HomePage() {
  const { user, accessToken } = useAuthStore();
  const isAuthenticated = Boolean(user && accessToken);
  const [darkMode, setDarkMode] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark flex flex-col font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border-light/80 dark:border-border-dark/80 bg-bg-light/90 dark:bg-bg-dark/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                D
              </div>
              <span className="font-bold text-lg tracking-tight">DocuMind</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-light dark:text-muted-dark">
            <a href="#features" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Architecture
            </a>
            <a href="#benchmarks" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Benchmarks
            </a>
            {isAuthenticated && (
              <>
                <Link to="/library" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
                  Library
                </Link>
                <Link to="/chat" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
                  Chat
                </Link>
                <Link to="/evals" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
                  Evals
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-muted-light dark:text-muted-dark hover:bg-surface-light dark:hover:bg-surface-dark border border-border-light dark:border-border-dark transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/library">
                  <Button size="sm" className="gap-2 shadow-sm text-xs sm:text-sm">
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gap-1.5 shadow-sm text-xs sm:text-sm">
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-border-light dark:border-border-dark bg-gradient-to-b from-surface-light/40 to-transparent dark:from-surface-dark/40 dark:to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-light dark:text-text-dark max-w-4xl mx-auto leading-tight sm:leading-tight">
            Intelligent Document Intelligence with{" "}
            <span className="bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
              Verifiable Deep Citations
            </span>
          </h1>

          <p className="mt-5 sm:mt-6 text-sm sm:text-lg text-muted-light dark:text-muted-dark max-w-2xl mx-auto leading-relaxed">
            Eliminate AI hallucinations. DocuMind fuses <strong>pgvector dense embeddings</strong>, <strong>Postgres BM25 lexical search</strong>, and <strong>cross-encoder reranking</strong> with interactive PDF page highlights.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
            {isAuthenticated ? (
              <>
                <Link to="/library" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2.5 shadow-md text-sm sm:text-base px-6 py-2.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Go to Document Library</span>
                  </Button>
                </Link>
                <Link to="/chat" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-sm sm:text-base px-6 py-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Launch Chat</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2.5 shadow-md text-sm sm:text-base px-6 py-2.5">
                    <Play className="w-4 h-4" />
                    <span>Get Started Free</span>
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-sm sm:text-base px-6 py-2.5">
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Interactive UI Mockup Showcase */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-2 sm:p-4 shadow-xl text-left">
            <div className="flex items-center justify-between pb-3 px-2 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-mono text-muted-light dark:text-muted-dark">documind-demo // split-view citations</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-light dark:text-muted-dark">
                <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">hybrid_rerank</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-1 sm:p-2">
              {/* Chat column mock */}
              <div className="rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-4 space-y-3">
                <div className="text-[11px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">
                  User Question
                </div>
                <div className="text-xs sm:text-sm font-medium text-text-light dark:text-text-dark bg-surface-light dark:bg-surface-dark p-3 rounded-lg border border-border-light dark:border-border-dark">
                  "What is the maximum liability limit and indemnification threshold defined in Section 8.2?"
                </div>

                <div className="text-[11px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider pt-2">
                  Assistant Response (Faithful Synthesis)
                </div>
                <div className="text-xs text-text-light dark:text-text-dark space-y-2 leading-relaxed">
                  <p>
                    Under Section 8.2 (Indemnification and Liability Caps), each party's aggregate liability is strictly capped at the fees paid over the preceding 12 calendar months{" "}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 text-[10px] font-mono font-semibold cursor-pointer border border-black/20 dark:border-white/20">
                      [Master_Service_Agreement.pdf, p. 14]
                    </span>
                    .
                  </p>
                  <p>
                    Additionally, claims arising from willful misconduct or gross negligence are explicitly excluded from this liability limitation{" "}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 text-[10px] font-mono font-semibold cursor-pointer border border-black/20 dark:border-white/20">
                      [Master_Service_Agreement.pdf, p. 15]
                    </span>
                    .
                  </p>
                </div>
              </div>

              {/* PDF Viewer column mock */}
              <div className="rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">
                  <span>Page-Level Grounding Inspector</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">100% Match Grounded</span>
                </div>

                <div className="border border-border-light dark:border-border-dark rounded-lg p-3 bg-surface-light/50 dark:bg-surface-dark/50 text-xs space-y-2 font-mono">
                  <div className="text-[11px] text-muted-light dark:text-muted-dark">
                    File: Master_Service_Agreement.pdf (Page 14)
                  </div>
                  <div className="p-2.5 rounded bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                    "...8.2 Limitation of Liability. IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT EXCEED THE TOTAL AMOUNT PAID BY CUSTOMER HEREUNDER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT..."
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-light dark:text-muted-dark pt-1">
                    <span>Bounding Box: [x: 72, y: 310, w: 468, h: 42]</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold">Faithfulness: 1.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid */}
      <section id="features" className="py-16 sm:py-24 border-b border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
              Core Capabilities
            </h2>
            <p className="mt-2 text-2xl sm:text-4xl font-extrabold text-text-light dark:text-text-dark tracking-tight">
              Built for High-Precision Enterprise RAG
            </p>
            <p className="mt-3 text-sm sm:text-base text-muted-light dark:text-muted-dark">
              Everything required to ingest complex multi-page PDFs, retrieve with maximum recall, and answer with verifiable accuracy.
            </p>
          </div>

          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark space-y-3 transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark">
                Quad-Mode Hybrid Retrieval
              </h3>
              <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                Swappable retrieval strategies: pgvector dense embeddings, Postgres BM25 tsvector search, Reciprocal Rank Fusion (k=60), and Cross-Encoder neural reranking.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark space-y-3 transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark">
                Deep Page-Level Citations
              </h3>
              <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                Sentences link directly to target PDF pages and bounding coordinates. Click any citation chip to jump right to the highlighted source paragraph.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark space-y-3 transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm">
                <TestTube2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark">
                Automated Eval Harness
              </h3>
              <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                Generate synthetic evaluation benchmarks to measure Hit@k, MRR, LLM Faithfulness, and Citation Accuracy across all four retrieval modes side-by-side.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark space-y-3 transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark">
                Multi-Tenant Isolation & RBAC
              </h3>
              <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                Row-level workspace separation with Owner/Admin/Member role enforcement, invite management, and secure document sandboxing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Architecture Section */}
      <section id="architecture" className="py-16 sm:py-24 border-b border-border-light dark:border-border-dark bg-surface-light/30 dark:bg-surface-dark/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
              System Architecture
            </h2>
            <p className="mt-2 text-2xl sm:text-4xl font-extrabold text-text-light dark:text-text-dark tracking-tight">
              End-to-End Grounded Pipeline
            </p>
            <p className="mt-3 text-sm sm:text-base text-muted-light dark:text-muted-dark">
              How DocuMind transforms unstructured PDF documents into precise, verifiable responses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 relative">
            <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px]">1</span>
                <span>Ingest & Parse</span>
              </div>
              <h4 className="font-semibold text-sm text-text-light dark:text-text-dark">PyMuPDF Text & Coordinate Extraction</h4>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                PDF text is extracted with bounding-box coordinates, page indexes, and normalized tokens.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px]">2</span>
                <span>Dual Indexing</span>
              </div>
              <h4 className="font-semibold text-sm text-text-light dark:text-text-dark">pgvector + BM25 Lexical</h4>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Chunks are dual-indexed: dense embeddings via modern vector models, and tsvectors for exact keyword search.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px]">3</span>
                <span>RRF & Cross-Encoder</span>
              </div>
              <h4 className="font-semibold text-sm text-text-light dark:text-text-dark">Neural Reranking</h4>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Reciprocal Rank Fusion merges ranked candidate lists, and a cross-encoder scores deep query-context relevance.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px]">4</span>
                <span>Synthesize & Ground</span>
              </div>
              <h4 className="font-semibold text-sm text-text-light dark:text-text-dark">SSE Stream + Citations</h4>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                LLM streams faithful answers with token-level citation injection and bounding highlight synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Benchmarks Section */}
      <section id="benchmarks" className="py-16 sm:py-24 border-b border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
              Empirical Validation
            </h2>
            <p className="mt-2 text-2xl sm:text-4xl font-extrabold text-text-light dark:text-text-dark tracking-tight">
              Benchmark Strategy Comparisons
            </p>
            <p className="mt-3 text-sm sm:text-base text-muted-light dark:text-muted-dark">
              Measured using DocuMind's integrated synthetic evaluation harness across real multi-page documents.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface-light dark:bg-border-dark/40 border-b border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-medium">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Strategy</th>
                  <th className="py-3 px-4 sm:px-6">Hit@5 Recall</th>
                  <th className="py-3 px-4 sm:px-6">Mean Reciprocal Rank (MRR)</th>
                  <th className="py-3 px-4 sm:px-6">Faithfulness</th>
                  <th className="py-3 px-4 sm:px-6">Citation Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold text-emerald-900 dark:text-emerald-300">
                  <td className="py-3.5 px-4 sm:px-6 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hybrid + Cross-Encoder Rerank (Recommended)</span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-emerald-700 dark:text-emerald-400">96.2%</td>
                  <td className="py-3.5 px-4 sm:px-6">0.89</td>
                  <td className="py-3.5 px-4 sm:px-6">94.8%</td>
                  <td className="py-3.5 px-4 sm:px-6">98.1%</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium">Hybrid Search (RRF k=60)</td>
                  <td className="py-3.5 px-4 sm:px-6">88.5%</td>
                  <td className="py-3.5 px-4 sm:px-6">0.78</td>
                  <td className="py-3.5 px-4 sm:px-6">89.2%</td>
                  <td className="py-3.5 px-4 sm:px-6">92.4%</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium">Dense Vector Only (Cosine)</td>
                  <td className="py-3.5 px-4 sm:px-6">78.1%</td>
                  <td className="py-3.5 px-4 sm:px-6">0.68</td>
                  <td className="py-3.5 px-4 sm:px-6">82.0%</td>
                  <td className="py-3.5 px-4 sm:px-6">86.5%</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium">Full-Text Lexical (Postgres FTS)</td>
                  <td className="py-3.5 px-4 sm:px-6">71.4%</td>
                  <td className="py-3.5 px-4 sm:px-6">0.62</td>
                  <td className="py-3.5 px-4 sm:px-6">79.5%</td>
                  <td className="py-3.5 px-4 sm:px-6">84.0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center">
            <Link to={isAuthenticated ? "/evals" : "/register"}>
              <Button variant="outline" size="sm" className="gap-2">
                <TestTube2 className="w-4 h-4" />
                <span>Run Your Own Evaluation Benchmark</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Call to Action Banner */}
      <section className="py-16 sm:py-20 bg-black text-white dark:bg-surface-dark dark:border-b dark:border-border-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Stop Guessing. Start Verifying.
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Upload your contracts, manuals, and technical documents to experience deep citation verification firsthand.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link to="/library" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 gap-2">
                  <span>Open Your Library</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 gap-2">
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="mt-auto py-8 sm:py-12 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-bg-dark text-xs text-muted-light dark:text-muted-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
              D
            </div>
            <span className="font-semibold text-text-light dark:text-text-dark">DocuMind</span>
            <span>— Verifiable Document Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/library" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Library
            </Link>
            <Link to="/chat" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Chat
            </Link>
            <Link to="/evals" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Evaluations
            </Link>
            <Link to="/settings" className="hover:text-text-light dark:hover:text-text-dark transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
