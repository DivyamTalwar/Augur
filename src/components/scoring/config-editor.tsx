"use client";

import { useMemo, useState, useTransition } from "react";
import { saveScoringConfig, startScoring } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { useLeadsWithScores } from "@/lib/hooks/use-leads";
import type {
  RequiredCharacteristic,
  DemandSignifier,
  ParsedScoringConfig,
} from "@/lib/types/scoring";
import { TabsRow, type TabDef } from "@/components/layout/tabs-row";
import { Hero } from "@/components/layout/hero";
import {
  EditorCard,
  EditorHead,
  EditorFoot,
  PrimaryButton,
  GhostButton,
} from "@/components/layout/editor-card";
import {
  Rail,
  RailCard,
  RailEyebrow,
  RailTitle,
  RailDesc,
  StatRow,
  Stat,
} from "@/components/layout/right-rail";
import {
  AddBtn,
  BadgeKey,
  Crit,
  CritBody,
  CritGrip,
  CritTagPass,
  Insight,
  ScoreHistogram,
  SectionHead,
  WeightBar,
  WeightStepper,
} from "@/components/scoring/rubric-primitives";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Icon, CheckIcon, DeleteIcon } from "@/components/ui/icon";
import { COPY } from "@/lib/copy";
import { toast } from "sonner";

