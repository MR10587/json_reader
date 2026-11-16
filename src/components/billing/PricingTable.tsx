"use client";

import { useState } from "react";
import {
  ALL_FEATURE_IDS,
  FEATURES,
  PLANS,
  PRICING,
  formatPrice,
  getAnnualSavingsPercent,
  getMonthlyEquivalent,
} from "@/lib/billing/config";
import { CheckIcon, DashIcon } from "./icons";
import { PremiumBadge } from "./PlanBadge";

type BillingInterval = "monthly" | "annual";

const primaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function IncludedMark({ included }: { included: boolean }) {
  if (included) {
    return (
      <span className="inline-flex items-center justify-center text-accent">
        <CheckIcon className="h-4 w-4" />
        <span className="sr-only">Included</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center text-muted-foreground">
      <DashIcon className="h-4 w-4" />
      <span className="sr-only">Not included</span>
    </span>
  );
}

export function PricingTable({
  devMockEnabled,
  upgradeAction,
}: {
  devMockEnabled: boolean;
  upgradeAction?: (formData: FormData) => Promise<void>;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const premium = PLANS.premium;
  const annualSavings = getAnnualSavingsPercent(
    premium.price.monthly,
    premium.price.annual,
  );
  const displayedPrice =
    interval === "monthly" ? premium.price.monthly : premium.price.annual;
  const period =
    interval === "monthly" ? PRICING.monthlyPeriod : PRICING.annualPeriod;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {PLANS.free.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {PLANS.free.tagline}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {formatPrice(PLANS.free.price.monthly)}
            </span>
            <span className="text-xs text-muted-foreground">
              {PRICING.monthlyPeriod}
            </span>
          </div>

          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            {PLANS.free.highlights.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-5">
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
            >
              {PRICING.freeCta}
            </button>
          </div>
        </section>

        <section className="relative flex flex-col rounded-2xl border border-accent/40 bg-surface p-5 shadow-sm">
          <span className="absolute right-4 top-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
            {premium.badge}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {premium.name}
              </h2>
              <PremiumBadge />
            </div>
            <p className="mt-1 max-w-[calc(100%-5rem)] text-xs text-muted-foreground">
              {premium.tagline}
            </p>
          </div>

          <div className="mt-4">
            <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5">
              {(["monthly", "annual"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={interval === value}
                  onClick={() => setInterval(value)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    interval === value
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value === "monthly"
                    ? PRICING.monthlyLabel
                    : PRICING.annualLabel}
                  {value === "annual" && annualSavings > 0 ? (
                    <span className="ml-1 text-accent">−{annualSavings}%</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {formatPrice(displayedPrice)}
              </span>
              <span className="text-xs text-muted-foreground">{period}</span>
            </div>
            {interval === "annual" ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatPrice(getMonthlyEquivalent(premium.price.annual))} per
                month · {PRICING.annualNote}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Switch to annual to save {annualSavings}%.
              </p>
            )}
          </div>

          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5">
              <CheckIcon />
              <span>Everything in Free</span>
            </li>
            {premium.highlights.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-5">
            {devMockEnabled && upgradeAction ? (
              <form action={upgradeAction}>
                <input type="hidden" name="interval" value={interval} />
                <button type="submit" className={primaryButtonClass}>
                  {PRICING.premiumCta}
                </button>
              </form>
            ) : (
              <button type="button" disabled className={primaryButtonClass}>
                {PRICING.disabledCta}
              </button>
            )}
            <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">
              {devMockEnabled
                ? "Development mock only. No payment is processed."
                : "Real checkout is not enabled in this preview."}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Compare plans</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every feature listed here is implemented. Premium features are checked
          on the server before the page renders.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="pb-2 pr-4 font-semibold">
                  Feature
                </th>
                <th scope="col" className="w-20 pb-2 pr-4 text-center font-semibold">
                  Free
                </th>
                <th scope="col" className="w-20 pb-2 text-center font-semibold">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ALL_FEATURE_IDS.map((featureId) => {
                const feature = FEATURES[featureId];
                const includedInFree = feature.tier === "free";

                return (
                  <tr key={featureId}>
                    <th scope="row" className="py-2.5 pr-4 align-top font-medium text-foreground">
                      <span className="flex flex-wrap items-center gap-2">
                        {feature.name}
                        {feature.tier === "premium" ? <PremiumBadge /> : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-4 text-muted-foreground">
                        {feature.description}
                      </span>
                    </th>
                    <td className="py-2.5 pr-4 text-center align-top">
                      <IncludedMark included={includedInFree} />
                    </td>
                    <td className="py-2.5 text-center align-top">
                      <IncludedMark included />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
