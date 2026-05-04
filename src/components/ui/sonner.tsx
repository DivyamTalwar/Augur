"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  IconCircleCheck,
  IconInfoCircle,
  IconAlertTriangle,
  IconCircleX,
  IconLoader2,
} from "@/components/ui/icon";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      offset={20}
      gap={10}
      closeButton
      className="toaster group"
      icons={{
        success: <IconCircleCheck className="size-4 text-leaf" />,
        info: <IconInfoCircle className="size-4 text-ink-2" />,
        warning: <IconAlertTriangle className="size-4 text-flame-2" />,
        error: <IconCircleX className="size-4 text-destructive" />,
        loading: <IconLoader2 className="size-4 animate-spin text-flame" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-paper)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-line)",
          "--success-bg": "var(--color-paper)",
          "--success-text": "var(--color-ink)",
          "--success-border": "color-mix(in srgb, var(--color-leaf) 36%, var(--color-line))",
          "--error-bg": "var(--color-paper)",
          "--error-text": "var(--color-ink)",
          "--error-border": "color-mix(in srgb, var(--color-destructive) 36%, var(--color-line))",
          "--warning-bg": "var(--color-paper)",
          "--warning-text": "var(--color-ink)",
          "--warning-border": "color-mix(in srgb, var(--color-flame-2) 40%, var(--color-line))",
          "--border-radius": "12px",
          "--font-family":
            '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast items-start!",
          icon: "mt-0.5",
          title: "text-foreground! font-medium",
          description: "text-muted-foreground!",
          error: "text-destructive!",
          closeButton:
            "border! border-line! bg-paper! text-ink-3! hover:text-ink! hover:bg-bg-2!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
