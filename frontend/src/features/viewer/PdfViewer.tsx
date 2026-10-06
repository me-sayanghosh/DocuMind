import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "../../components/ui/Spinner";
import { useViewerStore } from "../../hooks/useViewerStore";
import { useAuthStore } from "../../lib/auth";
import { HighlightLayer } from "./HighlightLayer";
import { ViewerToolbar } from "./ViewerToolbar";

export function PdfViewer() {
  const { open, documentId, filename, targetPage, targetBBoxes, closeViewer } = useViewerStore();
  const token = useAuthStore((s) => s.accessToken);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(targetPage || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (targetPage) {
      setCurrentPage(targetPage);
    }
  }, [targetPage]);

  useEffect(() => {
    let active = true;
    if (!open || !documentId) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      return;
    }

    const loadPdf = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/workspaces/${useAuthStore.getState().currentWorkspace?.id}/documents/${documentId}/file`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!res.ok) throw new Error("Failed to load PDF file");
        const blob = await res.blob();
        if (active) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [open, documentId]);

  if (!open) return null;

  return (
    <div className="h-full flex flex-col bg-surface-light dark:bg-bg-dark border-l border-border-light dark:border-border-dark overflow-hidden">
      <ViewerToolbar
        filename={filename}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        onPageChange={setCurrentPage}
        onZoomChange={setZoom}
        onClose={closeViewer}
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-muted-light/10 dark:bg-black/30"
      >
        {loading && (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8" />
            <p className="text-xs text-muted-light dark:text-muted-dark">Loading PDF...</p>
          </div>
        )}

        {blobUrl && !loading && (
          <div
            className="relative shadow-lg rounded bg-white transition-transform duration-200"
            style={{
              width: `${595 * zoom}px`,
              minHeight: `${842 * zoom}px`,
            }}
          >
            {/* Embedded PDF page view */}
            <iframe
              src={`${blobUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
              className="w-full h-full min-h-[750px] rounded border-0"
              title="PDF Viewer"
              onLoad={() => setTotalPages((p) => Math.max(p, currentPage))}
            />

            {/* Overlaid Highlight Layer on Target Page */}
            {currentPage === targetPage && targetBBoxes && targetBBoxes.length > 0 && (
              <HighlightLayer
                bboxes={targetBBoxes.filter((b) => b.page === currentPage)}
                scale={zoom}
                pageWidth={595}
                pageHeight={842}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
