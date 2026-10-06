import React from "react";
import { Citation } from "../../types/api";
import { CitationChip } from "./CitationChip";

export interface MarkdownProps {
  content: string;
  citations?: Citation[];
}

export function Markdown({ content, citations = [] }: MarkdownProps) {
  const citationMap = new Map<number, Citation>();
  citations.forEach((c) => citationMap.set(c.n, c));

  // Regex to split on [n] citation markers
  const parts = content.split(/(\[\d+\])/g);

  return (
    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed break-words">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const num = parseInt(match[1], 10);
          const citation = citationMap.get(num);
          return <CitationChip key={index} n={num} citation={citation} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}
