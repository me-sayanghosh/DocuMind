import { TableSkeleton } from "../../components/ui/Skeleton";
import { useDocuments } from "../../hooks/useDocuments";
import { DocumentTable } from "./DocumentTable";
import { UploadDropzone } from "./UploadDropzone";

export function LibraryPage() {
  const { documents, isLoading, deleteDocument, reingestDocument, refetch } = useDocuments();

  return (
    <div className="flex-1 h-full overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">Document Library</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-light dark:text-muted-dark">
            Upload and manage PDF documents for hybrid search retrieval and verifiable chat citations.
          </p>
        </div>

        <UploadDropzone onSuccess={() => refetch()} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
              Documents ({documents.length})
            </h2>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <DocumentTable
              documents={documents}
              onDelete={deleteDocument}
              onReingest={reingestDocument}
            />
          )}
        </div>
      </div>
    </div>
  );
}
