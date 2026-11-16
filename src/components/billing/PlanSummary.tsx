import Link from "next/link";
import { FEATURES, PLANS } from "@/lib/billing/config";
import type { Entitlement, EntitlementSource } from "@/lib/billing/types";
import { formatTimestamp } from "@/lib/ui/format";
import { CheckIcon } from "./icons";
import { PlanBadge } from "./PlanBadge";

const SOURCE_LABELS: Record<EntitlementSource, string> = {
  none: "Default Free plan",
  "dev-mock": "Development mock",
  verified: "Server-verified",
};

export function PlanSummary({
  entitlement,
  showFeatures = true,
}: {
  entitlement: Entitlement;
  showFeatures?: boolean;
}) {
  const plan = PLANS[entitlement.planId];
  const expires = entitlement.expiresAt
    ? formatTimestamp(entitlement.expiresAt)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge planId={entitlement.planId} />
        {entitlement.isDevMock ? (
          <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
            Dev mock
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">{plan.name} plan</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {SOURCE_LABELS[entitlement.source]}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Expires
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {expires ?? "No expiry"}
          </dd>
        </div>
      </dl>

      {showFeatures ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Included
          </p>
          <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {plan.features.map((featureId) => (
              <li key={featureId} className="flex items-start gap-1.5">
                <CheckIcon />
                <span>{FEATURES[featureId].name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {entitlement.planId === "premium"
          ? "Manage plan"
          : "Upgrade to Premium"}
      </Link>
    </div>
  );
}
