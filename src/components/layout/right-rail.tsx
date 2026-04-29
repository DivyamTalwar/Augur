/**
 * Right rail components — pipeline stat card, signals card, coach card.
 * Reference: augur-os.html `.rail-card`, `.stat`, `.signal`, dark coach card.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Rail({ children, className }: { children: React.ReactNode; className?: string }) {
  return <aside className={cn("flex flex-col gap-[18px]", className)}>{children}</aside>;
}

interface RailCardProps {
  children: React.ReactNode;
  /** When true, renders a gradient padding-box border. */
  gradientBorder?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function RailCard({ children, gradientBorder, className, style }: RailCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] p-[18px]",
        "transition-transform transition-shadow duration-300 ease-[cubic-bezier(.2,.7,.2,1)]",
        "hover:-translate-y-[3px]",
        className
      )}
      style={{
        background: gradientBorder
          ? "linear-gradient(var(--color-paper), var(--color-paper)) padding-box, linear-gradient(135deg, rgba(255,91,31,0.45), rgba(31,170,109,0.4)) border-box"
          : "var(--color-paper)",
        border: gradientBorder ? "1px solid transparent" : "1px solid var(--color-line)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px -16px rgba(26,23,20,0.12)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function RailEyebrow({
  children,
  blipColor = "var(--color-flame)",
}: {
  children: React.ReactNode;
  blipColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.14em] text-ink-3 mb-2.5">
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: blipColor }}
      />
      {children}
    </div>
  );
}

export function RailTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[15px] font-bold text-ink mb-1">{children}</div>;
}

export function RailDesc({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] leading-[1.5] text-ink-2 mb-3.5">{children}</div>
  );
}

/* Stats grid */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

export function Stat({ value, label, accent }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-[10px] p-3 transition-[transform,border-color] duration-200 hover:scale-[1.03] hover:border-flame group/stat"
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-line)",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 ease-out group-hover/stat:scale-x-100"
        style={{
          background: "linear-gradient(90deg, var(--color-flame), var(--color-flame-2))",
        }}
      />
      <div
        className="font-serif tabular-nums text-ink mb-1"
        style={{ fontSize: 30, lineHeight: 1, letterSpacing: "-0.02em" }}
      >
        {accent ? (
          <em
            className="italic"
            style={{
              background:
                "linear-gradient(120deg, var(--color-flame), var(--color-rose), var(--color-grape))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {value}
          </em>
        ) : (
          value
        )}
      </div>
      <div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-ink-3">{label}</div>
    </div>
  );
}

/* Signals */
type SignalTone = "live" | "queue" | "warn";

export function Signal({
  tone = "queue",
  tag,
  children,
}: {
  tone?: SignalTone;
  tag: string;
  children: React.ReactNode;
}) {
  const palette: Record<SignalTone, { bg: string; color: string; border: string }> = {
    live: {
      bg: "rgba(31,170,109,0.08)",
      color: "var(--color-leaf)",
      border: "rgba(31,170,109,0.20)",
    },
    queue: {
      bg: "rgba(0,0,0,0.04)",
      color: "var(--color-ink-2)",
      border: "rgba(0,0,0,0.10)",
    },
    warn: {
      bg: "rgba(255,91,31,0.08)",
      color: "var(--color-flame)",
      border: "rgba(255,91,31,0.20)",
    },
  };
  const p = palette[tone];
  return (
    <div className="flex items-center gap-2.5 py-2.5 text-[12px] border-b border-dashed border-line last:border-b-0 last:pb-0">
      <span
        className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded-md"
        style={{
          background: p.bg,
          color: p.color,
          border: `1px solid ${p.border}`,
        }}
      >
        {tag}
      </span>
      <span className="text-ink-2 flex-1">{children}</span>
    </div>
  );
}

/* Coach card — dark variant */
export function CoachCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[14px] p-[18px] text-paper transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-[3px]"
      style={{
        background: "linear-gradient(135deg, #1A1714, #2A241D)",
        border: "1px solid #1A1714",
        boxShadow: "0 8px 24px -12px rgba(26,23,20,0.45)",
      }}
    >
      {children}
    </div>
  );
}
