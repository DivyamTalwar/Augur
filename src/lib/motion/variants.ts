import type { Variants, Transition } from "motion/react";

/**
 * Motion variants for the Technical Minimalist aesthetic.
 * - 1px hairlines, no shadows, sharp 0/2px corners
 * - Snappy linear / ease-out transitions, no bounces, no spring overshoot
 * - Movement is incidental; opacity carries the work
 * - Every variant respects `prefers-reduced-motion` via a static fallback
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Read the user's reduced-motion preference at call time (SSR-safe). */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** Tight ease-out curve used for most surface motion (Material "decelerate"). */
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Slightly snappier curve for press/release feedback. */
const EASE_OUT_QUICK: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Reduced-motion transition: instant, but keeps opacity changes visible. */
const RM: Transition = { duration: 0 };

/* ────────────────────────────────────────────────────────────────────────── */
/* 1. Modal — overlay + content                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Use on the modal scrim/overlay (not the dialog body).
 * Pure opacity, 180ms linear. Pairs with `modalContentVariants`.
 */
export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: prefersReducedMotion() ? RM : { duration: 0.18, ease: "linear" },
  },
  exit: {
    opacity: 0,
    transition: prefersReducedMotion() ? RM : { duration: 0.12, ease: "linear" },
  },
};

/**
 * Use on the modal/dialog content surface. Fade + a 4px y-shift — never scale,
 * which would conflict with sharp 0/2px corners and read as "AI bubble".
 */
export const modalContentVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.18, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: prefersReducedMotion() ? 0 : 2,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.12, ease: "linear" },
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 2. Dropdown / Select / Popover                                             */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Use on dropdown, select, and popover surfaces. Opacity + 4px y-shift +
 * a near-imperceptible scale (0.98 → 1) so the popover feels anchored to its
 * trigger without reading as a generic "pop in" animation.
 */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.18, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: prefersReducedMotion() ? 0 : -2,
    scale: prefersReducedMotion() ? 1 : 0.99,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.12, ease: "linear" },
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 3. List item hover                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Use on rows in the leads/people lists. Background-color only — no transform,
 * no scale, no border colour shift. 120ms linear keeps high-frequency hovers
 * from feeling laggy. Pass `--row-hover` from your theme tokens.
 */
export const listItemHoverVariants: Variants = {
  rest: { backgroundColor: "var(--row-bg, transparent)" },
  hover: {
    backgroundColor: "var(--row-hover, rgba(0,0,0,0.03))",
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.12, ease: "linear" },
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 4. Button press                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Use on buttons, icon-buttons, and pressable toolbar items. Apply via
 * `whileTap={buttonPressVariants.pressed}` or as `whileTap` shorthand. The
 * 0.98 scale provides tactile confirmation without breaking the 1px-hairline
 * grid. 80ms ease-out releases instantly.
 */
export const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  pressed: {
    scale: prefersReducedMotion() ? 1 : 0.98,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.08, ease: EASE_OUT_QUICK },
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 5. Stream panel slide-in                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Use on the right-anchored stream/job-output panel. Slides 24px from the
 * right edge with fade. 220ms ease-out matches macOS sidebar timing without
 * overshoot. Reduced motion: fade only, no translate.
 */
export const streamPanelVariants: Variants = {
  hidden: { opacity: 0, x: prefersReducedMotion() ? 0 : 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.22, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    x: prefersReducedMotion() ? 0 : 16,
    transition: prefersReducedMotion()
      ? RM
      : { duration: 0.16, ease: "linear" },
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 6. Stagger for list-rendered items                                         */
/* ────────────────────────────────────────────────────────────────────────── */

/** Cap on the number of children that animate in; remaining items snap. */
export const STAGGER_MAX_ITEMS = 8;

/**
 * Wrap the list root with this. Children animated past `STAGGER_MAX_ITEMS`
 * should pass `custom={index}` to `listItemVariants` so they skip the delay.
 */
export const listContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: prefersReducedMotion()
      ? RM
      : { staggerChildren: 0.03, delayChildren: 0 },
  },
};

/**
 * Apply to each list child. Pass the row index as `custom` so rows beyond
 * `STAGGER_MAX_ITEMS` appear instantly instead of dragging the tail.
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: prefersReducedMotion() ? 0 : 2 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion()
      ? RM
      : index >= STAGGER_MAX_ITEMS
        ? { duration: 0 }
        : { duration: 0.16, ease: EASE_OUT },
  }),
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 7. Number / score count-up                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Tweenable config for `useMotionValue` + `animate()` driving the score badge
 * (`0 → 87` etc.). Not a `Variants` map — apply with `animate(motionValue,
 * target, scoreCountUpTransition)`. 600ms ease-out lands the digit decisively.
 */
export const scoreCountUpTransition: Transition = prefersReducedMotion()
  ? { duration: 0 }
  : { duration: 0.6, ease: EASE_OUT };

/* ────────────────────────────────────────────────────────────────────────── */
/* 8. Page / tab transitions                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Use on the outermost route/tab container inside `AnimatePresence
 * mode="wait"`. Opacity-only, 100ms — fast enough that nav feels free,
 * slow enough to mask layout swaps.
 */
export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: prefersReducedMotion() ? RM : { duration: 0.1, ease: "linear" },
  },
  exit: {
    opacity: 0,
    transition: prefersReducedMotion() ? RM : { duration: 0.08, ease: "linear" },
  },
};
