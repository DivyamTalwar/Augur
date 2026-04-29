import type { ClientLogEntry } from "@/lib/types/claude";

export function CostPill({ logs }: { logs: ClientLogEntry[] }) {
  const total = logs.reduce((sum, log) => sum + (log.usage?.totalCostUsd ?? 0), 0);

  const hot = total >= 1;

  return (
    <span
      className="rounded-full border px-2 py-1 font-mono text-[10px] font-semibold"
      style={{
        borderColor: hot ? "color-mix(in srgb, var(--color-flame) 35%, transparent)" : "var(--color-line)",
        color: hot ? "var(--color-flame)" : "var(--color-ink-2)",
        background: hot ? "color-mix(in srgb, var(--color-flame) 8%, transparent)" : "var(--color-paper)",
      }}
      title="Claude reported job cost"
    >
      ${total.toFixed(total < 0.1 ? 3 : 2)}
    </span>
  );
}
