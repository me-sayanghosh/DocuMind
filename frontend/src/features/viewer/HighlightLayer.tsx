import { BBox } from "../../types/api";

export interface HighlightLayerProps {
  bboxes: BBox[];
  scale: number;
  pageWidth?: number;
  pageHeight?: number;
}

export function HighlightLayer({
  bboxes,
  scale = 1.0,
  pageWidth: _pageWidth = 595,
  pageHeight: _pageHeight = 842,
}: HighlightLayerProps) {
  if (!bboxes || bboxes.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {bboxes.map((box, i) => {
        // PDF point space (origin bottom-left or top-left depending on fitz export)
        // PyMuPDF blocks use top-left origin (y0 is top, y1 is bottom):
        const left = box.x0 * scale;
        const top = box.y0 * scale;
        const width = (box.x1 - box.x0) * scale;
        const height = (box.y1 - box.y0) * scale;

        return (
          <div
            key={i}
            className="absolute rounded bg-yellow-400/50 border border-yellow-500 shadow-sm animate-pulse-highlight"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${Math.max(width, 20)}px`,
              height: `${Math.max(height, 12)}px`,
            }}
          />
        );
      })}
    </div>
  );
}
