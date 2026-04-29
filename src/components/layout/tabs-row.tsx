"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TabKey = "overview" | "company" | "person" | "convo";

export type TabShape = "circle" | "square" | "diamond";

export interface TabDef<K extends string = string> {
  key: K;
  label: string;
  /** Tab dot color CSS var or hex. */
  color: string;
  /** "circle" | "square" | "diamond" — matches reference shape variants. */
  shape: TabShape;
}

const PROMPT_TABS: TabDef<TabKey>[] = [
  { key: "overview", label: "Company Overview", color: "var(--color-c-overview)", shape: "square" },
  { key: "company", label: "Company", color: "var(--color-c-company)", shape: "square" },
  { key: "person", label: "Person", color: "var(--color-c-person)", shape: "circle" },
  { key: "convo", label: "Conversation", color: "var(--color-c-convo)", shape: "diamond" },
];

interface TabsRowProps<K extends string> {
  active: K;
  onChange: (key: K) => void;
  /** Override the default Prompt-page tab set (e.g. on /scoring). */
  tabs?: TabDef<K>[];
}

export function TabsRow<K extends string = TabKey>({
  active,
  onChange,
  tabs,
}: TabsRowProps<K>) {
  const tabDefs = (tabs ?? (PROMPT_TABS as unknown as TabDef<K>[]));
  const rowRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<K, HTMLButtonElement | null>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number; color: string }>({
    left: 36,
    width: 0,
    color: tabDefs[0]?.color ?? "var(--color-flame)",
  });

  const measure = () => {
    const rowEl = rowRef.current;
    const tabEl = tabRefs.current.get(active);
    if (!rowEl || !tabEl) return;
    const r = tabEl.getBoundingClientRect();
    const rowR = rowEl.getBoundingClientRect();
    const def = tabDefs.find((t) => t.key === active);
    setIndicator({
      left: r.left - rowR.left,
      width: r.width,
      color: def?.color ?? "var(--color-flame)",
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(measure, [active, tabDefs.length]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rowRef}
      role="tablist"
      className="relative px-9 flex items-center border-b border-line"
      style={{ background: "var(--color-paper)" }}
    >
      {tabDefs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current.set(tab.key, el);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-[18px] py-[14px] text-[13px] font-medium relative",
              "transition-colors duration-150 ease-out",
              isActive ? "text-ink font-semibold" : "text-ink-3 hover:text-ink"
            )}
          >
            <span
              aria-hidden
              className="block transition-transform duration-200"
              style={{
                width: 8,
                height: 8,
                background: tab.color,
                borderRadius: tab.shape === "circle" ? "50%" : 2,
                transform: tab.shape === "diamond" ? "rotate(45deg)" : undefined,
                animation: isActive ? "dot-glow 1.6s ease-in-out infinite" : undefined,
              }}
            />
            {tab.label}
          </button>
        );
      })}
      {/* Animated indicator */}
      <span
        aria-hidden
        className="absolute -bottom-[1px] h-[2px] rounded-t-sm pointer-events-none overflow-hidden"
        style={{
          left: indicator.left,
          width: indicator.width,
          background: indicator.color,
          boxShadow: `0 0 12px ${indicator.color}`,
          transition:
            "left 0.45s cubic-bezier(0.7,0,0.2,1), width 0.45s cubic-bezier(0.7,0,0.2,1), background 0.25s",
        }}
      >
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
            backgroundSize: "50% 100%",
            backgroundRepeat: "no-repeat",
            animation: "indicator-sweep 2.5s ease-in-out infinite",
          }}
        />
      </span>
    </div>
  );
}
