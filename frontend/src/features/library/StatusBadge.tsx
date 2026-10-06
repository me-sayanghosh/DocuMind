import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Badge } from "../../components/ui/Badge";

export interface StatusBadgeProps {
  status: "queued" | "processing" | "ready" | "failed";
  chunksDone?: number;
  chunksTotal?: number;
}

export function StatusBadge({ status, chunksDone = 0, chunksTotal = 0 }: StatusBadgeProps) {
  switch (status) {
    case "queued":
      return (
        <Badge variant="default" className="gap-1">
          <Clock className="w-3 h-3" />
          Queued
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="info" className="gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing {chunksTotal > 0 ? `(${chunksDone}/${chunksTotal})` : ""}
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="danger" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}
