"use client";

import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { useActiveTabLogs } from "@/lib/hooks/use-active-tab-logs";
import { ClientLogEntry, LogEntryType } from "@/lib/types/claude";
import { cn } from "@/lib/utils";
import {
  Icon,
  SettingsIcon,
  LoaderIcon,
  ArrowRightIcon,
  ArrowDownIcon,
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

const STICK_THRESHOLD_PX = 48;

export function StreamPanelContent() {
  const { logs, isRunning, status, isLoading } = useActiveTabLogs();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Source of truth for "should I auto-scroll?" — a ref so we never read a
  // stale value from a closure during fast log streaming. The state is mirrored
  // only to drive the "Latest" pill render.
  const stickRef = useRef(true);
  // Marks scrollTop assignments WE caused so we don't treat them as user intent.
  const programmaticRef = useRef(false);
  const [showLatest, setShowLatest] = useState(false);

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) {
      programmaticRef.current = false;
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom <= STICK_THRESHOLD_PX;
    if (stickRef.current !== atBottom) {
      stickRef.current = atBottom;
      setShowLatest(!atBottom);
    }
  }, []);

  // useLayoutEffect runs synchronously after DOM mutation, before paint, so
  // the user never sees an interim "scrolled-up" frame after a log lands.
  useLayoutEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTop = el.scrollHeight;
  });

  const jumpToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTop = el.scrollHeight;
    stickRef.current = true;
    setShowLatest(false);
  }, []);

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
    <div className="relative flex-1 min-h-0 bg-surface">
      {isRunning && <RunningEmbers />}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
      >
        <div className="relative z-[1]">
          {logs.map((log) => (
            <ActivityEntry key={log.id} entry={log} />
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 py-2 px-3 text-fg-muted">
              <Icon icon={LoaderIcon} size={12} strokeWidth={1.5} className="animate-spin" />
              <span className="text-sm">Processing…</span>
            </div>
          )}
        </div>
      </div>

      {showLatest && logs.length > 0 && (
        <m.button
          type="button"
          onClick={jumpToLatest}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-mono font-semibold text-paper shadow-lg"
          style={{
            background:
              "linear-gradient(180deg, var(--color-flame), var(--color-flame-2))",
            boxShadow:
              "0 8px 22px -10px rgba(255,91,31,0.7), 0 1px 0 rgba(255,255,255,0.18) inset",
          }}
          aria-label="Jump to latest"
        >
          <Icon icon={ArrowDownIcon} size={12} strokeWidth={2} />
          <span>Latest</span>
        </m.button>
      )}
    </div>
  );
}

// Subtle ember field — only mounts when a job is actively running.
// Five small flame dots drift upward with staggered delays. Pointer-events:none
// so it never interferes with log scroll. prefers-reduced-motion stops the drift
// via the global rule in globals.css.
const EMBERS = [
  { left: "12%", size: 4, duration: 7.2, delay: 0 },
  { left: "28%", size: 3, duration: 8.4, delay: 1.6 },
  { left: "47%", size: 5, duration: 6.8, delay: 0.8 },
  { left: "68%", size: 3, duration: 9.1, delay: 2.4 },
  { left: "85%", size: 4, duration: 7.7, delay: 3.2 },
] as const;

function RunningEmbers() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ contain: "layout paint" }}
    >
      {EMBERS.map((ember, i) => (
        <m.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: ember.left,
            bottom: -8,
            width: ember.size,
            height: ember.size,
            background:
              "radial-gradient(circle, var(--color-flame) 0%, var(--color-flame-2) 40%, transparent 70%)",
            filter: "blur(0.5px)",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: ["0%", "-180%", "-260%"],
            opacity: [0, 0.55, 0],
          }}
          transition={{
            duration: ember.duration,
            delay: ember.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
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
