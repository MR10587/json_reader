import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

export function PageLoading({
  label,
  wide = false,
}: {
  label: string;
  wide?: boolean;
}) {
  const widthClass = wide ? "max-w-6xl" : "max-w-3xl";

  return (
    <div
      className="min-h-dvh bg-background text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="border-b border-border bg-surface/70">
        <div
          className={`mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 ${widthClass}`}
        >
          <Brand subtitle="Private ChatGPT export viewer" />
          <ThemeToggle />
        </div>
      </header>

      <main className={`mx-auto w-full px-4 py-8 sm:px-6 ${widthClass}`}>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
