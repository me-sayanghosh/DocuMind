import React from "react";
import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-border-light dark:bg-border-dark rounded-md",
        className
      )}
    />
  );
}
