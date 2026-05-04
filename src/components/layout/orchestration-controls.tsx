"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { ApolloKeyStatus, ResearchDepth } from "@/lib/tauri/commands";
import { clearApolloApiKey, getApolloKeyStatus, setApolloApiKey } from "@/lib/tauri/commands";
import { SwitchPill } from "@/components/ui/switch-pill";
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
  const [keyStatus, setKeyStatus] = useState<ApolloKeyStatus>({
    configured: false,
    source: "none",
    last4: null,
    keyLength: null,
  });
  const [replaceMode, setReplaceMode] = useState(false);
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    loadSettings();
    getApolloKeyStatus()
      .then((status) => setKeyStatus(status))
      .catch(() =>
        setKeyStatus({ configured: false, source: "error", last4: null, keyLength: null }),
      );
  }, [loadSettings]);

  async function handleSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setBusy("save");
    try {
      await setApolloApiKey(trimmed);
      const status = await getApolloKeyStatus();
      setKeyStatus(status);
      setApiKey("");
      setReplaceMode(false);
      toast.success("Apollo key connected");
    } catch (error) {
      console.error("Failed to save Apollo API key:", error);
      toast.error("Failed to save Apollo API key");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Apollo and remove the saved key from this device?")) {
      return;
    }
    setBusy("clear");
    try {
      await clearApolloApiKey();
      const status = await getApolloKeyStatus();
      setKeyStatus(status);
      setApiKey("");
      setReplaceMode(false);
      toast.success("Apollo disconnected");
    } catch (error) {
      console.error("Failed to clear Apollo API key:", error);
      toast.error("Failed to clear Apollo API key");
    } finally {
      setBusy(null);
    }
  }

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
          {(Object.keys(depthLabels) as ResearchDepth[]).map((depth) => {
            const active = defaultResearchDepth === depth;
            return (
              <button
                key={depth}
                type="button"
                disabled={disabled}
                onClick={() => updateOrchestration({ defaultResearchDepth: depth })}
                className={cn(
                  "relative h-7 rounded-[6px] text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-ink-3 hover:text-ink hover:bg-paper/60"
                )}
              >
                {active && (
                  <m.span
                    layoutId="settings-depth-active"
                    className="absolute inset-0 rounded-[6px] bg-paper shadow-sm"
                    transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                  />
                )}
                <span className="relative">{depthLabels[depth]}</span>
              </button>
            );
          })}
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
            {[1, 2, 3].map((value) => {
              const active = deepJobConcurrency === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => updateOrchestration({ deepJobConcurrency: value })}
                  className={cn(
                    "relative h-6 w-7 rounded-[6px] text-[11px] font-medium transition-colors",
                    active ? "text-ink" : "text-ink-3 hover:text-ink hover:bg-paper/60"
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="deep-slots-active"
                      className="absolute inset-0 rounded-[6px] bg-paper shadow-sm"
                      transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                    />
                  )}
                  <span className="relative">{value}</span>
                </button>
              );
            })}
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
              const cents =
                raw === "" || !Number.isFinite(value)
                  ? null
                  : Math.max(0, Math.round(value * 100));
              // 0 is ambiguous — users mean "no cap", not "deny all". Persist as null so the
              // backend stays uncapped instead of locking every Apollo call out.
              updateOrchestration({
                dailyBudgetUsdCents: cents === 0 ? null : cents,
              });
            }}
            className="h-7 w-20 rounded-[6px] border border-line bg-paper px-2 text-right text-[11px] outline-none focus:border-flame disabled:opacity-60"
          />
        </div>
      </div>
      <div
        className={cn(
          "relative px-2.5 py-2.5 rounded-[12px] transition-colors",
          keyStatus.configured && !replaceMode
            ? "bg-gradient-to-b from-leaf/[0.06] to-transparent"
            : "bg-bg-2/40",
        )}
      >
        {keyStatus.configured && !replaceMode && !reducedMotion ? (
          <m.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-leaf/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6] }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        ) : null}

        <div className="relative flex items-center justify-between gap-2 mb-2">
          <span className="font-mono-label text-ink-3">Apollo Key</span>
          <ConnectionPill status={keyStatus} reducedMotion={reducedMotion ?? false} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {keyStatus.configured && !replaceMode ? (
            <m.div
              key="connected"
              initial={reducedMotion ? false : { opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative space-y-2"
            >
              <div className="group relative overflow-hidden rounded-[10px] border border-leaf/30 bg-paper px-2.5 py-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-leaf/[0.04] via-transparent to-leaf/[0.06]"
                />
                <div className="relative flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-leaf/10 text-leaf">
                    <KeyIcon />
                  </span>
                  <div
                    className="flex-1 min-w-0 truncate font-mono text-[12px] leading-none tracking-[0.16em] text-ink"
                    aria-label={`Apollo API key ending in ${keyStatus.last4 ?? "unknown"}`}
                    title={
                      keyStatus.last4
                        ? `Saved Apollo key — last 4: ${keyStatus.last4}`
                        : "Apollo key saved"
                    }
                  >
                    {renderMaskedKey(keyStatus)}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setReplaceMode(true);
                    setApiKey("");
                  }}
                  className="h-7 flex-1 rounded-[7px] border border-line bg-paper text-[11px] font-medium text-ink-2 transition-all duration-150 hover:-translate-y-px hover:border-line-2 hover:text-ink focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={busy === "clear" || keyStatus.source === "env"}
                  title={
                    keyStatus.source === "env"
                      ? "Set via APOLLO_API_KEY env — unset that to disconnect."
                      : undefined
                  }
                  className="h-7 flex-1 rounded-[7px] border border-line bg-paper text-[11px] font-medium text-ink-3 transition-all duration-150 hover:-translate-y-px hover:border-flame/40 hover:text-flame focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-3"
                >
                  {busy === "clear" ? "Removing…" : "Disconnect"}
                </button>
              </div>
            </m.div>
          ) : (
            <m.div
              key="disconnected"
              initial={reducedMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative space-y-2"
            >
              <label
                htmlFor="apollo-api-key-input"
                className="group relative block overflow-hidden rounded-[10px] border border-line bg-paper transition-all duration-150 focus-within:border-flame/60 focus-within:shadow-[0_0_0_3px_rgba(255,91,31,0.10)] hover:border-line-2"
              >
                <div className="flex items-center gap-2 px-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-[6px] transition-colors",
                      apiKey.trim()
                        ? "bg-flame/10 text-flame"
                        : "bg-bg-2 text-ink-3 group-focus-within:bg-flame/10 group-focus-within:text-flame",
                    )}
                  >
                    <ApolloMonogram />
                  </span>
                  <input
                    id="apollo-api-key-input"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && apiKey.trim()) {
                        event.preventDefault();
                        void handleSave();
                      } else if (event.key === "Escape" && replaceMode) {
                        event.preventDefault();
                        setReplaceMode(false);
                        setApiKey("");
                      }
                    }}
                    placeholder={replaceMode ? "Paste new key" : "Paste Apollo key"}
                    aria-label="Apollo API key"
                    className="min-w-0 flex-1 h-8 bg-transparent font-mono text-[11px] tracking-[0.04em] text-ink outline-none placeholder:text-ink-3/70"
                  />
                  {apiKey ? (
                    <button
                      type="button"
                      aria-label="Clear input"
                      onClick={() => setApiKey("")}
                      className="grid h-5 w-5 place-items-center rounded-full text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
                    >
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M3 3l6 6M9 3l-6 6" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </label>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!apiKey.trim() || busy === "save"}
                  className={cn(
                    "relative h-8 flex-1 overflow-hidden rounded-[7px] text-[11.5px] font-medium tracking-[0.02em] text-paper",
                    "bg-gradient-to-b from-flame to-flame-2 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(255,91,31,0.30)]",
                    "transition-all duration-150 hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_4px_12px_rgba(255,91,31,0.32)]",
                    "active:translate-y-0 active:shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(255,91,31,0.30)]",
                    "focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2",
                    "disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-ink-3 disabled:to-ink-3 disabled:opacity-50 disabled:shadow-none",
                  )}
                >
                  <span className="relative inline-flex items-center justify-center gap-1.5">
                    {busy === "save" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Spinner />
                        Saving…
                      </span>
                    ) : (
                      <>
                        <BoltIcon />
                        {replaceMode ? "Update key" : "Connect Apollo"}
                      </>
                    )}
                  </span>
                </button>
                {replaceMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceMode(false);
                      setApiKey("");
                    }}
                    aria-label="Cancel"
                    className="h-8 w-8 rounded-[7px] border border-line bg-paper text-ink-3 transition-colors hover:text-ink focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] leading-tight text-ink-3">
                {replaceMode
                  ? "Enter to save · Esc to cancel"
                  : "Stored locally · macOS Keychain"}
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ConnectionPill({
  status,
  reducedMotion,
}: {
  status: ApolloKeyStatus;
  reducedMotion: boolean;
}) {
  if (!status.configured) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-3">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-3/60" />
        Not connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-leaf">
      <span aria-hidden className="relative h-1.5 w-1.5">
        {!reducedMotion ? (
          <m.span
            className="absolute inset-0 rounded-full bg-leaf/40"
            animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        <span className="absolute inset-0 rounded-full bg-leaf shadow-[0_0_6px_rgba(31,170,109,0.6)]" />
      </span>
      Connected
      <span className="text-ink-3">·</span>
      <span className="text-ink-3">{status.source}</span>
    </span>
  );
}

function KeyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5.5" cy="8" r="2.5" />
      <path d="M8 8h6.5M11.5 8v2M13.5 8v1.5" />
    </svg>
  );
}

function ApolloMonogram() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 13L8 3l5 10" />
      <path d="M5.5 9.5h5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="currentColor"
    >
      <path d="M7 1L2.5 7h2.4L4.5 11 9.5 5H7.1L7 1z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 2a6 6 0 016 6" />
    </svg>
  );
}

function renderMaskedKey(status: ApolloKeyStatus): string {
  const last4 = status.last4 ?? "";
  if (!last4) return "•••• •••• ••••";
  return `•••• •••• ${last4}`;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}
