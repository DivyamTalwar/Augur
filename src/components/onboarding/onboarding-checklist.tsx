"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { OnboardingStatus } from "@/lib/tauri/types";
import { cn } from "@/lib/utils";

type StepDef = {
  id: string;
  label: string;
};

const STEPS: StepDef[] = [
  { id: "create-lead", label: "Connect your data source" },
  { id: "start-research", label: "Define your ICP & prompts" },
  { id: "score-lead", label: "Score your first account" },
  { id: "research-person", label: "Research the buyer" },
  { id: "conversation-insights", label: "Generate conversation insights" },
];

function getCompletions(status: OnboardingStatus): boolean[] {
  return [
    status.hasLead,
    status.hasResearchedLead,
    status.hasScoredLead,
    status.hasResearchedPerson,
    status.hasConversationTopics,
  ];
}

interface OnboardingChecklistProps {
  status: OnboardingStatus;
}

export function OnboardingChecklist({ status }: OnboardingChecklistProps) {
  const completions = useMemo(() => getCompletions(status), [status]);
  const completedCount = completions.filter(Boolean).length;
  const total = STEPS.length;
  const allDone = completedCount === total;
  const activeIndex = completions.findIndex((c) => !c);

  const [expanded] = useState(true);

  if (allDone) return null;

  const progress = Math.max(8, (completedCount / total) * 100);

  return (
    <div
      className="mt-3.5 rounded-[14px] p-3.5 relative overflow-hidden"
      style={{
        background: "var(--color-paper)",
        border: "1px solid var(--color-line)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px -12px rgba(26,23,20,0.15)",
      }}
    >
      {/* Shimmer top border — restrained 3-stop */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, var(--color-flame), var(--color-flame-2), var(--color-leaf))",
          backgroundSize: "200% 100%",
          animation: "shimmer 8s linear infinite",
        }}
      />

      {/* Head */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
          Getting started
        </div>
        <div className="font-mono text-[11px] text-ink-3 tabular-nums">
          {String(completedCount).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: "var(--color-bg-2)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          style={{
            background:
              "linear-gradient(90deg, var(--color-flame), var(--color-flame-2))",
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="space-y-0.5">
              {STEPS.map((step, idx) => {
                const isDone = completions[idx];
                const isActive = !isDone && idx === activeIndex;
                return <Step key={step.id} label={step.label} done={isDone} active={isActive} />;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={cn("flex gap-2.5 items-start py-1.5 text-xs leading-snug")}>
      <CheckCircle done={done} active={active} />
      <span
        className={cn(
          "leading-relaxed",
          done && "text-ink-3 line-through decoration-line-2",
          active && !done && "text-ink font-semibold",
          !done && !active && "text-ink-2 font-medium"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function CheckCircle({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span
        aria-hidden
        className="grid place-items-center w-4 h-4 rounded-full mt-[1px] shrink-0"
        style={{ background: "var(--color-leaf)", borderColor: "var(--color-leaf)" }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 4.5l2 2 4-4.5" />
        </svg>
      </span>
    );
  }
  if (active) {
    return (
      <span
        aria-hidden
        className="grid place-items-center w-4 h-4 rounded-full mt-[1px] shrink-0 border-[1.5px]"
        style={{
          background: "var(--color-flame)",
          borderColor: "var(--color-flame)",
          animation: "pulse-active 1.6s ease-in-out infinite",
        }}
      >
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--color-paper)" }} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="w-4 h-4 rounded-full mt-[1px] shrink-0 border-[1.5px]"
      style={{ borderColor: "var(--color-line-2)" }}
    />
  );
}
