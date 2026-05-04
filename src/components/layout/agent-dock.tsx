"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence, m } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useStreamTabs } from "@/lib/hooks/use-stream-tabs";
import { useJob } from "@/lib/query/use-job-query";
import { useActiveTabLogs } from "@/lib/hooks/use-active-tab-logs";
import { useStreamSubscription } from "@/components/stream-panel/use-stream-subscription";
import { ClientLogEntry, LogEntryType } from "@/lib/types/claude";
import { cn } from "@/lib/utils";
import { CostPill } from "./cost-pill";
import { ArrowDownIcon, Icon } from "@/components/ui/icon";

const EMPTY_LOGS: ClientLogEntry[] = [];

const DOCK_HEIGHT_KEY = "agent-dock-height";
const DOCK_DEFAULT_HEIGHT = 320;
const DOCK_MIN_HEIGHT = 140;
const DOCK_COLLAPSED_HEIGHT = 48;
const SCROLL_STICK_THRESHOLD_PX = 48;

function readSavedHeight(): number {
  if (typeof window === "undefined") return DOCK_DEFAULT_HEIGHT;
  const raw = window.localStorage.getItem(DOCK_HEIGHT_KEY);
  if (!raw) return DOCK_DEFAULT_HEIGHT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DOCK_DEFAULT_HEIGHT;
  return Math.max(DOCK_MIN_HEIGHT, parsed);
}

/**
 * AgentDock — collapsible bottom panel matching augur-os.html `.agent-dock`.
 * Replaces the old StreamPanel chrome. Reuses existing stream hooks.
 */
