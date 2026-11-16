export function PlanPanelSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
      <div className="mt-4 h-6 w-32 animate-pulse rounded-full bg-surface-muted" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="h-12 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-surface-muted" />
      </div>
      <div className="mt-4 h-16 animate-pulse rounded-lg bg-surface-muted" />
    </section>
  );
}
