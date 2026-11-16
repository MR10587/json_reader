"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChatArchive } from "@/components/ChatArchiveProvider";
import { BrandMark } from "@/components/Brand";
import { ConversationView } from "@/components/ConversationView";
import { Sidebar } from "@/components/Sidebar";
import {
  ImportFailureNotice,
  ImportingBanner,
  LoadingPanel,
  NoConversationsPanel,
  WarningsBanner,
} from "@/components/StatusPanels";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeState } from "@/components/WelcomeState";

export function AppShell() {
  const {
    library,
    selectedIndex,
    selectedConversation,
    importingFileName,
    failure,
    dismissFailure,
    warningsDismissed,
    dismissWarnings,
  } = useChatArchive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [selectedIndex, library?.fileName, library?.importedAt]);

  const warnings = library?.warnings ?? [];
  const showWarnings = warnings.length > 0 && !warningsDismissed;

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open conversations"
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <span className="truncate text-sm font-semibold">
              {selectedConversation?.title ?? "ChatArchive"}
            </span>
          </div>
          <ThemeToggle />
        </header>

        <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          <div className="flex min-h-full flex-col">
            {importingFileName && library ? <ImportingBanner fileName={importingFileName} /> : null}

            {library && (failure || showWarnings) ? (
              <div className="mx-auto w-full max-w-4xl space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
                {failure ? (
                  <ImportFailureNotice failure={failure} onDismiss={dismissFailure} />
                ) : null}
                {showWarnings ? (
                  <WarningsBanner warnings={warnings} onDismiss={dismissWarnings} />
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-1 flex-col">
              {importingFileName && !library ? (
                <LoadingPanel fileName={importingFileName} />
              ) : !library ? (
                <WelcomeState />
              ) : library.conversations.length === 0 ? (
                <NoConversationsPanel />
              ) : selectedConversation ? (
                <ConversationView conversation={selectedConversation} />
              ) : (
                <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Choose a conversation</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select a conversation from the sidebar to start reading.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
