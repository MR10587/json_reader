import Link from "next/link";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" strokeLinejoin="round" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Brand({
  subtitle,
  onClick,
}: {
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
    >
      <BrandMark />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          ChatArchive
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
