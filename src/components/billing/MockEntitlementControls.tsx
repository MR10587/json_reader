import {
  mockExpireAction,
  mockResetAction,
  mockUpgradeAction,
} from "@/lib/billing/actions";
import { LockIcon } from "./icons";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warning-soft";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const dangerButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-danger/40 bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger";

export function MockEntitlementControls() {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning-soft p-3">
      <div className="flex items-start gap-2">
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-xs font-semibold text-warning">
            Development controls — no payment
          </p>
          <p className="mt-1 text-[11px] leading-4 text-warning">
            These buttons write a signed cookie and redirect back to this page.
            They are disabled in production and never grant access from
            localStorage or a client boolean.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={mockUpgradeAction}>
          <button type="submit" className={primaryButtonClass}>
            Simulate Premium · 30 days
          </button>
        </form>

        <form action={mockUpgradeAction}>
          <input type="hidden" name="ttl" value="short" />
          <button type="submit" className={secondaryButtonClass}>
            Simulate Premium · 2 minutes
          </button>
        </form>

        <form action={mockExpireAction}>
          <button type="submit" className={secondaryButtonClass}>
            Set expired Premium
          </button>
        </form>

        <form action={mockResetAction}>
          <button type="submit" className={dangerButtonClass}>
            Reset to Free
          </button>
        </form>
      </div>
    </div>
  );
}
