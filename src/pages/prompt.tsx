"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Hero } from "@/components/layout/hero";
import { TabsRow, type TabKey } from "@/components/layout/tabs-row";
import {
  EditorCard,
  EditorHead,
  EditorSavedTag,
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
  Signal,
} from "@/components/layout/right-rail";
import { COPY } from "@/lib/copy";
import { getActiveScoringConfig, getPromptByType, savePromptByType } from "@/lib/tauri/commands";
import type { PromptType, ScoringConfig } from "@/lib/tauri/types";
import { useLeadsWithScores } from "@/lib/hooks/use-leads";
import { useRecentJobs } from "@/lib/query/use-job-query";
import { toast } from "sonner";

const TAB_TO_PROMPT: Record<TabKey, PromptType> = {
  overview: "company_overview",
  company: "company",
  person: "person",
  convo: "conversation_topics",
};

const TABS = COPY.prompt.tabs;

export default function PromptPage() {
  const [active, setActive] = useState<TabKey>("overview");
  const [contents, setContents] = useState<Record<TabKey, string>>({
    overview: "",
    company: "",
    person: "",
    convo: "",
  });
  const [savedAt, setSavedAt] = useState<Record<TabKey, number | null>>({
    overview: null,
    company: null,
    person: null,
    convo: null,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const types: PromptType[] = ["company_overview", "company", "person", "conversation_topics"];
        const results = await Promise.all(types.map((t) => getPromptByType(t)));
        if (!mounted) return;
        setContents({
          overview: results[0]?.content ?? "",
          company: results[1]?.content ?? "",
          person: results[2]?.content ?? "",
          convo: results[3]?.content ?? "",
        });
      } catch (e) {
        console.error("Failed to load prompts", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = contents[active];
  const wordCount = useMemo(
    () => (value.trim() ? value.trim().split(/\s+/).length : 0),
    [value]
  );
  const charCount = value.length;

  const handleSave = () => {
    setIsSaving(true);
    startTransition(async () => {
      try {
        await savePromptByType(TAB_TO_PROMPT[active], value);
        setSavedAt((prev) => ({ ...prev, [active]: Date.now() }));
        toast.success(`${TABS[active].title} saved`);
      } catch (error) {
        toast.error("Failed to save prompt", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const savedLabel = useSavedLabel(savedAt[active]);
  const meta = TABS[active];

  return (
    <>
      <Hero title={COPY.prompt.heroTitle} subtitle={COPY.prompt.heroSub} />
      <TabsRow active={active} onChange={setActive} />
      <section
        className="grid items-start gap-7 px-9 pt-7 pb-6"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
      >
        <EditorCard>
          <EditorHead
            badge={meta.letter}
            title={meta.title}
            meta={savedLabel ? <EditorSavedTag>{savedLabel}</EditorSavedTag> : null}
          />
          <div className="px-8 pt-5 pb-3">
            <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3">
              {meta.help}
            </p>
          </div>
          {loading ? (
            <div className="px-8 pb-8 text-ink-3 text-[14px]">Loading…</div>
          ) : (
            <textarea
              value={value}
              onChange={(e) =>
                setContents((prev) => ({ ...prev, [active]: e.target.value }))
              }
              placeholder={COPY.prompt.placeholder}
              spellCheck={false}
              className="w-full px-8 pb-6 bg-transparent border-0 outline-none resize-none font-sans text-[14px] leading-[1.7] text-ink placeholder:text-ink-3 min-h-[420px]"
            />
          )}
          <EditorFoot
            left={
              <>
                <span>
                  <b className="text-ink font-semibold">{wordCount.toLocaleString()}</b> words
                </span>
                <span>
                  <b className="text-ink font-semibold">{charCount.toLocaleString()}</b> chars
                </span>
                {savedLabel && (
                  <span style={{ color: "var(--color-leaf)" }}>● auto-saving</span>
                )}
              </>
            }
            right={
              <>
                <GhostButton>Preview prompt</GhostButton>
                <PrimaryButton onClick={handleSave} disabled={isSaving || isPending}>
                  {isSaving || isPending ? (
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white"
                      style={{ animation: "spin-360 0.8s linear infinite" }}
                      aria-label="Saving"
                    />
                  ) : (
                    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isSaving || isPending ? "Saving…" : COPY.prompt.saveLabel(meta.title)}
                </PrimaryButton>
              </>
            }
          />
        </EditorCard>

        <PipelineRail />
      </section>
    </>
  );
}

function useSavedLabel(timestamp: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timestamp) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  if (!timestamp) return null;
  const sec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (sec < 60) return `saved ${sec}s ago`;
  if (sec < 3600) return `saved ${Math.floor(sec / 60)}m ago`;
  return `saved ${Math.floor(sec / 3600)}h ago`;
}

function useScoringConfig() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getActiveScoringConfig();
        if (!mounted) return;
        if (!c) {
          setConfig(null);
          return;
        }
        const parsed: ScoringConfig = {
          ...c,
          requiredCharacteristics:
            typeof c.requiredCharacteristics === "string"
              ? JSON.parse(c.requiredCharacteristics)
              : c.requiredCharacteristics,
          demandSignifiers:
            typeof c.demandSignifiers === "string"
              ? JSON.parse(c.demandSignifiers)
              : c.demandSignifiers,
        };
        setConfig(parsed);
      } catch {
        if (mounted) setConfig(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return config;
}

function PipelineRail() {
  const { leads } = useLeadsWithScores();
  const { data: jobs } = useRecentJobs(50);
  const config = useScoringConfig();

  const counts = useMemo(() => {
    let hot = 0;
    let warm = 0;
    let nurture = 0;
    let scored = 0;
    let total = 0;
    for (const l of leads) {
      total++;
      if (!l.score) continue;
      scored++;
      if (l.score.tier === "hot") hot++;
      else if (l.score.tier === "warm") warm++;
      else if (l.score.tier === "nurture") nurture++;
    }
    const fitPct = scored ? Math.round(((hot + warm) / scored) * 100) : 0;
    return { total, hot, warm, nurture, scored, fitPct };
  }, [leads]);

  const avgSeconds = useMemo(() => {
    if (!jobs?.length) return 0;
    const finished = jobs.filter((j) => j.status === "completed" && j.startedAt && j.completedAt);
    if (!finished.length) return 0;
    const totalMs = finished.reduce(
      (acc, j) => acc + ((j.completedAt ?? 0) - (j.startedAt ?? 0)),
      0
    );
    return Math.round(totalMs / finished.length / 1000);
  }, [jobs]);

  const signals = useMemo(() => {
    if (!config) return [];
    const items = (config.demandSignifiers ?? []).filter((s) => s.enabled);
    items.sort((a, b) => b.weight - a.weight);
    const max = items[0]?.weight ?? 10;
    return items.slice(0, 6).map((s) => {
      const tone: "live" | "queue" | "warn" =
        s.weight >= Math.ceil(max * 0.8)
          ? "warn"
          : s.weight >= Math.ceil(max * 0.5)
            ? "live"
            : "queue";
      const tag =
        tone === "warn" ? `w${s.weight}` : tone === "live" ? `live` : `queue`;
      return { id: s.id, tone, tag, name: s.name, desc: s.description };
    });
  }, [config]);

  return (
    <Rail>
      <RailCard gradientBorder>
        <RailEyebrow>Pipeline · live</RailEyebrow>
        <StatRow>
          <Stat value={counts.total.toLocaleString()} label="Accounts surfaced" />
          <Stat value={counts.hot.toLocaleString()} label="Hot leads ready" accent />
          <Stat value={counts.scored ? `${counts.fitPct}%` : "—"} label="ICP fit" />
          <Stat value={avgSeconds ? `${avgSeconds}s` : "—"} label="Avg. research" />
        </StatRow>
      </RailCard>

      <RailCard>
        <RailEyebrow blipColor="var(--color-leaf)">Trigger signals</RailEyebrow>
        <RailTitle>What we're listening for</RailTitle>
        <RailDesc>
          Live signals from your active rubric. Adjust weights on the Scoring page to change priorities.
        </RailDesc>

        {signals.length === 0 ? (
          <div className="border border-dashed border-line rounded-[12px] py-5 px-3 text-center text-[12px] font-mono text-ink-3">
            No signifiers yet. Define them on the Scoring page.
          </div>
        ) : (
          signals.map((s) => (
            <Signal key={s.id} tone={s.tone} tag={s.tag}>
              <b className="text-ink font-semibold">{s.name || "Untitled"}</b>
              {s.desc ? <> — {s.desc}</> : null}
            </Signal>
          ))
        )}
      </RailCard>
    </Rail>
  );
}
