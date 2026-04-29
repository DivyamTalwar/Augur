/**
 * EditorCard — paper-on-paper editor with conic-gradient rotating border.
 * Composed: <EditorCard><EditorHead/><EditorToolbar/>{doc body}<EditorFoot/></EditorCard>.
 * Reference: augur-os.html `.editor` + `.editor-inner`.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function EditorCard({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative rounded-[18px] tab-pane", className)}
      style={{
        padding: "1.5px",
        background:
          "conic-gradient(from var(--ang,0deg), var(--color-flame), var(--color-flame-2), var(--color-leaf), var(--color-flame))",
        boxShadow: "0 24px 48px -32px rgba(26,23,20,0.22)",
        animation: "editor-spin 14s linear infinite",
      }}
    >
      <div
        className="rounded-[16.5px] overflow-hidden"
        style={{
          background: "var(--color-paper)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface EditorHeadProps {
  badge: string;
  title: string;
  meta?: React.ReactNode;
}

export function EditorHead({ badge, title, meta }: EditorHeadProps) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4 border-b border-line"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,91,31,0.025), transparent)",
      }}
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <div
          className="grid place-items-center w-6 h-6 rounded-[7px] text-paper italic font-serif text-[12px]"
          style={{ background: "var(--color-ink)" }}
        >
          {badge}
        </div>
        {title}
      </div>
      {meta && (
        <div className="ml-auto flex items-center gap-3.5 font-mono text-[11px] text-ink-3">
          {meta}
        </div>
      )}
    </div>
  );
}

export function EditorSavedTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: "var(--color-leaf)" }}>
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "var(--color-leaf)",
          boxShadow: "0 0 0 3px rgba(31,170,109,0.15)",
        }}
      />
      {children}
    </span>
  );
}

export function EditorToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-line" style={{ background: "var(--color-bg)" }}>
      {children}
    </div>
  );
}

export function ToolChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-[5px] rounded-md font-mono text-[11px] font-medium transition-colors duration-150 ease-out",
        active ? "text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-ink-2 hover:text-ink"
      )}
      style={{
        background: active ? "var(--color-paper)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

export function ToolDivider() {
  return <span aria-hidden className="w-[1px] h-3.5 mx-1" style={{ background: "var(--color-line-2)" }} />;
}

export function EditorFoot({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3.5 border-t border-line"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="font-mono text-[11px] text-ink-3 flex gap-3.5">{left}</div>
      <div className="flex gap-2">{right}</div>
    </div>
  );
}

/* ============================================
   Buttons (matching reference .btn-primary / .btn-ghost)
   ============================================ */

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold text-white relative overflow-hidden",
        "transition-transform duration-150 ease-out",
        "hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none",
        className
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--color-flame-2), var(--color-flame), var(--color-rose))",
        backgroundSize: "200% 200%",
        animation: "btn-flow 4s ease-in-out infinite",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.4) inset, 0 -1px 0 rgba(0,0,0,0.1) inset, 0 4px 12px rgba(255,91,31,0.35)",
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold border border-line text-ink-2 transition-colors duration-150 ease-out",
        "hover:bg-bg-2 hover:text-ink disabled:opacity-60 disabled:pointer-events-none",
        className
      )}
      style={{ background: "var(--color-paper)" }}
    >
      {children}
    </button>
  );
}
