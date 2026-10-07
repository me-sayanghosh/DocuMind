import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "../../components/ui/Button";

export interface ViewerToolbarProps {
  filename: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onClose: () => void;
}

export function ViewerToolbar({
  filename,
  currentPage,
  totalPages,
  zoom,
  onPageChange,
  onZoomChange,
  onClose,
}: ViewerToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark gap-2">
      <div className="truncate max-w-[120px] sm:max-w-[200px] lg:max-w-xs font-medium text-xs sm:text-sm">
        {filename}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-0.5 sm:gap-1 text-xs">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-[11px] sm:text-xs px-1 whitespace-nowrap">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="hidden sm:block h-4 w-px bg-border-light dark:border-border-dark mx-1" />

        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onZoomChange(Math.min(2.0, zoom + 0.2))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5 h-8 w-8">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
