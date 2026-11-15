# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: ChatArchive

A privacy-focused viewer for ChatGPT data exports, with optional premium features. The core viewer is free. Premium features must add real value on top of it.

## Stack

- Next.js 16 (App Router), React 19. This Next version has breaking changes compared with older training data; read `AGENTS.md` and the guides in `node_modules/next/dist/docs/` before writing Next-specific code.
- TypeScript (strict mode)
- Tailwind CSS v4
- JSZip for reading the export ZIP
- Vitest for unit tests (node environment, config in `vitest.config.mts`)

## Commands

```bash
npm run dev          # dev server
npm run lint         # ESLint
npm test             # all unit tests (vitest run)
npm run test:watch
npx vitest run src/lib/chatgpt-export/__tests__/import.test.ts -t "branched"   # single file / test name
npm run typecheck    # tsc --noEmit (needs .next/types; run dev or build once first)
npm run build        # production build
```

After any major change, run all three: **lint, tests, production build**.

## Parser architecture (`src/lib/chatgpt-export/`)

The public entry point is `importChatGptExport(input, { limits })` in `index.ts`. It never throws: it returns `{ ok: true, conversations, warnings }` or `{ ok: false, error: { code, message } }`. The pipeline:

1. `zip.ts` checks the size limits, opens the archive with JSZip, and finds the shallowest `conversations.json`, ignoring `__MACOSX/`.
2. `json.ts` parses the JSON safely.
3. `normalize.ts` turns each conversation into the types in `types.ts`.
4. `thread.ts` turns the `mapping` tree into a list by walking from `current_node` back up through `parent`. Edits and regenerations create branches, so only the selected branch is returned. It also guards against cycles and missing nodes.
5. `content.ts` maps each `content_type` to a `ContentPart`. Unknown types become `{ kind: "unsupported" }` rather than being dropped.

Raw export data is always `unknown`, narrowed with `guards.ts`. A bad conversation adds a warning and is skipped; it doesn't fail the whole import. Limits are set in `limits.ts` and can be overridden per call, which the tests use. Fixtures in `__tests__/fixtures.ts` are synthetic, built in code and zipped with JSZip.

## Architecture rules

- **Keep parsing separate from UI.** ZIP extraction and export-JSON parsing belong in plain TypeScript modules with no React imports, so they can be unit-tested on their own. Components only receive parsed, typed data.
- Keep components small and reusable.
- **Do not invent the ChatGPT export format.** Base parser changes on the known export structure, and never ask the user to share real conversation data. Use synthetic fixtures instead. If a field's shape is uncertain, handle it defensively (as `unsupported` or with a fallback) rather than guessing.
- Parsing must handle malformed input safely: corrupt or non-ZIP files, missing entries, invalid JSON, and unexpected shapes should produce clear errors, not crashes.
- Write tests for the important parsing logic, including malformed-input cases.

## Privacy and security (hard constraints)

- Imported ZIP files are processed entirely in the browser.
- Conversation content is never sent to our server, including through API routes, analytics, or error reporting payloads.
- Raw conversations are never stored in `localStorage`.
- No API keys or secrets in client code; anything `NEXT_PUBLIC_*` is public.
- Do not implement fake or client-only payment verification. If premium gating needs real verification and it isn't built yet, say so instead of stubbing it in a way that looks like it works.

## Working rules

- Only describe a feature as working once it has been tested.
- Keep changes scoped to the feature at hand, with no unrelated refactors or edits.
- Ask before making major architectural decisions (e.g. adding a backend, choosing a storage approach for parsed data, choosing a payment/auth provider).

## Product principles

Fast and simple UX, mobile responsive, privacy first.
