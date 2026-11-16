import Link from "next/link";
import {
  FEATURES,
  PLANS,
  PRICING,
  type FeatureId,
} from "@/lib/billing/config";
import { CheckIcon, LockIcon } from "./icons";
import { PremiumBadge } from "./PlanBadge";

export function UpgradePrompt({
  featureId,
  compact = false,
}: {
  featureId: FeatureId;
  compact?: boolean;
}) {
  const feature = FEATURES[featureId];

  return (
    <section
      className={`rounded-2xl border border-border bg-surface shadow-sm ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <LockIcon />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {feature.name}
            </h2>
            <PremiumBadge />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {feature.description}
          </p>

          {!compact ? (
            <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
              {PLANS.premium.highlights.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {PRICING.premiumCta}
            </Link>
            <p className="text-[11px] text-muted-foreground">
              Basic viewing and search stay free.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
