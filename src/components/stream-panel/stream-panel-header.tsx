"use client";

import { useMemo } from "react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useStreamTabs } from "@/lib/hooks/use-stream-tabs";
import { useJob } from "@/lib/query/use-job-query";
import { StreamPanelTabs } from "./stream-panel-tabs";
import { useStreamSubscription } from "./use-stream-subscription";
import {
  Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  StopIconAlias,
  MaximizeIcon,
  MinimizeIcon,
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function StreamPanelHeader() {
  const toggle = useStreamPanelStore((s) => s.toggle);
  const isOpen = useStreamPanelStore((s) => s.isOpen);
  const isMaximized = useStreamPanelStore((s) => s.isMaximized);
  const toggleMaximize = useStreamPanelStore((s) => s.toggleMaximize);
  const activeTabId = useStreamPanelStore((s) => s.activeTabId);

  const { tabs } = useStreamTabs();
  const { killJob, closeTab } = useStreamSubscription();

  const { data: activeJob } = useJob(activeTabId ?? "", !!activeTabId);

  const runningCount = useMemo(
    () => tabs.filter((t) => t.status === "running" || t.status === "queued").length,
    [tabs]
  );

  const handleCloseTab = async (jobId: string, isRunning: boolean) => {
    await closeTab(jobId, isRunning);
  };

  const handleStopCurrent = async () => {
    if (!activeTabId) return;
    if (activeJob?.status === "running" || activeJob?.status === "queued") {
      await killJob(activeTabId);
    }
  };

  return (
    <div className="bg-bg flex items-center justify-between border-b border-hairline h-9 shrink-0">
      <StreamPanelTabs onCloseTab={handleCloseTab} />

      <div className="flex items-center gap-3 px-3">
        {(activeJob?.status === "running" || activeJob?.status === "queued") && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleStopCurrent}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon icon={StopIconAlias} size={12} strokeWidth={1.5} />
            <span>Stop</span>
          </Button>
        )}

        {runningCount > 0 && (
          <span className="font-mono-label text-accent flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            {runningCount} running
          </span>
        )}

        <button
          type="button"
          onClick={toggleMaximize}
          aria-label={isMaximized ? "Restore stream panel size" : "Maximize stream panel"}
          title={isMaximized ? "Restore" : "Maximize"}
          className="p-1 rounded-sm text-fg-muted hover:bg-hover-surface hover:text-fg-emphasis transition-colors duration-150 ease-out"
        >
          <Icon
            icon={isMaximized ? MinimizeIcon : MaximizeIcon}
            size={13}
            strokeWidth={1.5}
          />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={isOpen ? "Collapse stream panel" : "Expand stream panel"}
          title={isOpen ? "Collapse" : "Expand"}
          className="p-1 rounded-sm text-fg-muted hover:bg-hover-surface hover:text-fg-emphasis transition-colors duration-150 ease-out"
        >
          <Icon
            icon={isOpen ? ChevronDownIcon : ChevronUpIcon}
            size={14}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
}
