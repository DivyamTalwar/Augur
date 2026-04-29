"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useStreamTabs, StreamTab } from "@/lib/hooks/use-stream-tabs";
import { cn } from "@/lib/utils";
import {
  Icon,
  CancelIcon,
  LoaderIcon,
  CheckCircleIcon,
  CancelCircleIconAlias,
  BuildingIcon,
  UserIcon,
  ClockIcon,
  MessageIcon,
  ChartBarIcon,
} from "@/components/ui/icon";
import type { IconType } from "@/components/ui/icon";

interface StreamPanelTabsProps {
  onCloseTab: (jobId: string, isRunning: boolean) => void;
}

export function StreamPanelTabs({ onCloseTab }: StreamPanelTabsProps) {
  const setActiveTab = useStreamPanelStore((s) => s.setActiveTab);
  const activeTabId = useStreamPanelStore((s) => s.activeTabId);
  const { tabs } = useStreamTabs();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-stretch overflow-x-auto h-full">
      {tabs.map((tab) => (
        <TabItem
          key={tab.jobId}
          tab={tab}
          isActive={tab.jobId === activeTabId}
          onClick={() => setActiveTab(tab.jobId)}
          onClose={() =>
            onCloseTab(tab.jobId, tab.status === "running" || tab.status === "queued")
          }
        />
      ))}
    </div>
  );
}

interface TabItemProps {
  tab: StreamTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function getTypeIconObject(type: StreamTab["type"]): IconType {
  switch (type) {
    case "person":
      return UserIcon;
    case "conversation":
      return MessageIcon;
    case "scoring":
      return ChartBarIcon;
    case "company":
    default:
      return BuildingIcon;
  }
}

function StatusIcon({ status }: { status: StreamTab["status"] }) {
  switch (status) {
    case "running":
    case "queued":
      return (
        <Icon
          icon={LoaderIcon}
          size={12}
          strokeWidth={1.5}
          className="animate-spin text-accent"
        />
      );
    case "completed":
      return (
        <Icon icon={CheckCircleIcon} size={12} strokeWidth={1.5} className="text-fg" />
      );
    case "error":
      return (
        <Icon
          icon={CancelCircleIconAlias}
          size={12}
          strokeWidth={1.5}
          className="text-destructive"
        />
      );
    case "timeout":
      return (
        <Icon icon={ClockIcon} size={12} strokeWidth={1.5} className="text-fg-muted" />
      );
    case "cancelled":
      return (
        <Icon
          icon={CancelCircleIconAlias}
          size={12}
          strokeWidth={1.5}
          className="text-fg-muted"
        />
      );
    default:
      return null;
  }
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const TypeIconObj = getTypeIconObject(tab.type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/tab flex items-center gap-2 px-3 text-[12px] whitespace-nowrap",
        "border-r border-hairline border-b-2 transition-colors duration-150 ease-out",
        isActive
          ? "bg-surface text-fg-emphasis border-b-accent"
          : "bg-bg text-fg-muted border-b-transparent hover:bg-hover-surface hover:text-fg-emphasis"
      )}
    >
      <Icon icon={TypeIconObj} size={13} strokeWidth={1.5} className="shrink-0" />
      <span className="max-w-[140px] truncate">{tab.label}</span>
      <StatusIcon status={tab.status} />
      <span
        role="button"
        tabIndex={0}
        aria-label={`Close ${tab.label}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        className="p-0.5 rounded-sm text-fg-muted opacity-0 group-hover/tab:opacity-100 hover:bg-hover-surface hover:text-fg-emphasis transition-opacity duration-150"
      >
        <Icon icon={CancelIcon} size={11} strokeWidth={1.5} />
      </span>
    </button>
  );
}
