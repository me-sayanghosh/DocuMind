import React from "react";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center mb-4 text-black dark:text-white">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-text-light dark:text-text-dark">{title}</h3>
      <p className="mt-1 text-sm text-muted-light dark:text-muted-dark leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
