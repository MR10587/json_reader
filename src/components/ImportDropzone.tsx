"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";

interface ImportDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * File picker and drop target. Parsing lives in ChatArchiveProvider, so this
 * component only hands the selected ZIP to the existing Stage 1 importer.
 */
export function ImportDropzone({ onFile, disabled = false, compact = false }: ImportDropzoneProps) {
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (file) onFile(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <label
      htmlFor={inputId}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition ${
        compact ? "px-5 py-7" : "px-6 py-10 sm:px-10 sm:py-12"
      } ${
        dragActive
          ? "border-accent bg-accent-soft"
          : "border-border-strong bg-surface hover:border-accent hover:bg-surface-muted"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-medium text-foreground">Select your ChatGPT export</span>
      <span className="text-sm text-muted-foreground">
        Drop a .zip here or click to browse. Processed on your device.
      </span>
      <input
        id={inputId}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  );
}
