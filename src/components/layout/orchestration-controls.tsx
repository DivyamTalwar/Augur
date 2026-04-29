"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { ResearchDepth } from "@/lib/tauri/commands";
import { clearApolloApiKey, getApolloKeyStatus, setApolloApiKey } from "@/lib/tauri/commands";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DepthIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 12.5h11M4 10V6m4 4V3.5m4 6.5V5" />
  </svg>
);

const ApolloIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6 11 5M5 11l-1.4 1.4" />
  </svg>
);

const depthLabels: Record<ResearchDepth, string> = {
  light: "Light",
  standard: "Standard",
  deep: "Deep",
};

const depthEstimates: Record<ResearchDepth, string> = {
  light: "1 agent",
  standard: "5+verify",
  deep: "8+verify",
};

export function OrchestrationControls() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);
  const orchestrationEnabled = useSettingsStore((state) => state.orchestrationEnabled);
  const defaultResearchDepth = useSettingsStore((state) => state.defaultResearchDepth);
  const apolloEnabled = useSettingsStore((state) => state.apolloEnabled);
  const apolloMaxContacts = useSettingsStore((state) => state.apolloMaxContacts);
  const deepJobConcurrency = useSettingsStore((state) => state.deepJobConcurrency);
  const dailyBudgetUsdCents = useSettingsStore((state) => state.dailyBudgetUsdCents);
  const updateOrchestration = useSettingsStore((state) => state.updateOrchestration);
  const [apiKey, setApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState("none");

  useEffect(() => {
    loadSettings();
    getApolloKeyStatus()
      .then((status) => setKeyStatus(status.configured ? status.source : "none"))
      .catch(() => setKeyStatus("unknown"));
  }, [loadSettings]);

  const disabled = !isInitialized;
  const dailyBudgetUsd = dailyBudgetUsdCents == null ? "" : String(dailyBudgetUsdCents / 100);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => !disabled && updateOrchestration({ orchestrationEnabled: !orchestrationEnabled })}
        disabled={disabled}
        aria-pressed={orchestrationEnabled}
        className={cn(
          "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[10px] text-[13px] font-medium",
          "text-ink-2 transition-colors duration-150 ease-out",
          "hover:bg-flame/[0.06] hover:text-ink",
          "outline-none focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2",
          "disabled:opacity-60 disabled:pointer-events-none"
        )}
      >
        <span className="shrink-0">{DepthIcon}</span>
        <span className="flex-1 text-left truncate">Specialists</span>
        <SwitchPill active={orchestrationEnabled} />
      </button>

      <div className="px-2.5 py-2 rounded-[10px]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono-label text-ink-3">Depth</span>
          <span className="font-mono text-[10px] text-ink-3">{depthEstimates[defaultResearchDepth]}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-[8px] bg-bg-2 p-1 border border-line">
          {(Object.keys(depthLabels) as ResearchDepth[]).map((depth) => (
            <button
              key={depth}
              type="button"
              disabled={disabled}
              onClick={() => updateOrchestration({ defaultResearchDepth: depth })}
              className={cn(
                "h-7 rounded-[6px] text-[11px] font-medium transition-colors",
                defaultResearchDepth === depth
                  ? "bg-paper text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink hover:bg-paper/60"
              )}
            >
              {depthLabels[depth]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => !disabled && updateOrchestration({ apolloEnabled: !apolloEnabled })}
        disabled={disabled}
        aria-pressed={apolloEnabled}
        className={cn(
          "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[10px] text-[13px] font-medium",
          "text-ink-2 transition-colors duration-150 ease-out",
          "hover:bg-flame/[0.06] hover:text-ink",
          "outline-none focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2",
          "disabled:opacity-60 disabled:pointer-events-none"
        )}
      >
        <span className="shrink-0">{ApolloIcon}</span>
        <span className="flex-1 text-left truncate">Apollo</span>
        <span className="font-mono text-[10px] text-ink-3">{apolloMaxContacts}</span>
        <SwitchPill active={apolloEnabled} />
      </button>
      <div className="px-2.5 py-2 rounded-[10px] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="font-mono-label text-ink-3" htmlFor="apollo-max-contacts">
            Max Contacts
          </label>
          <input
            id="apollo-max-contacts"
            type="number"
            min={1}
            max={25}
            value={apolloMaxContacts}
            disabled={disabled}
            onChange={(event) => {
              const value = clampInteger(Number(event.target.value), 1, 25);
              updateOrchestration({ apolloMaxContacts: value });
            }}
            className="h-7 w-16 rounded-[6px] border border-line bg-paper px-2 text-right text-[11px] outline-none focus:border-flame disabled:opacity-60"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-label text-ink-3">Deep Slots</span>
          <div className="grid grid-cols-3 gap-1 rounded-[8px] bg-bg-2 p-1 border border-line">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => updateOrchestration({ deepJobConcurrency: value })}
                className={cn(
                  "h-6 w-7 rounded-[6px] text-[11px] font-medium transition-colors",
                  deepJobConcurrency === value
                    ? "bg-paper text-ink shadow-sm"
                    : "text-ink-3 hover:text-ink hover:bg-paper/60"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="font-mono-label text-ink-3" htmlFor="apollo-daily-cap">
            Daily Cap
          </label>
          <input
            id="apollo-daily-cap"
            type="number"
            min={0}
            step="0.01"
            value={dailyBudgetUsd}
            disabled={disabled}
            placeholder="No cap"
            onChange={(event) => {
              const raw = event.target.value.trim();
              const value = Number(raw);
              updateOrchestration({
                dailyBudgetUsdCents:
                  raw === "" || !Number.isFinite(value)
                    ? null
                    : Math.max(0, Math.round(value * 100)),
              });
            }}
            className="h-7 w-20 rounded-[6px] border border-line bg-paper px-2 text-right text-[11px] outline-none focus:border-flame disabled:opacity-60"
          />
        </div>
      </div>
      <div className="px-2.5 py-2 rounded-[10px]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono-label text-ink-3">Apollo Key</span>
          <span className="font-mono text-[10px] text-ink-3">{keyStatus}</span>
        </div>
        <div className="flex gap-1">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="API key"
            className="min-w-0 flex-1 h-7 rounded-[6px] border border-line bg-paper px-2 text-[11px] outline-none focus:border-flame"
          />
          <button
            type="button"
            className="h-7 px-2 rounded-[6px] bg-ink text-paper text-[11px] font-medium disabled:opacity-50"
            disabled={!apiKey.trim()}
            onClick={async () => {
              try {
                await setApolloApiKey(apiKey);
                setApiKey("");
                const status = await getApolloKeyStatus();
                setKeyStatus(status.configured ? status.source : "none");
                toast.success("Apollo API key saved");
              } catch (error) {
                console.error("Failed to save Apollo API key:", error);
                setKeyStatus("error");
                toast.error("Failed to save Apollo API key");
              }
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="h-7 px-2 rounded-[6px] border border-line text-[11px] text-ink-3 hover:text-ink"
            onClick={async () => {
              if (!window.confirm("Clear the saved Apollo API key from this device?")) {
                return;
              }
              try {
                await clearApolloApiKey();
                const status = await getApolloKeyStatus();
                setKeyStatus(status.configured ? status.source : "none");
                toast.success("Apollo API key cleared");
              } catch (error) {
                console.error("Failed to clear Apollo API key:", error);
                setKeyStatus("error");
                toast.error("Failed to clear Apollo API key");
              }
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function SwitchPill({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-block w-8 h-[18px] rounded-full transition-colors duration-200"
      style={{
        background: active ? "var(--color-flame)" : "var(--color-line-2)",
      }}
    >
      <span
        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-paper transition-transform duration-200"
        style={{
          transform: active ? "translateX(16px)" : "translateX(2px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </span>
  );
}
