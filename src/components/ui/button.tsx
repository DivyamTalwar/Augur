import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Button — Technical Minimalist primitive.
 *  - Sharp 2px radius, 1px hairline borders, no shadows.
 *  - Orange accent for default CTA. Outline + ghost are 1px hairline frames.
 *  - Snappy 120ms color transitions; press-state via active:scale-[0.98].
 */
const buttonVariants = cva(
  [
    "group/button inline-flex items-center justify-center whitespace-nowrap select-none",
    "rounded-sm border bg-clip-padding text-xs font-medium",
    "transition-colors duration-150 ease-out",
    "outline-none focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98] motion-reduce:active:scale-100",
    "[&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-white hover:bg-accent-hover",
        outline:
          "border-hairline bg-bg text-fg-emphasis hover:bg-hover-surface",
        secondary:
          "border-transparent bg-surface text-fg-emphasis hover:bg-hover-surface",
        ghost:
          "border-transparent bg-transparent text-fg-muted hover:bg-hover-surface hover:text-fg-emphasis",
        destructive:
          "border-transparent bg-destructive text-white hover:bg-destructive/90",
        link:
          "border-transparent bg-transparent text-accent underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-8 gap-1.5 px-3",
        xs: "h-6 gap-1 px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2 px-4 text-sm",
        icon: "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
