import { m } from "motion/react";
import type { ParsedLeadScore, ScoringTier } from "@/lib/types/scoring";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: ParsedLeadScore | null;
  size?: "sm" | "default";
}

interface TierStyle {
  bg: string;
  fg: string;
  border: string;
}

const tierStyles: Record<ScoringTier, TierStyle> = {
  hot: { bg: "var(--color-flame)", fg: "#FFFFFF", border: "var(--color-flame)" },
  warm: { bg: "var(--color-flame-2)", fg: "#FFFFFF", border: "var(--color-flame-2)" },
  nurture: { bg: "var(--color-grape)", fg: "#FFFFFF", border: "var(--color-grape)" },
  disqualified: {
    bg: "var(--color-bg-2)",
    fg: "var(--color-ink-3)",
    border: "var(--color-line-2)",
  },
};

// Subtle ember halo that pulses behind a Hot-tier badge. Only renders for hot.
// Continuous pulse — flame-tier leads are rare so the motion functions as an
// "attention" signal without distracting on calm states. Respects reduced-motion
// via the global rule in globals.css.
function HotEmberHalo() {
  return (
    <m.span
      aria-hidden
      className="pointer-events-none absolute inset-[-4px] rounded-[10px]"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, var(--color-flame) 0%, transparent 65%)",
        filter: "blur(4px)",
      }}
      animate={{ opacity: [0.32, 0.62, 0.32], scale: [0.94, 1.04, 0.94] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function ScoreBadge({ score, size = "default" }: ScoreBadgeProps) {
  const isHot = score?.tier === "hot";
  const style = score
    ? tierStyles[score.tier]
    : { bg: "var(--color-bg-2)", fg: "var(--color-ink-3)", border: "var(--color-line)" };
  const display = score ? score.totalScore : 0;
  const dim = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-[11px]";

  return (
    <span className="relative inline-flex">
      {isHot && <HotEmberHalo />}
      <span
        className={cn(
          "relative inline-flex items-center justify-center font-mono font-semibold rounded-md tabular-nums",
          dim
        )}
        style={{
          background: style.bg,
          color: style.fg,
          border: `1px solid ${style.border}`,
        }}
      >
        {display}
      </span>
    </span>
  );
}

interface ScoreBadgeLargeProps {
  score: ParsedLeadScore;
}

export function ScoreBadgeLarge({ score }: ScoreBadgeLargeProps) {
  const isHot = score.tier === "hot";
  const style = tierStyles[score.tier];
  const label =
    score.tier.charAt(0).toUpperCase() + score.tier.slice(1);

  return (
    <div className="relative inline-flex">
      {isHot && <HotEmberHalo />}
      <div
        className="relative flex items-center gap-3 px-4 py-2.5 rounded-[10px] border"
        style={{
          background: "var(--color-paper)",
          borderColor: style.border,
          boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset",
        }}
      >
        <div
          className="font-serif tabular-nums"
          style={{
            fontSize: 28,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: style.bg,
          }}
        >
          {score.totalScore}
        </div>
        <div>
          <div
            className="font-mono text-[11px] uppercase tracking-[0.1em] font-semibold"
            style={{ color: style.bg }}
          >
            {label}
          </div>
          <div className="text-[12px] text-ink-3 mt-0.5">
            {score.passesRequirements ? "Requirements Passed" : "Filtered Out"}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TierFilterTabsProps {
  activeTier: ScoringTier | "all" | "unscored";
  onTierChange: (tier: ScoringTier | "all" | "unscored") => void;
  counts: {
    all: number;
    hot: number;
    warm: number;
    nurture: number;
    disqualified: number;
    unscored: number;
  };
}

export function TierFilterTabs({ activeTier, onTierChange, counts }: TierFilterTabsProps) {
  const tabs: Array<{
    id: ScoringTier | "all" | "unscored";
    label: string;
    color?: string;
    count: number;
  }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "hot", label: "Hot", color: "var(--color-flame)", count: counts.hot },
    { id: "warm", label: "Warm", color: "var(--color-flame-2)", count: counts.warm },
    { id: "nurture", label: "Nurture", color: "var(--color-grape)", count: counts.nurture },
    { id: "disqualified", label: "Filtered Out", color: "var(--color-ink-3)", count: counts.disqualified },
    { id: "unscored", label: "Unscored", color: "var(--color-line-2)", count: counts.unscored },
  ];

  return (
    <div className="flex items-center gap-1">
      {tabs.map((tab) => {
        const isActive = activeTier === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTierChange(tab.id)}
            className={cn(
              "px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors",
              isActive ? "bg-bg-2 text-ink" : "text-ink-2 hover:text-ink hover:bg-bg-2/50"
            )}
          >
            <span style={tab.color ? { color: tab.color } : undefined}>{tab.label}</span>
            {tab.count > 0 && <span className="ml-1.5 text-ink-3 font-mono text-[11px]">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
