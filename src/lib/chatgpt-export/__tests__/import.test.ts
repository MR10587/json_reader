import { describe, expect, it } from "vitest";
import { importChatGptExport, parseConversations, type ImportResult } from "../index";
import { buildZip, exportZip, makeConversation, makeMapping, text } from "./fixtures";

function expectOk(result: ImportResult) {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}: ${result.error.message}`);
  return result;
}

function expectError(result: ImportResult, code: string) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
}

describe("importChatGptExport — ZIP handling", () => {
  it("imports a well-formed export", async () => {
    const result = expectOk(await importChatGptExport(await exportZip([makeConversation()])));
    expect(result.conversations).toHaveLength(1);
    expect(result.warnings).toEqual([]);

    const [conv] = result.conversations;
    expect(conv).toMatchObject({
      id: "conv-1",
      title: "Simple math",
      createTime: 1_700_000_000_123,
      updateTime: 1_700_000_100_456,
      model: "gpt-4o",
    });
    expect(conv.messages.map((m) => [m.role, m.parts])).toEqual([
      ["system", []],
      ["user", [{ kind: "text", text: "What is 2+2?" }]],
      ["assistant", [{ kind: "text", text: "2+2 is 4." }]],
    ]);
    expect(conv.messages[0].hidden).toBe(true);
    expect(conv.messages[1].createTime).toBe(1_700_000_000_500);
  });

  it("accepts a Blob (as from a file input)", async () => {
    const bytes = await exportZip([makeConversation()]);
    const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
    expect(expectOk(await importChatGptExport(blob)).conversations).toHaveLength(1);
  });

  it("finds conversations.json in a nested folder and ignores __MACOSX", async () => {
    const zip = await buildZip({
      "__MACOSX/export/conversations.json": "garbage",
      "export-2024/conversations.json": JSON.stringify([makeConversation()]),
    });
    expect(expectOk(await importChatGptExport(zip)).conversations).toHaveLength(1);
  });

  it("rejects non-ZIP data", async () => {
    expectError(await importChatGptExport(new TextEncoder().encode("not a zip at all")), "INVALID_ZIP");
  });

  it("rejects an empty file", async () => {
    expectError(await importChatGptExport(new Uint8Array(0)), "INVALID_ZIP");
  });

  it("rejects a truncated ZIP", async () => {
    const zip = await exportZip([makeConversation()]);
    expectError(await importChatGptExport(zip.slice(0, Math.floor(zip.length / 2))), "INVALID_ZIP");
  });

  it("reports a missing conversations.json", async () => {
    const zip = await buildZip({ "user.json": "{}", "chat.html": "<html></html>" });
    expectError(await importChatGptExport(zip), "NOT_FOUND");
  });

  it("reports malformed JSON", async () => {
    const zip = await buildZip({ "conversations.json": '[{"title": "oops",' });
    expectError(await importChatGptExport(zip), "MALFORMED_JSON");
  });

  it("tolerates a UTF-8 BOM", async () => {
    const zip = await buildZip({ "conversations.json": "﻿" + JSON.stringify([makeConversation()]) });
    expect(expectOk(await importChatGptExport(zip)).conversations).toHaveLength(1);
  });

  it.each([{}, { conversations: [] }, "text", 42, null])(
    "rejects unsupported top-level shape %j",
    async (value) => {
      const zip = await buildZip({ "conversations.json": JSON.stringify(value) });
      expectError(await importChatGptExport(zip), "UNSUPPORTED_FORMAT");
    },
  );

  it("accepts an empty conversation list", async () => {
    expect(expectOk(await importChatGptExport(await exportZip([]))).conversations).toEqual([]);
  });
});

describe("importChatGptExport — size limits", () => {
  it("rejects files larger than maxZipBytes", async () => {
    const zip = await exportZip([makeConversation()]);
    expectError(await importChatGptExport(zip, { limits: { maxZipBytes: zip.length - 1 } }), "FILE_TOO_LARGE");
  });

  it("rejects conversations.json larger than maxJsonBytes", async () => {
    // Highly compressible content: small ZIP, larger uncompressed payload.
    const big = [makeConversation({ title: "x".repeat(10_000) })];
    const zip = await exportZip(big);
    expectError(await importChatGptExport(zip, { limits: { maxJsonBytes: 5_000 } }), "CONTENT_TOO_LARGE");
  });

  it("rejects archives with too many entries", async () => {
    const files: Record<string, string> = { "conversations.json": "[]" };
    for (let i = 0; i < 20; i++) files[`file-${i}.txt`] = "x";
    expectError(await importChatGptExport(await buildZip(files), { limits: { maxEntries: 10 } }), "TOO_MANY_ENTRIES");
  });
});

describe("parseConversations — conversation structure", () => {
  it("follows current_node through a branched (edited/regenerated) tree", () => {
    const mapping = makeMapping([
      { id: "root", parent: null, noMessage: true },
      { id: "u1", parent: "root", role: "user", content: text("Question") },
      { id: "a-old", parent: "u1", role: "assistant", content: text("First answer") },
      { id: "a-new", parent: "u1", role: "assistant", content: text("Regenerated answer") },
      { id: "u2", parent: "a-old", role: "user", content: text("Follow-up on first") },
    ]);
    const result = expectOk(parseConversations([makeConversation({ mapping, current_node: "a-new" })]));
    expect(result.conversations[0].messages.map((m) => m.id)).toEqual(["u1", "a-new"]);
  });

  it("falls back to the last-child branch when current_node is missing", () => {
    const mapping = makeMapping([
      { id: "root", parent: null, noMessage: true },
      { id: "u1", parent: "root" },
      { id: "a1", parent: "u1", role: "assistant" },
      { id: "a2", parent: "u1", role: "assistant" },
    ]);
    const result = expectOk(parseConversations([makeConversation({ mapping, current_node: undefined })]));
    expect(result.conversations[0].messages.map((m) => m.id)).toEqual(["u1", "a2"]);
    expect(result.warnings).toEqual([]);
  });

  it("falls back with a warning when current_node points to a missing node", () => {
    const result = expectOk(parseConversations([makeConversation({ current_node: "nope" })]));
    expect(result.conversations[0].messages.map((m) => m.id)).toEqual(["sys", "u1", "a1"]);
    expect(result.warnings[0].message).toMatch(/current_node/);
  });

  it("stops safely on cycles", () => {
    const mapping = makeMapping([
      { id: "a", parent: "b", children: ["b"] },
      { id: "b", parent: "a", children: ["a"] },
    ]);
    const result = expectOk(parseConversations([makeConversation({ mapping, current_node: "b" })]));
    expect(result.conversations[0].messages.map((m) => m.id)).toEqual(["a", "b"]);
    expect(result.warnings[0].message).toMatch(/Cycle/);
  });

  it("stops safely on dangling parent references", () => {
    const mapping = makeMapping([{ id: "u1", parent: "ghost" }]);
    const result = expectOk(parseConversations([makeConversation({ mapping, current_node: "u1" })]));
    expect(result.conversations[0].messages.map((m) => m.id)).toEqual(["u1"]);
    expect(result.warnings[0].message).toMatch(/missing node/);
  });

  it("handles missing title, ids, timestamps and mapping", () => {
    const result = expectOk(
      parseConversations([
        { title: "   ", mapping: null, create_time: null, update_time: "yesterday" },
        { mapping: "not-an-object" },
      ]),
    );
    expect(result.conversations).toHaveLength(2);
    for (const conv of result.conversations) {
      expect(conv.title).toBe("Untitled conversation");
      expect(conv.id).toMatch(/^unknown-\d$/);
      expect(conv.createTime).toBeNull();
      expect(conv.updateTime).toBeNull();
      expect(conv.model).toBeNull();
      expect(conv.messages).toEqual([]);
    }
    expect(result.warnings).toHaveLength(2);
  });

  it("falls back to `id` when conversation_id is missing", () => {
    const result = expectOk(parseConversations([makeConversation({ conversation_id: undefined, id: "only-id" })]));
    expect(result.conversations[0].id).toBe("only-id");
  });

  it("skips non-object entries with a warning but keeps valid ones", () => {
    const result = expectOk(parseConversations([null, 7, "x", makeConversation()]));
    expect(result.conversations.map((c) => c.id)).toEqual(["conv-1"]);
    expect(result.warnings.map((w) => w.index)).toEqual([0, 1, 2]);
  });

  it("tolerates messages with missing author, content and timestamps", () => {
    const mapping = {
      root: { id: "root", parent: null, children: ["m"], message: null },
      m: { id: "m", parent: "root", children: [], message: { id: "m" } },
    };
    const result = expectOk(parseConversations([makeConversation({ mapping, current_node: "m" })]));
    expect(result.conversations[0].messages).toEqual([
      { id: "m", role: "unknown", authorName: null, createTime: null, contentType: "missing", parts: [], hidden: false },
    ]);
  });

  it("sorts conversations by most recently updated", () => {
    const result = expectOk(
      parseConversations([
        makeConversation({ conversation_id: "old", update_time: 1_600_000_000 }),
        makeConversation({ conversation_id: "none", update_time: null, create_time: null }),
        makeConversation({ conversation_id: "new", update_time: 1_700_000_000 }),
      ]),
    );
    expect(result.conversations.map((c) => c.id)).toEqual(["new", "old", "none"]);
  });

  it("normalizes roles, including tool names and unknown roles", () => {
    const mapping = makeMapping([
      { id: "u", parent: null, role: "user" },
      { id: "t", parent: "u", role: "tool", authorName: "python" },
      { id: "x", parent: "t", role: "critic" },
    ]);
    const msgs = expectOk(parseConversations([makeConversation({ mapping, current_node: "x" })])).conversations[0]
      .messages;
    expect(msgs.map((m) => [m.role, m.authorName])).toEqual([
      ["user", null],
      ["tool", "python"],
      ["unknown", null],
    ]);
  });
});
