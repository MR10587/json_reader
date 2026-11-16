"use client";

import type { ImportWarning } from "@/lib/chatgpt-export";
import type { ImportFailure } from "@/components/ChatArchiveProvider";
import { useChatArchive } from "@/components/ChatArchiveProvider";
import { ImportDropzone } from "@/components/ImportDropzone";

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`}
    />
  );
}

export function LoadingPanel({ fileName }: { fileName: string }) {
  return (
    <div
      role="status"
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Spinner />
      </span>
      <h1 className="mt-5 text-lg font-semibold text-foreground">Reading your export…</h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Parsing <span className="font-medium text-foreground">{fileName}</span> in this tab.
        Nothing is uploaded.
      </p>
    </div>
  );
}

export function ImportingBanner({ fileName }: { fileName: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-border bg-accent-soft px-4 py-2.5 text-sm text-foreground"
    >
      <span className="text-accent">
        <Spinner className="h-4 w-4" />
      </span>
      <span className="truncate">
        Importing <span className="font-medium">{fileName}</span>…
      </span>
    </div>
  );
}

export function ImportFailureNotice({
  failure,
  onDismiss,
}: {
  failure: ImportFailure;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-danger"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Could not import {failure.fileName}</p>
        <p className="mt-0.5 text-sm opacity-90">{failure.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss import error"
        className="-mr-1 rounded-md p-1 opacity-70 transition hover:bg-danger/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function WarningsBanner({
  warnings,
  onDismiss,
}: {
  warnings: ImportWarning[];
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-warning">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
          <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
          <path d="M12 9v5M12 17.5v.01" strokeLinecap="round" />
        </svg>
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {warnings.length} conversation{warnings.length === 1 ? "" : "s"} had parsing warnings
          </summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs opacity-90">
            {warnings.map((warning, index) => (
              <li key={`${warning.index}-${index}`}>
                <span className="font-medium">{warning.conversationId ?? `Conversation ${warning.index + 1}`}:</span>{" "}
                {warning.message}
              </li>
            ))}
          </ul>
        </details>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss warnings"
          className="-mr-1 rounded-md p-1 opacity-70 transition hover:bg-warning/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function NoConversationsPanel() {
  const { importFile, importingFileName } = useChatArchive();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center sm:px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6Z" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">No conversations found</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        The import worked, but this export does not contain any conversations. Try importing
        another export file.
      </p>
      <div className="mt-6 w-full">
        <ImportDropzone
          compact
          onFile={(file) => void importFile(file)}
          disabled={importingFileName !== null}
        />
      </div>
    </div>
  );
}
