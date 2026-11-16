"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "chatarchive-theme";
const THEME_EVENT = "chatarchive:theme";

function parseTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function readStoredTheme(): Theme | null {
  try {
    return parseTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (for example in strict privacy modes).
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

function handleStorageChange(onStoreChange: () => void) {
  const stored = readStoredTheme();
  if (stored && stored !== readTheme()) {
    document.documentElement.setAttribute("data-theme", stored);
  }
  onStoreChange();
}

function subscribe(onStoreChange: () => void) {
  const onThemeEvent = () => onStoreChange();
  const onStorage = () => handleStorageChange(onStoreChange);
  window.addEventListener(THEME_EVENT, onThemeEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onThemeEvent);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  // React's development remount can clear attributes it does not manage from
  // <html>. Only act when the attribute is actually missing, so production
  // hydration keeps whatever the pre-paint script already applied.
  useLayoutEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") return;
    document.documentElement.setAttribute("data-theme", readStoredTheme() ?? readSystemTheme());
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);

  return { theme, setTheme };
}

function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5a8.5 8.5 0 1 0 11.3 11.3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <SunIcon className="h-4 w-4 dark:hidden" />
      <MoonIcon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div role="group" aria-label="Color theme" className="inline-flex rounded-xl border border-border bg-surface-muted p-1">
      {(["light", "dark"] as const).map((option) => {
        const selected = theme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            aria-pressed={selected}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option === "light" ? <SunIcon /> : <MoonIcon />}
            {option === "light" ? "Light" : "Dark"}
          </button>
        );
      })}
    </div>
  );
}
