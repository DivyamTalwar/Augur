import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — Technical Minimalist text field.
 *  - 1px hairline border, sharp 2px radius, no shadow.
 *  - Focus state: orange accent border + 1px ring.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-sm border border-hairline bg-bg px-3 py-1",
        "text-xs text-fg-emphasis placeholder:text-fg-muted",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-fg",
        className
      )}
      {...props}
    />
  );
}

export { Input };