interface ScoringConfigEditorProps {
  initialConfig: Omit<ParsedScoringConfig, "id" | "createdAt" | "updatedAt"> & {
    id: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

/* Cycle of accent gradients in the restrained 4-color palette.
 * Even segments lean orange; odd segments lean green; both with inner light variants. */
const SIG_GRADIENTS = [
  "linear-gradient(90deg, var(--color-flame), var(--color-flame-2))",
  "linear-gradient(90deg, var(--color-leaf), var(--color-leaf-2))",
  "linear-gradient(90deg, var(--color-flame-2), var(--color-flame))",
  "linear-gradient(90deg, var(--color-leaf-2), var(--color-leaf))",
  "linear-gradient(90deg, var(--color-flame), var(--color-flame-2))",
];

type ScoringTab = "icp" | "weights" | "thresholds" | "history";

const SCORING_TABS: TabDef<ScoringTab>[] = [
  { key: "icp", label: "ICP Rubric", color: "var(--color-flame)", shape: "square" },
  { key: "weights", label: "Weights", color: "var(--color-flame-2)", shape: "circle" },
  { key: "thresholds", label: "Thresholds", color: "var(--color-leaf)", shape: "diamond" },
  { key: "history", label: "History", color: "var(--color-ink)", shape: "circle" },
];

export default function ScoringEditorPage({ initialConfig }: ScoringConfigEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [tab, setTab] = useState<ScoringTab>("icp");
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const { leads } = useLeadsWithScores();

  const totalWeight = useMemo(
    () => config.demandSignifiers.reduce((acc, s) => acc + (s.enabled ? s.weight : 0), 0),
    [config.demandSignifiers]
  );

  const persistRubric = async () => {
    const newId = await saveScoringConfig(
      config.name || "Default",
      JSON.stringify(config.requiredCharacteristics),
      JSON.stringify(config.demandSignifiers),
      config.tierHotMin,
      config.tierWarmMin,
      config.tierNurtureMin,
      config.id ?? undefined
    );
    if (newId && !config.id) setConfig((prev) => ({ ...prev, id: newId }));
    return newId;
  };

  const handleSave = () => {
    setIsSaving(true);
    startTransition(async () => {
      try {
        await persistRubric();
        toast.success("Rubric saved");
      } catch (error) {
        toast.error("Failed to save", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleRescoreAll = () => {
    setIsRescoring(true);
    startTransition(async () => {
      try {
        await persistRubric();
        const eligible = leads.filter((l) => l.researchStatus === "completed");
        if (eligible.length === 0) {
          toast.info("Rubric saved — no researched leads to score yet.");
          return;
        }
        let queued = 0;
        let failed = 0;
        for (const lead of eligible) {
          try {
            await startScoring(lead.id, handleStreamEvent);
            queued++;
          } catch (err) {
            console.error("startScoring failed for", lead.id, err);
            failed++;
          }
        }
        if (queued > 0) {
          toast.success(`Re-scoring ${queued} account${queued === 1 ? "" : "s"} — watch the dock.`);
        }
        if (failed > 0) {
          toast.error(`${failed} account${failed === 1 ? "" : "s"} failed to queue.`);
        }
      } catch (error) {
        toast.error("Re-score failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsRescoring(false);
      }
    });
  };

  const eligibleCount = leads.filter((l) => l.researchStatus === "completed").length;

  const addRequirement = () => {
    setConfig((prev) => ({
      ...prev,
      requiredCharacteristics: [
        ...prev.requiredCharacteristics,
        {
          id: `req-${Date.now()}`,
          name: "New requirement",
          description: "Describe what must be true.",
          enabled: true,
        },
      ],
    }));
  };

  const updateRequirement = (i: number, patch: Partial<RequiredCharacteristic>) => {
    setConfig((prev) => ({
      ...prev,
      requiredCharacteristics: prev.requiredCharacteristics.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r
      ),
    }));
  };

  const removeRequirement = (i: number) => {
    setConfig((prev) => ({
      ...prev,
      requiredCharacteristics: prev.requiredCharacteristics.filter((_, idx) => idx !== i),
    }));
  };

  const addSignifier = () => {
    setConfig((prev) => ({
      ...prev,
      demandSignifiers: [
        ...prev.demandSignifiers,
        {
          id: `sig-${Date.now()}`,
          name: "New signifier",
          description: "Describe the signal.",
          weight: 5,
          enabled: true,
        },
      ],
    }));
  };

  const updateSignifier = (i: number, patch: Partial<DemandSignifier>) => {
    setConfig((prev) => ({
      ...prev,
      demandSignifiers: prev.demandSignifiers.map((s, idx) =>
        idx === i ? { ...s, ...patch } : s
      ),
    }));
  };

  const removeSignifier = (i: number) => {
    setConfig((prev) => ({
      ...prev,
      demandSignifiers: prev.demandSignifiers.filter((_, idx) => idx !== i),
    }));
  };

  const maxScore = config.demandSignifiers
    .filter((s) => s.enabled)
    .reduce((acc, s) => acc + s.weight, 0);

  const balanceLabel =
    totalWeight === 0 ? "empty" : totalWeight < 30 ? "light" : totalWeight > 50 ? "heavy" : "balanced";

  return (
    <>
      <Hero title={COPY.scoring.heroTitle} subtitle={COPY.scoring.heroSub} />
      <TabsRow tabs={SCORING_TABS} active={tab} onChange={setTab} />
      <section
        className="grid items-start gap-7 px-9 pt-7 pb-6"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
      >
        <EditorCard>
          <EditorHead
            badge={COPY.scoring.editorBadge}
            title={COPY.scoring.editorTitle}
            meta={
              <>
                <span style={{ color: "var(--color-leaf)" }}>{balanceLabel}</span>
                <span>
                  {totalWeight} / {maxScore || 40} max
                </span>
              </>
            }
          />

          <div className="px-7 py-6 doc rubric">
            {tab === "icp" && (
              <RubricEditor
                requirements={config.requiredCharacteristics}
                signifiers={config.demandSignifiers}
                onAddRequirement={addRequirement}
                onUpdateRequirement={updateRequirement}
                onRemoveRequirement={removeRequirement}
                onAddSignifier={addSignifier}
                onUpdateSignifier={updateSignifier}
                onRemoveSignifier={removeSignifier}
              />
            )}
            {tab === "weights" && (
              <WeightsView signifiers={config.demandSignifiers} />
            )}
            {tab === "thresholds" && (
              <ThresholdsView
                hotMin={config.tierHotMin}
                warmMin={config.tierWarmMin}
                nurtureMin={config.tierNurtureMin}
                onChange={(patch) => setConfig((p) => ({ ...p, ...patch }))}
                maxScore={maxScore || 40}
              />
            )}
            {tab === "history" && <HistoryView />}
          </div>

          <EditorFoot
            left={
              <>
                <span>
                  <b className="text-ink font-semibold">{config.requiredCharacteristics.length}</b> gates
                </span>
                <span>
                  <b className="text-ink font-semibold">{config.demandSignifiers.length}</b> signifiers
                </span>
                <span>
                  <b className="text-ink font-semibold">{maxScore || 40}</b> max score
                </span>
              </>
            }
            right={
              <>
                <GhostButton onClick={handleSave} disabled={isSaving || isRescoring}>
                  {isSaving && !isRescoring ? "Saving…" : "Save changes"}
                </GhostButton>
                <PrimaryButton onClick={handleRescoreAll} disabled={isRescoring || isPending}>
                  {isRescoring ? (
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white"
                      style={{ animation: "spin-360 0.8s linear infinite" }}
                      aria-label="Queueing"
                    />
                  ) : (
                    <Icon icon={CheckIcon} size={14} strokeWidth={2} />
                  )}
                  {isRescoring
                    ? "Queueing…"
                    : eligibleCount > 0
                      ? `${COPY.scoring.saveLabel} (${eligibleCount})`
                      : COPY.scoring.saveLabel}
                </PrimaryButton>
              </>
            }
          />
        </EditorCard>

        <ScoringRail signifiers={config.demandSignifiers} />
      </section>
    </>
  );
}

interface RubricEditorProps {
  requirements: RequiredCharacteristic[];
  signifiers: DemandSignifier[];
  onAddRequirement: () => void;
  onUpdateRequirement: (i: number, patch: Partial<RequiredCharacteristic>) => void;
  onRemoveRequirement: (i: number) => void;
  onAddSignifier: () => void;
  onUpdateSignifier: (i: number, patch: Partial<DemandSignifier>) => void;
  onRemoveSignifier: (i: number) => void;
}

function RubricEditor({
  requirements,
  signifiers,
  onAddRequirement,
  onUpdateRequirement,
  onRemoveRequirement,
  onAddSignifier,
  onUpdateSignifier,
  onRemoveSignifier,
}: RubricEditorProps) {
  const maxWeight = Math.max(1, ...signifiers.map((s) => s.weight));
  const keyId = useMemo(() => {
    const top = signifiers.reduce<DemandSignifier | null>(
      (acc, s) => (s.enabled && (!acc || s.weight > acc.weight) ? s : acc),
      null
    );
    return top?.id ?? null;
  }, [signifiers]);

  return (
    <>
      <SectionHead
        pin="gate"
        title={COPY.scoring.sections.gates.title}
        sub={COPY.scoring.sections.gates.sub}
        action={<AddBtn onClick={onAddRequirement}>{COPY.scoring.sections.gates.addLabel}</AddBtn>}
      />
      {requirements.length === 0 ? (
        <EmptyMicro hint={COPY.emptyMicro.noGates} />
      ) : (
        requirements.map((req, i) => (
          <Crit key={req.id}>
            <CritGrip />
            <div>
              <Input
                value={req.name}
                onChange={(e) => onUpdateRequirement(i, { name: e.target.value })}
                placeholder="Gate name"
                className="h-8 text-[13px] font-semibold mb-1.5"
              />
              <Input
                value={req.description}
                onChange={(e) => onUpdateRequirement(i, { description: e.target.value })}
                placeholder="Describe what must be true"
                className="h-8 text-[12px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <CritTagPass />
              <button
                type="button"
                onClick={() => onRemoveRequirement(i)}
                aria-label="Remove gate"
                className="p-1.5 rounded-md text-ink-3 hover:bg-bg-2 hover:text-flame transition-colors"
              >
                <Icon icon={DeleteIcon} size={14} strokeWidth={1.7} />
              </button>
            </div>
          </Crit>
        ))
      )}

      <SectionHead
        className="mt-8"
        pin="signal"
        title={COPY.scoring.sections.signals.title}
        sub={
          <>
            Weighted factors. Score = Σ (weight × signal strength). Max{" "}
            <b className="text-ink">
              {signifiers.reduce((acc, s) => acc + (s.enabled ? s.weight : 0), 0) || 40}
            </b>
            .
          </>
        }
        action={<AddBtn onClick={onAddSignifier}>{COPY.scoring.sections.signals.addLabel}</AddBtn>}
      />
      {signifiers.length === 0 ? (
        <EmptyMicro hint={COPY.emptyMicro.noSignifiers} />
      ) : (
        signifiers.map((sig, i) => {
          const fillPct = (sig.weight / 10) * 100;
          const grad = SIG_GRADIENTS[i % SIG_GRADIENTS.length];
          const isKey = sig.id === keyId && sig.weight === maxWeight && sig.enabled;
          return (
            <Crit key={sig.id} highlighted={isKey}>
              <CritGrip />
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Input
                    value={sig.name}
                    onChange={(e) => onUpdateSignifier(i, { name: e.target.value })}
                    placeholder="Signifier name"
                    className="h-8 text-[13px] font-semibold flex-1"
                  />
                  {isKey && <BadgeKey />}
                </div>
                <Input
                  value={sig.description}
                  onChange={(e) => onUpdateSignifier(i, { description: e.target.value })}
                  placeholder="What signal counts here?"
                  className="h-8 text-[12px]"
                />
                <CritBody name="" desc={null} fill={fillPct} fillColor={grad} />
              </div>
              <div className="flex items-center gap-2">
                <WeightStepper
                  value={sig.weight}
                  onChange={(v) => onUpdateSignifier(i, { weight: v })}
                />
                <button
                  type="button"
                  onClick={() => onRemoveSignifier(i)}
                  aria-label="Remove signifier"
                  className="p-1.5 rounded-md text-ink-3 hover:bg-bg-2 hover:text-flame transition-colors"
                >
                  <Icon icon={DeleteIcon} size={14} strokeWidth={1.7} />
                </button>
              </div>
            </Crit>
          );
        })
      )}
    </>
  );
}

function EmptyMicro({ hint }: { hint: string }) {
  return (
    <div className="border border-dashed border-line rounded-[12px] py-6 px-4 text-center text-[12px] font-mono text-ink-3 mb-3">
      {hint}
    </div>
  );
}

function WeightsView({ signifiers }: { signifiers: DemandSignifier[] }) {
  const enabled = signifiers.filter((s) => s.enabled);
  if (enabled.length === 0) {
    return <EmptyMicro hint="Add signifiers in the ICP tab to see weights." />;
  }
  return (
    <div>
      <SectionHead
        pin="signal"
        title="Weight balance"
        sub="At a glance: which signifiers carry the score."
      />
      <WeightBar
        segments={enabled.map((s, i) => ({
          id: s.id,
          label: s.name,
          weight: s.weight,
          color: SIG_GRADIENTS[i % SIG_GRADIENTS.length],
        }))}
      />
      <p className="text-[12px] text-ink-2 leading-[1.55]">
        Total weight allocated:{" "}
        <b className="text-ink font-semibold">
          {enabled.reduce((acc, s) => acc + s.weight, 0)}
        </b>{" "}
        pts. Bigger segments = more leverage on tier outcomes.
      </p>
    </div>
  );
}

interface ThresholdsViewProps {
  hotMin: number;
  warmMin: number;
  nurtureMin: number;
  onChange: (patch: { tierHotMin?: number; tierWarmMin?: number; tierNurtureMin?: number }) => void;
  maxScore: number;
}

function ThresholdsView({
  hotMin,
  warmMin,
  nurtureMin,
  onChange,
  maxScore,
}: ThresholdsViewProps) {
  return (
    <div>
      <SectionHead
        pin="gate"
        title="Tier thresholds"
        sub={
          <>
            Where each tier starts. Total max score: <b className="text-ink">{maxScore}</b>.
          </>
        }
      />
      <div className="grid grid-cols-3 gap-3 mt-4">
        <ThresholdField
          label="Hot ≥"
          color="var(--color-flame)"
          value={hotMin}
          onChange={(v) => onChange({ tierHotMin: v })}
          max={maxScore}
        />
        <ThresholdField
          label="Warm ≥"
          color="var(--color-flame-2)"
          value={warmMin}
          onChange={(v) => onChange({ tierWarmMin: v })}
          max={maxScore}
        />
        <ThresholdField
          label="Nurture ≥"
          color="var(--color-grape)"
          value={nurtureMin}
          onChange={(v) => onChange({ tierNurtureMin: v })}
          max={maxScore}
        />
      </div>
      <Insight tone="tip" tag="tip">
        {COPY.scoring.sections.thresholds.tipText}
      </Insight>
    </div>
  );
}

function ThresholdField({
  label,
  color,
  value,
  onChange,
  max,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 mb-1.5">
        {label}
      </div>
      <div
        className="flex items-center gap-2 p-2 rounded-[10px] bg-paper border border-line"
        style={{ boxShadow: `inset 4px 0 0 ${color}` }}
      >
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
          className="h-8 text-[14px] font-mono font-bold tabular-nums"
        />
      </div>
    </label>
  );
}

function HistoryView() {
  const { leads } = useLeadsWithScores();
  const recent = useMemo(
    () =>
      [...leads]
        .filter((l) => l.score)
        .sort((a, b) => {
          const ad = a.score?.scoredAt ?? 0;
          const bd = b.score?.scoredAt ?? 0;
          return bd - ad;
        })
        .slice(0, 12),
    [leads]
  );

  if (recent.length === 0) {
    return <EmptyMicro hint={COPY.scoring.emptyHistory} />;
  }
  return (
    <div className="space-y-2.5">
      {recent.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center justify-between p-3 rounded-[10px] bg-paper border border-line"
        >
          <div>
            <div className="text-[13px] font-semibold text-ink">{lead.companyName}</div>
            <div className="font-mono text-[10px] text-ink-3 mt-0.5">
              tier {lead.score?.tier} · score {lead.score?.totalScore}
            </div>
          </div>
          <div
            className="font-mono text-[12px] font-semibold tabular-nums px-2.5 py-1 rounded-md"
            style={{
              color: "var(--color-leaf)",
              background: "rgba(31,170,109,0.08)",
              border: "1px solid rgba(31,170,109,0.18)",
            }}
          >
            {lead.score?.totalScore ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoringRail({ signifiers }: { signifiers: DemandSignifier[] }) {
  const { leads } = useLeadsWithScores();

  const histogram = useMemo(() => {
    const bins = new Array(10).fill(0);
    let scored = 0;
    let total = 0;
    let median = 0;
    let hotN = 0;
    let warmN = 0;
    let coldN = 0;
    const sortedScores: number[] = [];

    for (const l of leads) {
      total++;
      if (!l.score) continue;
      scored++;
      const s = l.score.totalScore;
      sortedScores.push(s);
      const bin = Math.min(9, Math.max(0, Math.floor(s / 4)));
      bins[bin]++;
      if (l.score.tier === "hot") hotN++;
      else if (l.score.tier === "warm") warmN++;
      else coldN++;
    }
    sortedScores.sort((a, b) => a - b);
    if (sortedScores.length) {
      const m = sortedScores.length / 2;
      median =
        sortedScores.length % 2 === 0
          ? (sortedScores[m - 1] + sortedScores[m]) / 2
          : sortedScores[Math.floor(m)];
    }
    return { bins, scored, total, median, hotN, warmN, coldN };
  }, [leads]);

  const enabled = signifiers.filter((s) => s.enabled);

  return (
    <Rail>
      <RailCard gradientBorder>
        <RailEyebrow>
          Score distribution{" "}
          <span className="ml-1 text-ink-3 font-normal normal-case">
            · {histogram.scored} scored
          </span>
        </RailEyebrow>
        <ScoreHistogram
          bins={histogram.bins}
          warm={[5]}
          hot={[6, 7]}
          axisLabels={["0", "10", "20", "30", "40"]}
        />
        <StatRow>
          <Stat value={histogram.hotN.toLocaleString()} label="Hot · ≥30" />
          <Stat value={histogram.warmN.toLocaleString()} label="Warm · 20–29" accent />
          <Stat value={histogram.coldN.toLocaleString()} label="Cold · <20" />
          <Stat value={histogram.median.toFixed(1)} label="Median" />
        </StatRow>
      </RailCard>

      <WeightBalanceCard signifiers={enabled} />
    </Rail>
  );
}

interface WeightBalanceProps {
  signifiers: DemandSignifier[];
}

function WeightBalanceCard({ signifiers }: WeightBalanceProps) {
  const totalWeight = signifiers.reduce((acc, s) => acc + s.weight, 0);
  const topWeight = signifiers.reduce((acc, s) => Math.max(acc, s.weight), 0);
  const sorted = useMemo(
    () => [...signifiers].sort((a, b) => b.weight - a.weight),
    [signifiers]
  );
  const concentration = totalWeight > 0 ? Math.round((topWeight / totalWeight) * 100) : 0;
  const isEmpty = signifiers.length === 0;

  return (
    <RailCard>
      <RailEyebrow blipColor="var(--color-leaf)">Weight balance</RailEyebrow>
      <RailTitle>Where every point comes from</RailTitle>
      <RailDesc>Each signifier's leverage on the final score, ranked by weight.</RailDesc>

      {/* Big total */}
      <div className="flex items-baseline gap-2 mt-1 mb-3">
        <span
          className="font-serif tabular-nums leading-none text-ink"
          style={{ fontSize: 38, letterSpacing: "-0.02em" }}
        >
          {totalWeight}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          total weight · pts
        </span>
      </div>

      {isEmpty ? (
        <EmptyMicro hint="No signifiers yet." />
      ) : (
        <>
          {/* Stacked bar with inline weight numbers */}
          <WeightBar
            segments={sorted.map((s, i) => ({
              id: s.id,
              label: `${s.weight}`,
              weight: s.weight,
              color: SIG_GRADIENTS[i % SIG_GRADIENTS.length],
            }))}
          />

          {/* Legend rows */}
          <div className="space-y-2 mt-2 pt-3 border-t border-dashed border-line">
            {sorted.slice(0, 6).map((s, i) => {
              const pct = totalWeight ? Math.round((s.weight / totalWeight) * 100) : 0;
              const isTop = i === 0;
              return (
                <LegendRow
                  key={s.id}
                  color={SIG_GRADIENTS[i % SIG_GRADIENTS.length]}
                  name={s.name || "Untitled"}
                  pct={pct}
                  weight={s.weight}
                  isTop={isTop}
                />
              );
            })}
            {sorted.length > 6 && (
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 pt-1">
                + {sorted.length - 6} more
              </div>
            )}
          </div>

          {/* Footer concentration stats */}
          <div className="mt-3 pt-3 border-t border-line grid grid-cols-3 gap-2">
            <FooterStat label="Top" value={`${topWeight}`} />
            <FooterStat label="Spread" value={`${signifiers.length}`} />
            <FooterStat label="Concentration" value={`${concentration}%`} />
          </div>
        </>
      )}
    </RailCard>
  );
}

interface LegendRowProps {
  color: string;
  name: string;
  pct: number;
  weight: number;
  isTop?: boolean;
}

function LegendRow({ color, name, pct, weight, isTop }: LegendRowProps) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span
        aria-hidden
        className="w-2 h-2 rounded-[2px] shrink-0"
        style={{ background: color }}
      />
      <span
        className={cn(
          "flex-1 truncate",
          isTop ? "text-ink font-semibold" : "text-ink-2"
        )}
      >
        {name}
      </span>
      <span className="font-mono text-[10px] text-ink-3 tabular-nums">{pct}%</span>
      <span className="font-mono font-semibold text-ink tabular-nums w-5 text-right">
        {weight}
      </span>
    </div>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">{label}</div>
      <div className="font-serif tabular-nums text-ink mt-0.5" style={{ fontSize: 18, lineHeight: 1, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

export const ScoringConfigEditor = ScoringEditorPage;
