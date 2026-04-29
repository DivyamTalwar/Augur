/**
 * PageHeader — compact hero variant for list / scoring / detail pages.
 * Title (Instrument Serif), sub (ink-2 14px), optional eyebrow + right-side actions.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Color CSS variable for the eyebrow blip (default flame). */
  eyebrowColor?: string;
  actions?: React.ReactNode;
  /** Reduce vertical padding when the page already has dense content below. */
  compact?: boolean;
}

function renderTitle(raw: string) {
  const parts = raw.split(/\*([^*]+)\*/g);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      return (
        <em
          key={i}
          className="italic"
          style={{
            background:
              "linear-gradient(120deg, var(--color-flame) 0%, var(--color-flame-2) 50%, var(--color-leaf) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            animation: "gradient-shift 8s ease-in-out infinite",
          }}
        >
          {p}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  eyebrowColor = "var(--color-flame)",
  actions,
  compact = false,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "relative border-b border-line overflow-hidden",
        compact ? "px-9 pt-5 pb-4" : "px-9 pt-7 pb-[22px]"
      )}
      style={{
        background:
          "radial-gradient(800px 300px at 100% 0%, rgba(255,91,31,0.06), transparent 60%), radial-gradient(600px 240px at 0% 100%, rgba(31,170,109,0.04), transparent 60%)",
      }}
    >
      <div className="grid-bg" />
      <div className="relative z-[1] flex items-end gap-6">
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <div
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold mb-3 px-2.5 py-1 rounded-full"
              style={{
                color: eyebrowColor,
                background: `${eyebrowColor.replace("var(--color-", "rgba(").replace(")", ",0.08)")}`,
                border: `1px solid ${eyebrowColor.replace("var(--color-", "rgba(").replace(")", ",0.2)")}`,
              }}
            >
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: eyebrowColor,
                  boxShadow: `0 0 0 4px ${eyebrowColor.replace("var(--color-", "rgba(").replace(")", ",0.18)")}`,
                  animation: "pulse-dot 1.4s ease-in-out infinite",
                }}
              />
              {eyebrow}
            </div>
          )}
          <h1
            className="font-serif m-0 text-ink"
            style={{
              fontSize: compact ? 32 : 42,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {renderTitle(title)}
          </h1>
          {subtitle && (
            <p
              className="text-ink-2 m-0 max-w-[640px]"
              style={{ fontSize: 14, lineHeight: 1.5, marginTop: 8 }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
