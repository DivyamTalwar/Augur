"use client";

import { motion } from "motion/react";
import type { ResearchDepth } from "@/lib/tauri/commands";
import { cn } from "@/lib/utils";

const depths: Array<{ value: ResearchDepth; label: string; estimate: string }> = [
  { value: "light", label: "Light", estimate: "1 agent" },
  { value: "standard", label: "Standard", estimate: "specialists" },
  { value: "deep", label: "Deep", estimate: "full swarm" },
];

interface ResearchDepthDialProps {
  value: ResearchDepth;
  onChange: (depth: ResearchDepth) => void;
  orchestrationEnabled: boolean;
}

export function ResearchDepthDial({ value, onChange, orchestrationEnabled }: ResearchDepthDialProps) {
  return (
    <div className="rounded-[8px] border border-line bg-paper/80 px-3 py-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="font-mono-label text-ink-3">Research Depth</span>
        <span className="font-mono text-[10px] text-ink-3">
          {value === "light" ? "legacy" : orchestrationEnabled ? "per-run" : "disabled"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-[8px] bg-bg-2 p-1 border border-line" role="radiogroup" aria-label="Research depth">
        {depths.map((depth) => {
          const active = value === depth.value;
          const disabled = depth.value !== "light" && !orchestrationEnabled;
          return (
            <button
              key={depth.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => onChange(depth.value)}
              className={cn(
                "relative h-8 rounded-[6px] text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                active ? "text-ink" : "text-ink-3 hover:text-ink"
              )}
            >
              {active && (
                <motion.span
                  layoutId="research-depth-active"
                  className="absolute inset-0 rounded-[6px] bg-paper shadow-sm"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                />
              )}
              <span className="relative">{depth.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-ink-3">
        {depths.find((depth) => depth.value === value)?.estimate}
      </div>
    </div>
  );
}