export function AgentDock() {
  const isOpen = useStreamPanelStore((s) => s.isOpen);
  const toggle = useStreamPanelStore((s) => s.toggle);
  const activeTabId = useStreamPanelStore((s) => s.activeTabId);
  const setActiveTab = useStreamPanelStore((s) => s.setActiveTab);
  const activeLogs = useStreamPanelStore((s) =>
    activeTabId ? (s.jobLogs.get(activeTabId) ?? EMPTY_LOGS) : EMPTY_LOGS
  );

  const { tabs } = useStreamTabs();
  const { killJob, closeTab } = useStreamSubscription();
  const { data: activeJob } = useJob(activeTabId ?? "", !!activeTabId);

  // If there are tabs but none active, set first as active
  useEffect(() => {
    if (!activeTabId && tabs.length > 0) {
      setActiveTab(tabs[0].jobId);
    }
  }, [activeTabId, tabs, setActiveTab]);

  // Don't render until there's at least one job
  const hasJobs = tabs.length > 0;
  const collapsed = !isOpen || !hasJobs;

  // User-resizable dock height with localStorage persist + active-drag tracking.
  const [dockHeight, setDockHeight] = useState<number>(readSavedHeight);
  const [isResizing, setIsResizing] = useState(false);
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) return;
      event.preventDefault();
      dragStateRef.current = { startY: event.clientY, startHeight: dockHeight };
      setIsResizing(true);

      const onMove = (moveEvent: PointerEvent) => {
        const start = dragStateRef.current;
        if (!start) return;
        const delta = start.startY - moveEvent.clientY; // upward drag → positive delta
        const maxHeight = Math.max(
          DOCK_MIN_HEIGHT + 50,
          window.innerHeight - 120
        );
        const next = Math.max(
          DOCK_MIN_HEIGHT,
          Math.min(maxHeight, start.startHeight + delta)
        );
        setDockHeight(next);
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        dragStateRef.current = null;
        setIsResizing(false);
        try {
          window.localStorage.setItem(DOCK_HEIGHT_KEY, String(Math.round(dockHeight)));
        } catch {
          // localStorage may be disabled — ignore
        }
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [collapsed, dockHeight]
  );

  // Persist final height when drag ends (also on dependency change).
  useEffect(() => {
    if (isResizing) return;
    try {
      window.localStorage.setItem(DOCK_HEIGHT_KEY, String(Math.round(dockHeight)));
    } catch {
      // ignore
    }
  }, [dockHeight, isResizing]);

  const height = collapsed ? DOCK_COLLAPSED_HEIGHT : dockHeight;

  const runningCount = useMemo(
    () => tabs.filter((t) => t.status === "running" || t.status === "queued").length,
    [tabs]
  );
  const completedCount = useMemo(() => tabs.filter((t) => t.status === "completed").length, [tabs]);

  const activeTabMeta = useMemo(
    () => tabs.find((t) => t.jobId === activeTabId),
    [tabs, activeTabId]
  );

  const elapsed = useElapsed(activeJob?.startedAt ?? activeJob?.createdAt);

  return (
    <motion.section
      initial={false}
      animate={{ height: hasJobs ? height : 0 }}
      transition={
        isResizing
          ? { duration: 0 }
          : { duration: 0.45, ease: [0.7, 0, 0.2, 1] }
      }
      className="relative flex-shrink-0 overflow-hidden border-t border-line"
      style={{
        background:
          "linear-gradient(180deg, rgba(251,247,242,0.8) 0%, rgba(244,237,227,0.85) 100%)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
      }}
    >
      {/* Drag-to-resize handle — VS Code style, drag from the top edge upward to grow. */}
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize agent dock"
          onPointerDown={startResize}
          className={cn(
            "group/dockhandle absolute top-0 left-0 right-0 z-[6] h-[6px] cursor-row-resize",
            "transition-colors duration-150",
            isResizing ? "bg-flame" : "bg-line hover:bg-flame/40"
          )}
        >
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[3px] rounded-full transition-all duration-150 shadow-sm",
              isResizing
                ? "w-16 bg-flame"
                : "w-12 bg-line-2 group-hover/dockhandle:w-16 group-hover/dockhandle:bg-flame"
            )}
          />
        </div>
      )}

      {/* Shimmering top border (suppressed during resize so the grip is the only visual at the edge) */}
      {!isResizing && (
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-flame), var(--color-flame-2), var(--color-leaf), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 6s linear infinite",
          }}
        />
      )}
      {/* Inner radial highlights */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(400px 100px at 20% 0%, rgba(255,91,31,0.06), transparent 70%), radial-gradient(400px 100px at 80% 0%, rgba(31,170,109,0.05), transparent 70%)",
        }}
      />

      {/* Head */}
      <button
        type="button"
        onClick={toggle}
        className="relative w-full flex items-center gap-3 px-4 py-3 cursor-pointer h-12 flex-shrink-0 select-none md:px-9"
      >
        <DockPulse running={runningCount > 0} />
        <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink truncate">
          {activeTabMeta?.label ?? (hasJobs ? tabs[0].label : "Agent dock")}
          {runningCount > 0 && <BouncingDots />}
          {activeTabMeta && (
            <span className="font-normal text-ink-3 truncate">
              · {describeStatus(activeTabMeta.status)}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-ink-3 md:gap-4">
          <CostPill logs={activeLogs} />
          <span>
            <b className="font-semibold text-ink">
              {String(tabs.length).padStart(2, "0")}
            </b>{" "}
            {tabs.length === 1 ? "job" : "jobs"}
          </span>
          <span style={{ color: "var(--color-leaf)" }}>
            <b className="font-semibold">{String(completedCount).padStart(2, "0")}</b> ✓
          </span>
          <span>{elapsed}</span>
        </div>

        <span
          aria-hidden
          className="grid place-items-center w-[22px] h-[22px] text-ink-3"
          style={{
            transform: collapsed ? "rotate(180deg)" : undefined,
            transition: "transform .3s",
          }}
        >
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Body */}
      {hasJobs && !collapsed && (
        <div className="relative h-[calc(100%-48px)] overflow-hidden flex flex-col">
          {tabs.length > 1 && (
            <div className="flex items-center gap-1 px-9 py-2 border-b border-line overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.jobId}
                  type="button"
                  onClick={() => setActiveTab(t.jobId)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      closeTab(t.jobId, t.status === "running" || t.status === "queued");
                    }
                  }}
                  className={cn(
                    "font-mono text-[10px] uppercase px-2 py-1 rounded-md tracking-wider whitespace-nowrap transition-colors",
                    t.jobId === activeTabId
                      ? "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--color-line)]"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <DockBody />
          {activeTabMeta &&
            (activeTabMeta.status === "running" || activeTabMeta.status === "queued") && (
              <div className="flex justify-end px-9 py-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => activeTabId && killJob(activeTabId)}
                  className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-md text-flame hover:bg-flame/10 transition-colors"
                >
                  Stop
                </button>
              </div>
            )}
        </div>
      )}
    </motion.section>
  );
}

function DockPulse({ running }: { running: boolean }) {
  return (
    <div
      className="relative grid place-items-center w-7 h-7 rounded-lg flex-shrink-0"
      style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path d="M8 2l5 3v6l-5 3-5-3V5l5-3z" strokeLinejoin="round" />
        <path d="M8 8l5-3M8 8v6M8 8L3 5" strokeLinejoin="round" />
      </svg>
      {running && (
        <>
          <span
            aria-hidden
            className="absolute -inset-[2px] rounded-[10px] border-[1.5px] opacity-0"
            style={{ borderColor: "var(--color-flame)", animation: "ring-out 2s ease-out infinite" }}
          />
          <span
            aria-hidden
            className="absolute -inset-[2px] rounded-[10px] border-[1.5px] opacity-0"
            style={{
              borderColor: "var(--color-flame)",
              animation: "ring-out 2s ease-out infinite",
              animationDelay: "1s",
            }}
          />
        </>
      )}
    </div>
  );
}

function BouncingDots() {
  return (
    <span className="inline-flex gap-[3px] items-end pb-1">
      {[0, 0.15, 0.3].map((d, i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{
            background: "var(--color-flame)",
            animation: `bounce-dots 1.2s ease-in-out infinite`,
            animationDelay: `${d}s`,
          }}
        />
      ))}
    </span>
  );
}

