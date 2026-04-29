"use client";

import { useEffect, useRef } from "react";

/**
 * AppBackground — animated mesh of floating blurred orbs + cursor magnetic glow.
 * Mirrors the reference augur-os.html `.mesh` and `.cursor-glow` layers.
 *
 * Sits at z-index 0 behind everything; app shell uses position: relative + z-index ≥ 2.
 */
export function AppBackground() {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      glow.style.display = "none";
      return;
    }

    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 2;
    let tx = gx;
    let ty = gy;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    document.addEventListener("mousemove", onMove);

    const tick = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.left = `${gx}px`;
      glow.style.top = `${gy}px`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Floating orbs — restrained 3-orb composition (orange + light orange + green) */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            top: -140,
            right: -100,
            background:
              "radial-gradient(circle, #FF5B1F, transparent 70%)",
            filter: "blur(90px)",
            opacity: 0.32,
            willChange: "transform",
            animation: "float1 24s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 420,
            height: 420,
            bottom: -120,
            left: 200,
            background:
              "radial-gradient(circle, #FF8A3D, transparent 70%)",
            filter: "blur(90px)",
            opacity: 0.22,
            willChange: "transform",
            animation: "float2 28s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 340,
            height: 340,
            bottom: "18%",
            right: "10%",
            background:
              "radial-gradient(circle, #1FAA6D, transparent 70%)",
            filter: "blur(90px)",
            opacity: 0.18,
            willChange: "transform",
            animation: "float3 32s ease-in-out infinite",
          }}
        />
      </div>

      {/* Cursor magnetic glow */}
      <div
        ref={glowRef}
        aria-hidden
        className="fixed pointer-events-none rounded-full"
        style={{
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(255,91,31,0.10), transparent 60%)",
          transform: "translate(-50%, -50%)",
          mixBlendMode: "multiply",
          zIndex: 1,
          left: "50%",
          top: "50%",
        }}
      />
    </>
  );
}
