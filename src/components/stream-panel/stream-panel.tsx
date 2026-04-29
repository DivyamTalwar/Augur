"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamPanelHeader } from "./stream-panel-header";
import { StreamPanelContent } from "./stream-panel-content";

export function StreamPanel() {
  const isOpen = useStreamPanelStore((s) => s.isOpen);

  return (
    <div className="bg-bg flex flex-col h-full border-t border-hairline">
      <StreamPanelHeader />

      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 bg-surface">
          <StreamPanelContent />
        </div>
      )}
    </div>
  );
}
