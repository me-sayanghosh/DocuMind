import { useState } from "react";
import { Eye, FileText, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useViewerStore } from "../../hooks/useViewerStore";
import { formatBytes, formatDate } from "../../lib/format";
import { Document } from "../../types/api";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";
import { StatusBadge } from "./StatusBadge";

export interface DocumentTableProps {
  documents: Document[];
  onDelete: (id: string) => Promise<any>;
  onReingest: (id: string) => Promise<any>;
}

export function DocumentTable({ documents, onDelete, onReingest }: DocumentTableProps) {
  const openViewer = useViewerStore((s) => s.openViewer);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!selectedDoc) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedDoc.id);
      setDeleteModalOpen(false);
      setSelectedDoc(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload your first PDF document to build the search index and start asking questions."
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* 1. Mobile Cards View (< sm) */}
      <div className="sm:hidden space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-3.5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-2.5 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-black dark:text-white shrink-0" />
                <span className="font-semibold text-xs text-text-light dark:text-text-dark truncate">
                  {doc.filename}
                </span>
              </div>
              <StatusBadge
                status={doc.status}
                chunksDone={doc.chunks_done}
                chunksTotal={doc.chunks_total}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-light dark:text-muted-dark pt-1 border-t border-border-light/40 dark:border-border-dark/40">
              <div className="flex items-center gap-3">
                <span>{doc.page_count > 0 ? `${doc.page_count} pages` : "Pages: —"}</span>
                <span>•</span>
                <span>{formatBytes(doc.size_bytes)}</span>
              </div>
              <span>{formatDate(doc.created_at)}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-light/40 dark:border-border-dark/40">
              {doc.status === "ready" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openViewer(doc.id, doc.filename, 1)}
                  className="gap-1.5 text-xs h-8 px-2.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </Button>
              )}
              {doc.status === "failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReingest(doc.id)}
                  className="gap-1.5 text-xs h-8 px-2.5 text-amber-600"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDoc(doc);
                  setDeleteModalOpen(true);
                }}
                className="text-red-500 hover:text-red-600 h-8 px-2"
                title="Delete document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Desktop Table View (>= sm) */}
      <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark shadow-2xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-light dark:bg-border-dark/30 border-b border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark">
            <tr>
              <th className="py-3 px-4 font-medium">Document</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Pages</th>
              <th className="py-3 px-4 font-medium">Size</th>
              <th className="py-3 px-4 font-medium">Uploaded</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 transition-colors">
                <td className="py-3 px-4 font-medium text-text-light dark:text-text-dark max-w-xs truncate">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-black dark:text-white shrink-0" />
                    <span className="truncate">{doc.filename}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge
                    status={doc.status}
                    chunksDone={doc.chunks_done}
                    chunksTotal={doc.chunks_total}
                  />
                </td>
                <td className="py-3 px-4 text-muted-light dark:text-muted-dark">
                  {doc.page_count > 0 ? doc.page_count : "—"}
                </td>
                <td className="py-3 px-4 text-muted-light dark:text-muted-dark">
                  {formatBytes(doc.size_bytes)}
                </td>
                <td className="py-3 px-4 text-muted-light dark:text-muted-dark whitespace-nowrap">
                  {formatDate(doc.created_at)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {doc.status === "ready" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewer(doc.id, doc.filename, 1)}
                        title="View PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {doc.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReingest(doc.id)}
                        title="Retry Ingestion"
                      >
                        <RefreshCw className="w-4 h-4 text-amber-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setDeleteModalOpen(true);
                      }}
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteDocumentDialog
        document={selectedDoc}
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
