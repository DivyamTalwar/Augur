"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { SwitchPill } from "@/components/ui/switch-pill";
import { cn } from "@/lib/utils";

const ChromeIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" />
  </svg>
);

export function ChromeToggle() {
  const useChrome = useSettingsStore((state) => state.useChrome);
  const setUseChrome = useSettingsStore((state) => state.setUseChrome);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const disabled = !isInitialized;

  return (
    <button
      type="button"
      onClick={() => !disabled && setUseChrome(!useChrome)}
      disabled={disabled}
      aria-pressed={useChrome}
      className={cn(
        "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[10px] text-[13px] font-medium",
        "text-ink-2 transition-colors duration-150 ease-out",
        "hover:bg-flame/[0.06] hover:text-ink",
        "outline-none focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2",
        "disabled:opacity-60 disabled:pointer-events-none"
      )}
    >
      <span className="shrink-0">{ChromeIcon}</span>
      <span className="flex-1 text-left truncate">Chrome Access</span>
      <SwitchPill active={useChrome} />
    </button>
  );
}
