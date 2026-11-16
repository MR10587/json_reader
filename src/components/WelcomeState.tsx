"use client";

import { useChatArchive } from "@/components/ChatArchiveProvider";
import { ImportDropzone } from "@/components/ImportDropzone";
import { ImportFailureNotice } from "@/components/StatusPanels";

const features = [
  {
    title: "Stays on your device",
    description: "Your export is parsed in this browser tab. Nothing is uploaded.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.4 2.8 8.3 7 10 4.2-1.7 7-5.6 7-10V6l-7-3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Readable conversations",
    description: "Markdown, tables, code highlighting and message timestamps.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Your way",
    description: "A responsive dashboard with light and dark themes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function WelcomeState() {
  const { importFile, importingFileName, failure, dismissFailure } = useChatArchive();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Private by design
        </span>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Your ChatGPT history,
          <br className="hidden sm:block" /> beautifully organized.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
          Import the ZIP from your ChatGPT data export to browse conversations with clean
          formatting, syntax highlighting and an easy-to-scan layout.
        </p>
      </div>

      {failure ? <ImportFailureNotice failure={failure} onDismiss={dismissFailure} /> : null}

      <ImportDropzone
        onFile={(file) => void importFile(file)}
        disabled={importingFileName !== null}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border bg-surface p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              {feature.icon}
            </span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">{feature.title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      {process.env.NODE_ENV === "development" ? (
        <p className="text-center text-xs text-muted-foreground">
          Looking for the sample? Use{" "}
          <code className="font-mono">test-fixtures/chatgpt-sample.zip</code> while developing.
        </p>
      ) : null}
    </div>
  );
}
