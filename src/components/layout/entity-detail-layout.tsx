import { Link } from "react-router-dom";
import { m } from "motion/react";
import {
  Icon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StarIcon,
  MoreVerticalIconAlias,
} from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const heroVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 240, damping: 26 },
  },
};

const mainVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 26, delay: 0.06 },
  },
};

const sidebarVariants = {
  hidden: { opacity: 0, x: 6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 26, delay: 0.04 },
  },
};

interface EntityDetailLayoutProps {
  backHref: string;
  breadcrumbLabel: string;
  title: string;
  subtitle: React.ReactNode;
  prevUrl: string | null;
  nextUrl: string | null;
  currentIndex: number;
  totalItems: number;
  mainContent: React.ReactNode;
  activityContent: React.ReactNode;
  sidebarContent: React.ReactNode;
  /** Color CSS var for the title pin / accent (defaults to flame). */
  accent?: string;
  /** view-transition-name pinned on the title for shared-element morphs from the list. */
  titleTransitionName?: string;
}

export function EntityDetailLayout({
  backHref,
  breadcrumbLabel,
  title,
  subtitle,
  prevUrl,
  nextUrl,
  currentIndex,
  totalItems,
  mainContent,
  activityContent,
  sidebarContent,
  accent = "var(--color-flame)",
  titleTransitionName,
}: EntityDetailLayoutProps) {
  return (
    <>
      <div
        className="flex items-center px-9 py-3 gap-3 border-b border-line"
        style={{ background: "var(--color-paper)" }}
      >
        <Link
          to={backHref}
          viewTransition
          className="grid place-items-center w-8 h-8 rounded-md text-ink-2 border border-transparent hover:bg-bg-2 hover:border-line hover:text-ink transition-colors"
          aria-label={`Back to ${breadcrumbLabel}`}
        >
          <Icon icon={ArrowLeftIcon} size={15} strokeWidth={1.7} />
        </Link>
        <div className="flex items-center gap-2 text-[13px]">
          <Link to={backHref} viewTransition className="text-ink-3 hover:text-ink transition-colors">
            {breadcrumbLabel}
          </Link>
          <span className="text-line-2">/</span>
          <span className="text-ink font-semibold truncate max-w-[420px]">{title}</span>
        </div>

        <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-ink-3">
          <span>
            <b className="text-ink font-semibold">{currentIndex}</b> / {totalItems}
          </span>
          <div className="flex">
            <Link
              to={prevUrl ?? "#"}
              viewTransition
              aria-label="Previous"
              className={cn(
                "grid place-items-center w-7 h-7 rounded-md text-ink-2 hover:bg-bg-2 hover:text-ink transition-colors",
                !prevUrl && "opacity-30 pointer-events-none"
              )}
            >
              <Icon icon={ChevronUpIcon} size={14} strokeWidth={1.7} />
            </Link>
            <Link
              to={nextUrl ?? "#"}
              viewTransition
              aria-label="Next"
              className={cn(
                "grid place-items-center w-7 h-7 rounded-md text-ink-2 hover:bg-bg-2 hover:text-ink transition-colors",
                !nextUrl && "opacity-30 pointer-events-none"
              )}
            >
              <Icon icon={ChevronDownIcon} size={14} strokeWidth={1.7} />
            </Link>
          </div>
          <button
            type="button"
            aria-label="Star"
            className="grid place-items-center w-7 h-7 rounded-md text-ink-2 hover:bg-bg-2 hover:text-ink transition-colors"
          >
            <Icon icon={StarIcon} size={14} strokeWidth={1.7} />
          </button>
          <button
            type="button"
            aria-label="More"
            className="grid place-items-center w-7 h-7 rounded-md text-ink-2 hover:bg-bg-2 hover:text-ink transition-colors"
          >
            <Icon icon={MoreVerticalIconAlias} size={14} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto scroll-stable" style={{ background: "var(--color-paper)" }}>
          <div className="max-w-4xl mx-auto px-9 py-9">
            <m.div
              key={`hero-${title}`}
              className="mb-6"
              variants={heroVariants}
              initial="hidden"
              animate="visible"
            >
              <h1
                className="font-serif text-ink mb-1"
                style={{
                  fontSize: 38,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  ...(titleTransitionName ? { viewTransitionName: titleTransitionName } : {}),
                }}
              >
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-[3px] mr-3 align-middle"
                  style={{ background: accent, transform: "rotate(45deg)" }}
                />
                {title}
              </h1>
              <div className="text-ink-2 italic" style={{ fontSize: 14 }}>
                {subtitle}
              </div>
            </m.div>

            <m.div
              key={`main-${title}`}
              variants={mainVariants}
              initial="hidden"
              animate="visible"
            >
              {mainContent}

              <div className="mt-10 pt-6 border-t border-line">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-mono-label">Activity</h2>
                  <span aria-hidden className="flex-1 h-[1px] bg-gradient-to-r from-line to-transparent" />
                </div>
                <div className="space-y-3">{activityContent}</div>
              </div>
            </m.div>
          </div>
        </div>

        <m.aside
          key={`sidebar-${title}`}
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className="w-72 overflow-y-auto scroll-stable shrink-0 border-l border-line"
          style={{ background: "var(--color-bg)" }}
        >
          <div className="p-5">{sidebarContent}</div>
        </m.aside>
      </div>
    </>
  );
}

interface ActivityItemProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  label: string;
  date: Date;
}

export function ActivityItem({ icon, iconBgColor, label, date }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 text-[13px]">
      <div
        className="grid place-items-center w-7 h-7 rounded-md mt-0.5 shrink-0 border border-line"
        style={{ background: iconBgColor ?? "var(--color-paper)" }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-ink-2">{label}</p>
        <p className="font-mono text-[10px] text-ink-3 mt-0.5">
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  hasBorder?: boolean;
}

export function SidebarSection({ title, children, hasBorder = false }: SidebarSectionProps) {
  return (
    <div className={hasBorder ? "border-t border-line pt-4 mt-4" : "mb-5 pb-4 border-b border-line"}>
      <h3 className="font-mono-label mb-3">{title}</h3>
      {children}
    </div>
  );
}

interface SidebarPropertyProps {
  label: string;
  children: React.ReactNode;
}

export function SidebarProperty({ label, children }: SidebarPropertyProps) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1">{label}</div>
      <div className="text-[13px] text-ink">{children}</div>
    </div>
  );
}
