import { PageHeader } from "@/components/layout/page-header";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import { FindLeadsModal } from "@/components/leads/find-leads-modal";
import { LeadListWithSelection } from "@/components/leads/lead-list-with-selection";
import { LeadDiscoveryHero } from "@/components/leads/lead-discovery-hero";
import { useLeadsWithScores } from "@/lib/hooks/use-leads";
import { useStreamTabs } from "@/lib/hooks/use-stream-tabs";
import { COPY } from "@/lib/copy";
import type { LeadWithScore } from "@/lib/tauri/types";

function groupByUserStatus(leads: LeadWithScore[]) {
  const groups: Record<string, LeadWithScore[]> = {
    new: [],
    qualified: [],
    contacted: [],
    meeting: [],
    proposal: [],
    negotiating: [],
    won: [],
    lost: [],
    on_hold: [],
  };
  for (const lead of leads) {
    const status = lead.userStatus || "new";
    if (!groups[status]) groups[status] = [];
    groups[status].push(lead);
  }
  return groups;
}

function getTierCounts(leads: LeadWithScore[]) {
  const counts = { hot: 0, warm: 0, nurture: 0, disqualified: 0, unscored: 0 };
  for (const lead of leads) {
    if (lead.score) counts[lead.score.tier]++;
    else counts.unscored++;
  }
  return counts;
}

export default function LeadListPage() {
  const { leads, isLoading, refresh } = useLeadsWithScores();
  const { tabs } = useStreamTabs();
  const grouped = groupByUserStatus(leads);
  const tier = getTierCounts(leads);
  const hasRunningJob = tabs.some(
    (t) => t.status === "running" || t.status === "queued"
  );
  const isEmpty = leads.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={COPY.companies.eyebrow}
        eyebrowColor="var(--color-c-company)"
        title={COPY.companies.heroTitle}
        subtitle={COPY.companies.heroSub}
        actions={
          <>
            <FindLeadsModal onSuccess={refresh} />
            <AddLeadModal onSuccess={refresh} />
          </>
        }
      />

      <TierBar tier={tier} total={leads.length} />


      {isLoading && isEmpty ? (
        <div className="flex items-center justify-center py-20">
          <span
            className="inline-block w-5 h-5 rounded-full border-2 border-line border-t-flame"
            style={{ animation: "spin-360 0.8s linear infinite" }}
            aria-label="Loading"
          />
        </div>
      ) : isEmpty && hasRunningJob ? (
        <LeadDiscoveryHero />
      ) : (
        <div className="px-9 pt-5 pb-6">
          <LeadListWithSelection groupedLeads={grouped} onRefresh={refresh} />
        </div>
      )}
    </>
  );
}

interface TierCounts {
  hot: number;
  warm: number;
  nurture: number;
  disqualified: number;
  unscored: number;
}

const TIER_DEFS: Array<{
  key: keyof TierCounts;
  label: string;
  color: string;
  muted?: boolean;
  pulse?: boolean;
}> = [
  { key: "hot", label: "Hot", color: "var(--color-flame)", pulse: true },
  { key: "warm", label: "Warm", color: "var(--color-flame-2)" },
  { key: "nurture", label: "Nurture", color: "var(--color-ink)" },
  { key: "disqualified", label: "Filtered", color: "var(--color-ink-3)", muted: true },
  { key: "unscored", label: "Unscored", color: "var(--color-line-2)", muted: true },
];

function TierBar({ tier, total }: { tier: TierCounts; total: number }) {
  const scoredTotal =
    tier.hot + tier.warm + tier.nurture + tier.disqualified + tier.unscored || 1;
  return (
    <div
      className="px-9 py-3.5 flex items-center gap-3 border-b border-line"
      style={{ background: "var(--color-paper)" }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 shrink-0">
        Tiers
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {TIER_DEFS.map((def) => (
          <TierChip
            key={def.key}
            label={def.label}
            count={tier[def.key]}
            color={def.color}
            muted={def.muted}
            pulse={def.pulse}
          />
        ))}
      </div>

      <DistributionBar tier={tier} scoredTotal={scoredTotal} />

      <div className="ml-auto flex items-baseline gap-1.5 shrink-0">
        <span
          className="font-serif tabular-nums text-ink leading-none"
          style={{ fontSize: 26, letterSpacing: "-0.02em" }}
        >
          {total}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          total
        </span>
      </div>
    </div>
  );
}

function TierChip({
  label,
  count,
  color,
  muted,
  pulse,
}: {
  label: string;
  count: number;
  color: string;
  muted?: boolean;
  pulse?: boolean;
}) {
  const isHotActive = !!pulse && count > 0;
  return (
    <span className="relative inline-flex">
      {isHotActive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-3px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, var(--color-flame), transparent 65%)",
            filter: "blur(4px)",
            opacity: 0.5,
            animation: "pulse-active 2.4s ease-in-out infinite",
          }}
        />
      )}
      <span
        className="relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors"
        style={{
          color: muted ? "var(--color-ink-3)" : color,
          background: muted
            ? "var(--color-bg-2)"
            : `color-mix(in srgb, ${color} 9%, var(--color-paper))`,
          border: `1px solid ${muted ? "var(--color-line)" : `color-mix(in srgb, ${color} 28%, var(--color-line))`}`,
        }}
      >
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
        {label}
        <span
          className="tabular-nums font-bold"
          style={{ color: muted ? "var(--color-ink-2)" : "var(--color-ink)" }}
        >
          {count}
        </span>
      </span>
    </span>
  );
}

function DistributionBar({
  tier,
  scoredTotal,
}: {
  tier: TierCounts;
  scoredTotal: number;
}) {
  const segments: Array<{ key: keyof TierCounts; color: string }> = [
    { key: "hot", color: "var(--color-flame)" },
    { key: "warm", color: "var(--color-flame-2)" },
    { key: "nurture", color: "var(--color-ink)" },
    { key: "disqualified", color: "var(--color-ink-3)" },
    { key: "unscored", color: "var(--color-line-2)" },
  ];
  return (
    <div
      className="hidden lg:flex flex-1 h-1.5 rounded-full overflow-hidden min-w-0"
      style={{ background: "var(--color-bg-2)" }}
      role="img"
      aria-label="Tier distribution"
    >
      {segments.map((seg) => {
        const value = tier[seg.key];
        if (value <= 0) return null;
        return (
          <span
            key={seg.key}
            style={{
              width: `${(value / scoredTotal) * 100}%`,
              background: seg.color,
              transition: "width 320ms cubic-bezier(0.32,0.72,0,1)",
            }}
          />
        );
      })}
    </div>
  );
}
