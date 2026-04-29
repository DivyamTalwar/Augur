import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ResearchDepth } from "@/lib/tauri/commands";

interface ResearchDepthOverrideState {
  overrides: Record<number, ResearchDepth>;
  getDepthForLead: (leadId: number, fallback: ResearchDepth) => ResearchDepth;
  setDepthForLead: (leadId: number, depth: ResearchDepth) => void;
}

export const useResearchDepthOverrideStore = create<ResearchDepthOverrideState>()(
  persist(
    (set, get) => ({
      overrides: {},
      getDepthForLead: (leadId, fallback) => get().overrides[leadId] ?? fallback,
      setDepthForLead: (leadId, depth) =>
        set((state) => ({
          overrides: {
            ...state.overrides,
            [leadId]: depth,
          },
        })),
    }),
    {
      name: "research-depth-overrides",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
