import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ClientLogEntry } from "@/lib/types/claude";

export type StreamTabType = "company" | "person" | "conversation" | "scoring" | "lead_finder";

interface StreamPanelState {
  // UI state (persisted to localStorage)
  isOpen: boolean;
  isMaximized: boolean;
  activeTabId: string | null;

  // Logs per job (NOT persisted - hydrated from DB on reload)
  // Key: jobId, Value: log entries
  jobLogs: Map<string, ClientLogEntry[]>;

  // Whether initial hydration has been done
  isHydrated: boolean;

  // UI Actions
  setOpen: (open: boolean) => void;
  toggle: () => void;
  toggleMaximize: () => void;
  setActiveTab: (jobId: string | null) => void;

  // Log management
  appendLogs: (jobId: string, logs: ClientLogEntry[]) => void;
  setLogs: (jobId: string, logs: ClientLogEntry[]) => void;
  hydrateAll: (allLogs: Map<string, ClientLogEntry[]>) => void;
  clearLogs: (jobId: string) => void;
}

export const useStreamPanelStore = create<StreamPanelState>()(
  persist(
    (set) => ({
      isOpen: false,
      isMaximized: false,
      activeTabId: null,
      jobLogs: new Map(),
      isHydrated: false,

      setOpen: (open) => set({ isOpen: open }),

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      toggleMaximize: () =>
        set((state) => ({ isMaximized: !state.isMaximized, isOpen: true })),

      setActiveTab: (jobId) => set({ activeTabId: jobId }),

      // Append new logs (from live streaming)
      appendLogs: (jobId, logs) =>
        set((state) => {
          const newJobLogs = new Map(state.jobLogs);
          const existing = newJobLogs.get(jobId) ?? [];
          const seen = new Set(existing.map((log) => log.id));
          const fresh = logs.filter((log) => !seen.has(log.id));
          if (fresh.length === 0) {
            return state;
          }
          newJobLogs.set(jobId, [...existing, ...fresh]);
          return { jobLogs: newJobLogs };
        }),

      // Set logs for a job (replaces existing)
      setLogs: (jobId, logs) =>
        set((state) => {
          const newJobLogs = new Map(state.jobLogs);
          newJobLogs.set(jobId, logs);
          return { jobLogs: newJobLogs };
        }),

      // Hydrate all job logs at once (on panel mount / reload)
      hydrateAll: (allLogs) =>
        set((state) => {
          // Only hydrate jobs that don't already have logs (preserve live streaming data)
          const newJobLogs = new Map(state.jobLogs);
          for (const [jobId, logs] of allLogs) {
            if (!newJobLogs.has(jobId) || newJobLogs.get(jobId)!.length === 0) {
              newJobLogs.set(jobId, logs);
            }
          }
          return { jobLogs: newJobLogs, isHydrated: true };
        }),

      clearLogs: (jobId) =>
        set((state) => {
          const newJobLogs = new Map(state.jobLogs);
          newJobLogs.delete(jobId);
          return { jobLogs: newJobLogs };
        }),
    }),
    {
      name: "stream-panel-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist UI state, not logs
      partialize: (state) => ({
        isOpen: state.isOpen,
        isMaximized: state.isMaximized,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
