import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ChromeToggle } from "./chrome-toggle";
import { OrchestrationControls } from "./orchestration-controls";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { useOnboardingStatus } from "@/lib/query";
import { useSettingsStore } from "@/lib/store/settings-store";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const ViewsIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="5" height="5" rx="1" />
    <rect x="9" y="3" width="5" height="5" rx="1" />
    <rect x="2" y="10" width="5" height="3" rx="1" />
    <rect x="9" y="10" width="5" height="3" rx="1" />
  </svg>
);

const PeopleIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="6" r="2.5" />
    <path d="M3 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
  </svg>
);

const PromptIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3h10M3 7h10M3 11h6" />
  </svg>
);

const ScoringIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 1.5l1.8 4.4 4.7.4-3.6 3 1.1 4.6L8 11.5l-4 2.4 1.1-4.6-3.6-3 4.7-.4z" />
  </svg>
);

const ModelIcon = (
  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 4v4l2.5 1.5" />
  </svg>
);

function NavRow({ to, label, icon, badge }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] font-medium",
          "transition-[background,color,transform] duration-150 ease-out",
          isActive
            ? "text-paper"
            : "text-ink-2 hover:bg-flame/[0.06] hover:text-ink"
        )
      }
      style={({ isActive }) =>
        isActive
          ? {
              background: "linear-gradient(135deg, #1A1714, #2A241D)",
              boxShadow:
                "0 4px 14px -4px rgba(26,23,20,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            }
          : undefined
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <>
              {/* gradient overlay for the orange-tinged inset */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-[10px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,91,31,0.15), transparent 50%)",
                }}
              />
              {/* pulsing flame bar to the left */}
              <span
                aria-hidden
                className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[18px]"
                style={{
                  background:
                    "linear-gradient(180deg, var(--color-flame), var(--color-flame-2))",
                  borderRadius: "0 4px 4px 0",
                  boxShadow: "0 0 10px rgba(255,91,31,0.6)",
                  animation: "bar-pulse 2s ease-in-out infinite",
                }}
              />
            </>
          )}
          <span className={cn("relative z-[1] shrink-0", isActive && "opacity-100")}>{icon}</span>
          <span className="relative z-[1] flex-1 truncate">{label}</span>
          {badge && (
            <span
              className={cn(
                "relative z-[1] font-mono text-[10px] px-1.5 py-0.5 rounded-md",
                isActive ? "text-paper" : "text-ink-2"
              )}
              style={{
                background: isActive ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
              }}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-3 pb-2 text-[10px] uppercase font-bold tracking-[0.14em] text-ink-3">
      <span className="font-mono font-semibold text-ink-2">{num}</span>
      <span>{children}</span>
    </div>
  );
}

export function Sidebar() {
  const { data: onboardingStatus } = useOnboardingStatus();
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <aside
      className="relative flex max-h-[42vh] w-full flex-col overflow-hidden border-b border-line p-3 md:max-h-none md:w-[260px] md:border-b-0 md:border-r md:p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(251,247,242,0.85) 0%, rgba(246,239,226,0.85) 100%)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
      }}
    >
      {/* Animated edge gradient on right */}
      <span
        aria-hidden
        className="absolute top-0 right-0 w-[1px] h-full pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,91,31,0.5), rgba(31,170,109,0.4), transparent)",
          backgroundSize: "100% 200%",
          animation: "edge-flow 8s linear infinite",
        }}
      />

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-[18px]">
        <div
          className="relative grid place-items-center w-[34px] h-[34px] rounded-[10px] text-[#FBF7F2] font-extrabold text-[16px]"
          style={{
            letterSpacing: "-0.02em",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.5) inset, 0 4px 12px rgba(26,23,20,0.25)",
            background:
              "linear-gradient(#1A1714, #2A241D) padding-box, conic-gradient(from var(--ang2,0deg), var(--color-flame), var(--color-flame-2), var(--color-leaf), var(--color-flame)) border-box",
            border: "2px solid transparent",
            animation: "brand-spin 8s linear infinite",
          }}
        >
          <span className="relative z-[1]">A</span>
        </div>
        <div className="font-serif text-[22px] tracking-[-0.01em] text-ink leading-none">
          Augur <em className="italic text-flame">OS</em>
        </div>
        <div className="ml-auto font-mono uppercase text-[10px] font-semibold tracking-[0.06em] text-ink-2 bg-paper border border-line px-[7px] py-[3px] rounded-full">
          v3
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col">
        <div>
          <SectionLabel num="01">Views</SectionLabel>
          <div className="space-y-1">
            <NavRow to="/lead" label="Companies" icon={ViewsIcon} />
            <NavRow to="/people" label="People" icon={PeopleIcon} />
          </div>
        </div>

        <div>
          <SectionLabel num="02">Workspace</SectionLabel>
          <div className="space-y-1">
            <NavRow to="/prompt" label="Prompt" icon={PromptIcon} />
            <NavRow to="/scoring" label="Scoring" icon={ScoringIcon} />
          </div>
        </div>

        <div>
          <SectionLabel num="03">Settings</SectionLabel>
          <div className="space-y-1">
            <div className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] font-medium text-ink-2">
              <span className="shrink-0">{ModelIcon}</span>
              <span className="flex-1 truncate">Opus 4.6</span>
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{
                  color: "var(--color-leaf)",
                  background: "rgba(31,170,109,0.1)",
                }}
              >
                live
              </span>
            </div>
            <ChromeToggle />
            <OrchestrationControls />
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {onboardingStatus && <OnboardingChecklist status={onboardingStatus} />}
    </aside>
  );
}
