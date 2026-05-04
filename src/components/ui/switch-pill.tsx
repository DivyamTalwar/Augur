import { cn } from "@/lib/utils";

interface SwitchPillProps {
  active: boolean;
  className?: string;
}

/**
 * iOS-style switch with proportions tuned to never look "detached":
 *  pill 36×20, thumb 16×16, 2px gap on either edge in both states.
 * Uses palette tokens. Decorative — wrap in a button with aria-pressed for a11y.
 */
export function SwitchPill({ active, className }: SwitchPillProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
        className
      )}
      style={{
        background: active ? "var(--color-flame)" : "var(--color-line-2)",
        boxShadow: active
          ? "0 0 0 1px rgba(255,91,31,0.34) inset, 0 1px 2px rgba(255,91,31,0.18)"
          : "0 0 0 1px rgba(0,0,0,0.04) inset",
      }}
    >
      <span
        className="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-paper transition-transform duration-200 ease-out"
        style={{
          transform: active ? "translateX(18px)" : "translateX(2px)",
          boxShadow:
            "0 1px 2px rgba(26,23,20,0.22), 0 0 0 1px rgba(26,23,20,0.04)",
        }}
      />
    </span>
  );
}
