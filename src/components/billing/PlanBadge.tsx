import type { PlanId } from "@/lib/billing/config";
import { SparkleIcon } from "./icons";

export function PlanBadge({
  planId,
  className = "",
}: {
  planId: PlanId;
  className?: string;
}) {
  const premium = planId === "premium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        premium
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-border bg-surface-muted text-muted-foreground"
      } ${className}`}
    >
      {premium ? <SparkleIcon /> : null}
      {premium ? "Premium" : "Free plan"}
    </span>
  );
}

export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent ${className}`}
    >
      <SparkleIcon />
      Premium
    </span>
  );
}
