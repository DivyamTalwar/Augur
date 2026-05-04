import { Button } from "@/components/ui/button";
import { IconLoader2 } from "@/components/ui/icon";
import { AugurMark } from "@/components/brand/augur-mark";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    loadingLabel?: string;
    onClick: () => void;
    isLoading?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
  };
  /**
   * When true, replace the icon with the Augur brand mark and the warm ember halo.
   * Best for "first-run" or "ready to start" empty states.
   */
  branded?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  branded = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {branded ? (
        <div
          className="relative grid h-16 w-16 place-items-center rounded-2xl mb-5 overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 88%, rgba(255,91,31,0.32), transparent 52%), linear-gradient(180deg, #1A1714, #0F0C0A)",
            boxShadow:
              "0 0 0 1px rgba(255,91,31,0.28), 0 18px 48px -22px rgba(255,91,31,0.65), 0 8px 18px -14px rgba(26,23,20,0.45)",
          }}
        >
          <AugurMark className="h-12 w-12" glow decorative />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-bg-2 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} disabled={action.isLoading}>
          {action.isLoading ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : action.icon ? (
            <action.icon className="h-4 w-4" />
          ) : null}
          {action.isLoading ? action.loadingLabel || "Starting..." : action.label}
        </Button>
      )}
    </div>
  );
}

interface SmallEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}

export function SmallEmptyState({ icon: Icon, message }: SmallEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-bg-2 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
