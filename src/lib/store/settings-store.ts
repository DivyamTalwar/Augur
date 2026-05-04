import { create } from "zustand";
import {
  getSettings,
  updateOrchestrationSettings,
  updateSettings as updateSettingsCmd,
  type ResearchDepth,
} from "@/lib/tauri/commands";

// Model is locked to claude-opus-4-6 at xhigh reasoning effort in the Rust
// job queue. Surface the label here so the sidebar can display it without
// offering a selector.
export const LOCKED_MODEL_LABEL = "Opus 4.7 · xhigh";

interface SettingsState {
  useChrome: boolean;
  orchestrationEnabled: boolean;
  defaultResearchDepth: ResearchDepth;
  apolloEnabled: boolean;
  apolloMaxContacts: number;
  deepJobConcurrency: number;
  dailyBudgetUsdCents: number | null;
  isLoading: boolean;
  isInitialized: boolean;
  loadSettings: () => Promise<void>;
  setUseChrome: (useChrome: boolean) => Promise<void>;
  updateOrchestration: (settings: Partial<OrchestrationSettingsPatch>) => Promise<void>;
}

interface OrchestrationSettingsPatch {
  orchestrationEnabled: boolean;
  defaultResearchDepth: ResearchDepth;
  apolloEnabled: boolean;
  apolloMaxContacts: number;
  deepJobConcurrency: number;
  dailyBudgetUsdCents: number | null;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  useChrome: false,
  orchestrationEnabled: false,
  defaultResearchDepth: "light",
  apolloEnabled: false,
  apolloMaxContacts: 10,
  deepJobConcurrency: 1,
  dailyBudgetUsdCents: null,
  isLoading: false,
  isInitialized: false,

  loadSettings: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const settings = await getSettings();
      set({
        useChrome: settings.useChrome,
        orchestrationEnabled: settings.orchestrationEnabled,
        defaultResearchDepth: settings.defaultResearchDepth,
        apolloEnabled: settings.apolloEnabled,
        apolloMaxContacts: settings.apolloMaxContacts,
        deepJobConcurrency: settings.deepJobConcurrency,
        dailyBudgetUsdCents: settings.dailyBudgetUsdCents,
        isInitialized: true,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setUseChrome: async (useChrome: boolean) => {
    set({ useChrome });
    try {
      await updateSettingsCmd(useChrome);
    } catch (error) {
      console.error("Failed to update useChrome setting:", error);
    }
  },

  updateOrchestration: async (patch) => {
    const current = get();
    const next = {
      orchestrationEnabled: patch.orchestrationEnabled ?? current.orchestrationEnabled,
      defaultResearchDepth: patch.defaultResearchDepth ?? current.defaultResearchDepth,
      apolloEnabled: patch.apolloEnabled ?? current.apolloEnabled,
      apolloMaxContacts: patch.apolloMaxContacts ?? current.apolloMaxContacts,
      deepJobConcurrency: patch.deepJobConcurrency ?? current.deepJobConcurrency,
      dailyBudgetUsdCents:
        "dailyBudgetUsdCents" in patch
          ? patch.dailyBudgetUsdCents ?? null
          : current.dailyBudgetUsdCents,
    };

    set(next);
    try {
      await updateOrchestrationSettings(next);
    } catch (error) {
      console.error("Failed to update orchestration settings:", error);
      set({
        orchestrationEnabled: current.orchestrationEnabled,
        defaultResearchDepth: current.defaultResearchDepth,
        apolloEnabled: current.apolloEnabled,
        apolloMaxContacts: current.apolloMaxContacts,
        deepJobConcurrency: current.deepJobConcurrency,
        dailyBudgetUsdCents: current.dailyBudgetUsdCents,
      });
    }
  },
}));
