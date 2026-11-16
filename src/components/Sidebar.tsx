"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Brand } from "@/components/Brand";
import { useChatArchive } from "@/components/ChatArchiveProvider";
import { ConversationListItem } from "@/components/ConversationListItem";
import { SearchControls } from "@/components/SearchControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PremiumBadge } from "@/components/billing/PlanBadge";
import { SparkleIcon } from "@/components/billing/icons";
import type { Conversation } from "@/lib/chatgpt-export";
import {
  buildConversationSearchIndex,
  dateInputToEndOfDay,
  dateInputToStartOfDay,
  filterAndSortConversations,
  tokenizeQuery,
  type SortOrder,
} from "@/lib/search/conversation-search";

const SEARCH_DEBOUNCE_MS = 250;
const RESULT_BATCH_SIZE = 100;
const EMPTY_CONVERSATIONS: readonly Conversation[] = [];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    library,
    selectedIndex,
    importingFileName,
    importFile,
    selectConversation,
  } = useChatArchive();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hasUserMessages, setHasUserMessages] = useState(false);
  const [hasAssistantMessages, setHasAssistantMessages] = useState(false);
  const [sort, setSort] = useState<SortOrder>("newest");
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH_SIZE);

  const conversations = library?.conversations ?? EMPTY_CONVERSATIONS;

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedQuery(queryInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [queryInput]);

  // Clearing the input takes effect immediately instead of waiting for the debounce.
  const effectiveQuery = queryInput.trim() === "" ? "" : debouncedQuery;
  const tokens = useMemo(() => tokenizeQuery(effectiveQuery), [effectiveQuery]);
  const index = useMemo(
    () => buildConversationSearchIndex(conversations),
    [conversations],
  );

  const dateRangeInvalid = dateFrom !== "" && dateTo !== "" && dateFrom > dateTo;
  const fromMs = useMemo(() => dateInputToStartOfDay(dateFrom), [dateFrom]);
  const toMs = useMemo(() => dateInputToEndOfDay(dateTo), [dateTo]);

  const results = useMemo(() => {
    if (dateRangeInvalid) return [];
    return filterAndSortConversations(index, {
      tokens,
      fromMs,
      toMs,
      hasUserMessages,
      hasAssistantMessages,
      sort,
    });
  }, [
    index,
    tokens,
    fromMs,
    toMs,
    hasUserMessages,
    hasAssistantMessages,
    sort,
    dateRangeInvalid,
  ]);

  const activeFilterCount =
    (dateFrom !== "" || dateTo !== "" ? 1 : 0) +
    (hasUserMessages ? 1 : 0) +
    (hasAssistantMessages ? 1 : 0) +
    (sort !== "newest" ? 1 : 0);
  const isFiltering =
    tokens.length > 0 ||
    dateFrom !== "" ||
    dateTo !== "" ||
    hasUserMessages ||
    hasAssistantMessages;

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount],
  );
  const hasMore = visibleCount < results.length;

  const handleSelect = useCallback(
    (index: number) => {
      selectConversation(index);
      onClose();
    },
    [selectConversation, onClose],
  );

  const handleQueryChange = useCallback((value: string) => {
    setQueryInput(value);
    // Drop the stale debounced value as soon as the field is cleared so a later
    // keystroke cannot briefly show results for the previous query.
    if (value.trim() === "") setDebouncedQuery("");
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleClearQuery = useCallback(() => {
    setQueryInput("");
    setDebouncedQuery("");
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleDateFromChange = useCallback((value: string) => {
    setDateFrom(value);
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleDateToChange = useCallback((value: string) => {
    setDateTo(value);
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleHasUserMessagesChange = useCallback((value: boolean) => {
    setHasUserMessages(value);
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleHasAssistantMessagesChange = useCallback((value: boolean) => {
    setHasAssistantMessages(value);
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleSortChange = useCallback((value: SortOrder) => {
    setSort(value);
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleResetFilters = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setHasUserMessages(false);
    setHasAssistantMessages(false);
    setSort("newest");
    setVisibleCount(RESULT_BATCH_SIZE);
  }, []);

  const handleClearAll = useCallback(() => {
    handleClearQuery();
    handleResetFilters();
    setFiltersOpen(false);
  }, [handleClearQuery, handleResetFilters]);

  const handleShowMore = useCallback(() => {
    setVisibleCount((count) => count + RESULT_BATCH_SIZE);
  }, []);

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setVisibleCount(RESULT_BATCH_SIZE);
    onClose();
    void importFile(file);
  }

  const resultCountLabel = `${results.length} conversation${
    results.length === 1 ? "" : "s"
  } found`;

  return (
    <aside
      id="app-sidebar"
      aria-label="Conversations"
      className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar shadow-xl transition-[transform,visibility] duration-200 ease-out lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:visible lg:shadow-none ${
        open ? "visible translate-x-0" : "invisible -translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <Brand onClick={onClose} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 px-3 pt-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importingFileName !== null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          {importingFileName ? "Reading export…" : "Import another export"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={handleImport}
          disabled={importingFileName !== null}
        />

        <SearchControls
          query={queryInput}
          onQueryChange={handleQueryChange}
          onClearQuery={handleClearQuery}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((value) => !value)}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={handleDateFromChange}
          onDateToChange={handleDateToChange}
          hasUserMessages={hasUserMessages}
          hasAssistantMessages={hasAssistantMessages}
          onHasUserMessagesChange={handleHasUserMessagesChange}
          onHasAssistantMessagesChange={handleHasAssistantMessagesChange}
          sort={sort}
          onSortChange={handleSortChange}
          activeFilterCount={activeFilterCount}
          dateRangeInvalid={dateRangeInvalid}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </h2>
        {conversations.length > 0 ? (
          <span
            title={
              isFiltering
                ? `${results.length} of ${conversations.length} conversations`
                : undefined
            }
            className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {isFiltering ? `${results.length} of ${conversations.length}` : conversations.length}
          </span>
        ) : null}
      </div>

      <nav
        aria-label="Conversation results"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]"
      >
        <p role="status" aria-live="polite" className="sr-only">
          {isFiltering ? resultCountLabel : `${conversations.length} conversations`}
        </p>

        {conversations.length > 0 ? (
          results.length > 0 ? (
            <>
              <ul className="space-y-0.5">
                {visibleResults.map((entry) => (
                  <ConversationListItem
                    key={`${entry.conversation.id}-${entry.index}`}
                    entry={entry}
                    tokens={tokens}
                    selected={selectedIndex === entry.index}
                    onSelect={handleSelect}
                  />
                ))}
              </ul>
              {hasMore ? (
                <div className="px-1 pt-2">
                  <button
                    type="button"
                    onClick={handleShowMore}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Show more conversations
                  </button>
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    Showing {visibleResults.length} of {results.length}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mx-2 rounded-xl border border-dashed border-border px-3 py-6 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" strokeLinecap="round" />
                </svg>
              </span>
              <p className="mt-3 text-xs font-medium text-foreground">No conversations match</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Try another search term or adjust your filters.
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-3 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Clear search and filters
              </button>
            </div>
          )
        ) : (
          <div className="mx-2 rounded-xl border border-dashed border-border px-3 py-6 text-center">
            <p className="text-xs font-medium text-foreground">
              {library ? "No conversations in this export" : "No export loaded yet"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {library
                ? "Try importing a different ZIP file."
                : "Import your ChatGPT export to start browsing."}
            </p>
          </div>
        )}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-start gap-2 rounded-lg bg-surface-muted/70 px-2.5 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.4 2.8 8.3 7 10 4.2-1.7 7-5.6 7-10V6l-7-3Z" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[11px] leading-4 text-muted-foreground">
            Your export never leaves this tab. Nothing is uploaded, stored, or sent to a search API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/analytics"
            onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M5 20v-6M12 20V6M19 20v-9M3 20h18" strokeLinecap="round" />
            </svg>
            Analytics
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Settings
          </Link>
        </div>
        <Link
          href="/upgrade"
          onClick={onClose}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-2 text-sm font-medium text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SparkleIcon className="h-4 w-4 text-accent" />
          Plans &amp; upgrade
          <PremiumBadge />
        </Link>
      </div>
    </aside>
  );
}
