// Re-export scoring types from tauri types
export type {
  ScoringTier,
  RequiredCharacteristic,
  DemandSignifier,
  RequirementResult,
  SignifierScore,
  ScoringConfig,
  LeadScore,
} from "@/lib/tauri/types";

// Alias for backward compatibility
export type { LeadScore as ParsedLeadScore } from "@/lib/tauri/types";
export type { ScoringConfig as ParsedScoringConfig } from "@/lib/tauri/types";

// Tier configuration for UI display
export interface TierConfig {
  tier: import("@/lib/tauri/types").ScoringTier;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  minScore: number;
}

export const tierConfigs: Record<
  import("@/lib/tauri/types").ScoringTier,
  Omit<TierConfig, "minScore">
> = {
  hot: {
    tier: "hot",
    label: "Hot",
    color: "text-flame",
    bgColor: "bg-flame/10",
    borderColor: "border-flame/30",
  },
  warm: {
    tier: "warm",
    label: "Warm",
    color: "text-flame-2",
    bgColor: "bg-flame-2/10",
    borderColor: "border-flame-2/30",
  },
  nurture: {
    tier: "nurture",
    label: "Nurture",
    color: "text-leaf",
    bgColor: "bg-leaf/10",
    borderColor: "border-leaf/30",
  },
  disqualified: {
    tier: "disqualified",
    label: "Filtered Out",
    color: "text-ink-3",
    bgColor: "bg-bg-2",
    borderColor: "border-line",
  },
};

// Default scoring configuration
export const defaultScoringConfig = {
  name: "default",
  isActive: true,
  requiredCharacteristics: [
    {
      id: "min-company-size",
      name: "Minimum Company Size",
      description: "Company must have at least 50 employees",
      enabled: true,
    },
    {
      id: "target-industry",
      name: "Target Industry",
      description: "Company must be in technology, finance, or healthcare sectors",
      enabled: true,
    },
  ],
  demandSignifiers: [
    {
      id: "growth-signals",
      name: "Growth Signals",
      description: "Recent funding, hiring, or expansion announcements",
      weight: 8,
      enabled: true,
    },
    {
      id: "tech-adoption",
      name: "Technology Adoption",
      description: "Use of modern tech stack and willingness to adopt new solutions",
      weight: 7,
      enabled: true,
    },
    {
      id: "budget-authority",
      name: "Budget Authority",
      description: "Evidence of budget and decision-making authority for relevant purchases",
      weight: 9,
      enabled: true,
    },
    {
      id: "pain-points",
      name: "Pain Point Alignment",
      description: "Company has challenges that our solution addresses",
      weight: 10,
      enabled: true,
    },
    {
      id: "timeline-urgency",
      name: "Timeline Urgency",
      description: "Indicators of urgency or upcoming projects requiring our solution",
      weight: 6,
      enabled: true,
    },
  ],
  tierHotMin: 80,
  tierWarmMin: 50,
  tierNurtureMin: 30,
};

// Lead with score for list display
export interface LeadWithScore {
  id: number;
  companyName: string;
  website: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  researchStatus: "pending" | "in_progress" | "completed" | "failed" | null;
  score: import("@/lib/tauri/types").LeadScore | null;
}
