"use client";

import { memo } from "react";
import { useActiveTabLogs } from "@/lib/hooks/use-active-tab-logs";
import { ClientLogEntry, LogEntryType } from "@/lib/types/claude";
import { cn } from "@/lib/utils";
import {
  Icon,
  SettingsIcon,
  LoaderIcon,
  ArrowRightIcon,
  CancelCircleIconAlias,
  GlobeIcon,
  ClockIcon,
  MessageIcon,
  BulbIcon,
  ExternalLinkIcon,
} from "@/components/ui/icon";
import type { IconType } from "@/components/ui/icon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function StreamPanelContent() {
  const { logs, isRunning, status, isLoading } = useActiveTabLogs();

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-fg-muted">
        <Icon icon={LoaderIcon} size={14} strokeWidth={1.5} className="animate-spin mr-2" />
        Loading logs…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-fg-muted font-mono-label">
        No active stream
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-surface">
      {logs.map((log) => (
        <ActivityEntry key={log.id} entry={log} />
      ))}
      {isRunning && (
        <div className="flex items-center gap-2 py-2 px-3 text-fg-muted">
          <Icon icon={LoaderIcon} size={12} strokeWidth={1.5} className="animate-spin" />
          <span className="text-sm">Processing…</span>
        </div>
      )}
      <div ref={(el) => el?.scrollIntoView()} />
    </div>
  );
}

const ActivityEntry = memo(function ActivityEntry({ entry }: { entry: ClientLogEntry }) {
  if (entry.content === "") return null;

  const colorClass = getLogColorClass(entry.type);
  const iconObj = getLogIconObject(entry.type);
  const isRichContent = entry.type === "assistant" || entry.type === "thinking";

  return (
    <div className="flex items-start gap-2.5 py-2 px-3 border-b border-hairline hover:bg-hover-surface transition-colors duration-150 ease-out">
      <div
        className={cn(
          "size-4 rounded-sm bg-bg border border-hairline flex items-center justify-center flex-shrink-0 mt-0.5",
          colorClass
        )}
      >
        <Icon
          icon={iconObj}
          size={10}
          strokeWidth={1.5}
          className={entry.type === "progress" ? "animate-pulse" : undefined}
        />
      </div>

      <div className="flex-1 min-w-0 text-sm">
        {isRichContent ? (
          <div
            className={cn(
              "prose prose-sm prose-neutral max-w-none",
              "prose-headings:font-semibold prose-headings:tracking-tight",
              "prose-p:text-fg-emphasis prose-p:leading-relaxed",
              "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
              "prose-strong:text-fg prose-strong:font-semibold",
              "prose-code:bg-bg prose-code:border prose-code:border-hairline prose-code:rounded-sm prose-code:px-1 prose-code:py-0.5 prose-code:text-[12px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:bg-bg prose-pre:border prose-pre:border-hairline prose-pre:rounded-sm",
              "prose-li:text-fg-emphasis",
              "prose-hr:border-hairline",
              entry.type === "thinking" && "italic text-fg-muted opacity-80"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
          </div>
        ) : (
          <>
            {entry.toolName && (
              <span className={cn("font-mono text-[12px] font-medium", colorClass)}>
                [{entry.toolName}]{" "}
              </span>
            )}
            <span className={cn(getTextColorClass(entry.type))}>{entry.content}</span>
          </>
        )}
      </div>

      <span className="text-[10px] text-fg-muted/60 flex-shrink-0 tabular-nums font-mono pt-0.5">
        {formatTime(entry.timestamp)}
      </span>
    </div>
  );
});

function getLogIconObject(type: LogEntryType): IconType {
  switch (type) {
    case "system":
      return SettingsIcon;
    case "assistant":
      return MessageIcon;
    case "thinking":
      return BulbIcon;
    case "tool_use":
      return ArrowRightIcon;
    case "error":
      return CancelCircleIconAlias;
    case "browser":
      return GlobeIcon;
    case "progress":
      return ClockIcon;
    case "redirect":
      return ExternalLinkIcon;
    default:
      return MessageIcon;
  }
}

/** Tints the icon chip — restrained palette, only orange and destructive carry chroma. */
function getLogColorClass(type: LogEntryType): string {
  switch (type) {
    case "tool_use":
    case "browser":
      return "text-accent";
    case "error":
      return "text-destructive";
    case "assistant":
      return "text-fg-emphasis";
    case "thinking":
    case "progress":
    case "redirect":
    case "system":
    default:
      return "text-fg-muted";
  }
}

/** Body-text color for plain (non-markdown) entries. */
function getTextColorClass(type: LogEntryType): string {
  if (type === "error") return "text-destructive";
  return "text-fg-muted";
}

function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
