"use client";

import { m } from "motion/react";
import type { ResearchDepth } from "@/lib/tauri/commands";
import { cn } from "@/lib/utils";

interface DepthDef {
  value: ResearchDepth;
  label: string;
  agents: string;
  description: string;
  accent: string;
}

const DEPTHS: DepthDef[] = [
  {
    value: "light",
    label: "Light",
    agents: "1 agent",
    description: "Single Opus pass — fast snapshot of the company.",
    accent: "var(--color-ink)",
  },
  {
    value: "standard",
    label: "Standard",
    agents: "5 + verifier",
    description: "Parallel specialists for pain, triggers, tech & buyer map.",
    accent: "var(--color-flame-2)",
  },
  {
    value: "deep",
    label: "Deep",
    agents: "8 + verifier",
    description: "Full swarm — adds business model, competitive, growth.",
    accent: "var(--color-flame)",
  },
];

interface ResearchDepthDialProps {
  value: ResearchDepth;
  onChange: (depth: ResearchDepth) => void;
  /** Optional — when provided, the dial auto-enables orchestration when user picks Standard/Deep. */
  onEnableOrchestration?: () => void;
}

export function ResearchDepthDial({
  value,
  onChange,
  onEnableOrchestration,
}: ResearchDepthDialProps) {
  const handlePick = (depth: ResearchDepth) => {
    if (depth !== "light") {
      onEnableOrchestration?.();
    }
    onChange(depth);
  };

  return (
    <div
      className="rounded-[14px] border border-line p-4"
      style={{
        background:
          "linear-gradient(180deg, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 92%, var(--color-bg-2)) 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px -16px rgba(26,23,20,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          Research Depth
        </span>
        <span className="font-mono text-[10px] text-ink-3">per-run</span>
      </div>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Research depth">
        {DEPTHS.map((depth) => {
          const active = value === depth.value;
          return (
            <button
              key={depth.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => handlePick(depth.value)}
              className={cn(
                "relative group/depth flex flex-col items-start text-left rounded-[10px] p-3 transition-all duration-150 ease-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/40",
                active
                  ? "bg-paper text-ink"
                  : "bg-bg-2/50 text-ink-2 hover:bg-paper hover:text-ink hover:-translate-y-[1px]"
              )}
              style={
                active
                  ? {
                      boxShadow: `0 0 0 1.5px ${depth.accent} inset, 0 12px 28px -16px color-mix(in srgb, ${depth.accent} 65%, transparent), 0 1px 0 rgba(255,255,255,0.6) inset`,
                    }
                  : undefined
              }
            >
              {active && (
                <m.span
                  layoutId="research-depth-tile-glow"
                  aria-hidden
                  className="absolute inset-0 rounded-[10px] pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${depth.accent} 14%, transparent), transparent 60%)`,
                  }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                />
              )}

              <div className="relative flex items-center gap-1.5 w-full">
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: active ? depth.accent : "var(--color-line-2)" }}
                />
                <span
                  className={cn(
                    "font-semibold text-[12px] tracking-[-0.005em]",
                    active && "text-ink"
                  )}
                >
                  {depth.label}
                </span>
                <span
                  className={cn(
                    "ml-auto font-mono text-[9px] uppercase tracking-wider tabular-nums",
                    active ? "text-ink-2" : "text-ink-3"
                  )}
                >
                  {depth.agents}
                </span>
              </div>
              <p
                className={cn(
                  "relative mt-1.5 text-[10.5px] leading-[1.45]",
                  active ? "text-ink-2" : "text-ink-3"
                )}
              >
                {depth.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
