"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn("h-full w-full", className)}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

/**
 * Vertical resize handle — visible 6px bar with a flame grip dot.
 * Hard-coded vertical orientation (only group in the app is vertical).
 * The v4 lib outputs `data-separator="vertical"` not `data-orientation`,
 * so we don't bother with conditional CSS.
 */
function ResizableHandle({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "group/handle relative flex h-1.5 w-full items-center justify-center cursor-row-resize",
        "bg-line transition-colors duration-150",
        "hover:bg-flame/40 active:bg-flame focus-visible:bg-flame focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 h-[3px] w-12 rounded-full bg-line-2 shadow-sm transition-all duration-150",
            "group-hover/handle:bg-flame group-hover/handle:w-16",
            "group-active/handle:bg-flame group-active/handle:w-16"
          )}
        />
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
