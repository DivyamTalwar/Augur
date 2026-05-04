import { useId } from "react";
import { cn } from "@/lib/utils";

interface AugurMarkProps {
  className?: string;
  title?: string;
  glow?: boolean;
  decorative?: boolean;
}

// Palette-aligned tokens (mirrors --color-flame / --color-flame-2 / --color-ink in globals.css).
// Inline SVG `stop-color` attributes can't reference CSS vars directly, so values are pinned.
const FLAME = "#FF5B1F";
const FLAME_2 = "#FF8A3D";
const FLAME_HIGHLIGHT = "#FFC494"; // derived from flame-2; only used as gradient hot-center
const INK = "#1A1714";

export function AugurMark({
  className,
  title = "Augur OS",
  glow = false,
  decorative = false,
}: AugurMarkProps) {
  const id = useId();
  const edge = `${id}-edge`;
  const ember = `${id}-ember`;
  const flare = `${id}-flare`;
  const filter = `${id}-glow`;

  const a11yProps = decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": title };

  return (
    <svg
      viewBox="0 0 128 128"
      {...a11yProps}
      className={cn("block", className)}
      fill="none"
    >
      <defs>
        <linearGradient id={edge} x1="22" y1="108" x2="105" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={FLAME} />
          <stop offset="0.45" stopColor={FLAME_2} />
          <stop offset="0.72" stopColor={FLAME_HIGHLIGHT} />
          <stop offset="1" stopColor={FLAME} />
        </linearGradient>
        <radialGradient id={ember} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(64 111) rotate(-90) scale(80 76)">
          <stop stopColor={FLAME_2} stopOpacity="0.92" />
          <stop offset="0.2" stopColor={FLAME} stopOpacity="0.64" />
          <stop offset="0.64" stopColor={INK} stopOpacity="0.28" />
          <stop offset="1" stopColor={INK} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={flare} x1="20" y1="70" x2="82" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor={FLAME_HIGHLIGHT} />
          <stop offset="0.28" stopColor={FLAME_2} />
          <stop offset="1" stopColor={FLAME} />
        </linearGradient>
        <filter id={filter} x="-28" y="-28" width="184" height="184" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 1  0 0.34 0 0 0.18  0 0 0.05 0 0  0 0 0 0.85 0"
            result="hot"
          />
          <feMerge>
            <feMergeNode in="hot" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="64" cy="112" rx="48" ry="8" fill={`url(#${ember})`} opacity={glow ? 0.86 : 0.38} />
      <path
        d="M18 111 55.6 27.2c3.4-7.6 14.2-7.7 17.8-.2L112 111 89.3 98.2 64.5 43.7 53.5 67.7 29.5 76.9 18 111Z"
        fill="rgba(26, 23, 20, 0.88)"
        stroke={`url(#${edge})`}
        strokeWidth="4.8"
        strokeLinejoin="round"
        filter={glow ? `url(#${filter})` : undefined}
      />
      <path
        d="M27.2 76.9 57.4 65.1 70.4 37.4 91.3 98.7"
        stroke={FLAME_2}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.82"
      />
      <path
        d="M24 75.9 64.5 61.7 76.6 57.4C62.5 63.6 52.1 76.2 42.8 97.7L18 111l17.7-31.8 28.8-17.5"
        fill={INK}
        stroke={`url(#${flare})`}
        strokeWidth="3.8"
        strokeLinejoin="round"
        filter={glow ? `url(#${filter})` : undefined}
      />
      <path
        d="M18 111 43.2 97.5M64.6 43.8 112 111"
        stroke={FLAME_HIGHLIGHT}
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.9"
      />
      {glow && (
        <g stroke={FLAME} strokeLinecap="round" opacity="0.76">
          <path d="M18 57 8 50" strokeWidth="1.3" />
          <path d="M102 33 111 21" strokeWidth="1.6" />
          <path d="M107 56 119 48" strokeWidth="1.2" />
          <path d="M37 30 31 18" strokeWidth="1" opacity="0.42" />
        </g>
      )}
    </svg>
  );
}
