"use client";

import { useState, type ChangeEvent } from "react";
import { importChatGptExport, type ImportResult } from "@/lib/chatgpt-export";

type State =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "done"; fileName: string; result: ImportResult };

/**
 * Lets the user pick their ChatGPT export ZIP. The file is read and parsed
 * in the browser; results live only in React state (no upload, no storage).
 */
export function ImportDropzone() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setState({ status: "loading", fileName: file.name });
    let result: ImportResult;
    try {
      result = await importChatGptExport(file);
    } catch {
      // The importer is designed not to throw; this guards against e.g. out-of-memory errors.
      result = {
        ok: false,
        error: { code: "READ_FAILED", message: "Something went wrong while reading this file. It may be too large for this device." },
      };
    }
    setState({ status: "done", fileName: file.name, result });
  }

  return (
    <section className="w-full space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center hover:border-zinc-500 dark:border-zinc-700">
        <span className="font-medium">Select your ChatGPT export (.zip)</span>
        <span className="text-sm text-zinc-500">Processed on your device. Nothing is uploaded.</span>
        <input
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={handleChange}
          disabled={state.status === "loading"}
        />
      </label>

      {state.status === "loading" && <p className="text-sm">Reading {state.fileName}…</p>}
      {state.status === "done" && <ImportSummary result={state.result} />}
    </section>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  if (!result.ok) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        {result.error.message}
      </p>
    );
  }

  const { conversations, warnings } = result;
  return (
    <div className="space-y-2">
      <p className="text-sm">
        Imported {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
        {warnings.length > 0 && ` (${warnings.length} warning${warnings.length === 1 ? "" : "s"})`}.
      </p>
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {conversations.map((c, i) => (
          <li key={`${c.id}-${i}`} className="flex justify-between gap-4 px-3 py-2 text-sm">
            <span className="truncate">{c.title}</span>
            <span className="shrink-0 text-zinc-500">{c.messages.length} msgs</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
