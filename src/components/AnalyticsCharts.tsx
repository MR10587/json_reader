import type { ReactNode } from "react";
import type {
  MonthlyBucket,
  WeekdayBucket,
} from "@/lib/analytics/conversation-analytics";

const countFormatter = new Intl.NumberFormat();

function formatCount(value: number): string {
  return countFormatter.format(value);
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function ChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Unavailable({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;

  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_2.5rem]">
      <span
        className="truncate text-[11px] text-muted-foreground sm:text-xs"
        title={label}
      >
        {label}
      </span>
      <span
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="text-right text-[11px] font-medium tabular-nums text-foreground sm:text-xs">
        {formatCount(value)}
      </span>
    </li>
  );
}

export function MonthlyActivityChart({
  buckets,
  top,
}: {
  buckets: readonly MonthlyBucket[];
  top: readonly MonthlyBucket[];
}) {
  const max = buckets.reduce(
    (highest, bucket) => Math.max(highest, bucket.conversations),
    0,
  );
  const total = buckets.reduce(
    (sum, bucket) => sum + bucket.conversations,
    0,
  );

  return (
    <ChartFrame
      title="Conversations created per month"
      description="Grouped by creation date in your local time zone. Missing months inside the range are real zeros."
    >
      {buckets.length === 0 ? (
        <Unavailable>
          Not available — this export has no conversation creation dates.
        </Unavailable>
      ) : (
        <>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {buckets.map((bucket) => (
              <BarRow
                key={bucket.key}
                label={bucket.label}
                value={bucket.conversations}
                max={max}
              />
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {formatCount(total)}{" "}
            {pluralize(total, "conversation", "conversations")} across{" "}
            {formatCount(buckets.length)}{" "}
            {pluralize(buckets.length, "month", "months")}.
          </p>
          {top.length > 0 ? (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Most active months
              </p>
              <ol className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                {top.map((bucket, rank) => (
                  <li key={bucket.key}>
                    <span className="font-medium text-foreground">
                      {rank + 1}. {bucket.label}
                    </span>{" "}
                    · {formatCount(bucket.conversations)}{" "}
                    {pluralize(bucket.conversations, "conversation", "conversations")}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}
    </ChartFrame>
  );
}

export function WeekdayActivityChart({
  buckets,
  available,
}: {
  buckets: readonly WeekdayBucket[];
  available: boolean;
}) {
  const max = buckets.reduce(
    (highest, bucket) => Math.max(highest, bucket.messages),
    0,
  );
  const total = buckets.reduce((sum, bucket) => sum + bucket.messages, 0);

  return (
    <ChartFrame
      title="Visible messages by day of week"
      description="All non-hidden messages with a timestamp, grouped in your local time zone. Monday first."
    >
      {!available ? (
        <Unavailable>
          Not available — this export has no message timestamps.
        </Unavailable>
      ) : (
        <>
          <ul className="space-y-2">
            {buckets.map((bucket) => (
              <BarRow
                key={bucket.weekday}
                label={bucket.label}
                value={bucket.messages}
                max={max}
              />
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Peak day: {formatCount(max)}{" "}
            {pluralize(max, "message", "messages")} · {formatCount(total)} timed{" "}
            {pluralize(total, "message", "messages")} total.
          </p>
        </>
      )}
    </ChartFrame>
  );
}
