import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * StatusBadge — Technical Minimalist system indicator.
 *
 *  ┌──────────────────────┐
 *  │ ▪ ACTIVE             │   1px hairline · 8×8 dot · JetBrains Mono uppercase 10px
 *  └──────────────────────┘
 *
 * Variants encode tier/state without leaving the black/white/orange palette:
 *   - neutral: hairline border, fg-muted text, fg-emphasis dot
 *   - accent:  hairline border tinted orange, accent text, accent dot (use for Hot / Live / Active)
 *   - subtle:  no border, surface bg, muted text (use inline w/ dense tables)
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-2 rounded-sm font-mono uppercase font-medium tracking-[0.08em] whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        neutral: "border border-hairline bg-bg text-fg-muted",
        accent: "border border-accent/30 bg-accent-tint text-accent",
        subtle: "bg-surface text-fg-muted",
      },
      size: {
        sm: "h-5 px-2 text-[9px]",
        default: "h-6 px-3 text-[10px]",
        lg: "h-7 px-3.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
);

const dotVariants = cva("shrink-0", {
  variants: {
    variant: {
      neutral: "bg-fg-emphasis",
      accent: "bg-accent",
      subtle: "bg-fg-muted",
    },
    size: {
      sm: "size-1.5",
      default: "size-2",
      lg: "size-2.5",
    },
  },
  defaultVariants: {
    variant: "neutral",
    size: "default",
  },
});

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Hide the leading dot (text-only label). */
  hideDot?: boolean;
}

export function StatusBadge({
  className,
  variant,
  size,
  hideDot = false,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {!hideDot && (
        <span aria-hidden className={cn(dotVariants({ variant, size }))} />
      )}
      <span>{children}</span>
    </span>
  );
}
