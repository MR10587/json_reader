"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  importChatGptExport,
  type Conversation,
  type ImportError,
  type ImportWarning,
} from "@/lib/chatgpt-export";

export interface ImportedLibrary {
  fileName: string;
  conversations: Conversation[];
  warnings: ImportWarning[];
  importedAt: number;
}

export interface ImportFailure extends ImportError {
  fileName: string;
}

interface ChatArchiveContextValue {
  library: ImportedLibrary | null;
  selectedIndex: number | null;
  selectedConversation: Conversation | null;
  importingFileName: string | null;
  failure: ImportFailure | null;
  warningsDismissed: boolean;
  importFile: (file: File) => Promise<void>;
  selectConversation: (index: number) => void;
  dismissFailure: () => void;
  dismissWarnings: () => void;
}

const ChatArchiveContext = createContext<ChatArchiveContextValue | null>(null);

/**
 * Owns the in-memory import state. Mounted at the root so client-side
 * navigation (for example to Settings) never discards the imported library.
 * Nothing is written to storage or sent anywhere.
 */
export function ChatArchiveProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<ImportedLibrary | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [importingFileName, setImportingFileName] = useState<string | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const importingRef = useRef(false);

  const importFile = useCallback(async (file: File) => {
    if (importingRef.current) return;
    importingRef.current = true;
    setImportingFileName(file.name);
    setFailure(null);

    try {
      const result = await importChatGptExport(file);
      if (result.ok) {
        setWarningsDismissed(false);
        setLibrary({
          fileName: file.name,
          conversations: result.conversations,
          warnings: result.warnings,
          importedAt: Date.now(),
        });
        setSelectedIndex(result.conversations.length > 0 ? 0 : null);
      } else {
        setFailure({ ...result.error, fileName: file.name });
      }
    } catch {
      // The importer is designed not to throw; this guards against
      // browser-level failures such as running out of memory.
      setFailure({
        code: "READ_FAILED",
        fileName: file.name,
        message:
          "Something went wrong while reading this file. It may be too large for this device.",
      });
    } finally {
      importingRef.current = false;
      setImportingFileName(null);
    }
  }, []);

  const selectConversation = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const dismissFailure = useCallback(() => setFailure(null), []);
  const dismissWarnings = useCallback(() => setWarningsDismissed(true), []);

  const selectedConversation =
    library !== null && selectedIndex !== null
      ? (library.conversations[selectedIndex] ?? null)
      : null;

  const value = useMemo<ChatArchiveContextValue>(
    () => ({
      library,
      selectedIndex,
      selectedConversation,
      importingFileName,
      failure,
      warningsDismissed,
      importFile,
      selectConversation,
      dismissFailure,
      dismissWarnings,
    }),
    [
      library,
      selectedIndex,
      selectedConversation,
      importingFileName,
      failure,
      warningsDismissed,
      importFile,
      selectConversation,
      dismissFailure,
      dismissWarnings,
    ],
  );

  return <ChatArchiveContext.Provider value={value}>{children}</ChatArchiveContext.Provider>;
}

export function useChatArchive(): ChatArchiveContextValue {
  const value = useContext(ChatArchiveContext);
  if (!value) {
    throw new Error("useChatArchive must be used inside ChatArchiveProvider.");
  }
  return value;
}