function describeStatus(status: string) {
  switch (status) {
    case "running":
      return "running · live tail";
    case "queued":
      return "queued";
    case "completed":
      return "completed";
    case "error":
      return "error";
    case "timeout":
      return "timed out";
    case "cancelled":
      return "cancelled";
    default:
      return status;
  }
}

function useElapsed(startMs: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  if (!startMs) return "00:00";
  const sec = Math.max(0, Math.floor((now - startMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function DockBody() {
  const { logs, isRunning, status, isLoading } = useActiveTabLogs();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Refs avoid stale-closure races during fast log streaming. State only mirrors
  // the "Latest" pill visibility — the auto-scroll lock itself is pure ref.
  const stickRef = useRef(true);
  const programmaticRef = useRef(false);
  const [showLatest, setShowLatest] = useState(false);

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) {
      programmaticRef.current = false;
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom <= SCROLL_STICK_THRESHOLD_PX;
    if (stickRef.current !== atBottom) {
      stickRef.current = atBottom;
      setShowLatest(!atBottom);
    }
  }, []);

  // Layout effect: fires synchronously after DOM mutation, before paint.
  // Reading stickRef.current at call time means we always have the most-recent
  // user intent — no stale closure can yank the user back to the bottom.
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
      <div className="flex items-center justify-center h-full text-[12px] font-mono text-ink-3">
        Loading…
      </div>
    );
  }
  if (!status) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] font-mono text-ink-3">
        No active stream.
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden px-9 pt-1 pb-4 font-mono text-[12px] text-ink-2"
      >
        <AnimatePresence initial={false}>
          {logs.map((log, idx) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: Math.min(idx, 5) * 0.05,
              }}
              className="grid items-start gap-3 py-2 border-b border-dashed border-line"
              style={{ gridTemplateColumns: "14px 1fr auto" }}
            >
              <LogIconChip type={log.type} />
              <LogTextLine entry={log} />
              <span className="text-[10px] text-ink-3 mt-1 tabular-nums">{formatTime(log.timestamp)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {isRunning && (
          <div className="flex items-center gap-2 py-3 text-ink-3">
            <BouncingDots />
            <span>processing…</span>
          </div>
        )}
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

type IconTone = "info" | "warn" | "act" | "ok";

function logTone(type: LogEntryType): IconTone {
  switch (type) {
    case "tool_use":
    case "browser":
    case "thinking":
      return "act";
    case "tool_result":
      return "ok";
    case "error":
      return "warn";
    default:
      return "info";
  }
}

function LogIconChip({ type }: { type: LogEntryType }) {
  const tone = logTone(type);
  const tonePalette: Record<IconTone, { bg: string; color: string }> = {
    info: { bg: "rgba(0,0,0,0.05)", color: "var(--color-ink-2)" },
    warn: { bg: "rgba(255,91,31,0.10)", color: "var(--color-flame)" },
    act: { bg: "rgba(255,91,31,0.10)", color: "var(--color-flame)" },
    ok: { bg: "rgba(31,170,109,0.12)", color: "var(--color-leaf)" },
  };
  const p = tonePalette[tone];
  return (
    <div
      className="w-[14px] h-[14px] mt-1 rounded-[4px] grid place-items-center flex-shrink-0"
      style={{ background: p.bg, color: p.color }}
    >
      {iconFor(type)}
    </div>
  );
}

function iconFor(type: LogEntryType) {
  const cls = "w-[9px] h-[9px]";
  switch (type) {
    case "tool_use":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "tool_result":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M8 2l6 11H2L8 2z" strokeLinejoin="round" />
          <path d="M8 7v3M8 12h.01" strokeLinecap="round" />
        </svg>
      );
    case "browser":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="6" cy="6" r="4" />
          <path d="M9 9l3 3" strokeLinecap="round" />
        </svg>
      );
    case "thinking":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M8 1.5a4 4 0 00-2 7.4V11h4V8.9A4 4 0 008 1.5z" strokeLinejoin="round" />
          <path d="M6 13h4M6.5 14.5h3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 7v4M8 5h.01" strokeLinecap="round" />
        </svg>
      );
  }
}

function LogTextLine({ entry }: { entry: ClientLogEntry }) {
  const isRich = entry.type === "assistant" || entry.type === "thinking";
  if (isRich) {
    return (
      <div
        className={cn(
          "leading-[1.55]",
          entry.type === "thinking" ? "font-serif italic text-[14px] text-ink" : "text-ink"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
      </div>
    );
  }
  if (entry.toolName) {
    return (
      <div className="leading-[1.55]">
        <span className="font-semibold" style={{ color: "var(--color-flame)" }}>
          {entry.toolName}
        </span>{" "}
        <span className="text-ink-3">→</span>{" "}
        <span className="text-ink">{entry.content}</span>
      </div>
    );
  }
  return <div className="leading-[1.55] text-ink">{entry.content}</div>;
}

function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
