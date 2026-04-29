/**
 * Scoring rubric primitives matching scoring.html.
 * - SectionHead with sec-pin (gate=flame diamond, signal=grape gradient circle)
 * - CritRow (gate variant: required tag) + WeightedCrit (with animated fill bar + stepper)
 * - ScoreHistogram (10-bar bg-2→ink-3→sun→flame gradient, with axis)
 * - WeightBar (stacked horizontal segmented gradient)
 * - Insight row (tip/test tags)
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* ========== Section heads ========== */

interface SectionHeadProps {
  pin: "gate" | "signal";
  title: string;
  sub: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHead({ pin, title, sub, action, className }: SectionHeadProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-3.5", className)}>
      <div>
        <div className="flex items-center gap-2.5 text-[14px] font-bold text-ink">
          <span aria-hidden className={cn("w-[9px] h-[9px] shrink-0", pin === "gate" ? "rounded-[3px]" : "rounded-full")}
            style={
              pin === "gate"
                ? { background: "var(--color-flame)", transform: "rotate(45deg)" }
                : {
                    background:
                      "linear-gradient(135deg, var(--color-leaf), var(--color-leaf-2))",
                    boxShadow: "0 0 0 3px rgba(31,170,109,0.14)",
                  }
            }
          />
          {title}
        </div>
        <div className="text-[12px] text-ink-3 mt-0.5 pl-[19px]">{sub}</div>
      </div>
      {action}
    </div>
  );
}

export function AddBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold text-ink border border-line bg-paper hover:bg-bg-2 hover:border-flame hover:-translate-y-px transition-[background,border-color,transform] duration-150"
    >
      <span className="text-flame font-bold text-[14px] leading-none">+</span>
      {children}
    </button>
  );
}

/* ========== Crit row ========== */

interface CritProps {
  highlighted?: boolean;
  children: React.ReactNode;
}

export function Crit({ highlighted, children }: CritProps) {
  if (highlighted) {
    return (
      <div
        className="grid items-center gap-3.5 px-4 py-3.5 mb-2 rounded-[12px] relative transition-[background,transform,box-shadow] duration-200"
        style={{
          gridTemplateColumns: "14px 1fr auto",
          background:
            "linear-gradient(var(--color-paper), var(--color-paper)) padding-box, linear-gradient(135deg, var(--color-flame), var(--color-rose), var(--color-grape)) border-box",
          border: "1.5px solid transparent",
          boxShadow: "0 6px 24px -12px rgba(255,91,31,0.35)",
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className="group/crit grid items-center gap-3.5 px-4 py-3.5 mb-2 rounded-[12px] bg-paper border border-line transition-[background,border-color,transform,box-shadow] duration-200 hover:border-line-2 hover:-translate-y-px hover:shadow-[0_6px_18px_-10px_rgba(26,23,20,0.18)] relative"
      style={{ gridTemplateColumns: "14px 1fr auto" }}
    >
      {children}
    </div>
  );
}

export function CritGrip() {
  return (
    <div
      aria-hidden
      className="w-[10px] h-4 cursor-grab opacity-60 group-hover/crit:opacity-100 transition-opacity"
      style={{
        backgroundImage: "radial-gradient(circle, var(--color-line-2) 1px, transparent 1.5px)",
        backgroundSize: "4px 4px",
      }}
    />
  );
}

export function CritBody({
  name,
  desc,
  badge,
  fill,
  fillColor = "linear-gradient(90deg, var(--color-leaf), #3FCB85)",
}: {
  name: string;
  desc: React.ReactNode;
  badge?: React.ReactNode;
  fill?: number;
  fillColor?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-semibold text-ink flex items-center gap-2 mb-[3px]">
        <span className="truncate">{name}</span>
        {badge}
      </div>
      <div className="text-[12px] text-ink-2 leading-[1.5]">{desc}</div>
      {fill !== undefined && (
        <div
          className="mt-2.5 h-[5px] rounded-full overflow-hidden relative"
          style={{ background: "var(--color-bg-2)" }}
        >
          <span
            className="block h-full rounded-full relative"
            style={{
              width: `${Math.max(0, Math.min(100, fill))}%`,
              background: fillColor,
              boxShadow: "0 0 8px -2px currentColor",
              animation: "fill-in .8s cubic-bezier(.2,.7,.2,1) both",
              ["--w" as string]: `${Math.max(0, Math.min(100, fill))}%`,
            } as React.CSSProperties}
          >
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                backgroundSize: "50% 100%",
                backgroundRepeat: "no-repeat",
                animation: "indicator-sweep 2.5s ease-in-out infinite",
              }}
            />
          </span>
        </div>
      )}
    </div>
  );
}

export function CritTagPass() {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-[0.06em] font-semibold px-2.5 py-1 rounded-md"
      style={{
        background: "rgba(255,91,31,0.08)",
        color: "var(--color-flame)",
        border: "1px solid rgba(255,91,31,0.2)",
      }}
    >
      required
    </span>
  );
}

