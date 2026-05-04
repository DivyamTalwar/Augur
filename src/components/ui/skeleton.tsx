import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden rounded bg-bg-2", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, rgba(255,91,31,0.08) 38%, rgba(255,138,61,0.12) 50%, rgba(255,91,31,0.08) 62%, transparent 100%)",
        backgroundSize: "200% 100%",
        backgroundRepeat: "no-repeat",
        animation: "shimmer 1.6s linear infinite",
      }}
      {...props}
    />
  );
}

export { Skeleton };
