"use client";

import { useRef, type KeyboardEvent } from "react";
import type { SortOrder } from "@/lib/search/conversation-search";

interface SearchControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  hasUserMessages: boolean;
  hasAssistantMessages: boolean;
  onHasUserMessagesChange: (value: boolean) => void;
  onHasAssistantMessagesChange: (value: boolean) => void;
  sort: SortOrder;
  onSortChange: (value: SortOrder) => void;
  activeFilterCount: number;
  dateRangeInvalid: boolean;
  onResetFilters: () => void;
}

const controlClass =
  "w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function SearchControls({
  query,
  onQueryChange,
  onClearQuery,
  filtersOpen,
  onToggleFilters,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  hasUserMessages,
  hasAssistantMessages,
  onHasUserMessagesChange,
  onHasAssistantMessagesChange,
  sort,
  onSortChange,
  activeFilterCount,
  dateRangeInvalid,
  onResetFilters,
}: SearchControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query !== "") {
      event.preventDefault();
      event.stopPropagation();
      onClearQuery();
    }
  }

  function handleClear() {
    onClearQuery();
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div role="search">
        <label htmlFor="conversation-search" className="sr-only">
          Search conversations
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            id="conversation-search"
            type="text"
            role="searchbox"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations…"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-8 pr-8 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {query !== "" ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleFilters}
        aria-expanded={filtersOpen}
        aria-controls="conversation-filters"
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="inline-flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`details-chevron h-3.5 w-3.5 ${filtersOpen ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {filtersOpen ? (
        <div
          id="conversation-filters"
          className="max-h-[55vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-sidebar p-3 shadow-sm [scrollbar-width:thin]"
        >
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Date range
            </legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <label className="min-w-0">
                <span className="mb-1 block text-[11px] text-muted-foreground">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => onDateFromChange(event.target.value)}
                  className={controlClass}
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-[11px] text-muted-foreground">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => onDateToChange(event.target.value)}
                  className={controlClass}
                />
              </label>
            </div>
            {dateRangeInvalid ? (
              <p role="alert" className="mt-1.5 text-[11px] text-danger">
                The “From” date must be before the “To” date.
              </p>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Messages
            </legend>
            <div className="mt-1.5 space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={hasUserMessages}
                  onChange={(event) => onHasUserMessagesChange(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                Has user messages
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={hasAssistantMessages}
                  onChange={(event) => onHasAssistantMessagesChange(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                Has assistant messages
              </label>
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sort by
            </span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortOrder)}
              className={controlClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>

          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