export function BadgeKey() {
  return (
    <span
      className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] px-1.5 py-[2px] rounded-md text-white"
      style={{
        background: "linear-gradient(135deg, var(--color-flame), var(--color-flame-2))",
      }}
    >
      key
    </span>
  );
}

/* ========== Weight stepper ========== */

interface WeightStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

export function WeightStepper({ value, onChange, min = 0, max = 10 }: WeightStepperProps) {
  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] font-bold text-ink-3">weight</span>
      <div
        className="inline-flex items-center h-[30px] rounded-lg overflow-hidden"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-line)" }}
      >
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label="Decrement"
          className="w-[26px] h-[30px] grid place-items-center text-ink-2 hover:bg-paper hover:text-flame transition-colors"
        >
          −
        </button>
        <b
          className="grid place-items-center w-8 h-[30px] font-mono text-[13px] font-bold text-ink"
          style={{
            background: "var(--color-paper)",
            borderLeft: "1px solid var(--color-line)",
            borderRight: "1px solid var(--color-line)",
          }}
        >
          {value}
        </b>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label="Increment"
          className="w-[26px] h-[30px] grid place-items-center text-ink-2 hover:bg-paper hover:text-flame transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ========== Score histogram ========== */

interface ScoreHistogramProps {
  /** 10-bin counts (any range; auto-scales to max). */
  bins: number[];
  /** Indices of bins that represent "warm" tier. */
  warm?: number[];
  /** Indices of bins that represent "hot" tier. */
  hot?: number[];
  /** Axis labels (5 items). */
  axisLabels?: [string, string, string, string, string];
}

export function ScoreHistogram({
  bins,
  warm = [],
  hot = [],
  axisLabels = ["0", "10", "20", "30", "40"],
}: ScoreHistogramProps) {
  const max = Math.max(1, ...bins);
  return (
    <div className="mt-2">
      <div className="grid grid-cols-10 gap-1 items-end h-[70px] pt-2">
        {bins.map((b, i) => {
          const h = Math.max(6, (b / max) * 100);
          const isHot = hot.includes(i);
          const isWarm = !isHot && warm.includes(i);
          const bg = isHot
            ? "linear-gradient(180deg, var(--color-flame), var(--color-flame-2))"
            : isWarm
              ? "linear-gradient(180deg, var(--color-flame-2), var(--color-flame))"
              : "linear-gradient(180deg, var(--color-ink-3), var(--color-line-2))";
          const shadow = isHot ? "0 0 12px -2px rgba(255,91,31,0.5)" : undefined;
          return (
            <span
              key={i}
              className="rounded-t-[3px] hover:scale-y-[1.04] transition-transform"
              style={{
                height: `${h}%`,
                background: bg,
                boxShadow: shadow,
                animation: "fade-up 0.9s cubic-bezier(.2,.7,.2,1) both",
                animationDelay: `${i * 40}ms`,
              }}
              title={`${b}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[9px] text-ink-3 pt-1.5 pb-[2px] border-t border-dashed border-line mt-1">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/* ========== Weight bar (stacked horizontal) ========== */

export interface WeightSegment {
  id: string;
  label: string;
  weight: number;
  color: string;
}

export function WeightBar({ segments }: { segments: WeightSegment[] }) {
  const total = Math.max(1, segments.reduce((acc, s) => acc + s.weight, 0));
  return (
    <div
      className="flex h-8 rounded-[9px] overflow-hidden my-3"
      style={{ boxShadow: "inset 0 0 0 1px var(--color-line)" }}
    >
      {segments.map((seg) => (
        <span
          key={seg.id}
          className="grid place-items-center font-mono text-[10px] font-bold text-white tracking-wider transition-[filter,transform] duration-150 hover:brightness-110 relative truncate px-1"
          style={{
            width: `${(seg.weight / total) * 100}%`,
            background: seg.color,
            boxShadow: "-1px 0 0 rgba(255,255,255,0.2)",
          }}
          title={`${seg.label} · ${seg.weight}`}
        >
          {seg.label}
        </span>
      ))}
    </div>
  );
}

/* ========== Insight ========== */

export function Insight({
  tone = "test",
  tag,
  children,
}: {
  tone?: "tip" | "test" | "warn";
  tag: string;
  children: React.ReactNode;
}) {
  const palette =
    tone === "warn"
      ? {
          bg: "rgba(255,91,31,0.08)",
          color: "var(--color-flame)",
          border: "rgba(255,91,31,0.18)",
        }
      : tone === "tip"
        ? {
            bg: "rgba(255,91,31,0.08)",
            color: "var(--color-flame)",
            border: "rgba(255,91,31,0.18)",
          }
        : {
            bg: "rgba(31,170,109,0.08)",
            color: "var(--color-leaf)",
            border: "rgba(31,170,109,0.18)",
          };
  return (
    <div className="flex gap-2.5 items-start py-2.5 border-t border-dashed border-line text-[12px] text-ink-2 leading-[1.5] first:border-t-0">
      <span
        className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] font-semibold px-1.5 py-0.5 rounded-md"
        style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}
      >
        {tag}
      </span>
      <span>{children}</span>
    </div>
  );
}
