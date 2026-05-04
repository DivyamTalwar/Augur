import { useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  IconBrandLinkedin,
  IconCircleCheck,
  IconMail,
  IconSparkles,
  IconLoader2,
} from "@/components/ui/icon";
import { useSettingsStore } from "@/lib/store/settings-store";
import { enrichPersonApollo } from "@/lib/tauri/commands";
import type { PersonWithCompany } from "@/lib/tauri/types";
import { cn } from "@/lib/utils";

interface PersonContactPanelProps {
  person: PersonWithCompany;
}

export function PersonContactPanel({ person }: PersonContactPanelProps) {
  const apolloEnabled = useSettingsStore((s) => s.apolloEnabled);
  const reducedMotion = useReducedMotion();
  const [isEnriching, setIsEnriching] = useState(false);
  const [justFound, setJustFound] = useState<null | "email" | "phone" | "both" | "none">(null);

  const hasEmail = Boolean(person.email);
  const hasPhone = Boolean(person.phone);
  const verified = person.emailStatus?.toLowerCase() === "verified";
  const guessed = person.emailStatus?.toLowerCase() === "guessed";

  async function handleFindContact(intent: "email" | "phone" | "any") {
    if (isEnriching) return;
    if (!apolloEnabled) {
      toast.message("Apollo is off", {
        description: "Toggle Apollo on in the sidebar to enrich contacts.",
      });
      return;
    }
    const hadEmail = hasEmail;
    const hadPhone = hasPhone;
    setIsEnriching(true);
    setJustFound(null);
    try {
      const result = await enrichPersonApollo(person.id);
      if (!result.matched) {
        toast.message("No match", {
          description: result.message ?? "Apollo could not match this person.",
        });
        setJustFound("none");
        return;
      }

      const newEmail = Boolean(result.email) && !hadEmail;
      const newPhone = Boolean(result.phone) && !hadPhone;
      setJustFound(newEmail && newPhone ? "both" : newEmail ? "email" : newPhone ? "phone" : "none");

      if (intent === "phone") {
        if (newPhone) {
          toast.success("Phone unlocked");
        } else if (result.phone) {
          toast.message("Phone already on file");
        } else {
          toast.message("No phone returned", {
            description:
              "Apollo matched this person, but personal phone reveal is gated behind a paid plan that delivers numbers via webhook. We only get whatever phone data is already on the record.",
          });
        }
        return;
      }

      // intent: "email" or "any"
      if (newEmail && newPhone) {
        toast.success("Email + phone unlocked");
      } else if (newEmail) {
        toast.success("Email unlocked");
      } else if (newPhone) {
        toast.success("Phone unlocked");
      } else if (result.email) {
        toast.message("Email already on file");
      } else {
        toast.message("Match found, no contact data", {
          description: "Apollo matched this person but returned no email or phone.",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Enrichment failed", { description: message });
    } finally {
      setIsEnriching(false);
    }
  }

  if (!person.email && !person.linkedinUrl && !person.phone) {
    return (
      <div className="border-t border-line pt-4 mt-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Contact
        </h4>
        <FindContactButton
          onClick={() => handleFindContact("any")}
          isEnriching={isEnriching}
          apolloEnabled={apolloEnabled}
          reducedMotion={reducedMotion ?? false}
          variant="primary"
        />
      </div>
    );
  }

  return (
    <div className="border-t border-line pt-4 mt-4">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Contact
      </h4>
      <div className="space-y-1.5">
        {person.linkedinUrl && (
          <a
            href={person.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-[8px] px-2 py-1.5 -mx-2 text-sm text-muted-foreground transition-colors hover:bg-bg-2/60 hover:text-foreground"
          >
            <IconBrandLinkedin className="w-4 h-4" />
            <span className="truncate">LinkedIn</span>
          </a>
        )}

        <AnimatePresence mode="popLayout">
          {hasEmail ? (
            <m.div
              key="email-row"
              layout
              initial={
                justFound && reducedMotion !== true
                  ? { opacity: 0, y: -2, scale: 0.98 }
                  : false
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="rounded-[8px] px-2 py-1.5 -mx-2 transition-colors hover:bg-bg-2/60"
            >
              <a
                href={`mailto:${person.email}`}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <IconMail className="w-4 h-4 mt-[3px] shrink-0 text-ink-2" />
                <span className="flex-1 break-all font-mono text-[12px] leading-tight">
                  {person.email}
                </span>
              </a>
              {verified || guessed ? (
                <div className="mt-1 ml-6">
                  {verified ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-leaf"
                      title="Apollo verified deliverable"
                    >
                      <IconCircleCheck className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span
                      className="inline-flex rounded-full bg-flame/10 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-flame"
                      title="Pattern-guessed — verify before sending"
                    >
                      Guessed
                    </span>
                  )}
                </div>
              ) : null}
            </m.div>
          ) : (
            <m.div
              key="email-find"
              layout
              initial={false}
              transition={{ duration: 0.22 }}
              className="-mx-2"
            >
              <FindContactButton
                onClick={() => handleFindContact("email")}
                isEnriching={isEnriching}
                apolloEnabled={apolloEnabled}
                reducedMotion={reducedMotion ?? false}
                variant="primary"
              />
            </m.div>
          )}

          {hasPhone ? (
            <m.a
              key="phone-row"
              layout
              initial={
                justFound && reducedMotion !== true
                  ? { opacity: 0, y: -2, scale: 0.98 }
                  : false
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: 0.06 }}
              href={`tel:${person.phone}`}
              className="group flex items-start gap-2 rounded-[8px] px-2 py-1.5 -mx-2 text-sm text-foreground transition-colors hover:bg-bg-2/60"
            >
              <span className="mt-[3px] text-ink-2">
                <PhoneIcon />
              </span>
              <span className="flex-1 break-all font-mono text-[12px] leading-tight">
                {person.phone}
              </span>
            </m.a>
          ) : hasEmail ? (
            <m.div
              key="phone-hint"
              layout
              initial={false}
              className="-mx-2"
            >
              <FindContactButton
                onClick={() => handleFindContact("phone")}
                isEnriching={isEnriching}
                apolloEnabled={apolloEnabled}
                reducedMotion={reducedMotion ?? false}
                variant="secondary"
                label="Find phone"
              />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface FindContactButtonProps {
  onClick: () => void;
  isEnriching: boolean;
  apolloEnabled: boolean;
  reducedMotion: boolean;
  variant: "primary" | "secondary";
  label?: string;
}

function FindContactButton({
  onClick,
  isEnriching,
  apolloEnabled,
  reducedMotion,
  variant,
  label = "Find email",
}: FindContactButtonProps) {
  const disabled = isEnriching;
  const dimmed = !apolloEnabled;
  const title = dimmed
    ? "Toggle Apollo on in the sidebar to enrich"
    : isEnriching
    ? "Searching Apollo…"
    : `${label} via Apollo`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "group relative w-full overflow-hidden",
        "flex items-center justify-center gap-2",
        "h-9 px-3 rounded-[10px] text-[12px] font-medium tracking-[0.01em]",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-1 focus-visible:outline-flame focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed",
        variant === "primary"
          ? cn(
              "border border-flame/35 bg-gradient-to-b from-flame/[0.10] to-flame/[0.04] text-flame",
              "shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_1px_2px_rgba(255,91,31,0.10)]",
              "hover:from-flame/[0.16] hover:to-flame/[0.08] hover:-translate-y-px hover:border-flame/50",
              "hover:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_4px_14px_rgba(255,91,31,0.18)]",
              "active:translate-y-0",
              "disabled:translate-y-0 disabled:opacity-60",
            )
          : cn(
              "border border-line bg-paper text-ink-2",
              "hover:-translate-y-px hover:border-line-2 hover:text-ink hover:bg-bg-2/40",
              "active:translate-y-0",
              "disabled:translate-y-0 disabled:opacity-60",
            ),
        dimmed && "opacity-50 hover:translate-y-0 hover:shadow-none",
      )}
    >
      {!reducedMotion && variant === "primary" && !disabled && !dimmed ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-flame/[0.18] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      ) : null}
      <span className="relative inline-flex items-center gap-1.5">
        {isEnriching ? (
          <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
        ) : variant === "primary" ? (
          <IconSparkles className="w-3.5 h-3.5" />
        ) : (
          <PhoneIcon />
        )}
        {isEnriching ? "Searching Apollo…" : label}
      </span>
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.2 3.2c0-.7.6-1.3 1.3-1.3h1.7c.5 0 1 .3 1.2.8l.9 2c.2.5.1 1-.3 1.4l-.9.9c.7 1.5 1.9 2.7 3.4 3.4l.9-.9c.4-.4.9-.5 1.4-.3l2 .9c.5.2.8.7.8 1.2v1.7c0 .7-.6 1.3-1.3 1.3C7.2 14.3 1.7 8.8 1.7 4.5h0z" />
    </svg>
  );
}
