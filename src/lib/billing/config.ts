/**
 * Central plan, feature, and pricing configuration.
 *
 * This is the single place to change what Free and Premium include, what the
 * plans cost, and the copy shown on the upgrade page. Everything here is
 * isomorphic so it can be imported by both server and client components.
 */

export const FEATURES = {
  viewer: {
    name: "Conversation viewer",
    description:
      "Read every imported conversation, including Markdown, code blocks, and long threads.",
    tier: "free",
  },
  search: {
    name: "Search and filters",
    description:
      "Search message text and narrow conversations by date, role, and sort order.",
    tier: "free",
  },
  settings: {
    name: "Appearance and privacy",
    description:
      "Choose light or dark mode and review how your export stays in this browser tab.",
    tier: "free",
  },
  "analytics.summary": {
    name: "Summary analytics",
    description:
      "Conversation and message totals, user/assistant split, and average thread length.",
    tier: "free",
  },
  "analytics.advanced": {
    name: "Advanced analytics",
    description:
      "Monthly and weekday activity charts, busiest weekday, top month, longest conversations, and detailed coverage notes.",
    tier: "premium",
  },
} as const;

export type FeatureId = keyof typeof FEATURES;
export type FeatureTier = (typeof FEATURES)[FeatureId]["tier"];

export const ALL_FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

export const FREE_FEATURE_IDS = ALL_FEATURE_IDS.filter(
  (featureId) => FEATURES[featureId].tier === "free",
);

export const PREMIUM_FEATURE_IDS = ALL_FEATURE_IDS.filter(
  (featureId) => FEATURES[featureId].tier === "premium",
);

/**
 * Plan definitions. `features` is derived from `FEATURES` above so the pricing
 * table, badges, and server checks cannot drift apart.
 */
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Local viewing and the essentials.",
    description:
      "Everything you need to read, search, and summarize your own ChatGPT export.",
    price: { monthly: 0, annual: 0 },
    features: FREE_FEATURE_IDS,
    highlights: [
      "Private in-browser viewing",
      "Search, filters, and settings",
      "Summary analytics",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Understand your conversation history over time.",
    description:
      "Deeper analytics for seeing when, how, and where your ChatGPT activity is concentrated.",
    price: { monthly: 600, annual: 6000 },
    features: ALL_FEATURE_IDS,
    highlights: [
      "Monthly and weekday activity charts",
      "Busiest weekday and top month",
      "Top 5 longest conversations",
      "Detailed coverage and hidden-message notes",
    ],
    badge: "Most popular",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PRICING = {
  currency: "USD",
  locale: "en-US",
  monthlyLabel: "Monthly",
  annualLabel: "Annual",
  monthlyPeriod: "per month",
  annualPeriod: "per year",
  freeCta: "Included",
  premiumCta: "Upgrade to Premium",
  disabledCta: "Payments coming soon",
  annualNote: "Two months free",
  devNote:
    "Development mock: no payment is processed. Premium is simulated with a signed, HttpOnly cookie.",
  productionNote:
    "Payments are not enabled yet. This preview cannot issue real Premium access.",
  alwaysFreeNote:
    "Basic conversation viewing, search, settings, and summary analytics are always free.",
} as const;

export function formatPrice(amountInCents: number): string {
  const hasCents = amountInCents % 100 !== 0;
  return new Intl.NumberFormat(PRICING.locale, {
    style: "currency",
    currency: PRICING.currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amountInCents / 100);
}

export function getAnnualSavingsPercent(
  monthlyCents: number,
  annualCents: number,
): number {
  const fullYear = monthlyCents * 12;
  if (fullYear <= 0 || annualCents >= fullYear) return 0;
  return Math.round(((fullYear - annualCents) / fullYear) * 100);
}

export function getMonthlyEquivalent(annualCents: number): number {
  return Math.round(annualCents / 12);
}
