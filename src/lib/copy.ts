/**
 * Centralized UI copy. Update product strings here, not in pages/components.
 * Format note: titles can use *...* to mark a phrase that should render with
 * the gradient-italic emphasis treatment (rendered by Hero / PageHeader).
 */

export const APP = {
  name: "Augur OS",
  brandTaglineHTML: "Augur <em>OS</em>",
  modelLabel: "Opus 4.6",
  modelStatus: "live",
} as const;

export const NAV_SECTIONS = [
  { num: "01", label: "Views" },
  { num: "02", label: "Workspace" },
  { num: "03", label: "Settings" },
] as const;

/* ===== Hero / page headers ===== */

export const COPY = {
  prompt: {
    heroTitle: "The *operating system* for outbound that actually closes.",
    heroSub:
      "Augur reads the signals. You close the deal. Define your ICP once, then Augur OS researches accounts, scores intent in real time, and writes the opening line.",
    tabs: {
      overview: { letter: "A", title: "Company Overview", help: "Describe your company and ICP. Injected into every research prompt." },
      company:  { letter: "B", title: "Company Research", help: "Instructions for company research. Target details auto-injected." },
      person:   { letter: "C", title: "Person Research",  help: "Instructions for person research. Person + company auto-injected." },
      convo:    { letter: "D", title: "Conversation Topics", help: "Generate ice-breakers and discovery questions. Person + company auto-injected." },
    },
    placeholder:
      "Start writing your prompt — the sharper the signal, the sharper Augur OS gets.",
    saveLabel: (title: string) => `Save ${title}`,
  },
  scoring: {
    heroTitle: "Decide what *matters.*",
    heroSub:
      "Augur reads the signals. You close the deal. Required characteristics gate the noise while demand signifiers rank what is ready to move.",
    editorTitle: "Lead Scoring Rubric",
    editorBadge: "S",
    sections: {
      gates: {
        title: "Required characteristics",
        sub: "Pass/fail gates. Miss one, the lead is out — no exceptions.",
        addLabel: "Add gate",
      },
      signals: {
        title: "Demand signifiers",
        addLabel: "Add signifier",
      },
      thresholds: {
        title: "Tier thresholds",
        tipText:
          "Anything below Nurture is automatically filtered out. Keep gaps wide enough to feel decisive — narrow gaps = noisy tier shuffling.",
      },
    },
    saveLabel: "Re-score all accounts",
    sampleLabel: "Test on sample",
    emptyHistory: "No scoring history yet. Score a lead to see it here.",
  },
  companies: {
    eyebrow: "01 · Companies",
    heroTitle: "Your *pipeline* at a glance.",
    heroSub:
      "Every account Augur OS has surfaced — grouped, scored, and ready to action.",
  },
  people: {
    eyebrow: "02 · People",
    heroTitle: "Every *decision-maker* you've researched.",
    heroSub:
      "Buyer profiles, conversation hooks, and outreach context — one click away.",
  },
  modals: {
    addLead: {
      title: "Add new lead",
      desc: "Drop in a company manually. Augur OS will enrich and score it on your next research run.",
      placeholders: {
        companyName: "Acme Inc.",
        website: "https://example.com",
        city: "San Francisco",
        state: "CA",
        country: "United States",
      },
    },
    findLeads: {
      title: "Find leads from your ICP",
      desc:
        "Describe who you sell to. Augur OS will surface 15–20 real companies with at least one fresh trigger signal.",
      placeholder:
        "B2B SaaS, 150–3,000 employees, with an LLM feature already in production. Buyer is VP Engineering or Head of AI.",
    },
    addPerson: {
      title: "Add a person",
      desc:
        "Capture a contact manually. You can run person research and generate conversation topics from the detail page.",
      placeholders: {
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        title: "VP of Engineering",
        linkedinUrl: "https://linkedin.com/in/johnsmith",
      },
    },
  },
  agentDock: {
    idle: "No active stream.",
    statusVerb: {
      running: "running · live tail",
      queued: "queued",
      completed: "completed",
      error: "error",
      timeout: "timed out",
      cancelled: "cancelled",
    } as Record<string, string>,
  },
  emptyMicro: {
    noGates: "No gates yet. Add one to start filtering.",
    noSignifiers: "No signifiers yet. Add one to start scoring.",
  },
} as const;

/* ===== Coach insights — derived templates ===== */

export interface CoachInsight {
  title: string;
  body: string;
  cta: string;
}

export interface PromptCoachContext {
  totalLeads: number;
  scoredLeads: number;
  hotLeads: number;
}

export function getPromptCoach(ctx: PromptCoachContext): CoachInsight {
  const { totalLeads, scoredLeads, hotLeads } = ctx;
  const unscored = Math.max(0, totalLeads - scoredLeads);
  const hotPct = scoredLeads ? Math.round((hotLeads / scoredLeads) * 100) : 0;

  if (totalLeads === 0) {
    return {
      title: "Start with one company.",
      body: "Pick a real account you wish you'd booked. Add it, run research, and watch the rubric score it. The system gets sharper with each one.",
      cta: "Add your first lead",
    };
  }
  if (unscored > 0) {
    return {
      title: "Score the long tail.",
      body: `${unscored} of your ${totalLeads} accounts haven't been scored. Once they are, you'll see exactly which signifiers actually move tier outcomes.`,
      cta: "Re-score everything",
    };
  }
  if (hotPct < 15) {
    return {
      title: "Your ICP is too wide.",
      body: `Only ${hotPct}% of scored accounts came back hot. Tighten a gate or add a deal-breaker — fewer matches, more conviction.`,
      cta: "Tighten the rubric",
    };
  }
  return {
    title: "Your ICP is *surgical.*",
    body: `${hotPct}% hot density across ${scoredLeads} scored accounts. Run Find Leads on your top tier verticals and let the dock keep going.`,
    cta: "Find more leads",
  };
}

export interface ScoringCoachContext {
  signifierCount: number;
  topWeight: number;
  totalWeight: number;
}

export function getScoringCoach(ctx: ScoringCoachContext): CoachInsight {
  const { signifierCount, topWeight, totalWeight } = ctx;
  if (signifierCount === 0) {
    return {
      title: "Define what to *reward.*",
      body: "Add 3–5 demand signifiers — observable signals that an account is in-market. Weight the strongest one at 9 or 10. The rest balance around it.",
      cta: "Add a signifier",
    };
  }
  if (signifierCount > 8) {
    return {
      title: "Trim the long tail.",
      body: `You have ${signifierCount} signifiers. Past 8, marginal weights drown each other out. Keep the ones that correlate with closed-won — drop the rest.`,
      cta: "Audit signifiers",
    };
  }
  if (totalWeight && topWeight / totalWeight < 0.25) {
    return {
      title: "Pick a *winner.*",
      body: "No single signifier is dominant. The strongest signal usually drives 25-35% of the score. Bump your highest-conviction one.",
      cta: "Boost top weight",
    };
  }
  return {
    title: "Your rubric is *predictive.*",
    body: `${signifierCount} signifiers, ${totalWeight} total points, top weight ${topWeight}. Run a re-score to see which leads shift tiers under this configuration.`,
    cta: "Re-score accounts",
  };
}
