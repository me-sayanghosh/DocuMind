import { Spinner } from "../../components/ui/Spinner";
import { useDocuments } from "../../hooks/useDocuments";
import { DocumentTable } from "./DocumentTable";
import { UploadDropzone } from "./UploadDropzone";

export function LibraryPage() {
  const { documents, isLoading, deleteDocument, reingestDocument, refetch } = useDocuments();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Document Library</h1>
        <p className="mt-1 text-sm text-muted-light dark:text-muted-dark">
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
          <div className="flex justify-center p-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <DocumentTable
            documents={documents}
            onDelete={deleteDocument}
            onReingest={reingestDocument}
          />
        )}
      </div>
    </div>
  );
}
