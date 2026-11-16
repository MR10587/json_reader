import Link from "next/link";
import type { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat();

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
}

export function StatCard({
  label,
  value,
  hint,
  available = true,
}: {
  label: string;
  value: string;
  hint: string;
  available?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 tabular-nums tracking-tight ${
          available
            ? "text-2xl font-semibold text-foreground"
            : "text-base font-medium text-muted-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ImportLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      Import an export
    </Link>
  );
}
