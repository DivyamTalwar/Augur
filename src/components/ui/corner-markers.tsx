/**
 * CornerMarkers — Technical Minimalist L-shaped accents at the corners
 * of a positioned container. Pair with `relative` parent.
 *
 *  ┌─                  ─┐
 *  ▎                    ▎      <- L-shapes in orange accent
 *
 *  ▎                    ▎
 *  └─                  ─┘
 */
import { cn } from "@/lib/utils";

interface CornerMarkersProps {
  /** L-arm length in px. Default 10. */
  size?: number;
  /** Stroke width in px. Default 1. */
  thickness?: number;
  /** Tailwind color class for the marker stroke. Default text-accent. */
  className?: string;
  /** Inset distance from corners in px. Default 0. */
  inset?: number;
}

export function CornerMarkers({
  size = 10,
  thickness = 1,
  className,
  inset = 0,
}: CornerMarkersProps) {
  const armColor = cn("bg-current", className ?? "text-accent");
  const horiz = { width: size, height: thickness };
  const vert = { width: thickness, height: size };

  return (
    <>
      {/* top-left */}
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ top: inset, left: inset, ...horiz }}
      />
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ top: inset, left: inset, ...vert }}
      />
      {/* top-right */}
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ top: inset, right: inset, ...horiz }}
      />
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ top: inset, right: inset, ...vert }}
      />
      {/* bottom-left */}
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ bottom: inset, left: inset, ...horiz }}
      />
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ bottom: inset, left: inset, ...vert }}
      />
      {/* bottom-right */}
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ bottom: inset, right: inset, ...horiz }}
      />
      <span
        aria-hidden
        className={cn("absolute pointer-events-none", armColor)}
        style={{ bottom: inset, right: inset, ...vert }}
      />
    </>
  );
}
