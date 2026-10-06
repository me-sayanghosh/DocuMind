import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Document } from "../../types/api";

export interface DeleteDocumentDialogProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteDocumentDialog({
  document,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteDocumentDialogProps) {
  if (!document) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Document"
      description={`Are you sure you want to delete "${document.filename}"?`}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-light dark:text-muted-dark">
          This will permanently delete the original PDF, all extracted text chunks, vector embeddings, and search index entries from this workspace.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
            Delete Document
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
