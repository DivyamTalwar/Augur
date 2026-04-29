/**
 * Hero — Instrument Serif title with animated gradient italic em + grid-bg overlay
 * + radial highlight tints. Reference: augur-os.html `.hero`.
 */
interface HeroProps {
  /** Title supports a single highlighted phrase between asterisks: "The *operating system* for outbound." */
  title: string;
  subtitle?: string;
}

function renderTitle(raw: string) {
  const parts = raw.split(/\*([^*]+)\*/g);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      return (
        <em
          key={i}
          className="italic"
          style={{
            background:
              "linear-gradient(120deg, var(--color-flame) 0%, var(--color-flame-2) 50%, var(--color-leaf) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            animation: "gradient-shift 8s ease-in-out infinite",
          }}
        >
          {p}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function Hero({ title, subtitle }: HeroProps) {
  return (
    <section
      className="relative px-9 pt-7 pb-[22px] border-b border-line overflow-hidden"
      style={{
        background:
          "radial-gradient(800px 300px at 100% 0%, rgba(255,91,31,0.06), transparent 60%), radial-gradient(600px 240px at 0% 100%, rgba(31,170,109,0.04), transparent 60%)",
      }}
    >
      <div className="grid-bg" />
      <div className="relative z-[1]">
        <h1
          className="font-serif max-w-[720px] m-0 mb-2 text-ink"
          style={{
            fontSize: "42px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {renderTitle(title)}
        </h1>
        {subtitle && (
          <p
            className="text-ink-2 max-w-[640px] m-0"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
