import { PageHeader } from "@/components/layout/page-header";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import { FindLeadsModal } from "@/components/leads/find-leads-modal";
import { LeadListWithSelection } from "@/components/leads/lead-list-with-selection";
import { useLeadsWithScores } from "@/lib/hooks/use-leads";
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
  const grouped = groupByUserStatus(leads);
  const tier = getTierCounts(leads);

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

      <div
        className="px-9 py-3 flex items-center gap-4 border-b border-line"
        style={{ background: "var(--color-paper)" }}
      >
        <span className="font-mono-label">Tiers</span>
        <TierChip label="Hot" count={tier.hot} color="var(--color-flame)" />
        <TierChip label="Warm" count={tier.warm} color="var(--color-flame-2)" />
        <TierChip label="Nurture" count={tier.nurture} color="var(--color-grape)" />
        <TierChip label="Filtered Out" count={tier.disqualified} color="var(--color-ink-3)" />
        <TierChip label="Unscored" count={tier.unscored} color="var(--color-line-2)" muted />
        <span className="ml-auto font-mono text-[11px] text-ink-3">
          <b className="text-ink font-semibold">{leads.length}</b> total
        </span>
      </div>

      {isLoading && leads.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span
            className="inline-block w-5 h-5 rounded-full border-2 border-line border-t-flame"
            style={{ animation: "spin-360 0.8s linear infinite" }}
            aria-label="Loading"
          />
        </div>
      ) : (
        <div className="px-9 pt-5 pb-6">
          <LeadListWithSelection groupedLeads={grouped} onRefresh={refresh} />
        </div>
      )}
    </>
  );
}

function TierChip({
  label,
  count,
  color,
  muted,
}: {
  label: string;
  count: number;
  color: string;
  muted?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider"
      style={{ color: muted ? "var(--color-ink-3)" : color }}
    >
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
      <span className="text-ink font-semibold tabular-nums">{count}</span>
    </span>
  );
}
