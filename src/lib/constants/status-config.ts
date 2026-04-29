import {
  IconCircle,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconSparkles,
  IconPhone,
  IconCalendarEvent,
  IconFileText,
  IconMessages,
  IconTrophy,
  IconThumbDown,
  IconPlayerPause,
  IconMail,
  IconMessageReply,
  IconCalendarCheck,
  IconMessage,
  IconStar,
  IconX,
} from "@/components/ui/icon";

// ============================================
// Status palette helpers — every state mapped onto our 4-color system
// ============================================
//   - active / warm  → flame
//   - success / done → leaf
//   - in-motion      → ink (bold)
//   - muted / paused → ink-3
//   - destructive    → destructive token
// ============================================

const TONE = {
  active: { color: "text-flame", bgColor: "bg-flame/10" },
  success: { color: "text-leaf", bgColor: "bg-leaf/10" },
  motion: { color: "text-ink", bgColor: "bg-bg-2" },
  muted: { color: "text-ink-3", bgColor: "bg-bg-2" },
  destructive: { color: "text-destructive", bgColor: "bg-destructive/10" },
} as const;

// ============================================
// Research Status (Claude CLI agent state)
// ============================================

export type ResearchStatusType = "pending" | "in_progress" | "completed" | "failed";

interface StatusConfigItem {
  label: string;
  icon: typeof IconCircle;
  color: string;
  bgColor: string;
}

export const RESEARCH_STATUS_CONFIG: Record<ResearchStatusType, StatusConfigItem> = {
  pending: { label: "Pending", icon: IconCircle, ...TONE.muted },
  in_progress: { label: "In Progress", icon: IconLoader2, ...TONE.active },
  completed: { label: "Completed", icon: IconCircleCheck, ...TONE.success },
  failed: { label: "Failed", icon: IconCircleX, ...TONE.destructive },
};

export const RESEARCH_STATUS_ORDER: ResearchStatusType[] = [
  "completed",
  "in_progress",
  "pending",
  "failed",
];

export function isValidResearchStatus(status: string | null): status is ResearchStatusType {
  return status !== null && RESEARCH_STATUS_ORDER.includes(status as ResearchStatusType);
}

export function validateResearchStatus(status: string | null): ResearchStatusType {
  if (isValidResearchStatus(status)) return status;
  return "pending";
}

export function getResearchStatusConfig(status: string | null): StatusConfigItem {
  return RESEARCH_STATUS_CONFIG[validateResearchStatus(status)];
}

// ============================================
// Lead User Status (sales pipeline stage)
// ============================================

export type LeadUserStatusType =
  | "new"
  | "qualified"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiating"
  | "won"
  | "lost"
  | "on_hold";

export const LEAD_USER_STATUS_CONFIG: Record<LeadUserStatusType, StatusConfigItem> = {
  new: { label: "New", icon: IconSparkles, ...TONE.active },
  qualified: { label: "Signal Ready", icon: IconCircleCheck, ...TONE.success },
  contacted: { label: "Contacted", icon: IconPhone, ...TONE.motion },
  meeting: { label: "Meeting", icon: IconCalendarEvent, ...TONE.active },
  proposal: { label: "Proposal", icon: IconFileText, ...TONE.active },
  negotiating: { label: "Negotiating", icon: IconMessages, ...TONE.active },
  won: { label: "Won", icon: IconTrophy, ...TONE.success },
  lost: { label: "Lost", icon: IconThumbDown, ...TONE.destructive },
  on_hold: { label: "On Hold", icon: IconPlayerPause, ...TONE.muted },
};

export const LEAD_USER_STATUS_ORDER: LeadUserStatusType[] = [
  "new",
  "qualified",
  "contacted",
  "meeting",
  "proposal",
  "negotiating",
  "won",
  "lost",
  "on_hold",
];

export function isValidLeadUserStatus(status: string | null): status is LeadUserStatusType {
  return status !== null && LEAD_USER_STATUS_ORDER.includes(status as LeadUserStatusType);
}

export function validateLeadUserStatus(status: string | null): LeadUserStatusType {
  if (isValidLeadUserStatus(status)) return status;
  return "new";
}

export function getLeadUserStatusConfig(status: string | null): StatusConfigItem {
  return LEAD_USER_STATUS_CONFIG[validateLeadUserStatus(status)];
}

// ============================================
// Person User Status (sales pipeline stage)
// ============================================

export type PersonUserStatusType =
  | "new"
  | "reached_out"
  | "responded"
  | "meeting_scheduled"
  | "in_conversation"
  | "champion"
  | "not_interested";

export const PERSON_USER_STATUS_CONFIG: Record<PersonUserStatusType, StatusConfigItem> = {
  new: { label: "New", icon: IconSparkles, ...TONE.active },
  reached_out: { label: "Reached Out", icon: IconMail, ...TONE.motion },
  responded: { label: "Responded", icon: IconMessageReply, ...TONE.active },
  meeting_scheduled: { label: "Meeting Scheduled", icon: IconCalendarCheck, ...TONE.active },
  in_conversation: { label: "In Conversation", icon: IconMessage, ...TONE.active },
  champion: { label: "Champion", icon: IconStar, ...TONE.success },
  not_interested: { label: "Not Interested", icon: IconX, ...TONE.destructive },
};

export const PERSON_USER_STATUS_ORDER: PersonUserStatusType[] = [
  "new",
  "reached_out",
  "responded",
  "meeting_scheduled",
  "in_conversation",
  "champion",
  "not_interested",
];

export function isValidPersonUserStatus(status: string | null): status is PersonUserStatusType {
  return status !== null && PERSON_USER_STATUS_ORDER.includes(status as PersonUserStatusType);
}

export function validatePersonUserStatus(status: string | null): PersonUserStatusType {
  if (isValidPersonUserStatus(status)) return status;
  return "new";
}

export function getPersonUserStatusConfig(status: string | null): StatusConfigItem {
  return PERSON_USER_STATUS_CONFIG[validatePersonUserStatus(status)];
}

// ============================================
// Legacy aliases
// ============================================

export type StatusType = ResearchStatusType;
export const STATUS_CONFIG = RESEARCH_STATUS_CONFIG;
export const STATUS_ORDER = RESEARCH_STATUS_ORDER;
export const getStatusConfig = getResearchStatusConfig;
