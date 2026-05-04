"use client";

import { m } from "motion/react";

const TICKER_PHRASES = [
  "Sweeping public filings",
  "Cross-checking funding rounds",
  "Mapping the buyer landscape",
  "Filtering by ICP fit",
  "Surfacing strong signals",
];

interface LeadDiscoveryHeroProps {
  /** Optional headline override, e.g. when a person/scoring job is running. */
  title?: string;
  subtitle?: string;
}

export function LeadDiscoveryHero({
  title = "Discovering signals",
  subtitle = "The orchestrator is sweeping the web for ICP-fit accounts. New leads will land here as they're verified.",
}: LeadDiscoveryHeroProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-24 px-9 text-center">
      {/* Title */}
      <m.h2
        className="font-serif text-ink mb-2"
        style={{ fontSize: 32, lineHeight: 1.1, letterSpacing: "-0.02em" }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {title}
        <m.span
          aria-hidden
          className="inline-block ml-1"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          ·
        </m.span>
      </m.h2>

      <p
        className="text-ink-2 italic max-w-md mb-8"
        style={{ fontSize: 14, lineHeight: 1.5 }}
      >
        {subtitle}
      </p>

      {/* Indeterminate sweeping progress bar */}
      <div
        className="relative w-72 h-1 rounded-full overflow-hidden mb-5"
        style={{ background: "var(--color-bg-2)" }}
      >
        <m.span
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: "40%",
            background:
              "linear-gradient(90deg, transparent 0%, var(--color-flame) 50%, transparent 100%)",
          }}
          animate={{ x: ["-100%", "250%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Cycling ticker */}
      <div className="relative h-5 overflow-hidden font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
        {TICKER_PHRASES.map((phrase, idx) => (
          <m.span
            key={phrase}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [8, 0, 0, -8],
            }}
            transition={{
              duration: TICKER_PHRASES.length * 2.4,
              times: [
                idx / TICKER_PHRASES.length,
                (idx + 0.1) / TICKER_PHRASES.length,
                (idx + 0.85) / TICKER_PHRASES.length,
                (idx + 1) / TICKER_PHRASES.length,
              ],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {phrase}
          </m.span>
        ))}
      </div>
    </div>
  );
}
