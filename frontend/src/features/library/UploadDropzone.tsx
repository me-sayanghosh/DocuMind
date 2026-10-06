import React, { useRef, useState } from "react";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";
import { Progress } from "../../components/ui/Progress";
import { useAuthStore } from "../../lib/auth";

export interface UploadDropzoneProps {
  onSuccess: () => void;
}

export function UploadDropzone({ onSuccess }: UploadDropzoneProps) {
  const wsId = useAuthStore((s) => s.currentWorkspace?.id);
  const token = useAuthStore((s) => s.accessToken);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setMessage({ type: "error", text: "Only PDF documents are supported." });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setMessage({ type: "error", text: "File exceeds 25 MB maximum size limit." });
      return;
    }

    if (!wsId) return;

    setUploading(true);
    setProgress(20);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setProgress(50);
      const res = await fetch(`/api/v1/workspaces/${wsId}/documents`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      setProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      if (data.duplicate) {
        setMessage({
          type: "warning",
          text: `"${file.name}" was already uploaded in this workspace.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Successfully uploaded "${file.name}". Ingestion queued.`,
        });
      }

      onSuccess();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Upload failed" });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border-light dark:border-border-dark hover:border-primary/50 bg-surface-light dark:bg-surface-dark"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFile(file);
            }
          }}
        />

        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
          <Upload className="w-6 h-6" />
        </div>

        <p className="text-sm font-semibold text-text-light dark:text-text-dark">
          Click to upload or drag and drop your PDF
        </p>
        <p className="mt-1 text-xs text-muted-light dark:text-muted-dark">
          Max 25 MB · Up to 300 pages · Page-aware chunking & verifiable citations
        </p>

        {uploading && (
          <div className="mt-4 max-w-xs mx-auto">
            <Progress value={progress} />
            <p className="text-xs text-muted-light dark:text-muted-dark mt-1">Uploading...</p>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : message.type === "warning"
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          }`}
        >
          {message.type === "success" && <CheckCircle className="w-4 h-4 shrink-0" />}
          {message.type === "warning" && <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
