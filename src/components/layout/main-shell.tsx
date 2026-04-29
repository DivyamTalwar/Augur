/**
 * MainShell — wraps page content with the new TopBar + AgentDock chrome.
 * The page itself fills the middle scroll region.
 */
import * as React from "react";
import { TopBar } from "./topbar";
import { AgentDock } from "./agent-dock";

export function MainShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex-1 flex flex-col overflow-hidden" style={{ background: "var(--color-paper)" }}>
      <TopBar />
      <div className="flex-1 overflow-auto relative">{children}</div>
      <AgentDock />
    </main>
  );
}
