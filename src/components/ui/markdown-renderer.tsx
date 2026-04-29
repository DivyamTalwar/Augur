"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
  className?: string;
}

export function MarkdownRenderer({ content, compact, className }: MarkdownRendererProps) {
  return (
    <article
      className={cn(
        "prose prose-neutral max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-fg",
        "prose-p:text-fg-emphasis prose-p:leading-relaxed",
        "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-fg prose-strong:font-semibold",
        "prose-code:text-fg prose-code:bg-surface prose-code:rounded-sm prose-code:px-1 prose-code:py-0.5 prose-code:text-[12px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-surface prose-pre:border prose-pre:border-hairline prose-pre:rounded-sm prose-pre:text-fg",
        "prose-li:text-fg-emphasis",
        "prose-hr:border-hairline",
        "prose-blockquote:border-l-accent prose-blockquote:text-fg-muted prose-blockquote:not-italic",
        compact && "prose-sm",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
