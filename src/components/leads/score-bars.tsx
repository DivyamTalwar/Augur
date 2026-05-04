import { m } from "motion/react";
import type { ParsedLeadScore, ScoringTier } from "@/lib/types/scoring";
import { cn } from "@/lib/utils";

const tierColors: Record<ScoringTier, string> = {
  hot: "bg-flame",
  warm: "bg-flame-2",
  nurture: "bg-leaf",
  disqualified: "bg-line-2",
};

const tierTextColors: Record<ScoringTier, string> = {
  hot: "text-flame",
  warm: "text-flame-2",
  nurture: "text-leaf",
  disqualified: "text-ink-3",
};

const TOTAL_BARS = 10;

interface BarsProps {
  value: number;
  tier: ScoringTier | null;
  size?: "sm" | "default" | "lg";
}

export function Bars({ value, tier, size = "default" }: BarsProps) {
  const filledBars = Math.floor(value / 10);
  const partialFill = (value % 10) / 10;
  const tierColor = tier ? tierColors[tier] : "bg-line-2";

  const sizeConfig = {
    sm: { barWidth: "w-[2px]", barHeight: "h-3", gap: "gap-[2px]" },
    default: { barWidth: "w-1", barHeight: "h-4", gap: "gap-[2px]" },
    lg: { barWidth: "w-1.5", barHeight: "h-5", gap: "gap-[3px]" },
  };

  const { barWidth, barHeight, gap } = sizeConfig[size];

  return (
    <div className={cn("flex items-end", gap)}>
      {Array.from({ length: TOTAL_BARS }).map((_, index) => {
        const isFilled = index < filledBars;
        const isPartial = index === filledBars && partialFill > 0;
        const fill = isFilled ? 1 : isPartial ? partialFill : 0;

        return (
          <div key={index} className={cn("relative bg-bg-2", barWidth, barHeight)}>
            {fill > 0 && (
              <m.div
                className={cn("absolute bottom-0 left-0 right-0 origin-bottom", tierColor)}
                style={{ height: `${fill * 100}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 22,
                  delay: index * 0.03,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ScoreBarsProps {
  score: ParsedLeadScore | null;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function ScoreBars({ score, size = "default", showLabel = false }: ScoreBarsProps) {
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <m.span
          key={score?.totalScore ?? 0}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="text-sm font-medium tabular-nums w-2"
        >
          {score?.totalScore ?? 0}
        </m.span>
      )}
      <Bars value={score?.totalScore ?? 0} tier={score?.tier ?? null} size={size} />
    </div>
  );
}

interface ScoreCardProps {
  score: ParsedLeadScore | null;
  className?: string;
}

export function ScoreCard({ score, className }: ScoreCardProps) {
  const totalScore = score?.totalScore ?? 0;
  const tier = score?.tier;
  const tierTextColor = tier ? tierTextColors[tier] : "text-ink-3";
  const tierLabel = tier
    ? { hot: "Hot", warm: "Warm", nurture: "Nurture", disqualified: "Filtered Out" }[tier]
    : "Unscored";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline gap-2">
        <m.span
          key={totalScore}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className={cn("text-lg font-bold tabular-nums", tierTextColor)}
        >
          {totalScore}
        </m.span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{tierLabel}</span>
      </div>
      <Bars value={totalScore} tier={tier ?? null} size="default" />
      {score && (
        <div className="text-xs text-muted-foreground">
          {score.passesRequirements
            ? `${score.requirementResults.filter((r) => r.passed).length}/${score.requirementResults.length} requirements`
            : "Failed requirements"}
        </div>
      )}
    </div>
  );
}

export { tierColors, tierTextColors };
