import type { ContentPart } from "@/lib/chatgpt-export";
import { MessageMarkdown } from "@/components/Markdown";

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Builds a fenced block with a fence longer than any backtick run in the text. */
function fencedCode(text: string, language: string | null): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  const lang =
    language && language !== "unknown" && /^[a-zA-Z0-9_+-]+$/.test(language)
      ? language.toLowerCase()
      : "";
  return `${fence}${lang}\n${text.replace(/\n$/, "")}\n${fence}`;
}

function PartFrame({
  label,
  tone = "muted",
  children,
}: {
  label: string;
  tone?: "muted" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        tone === "danger" ? "border-danger/30 bg-danger-soft" : "border-border bg-surface-muted"
      }`}
    >
      <div
        className={`border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
          tone === "danger" ? "border-danger/20 text-danger" : "border-border text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="px-3 py-2.5 text-sm">{children}</div>
    </div>
  );
}

function CollapsiblePart({ label, text }: { label: string; text: string }) {
  return (
    <details className="group rounded-xl border border-border bg-surface-muted/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="details-chevron h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </summary>
      <div className="border-t border-border px-3 py-3">
        <MessageMarkdown>{text}</MessageMarkdown>
      </div>
    </details>
  );
}

function Part({ part }: { part: ContentPart }) {
  switch (part.kind) {
    case "text":
      return <MessageMarkdown>{part.text}</MessageMarkdown>;

    case "code":
      return <MessageMarkdown>{fencedCode(part.text, part.language)}</MessageMarkdown>;

    case "execution_output":
      return (
        <PartFrame label="Execution output">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
            {part.text}
          </pre>
        </PartFrame>
      );

    case "quote": {
      const href = safeExternalUrl(part.url);
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" strokeLinecap="round" />
              <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" strokeLinecap="round" />
            </svg>
            <span className="font-medium">{part.domain ?? "Quoted source"}</span>
            {part.title ? <span className="truncate">· {part.title}</span> : null}
          </div>
          <div className="px-3 py-3 text-sm">
            {part.text ? <MessageMarkdown>{part.text}</MessageMarkdown> : null}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-xs font-medium text-accent underline underline-offset-2"
              >
                Open source
              </a>
            ) : null}
          </div>
        </div>
      );
    }

    case "browsing":
      return (
        <PartFrame label="Browsing">
          <p className="whitespace-pre-wrap break-words">{part.text}</p>
        </PartFrame>
      );

    case "error":
      return (
        <PartFrame label={part.name ? `Error · ${part.name}` : "Error"} tone="danger">
          <p className="whitespace-pre-wrap break-words">{part.text}</p>
        </PartFrame>
      );

    case "reasoning":
      return <CollapsiblePart label="Reasoning" text={part.text} />;

    case "context":
      return <CollapsiblePart label="Context" text={part.text} />;

    case "image":
      return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="m3 15 4.5-4.5 4 4L15 11l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Image attachment</p>
            <p className="text-xs text-muted-foreground">
              {part.width && part.height ? `${part.width} × ${part.height} · ` : ""}
              Preview not available in the export viewer.
            </p>
          </div>
        </div>
      );

    case "audio":
      return (
        <PartFrame label="Audio message">
          {part.transcript ? (
            <MessageMarkdown>{part.transcript}</MessageMarkdown>
          ) : (
            <p className="text-muted-foreground">No transcript available.</p>
          )}
        </PartFrame>
      );

    case "unsupported":
      return (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Unsupported content type: <code>{part.contentType}</code>
        </p>
      );
  }
}

export function ContentParts({ parts }: { parts: ContentPart[] }) {
  if (parts.length === 0) return null;
  return (
    <div className="space-y-3">
      {parts.map((part, index) => (
        <Part key={`${part.kind}-${index}`} part={part} />
      ))}
    </div>
  );
}
