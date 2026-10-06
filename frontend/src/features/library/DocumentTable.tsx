import React, { useState } from "react";
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
    <div className="w-full overflow-x-auto rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark">
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
                  <FileText className="w-4 h-4 text-primary shrink-0" />
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
