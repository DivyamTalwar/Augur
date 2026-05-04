"use client";

import { useStreamTabs } from "@/lib/hooks/use-stream-tabs";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamPanel } from "./stream-panel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function StreamPanelWrapper({ children }: { children: React.ReactNode }) {
  const { tabs } = useStreamTabs();
  const isOpen = useStreamPanelStore((s) => s.isOpen);
  const isMaximized = useStreamPanelStore((s) => s.isMaximized);
  const hasTabs = tabs.length > 0;

  // No tabs OR collapsed: render children full-height with no panel space.
  if (!hasTabs || !isOpen) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  // Maximized: stream panel takes most of the screen, main shrinks.
  const mainSize = isMaximized ? 12 : 55;
  const streamSize = isMaximized ? 88 : 45;

  return (
    <ResizablePanelGroup orientation="vertical" className="flex-1">
      <ResizablePanel defaultSize={mainSize} minSize={10}>
        <main className="h-full flex flex-col overflow-hidden">{children}</main>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={streamSize} minSize={15} maxSize={92}>
        <StreamPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
