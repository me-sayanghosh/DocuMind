import React from "react";
import { cn } from "../../lib/cn";

export interface ProgressProps {
  value: number; // 0 to 100
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("w-full bg-border-light dark:bg-border-dark rounded-full h-2 overflow-hidden", className)}>
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
