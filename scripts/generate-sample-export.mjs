#!/usr/bin/env node
/**
 * Generates test-fixtures/chatgpt-sample.zip: a synthetic ChatGPT data export.
 *
 * All names, emails, companies and content are fictional. The structure
 * mirrors the publicly known export format (conversations.json with a
 * `mapping` message tree per conversation). Output is deterministic.
 *
 * Usage: node scripts/generate-sample-export.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "test-fixtures", "chatgpt-sample.zip");
const FIXED_DATE = new Date("2025-01-01T00:00:00Z");

// Base time: 2024-03-10T09:00:00Z, in Unix seconds (exports use fractional seconds).
const T0 = 1_710_061_200;

let idCounter = 0;
/** Deterministic UUID-shaped ids. */
function uuid(prefix = "0000") {
  idCounter += 1;
  return `${prefix}aaaa-bbbb-4ccc-8ddd-${String(idCounter).padStart(12, "0")}`;
}

const text = (...parts) => ({ content_type: "text", parts });

/**
 * Builds a conversation. `nodes` is a list of
 * { key, parent, role, content, t, name?, recipient?, hidden?, model? }
 * where `parent` refers to another key (or null for the first message).
 */
function conversation({ title, created, model, nodes, currentKey, extra = {} }) {
  const convId = uuid("c0nv");
  const ids = new Map([["root", uuid("r00t")]]);
  for (const n of nodes) ids.set(n.key, uuid("m5g0"));

  const mapping = {
    [ids.get("root")]: { id: ids.get("root"), message: null, parent: null, children: [] },
  };

  // Hidden system message, as seen at the start of many exported conversations.
  const all = [
    {
      key: "__system",
      parent: "root",
      role: "system",
      content: text(""),
      t: null,
      hidden: true,
    },
    ...nodes.map((n) => ({ ...n, parent: n.parent ?? "__system" })),
  ];
  ids.set("__system", uuid("5y5t"));

  for (const n of all) {
    const id = ids.get(n.key);
    const parentId = ids.get(n.parent);
    const isAssistant = n.role === "assistant";
    mapping[id] = {
      id,
      message: {
        id,
        author: { role: n.role, name: n.name ?? null, metadata: {} },
        create_time: n.t === null ? null : created + n.t + 0.123456,
        update_time: null,
        content: n.content,
        status: "finished_successfully",
        end_turn: isAssistant ? true : null,
        weight: n.role === "system" ? 0 : 1,
        metadata: {
          ...(n.hidden ? { is_visually_hidden_from_conversation: true } : {}),
          ...(isAssistant || n.role === "tool"
            ? { model_slug: n.model ?? model, default_model_slug: model, parent_id: parentId }
            : {}),
          ...(n.role === "user" ? { request_id: uuid("req0"), message_source: null } : {}),
        },
        recipient: n.recipient ?? "all",
        channel: null,
      },
      parent: parentId,
      children: [],
    };
    mapping[parentId].children.push(id);
  }

  const lastT = Math.max(...nodes.map((n) => n.t ?? 0));
  return {
    title,
    create_time: created + 0.654321,
    update_time: created + lastT + 30.5,
    mapping,
    moderation_results: [],
    current_node: ids.get(currentKey),
    plugin_ids: null,
    conversation_id: convId,
    conversation_template_id: null,
    gizmo_id: null,
    gizmo_type: null,
    is_archived: false,
    is_starred: null,
    safe_urls: [],
    blocked_urls: [],
    default_model_slug: model,
    conversation_origin: null,
    voice: null,
    async_status: null,
    disabled_tool_ids: [],
    id: convId,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// 1. Code: markdown code blocks + a code-interpreter run (code / execution_output)
const csvCode = [
  "import csv",
  "",
  "def load_orders(path):",
  '    with open(path, newline="", encoding="utf-8") as f:',
  "        reader = csv.DictReader(f)",
  '        return [row for row in reader if row["quantity"].strip()]',
].join("\n");

const codeConversation = conversation({
  title: "Fix CSV parser skipping rows",
  created: T0,
  model: "gpt-4o",
  nodes: [
    {
      key: "u1",
      role: "user",
      t: 0,
      content: text(
        "My script reads orders.csv but some rows disappear. Here's the code:\n\n```python\nimport csv\n\ndef load_orders(path):\n    with open(path) as f:\n        return [row for row in csv.reader(f) if row[2]]\n```",
      ),
    },
    {
      key: "a1",
      parent: "u1",
      role: "assistant",
      t: 8,
      content: text(
        `Two things are likely going on:\n\n1. Rows with an empty third column are filtered out by \`if row[2]\`.\n2. Without \`newline=""\`, quoted fields containing line breaks can be split.\n\nHere's a safer version using \`DictReader\`:\n\n\`\`\`python\n${csvCode}\n\`\`\`\n\nWant me to test it against a sample file?`,
      ),
    },
    { key: "u2", parent: "a1", role: "user", t: 60, content: text("Yes please, use a tiny made-up file.") },
    {
      key: "a2",
      parent: "u2",
      role: "assistant",
      t: 65,
      recipient: "python",
      content: {
        content_type: "code",
        language: "unknown",
        text: `rows = "order_id,item,quantity\\n1001,Blue mug,2\\n1002,\\"Tea, green\\",\\n1003,Notebook,5\\n"\nopen("orders.csv", "w").write(rows)\n\n${csvCode}\n\nprint(load_orders("orders.csv"))`,
      },
    },
    {
      key: "t1",
      parent: "a2",
      role: "tool",
      name: "python",
      t: 67,
      content: {
        content_type: "execution_output",
        text: "[{'order_id': '1001', 'item': 'Blue mug', 'quantity': '2'}, {'order_id': '1003', 'item': 'Notebook', 'quantity': '5'}]",
      },
    },
    {
      key: "a3",
      parent: "t1",
      role: "assistant",
      t: 70,
      content: text(
        'It works: row 1002 is skipped because its quantity is empty, and the quoted `"Tea, green"` value is kept intact. If you\'d rather keep rows with no quantity, remove the `if` filter and default it to `"0"`:\n\n```python\nrow["quantity"] = row["quantity"].strip() or "0"\n```',
      ),
    },
  ],
  currentKey: "a3",
});

// ---------------------------------------------------------------------------
// 2. Branches: an edited user message AND a regenerated assistant answer.
const branchConversation = conversation({
  title: "Weekend trip ideas",
  created: T0 + 86_400 * 2,
  model: "gpt-4o",
  nodes: [
    { key: "u1", role: "user", t: 0, content: text("Suggest a 2-day itinerary for a small coastal town.") },
    {
      key: "a1",
      parent: "u1",
      role: "assistant",
      t: 6,
      content: text(
        "**Day 1:** Harbour walk, lunch at a seafood stall, lighthouse at sunset.\n\n**Day 2:** Morning kayak tour, local market, cliffside picnic.",
      ),
    },
    // Original follow-up (older branch)
    { key: "u2-original", parent: "a1", role: "user", t: 40, content: text("Can you make it cheaper?") },
    {
      key: "a2-original",
      parent: "u2-original",
      role: "assistant",
      t: 45,
      content: text("Swap the kayak tour for a free coastal trail and pack your own picnic."),
    },
    // Edited follow-up (newer branch)
    {
      key: "u2-edited",
      parent: "a1",
      role: "user",
      t: 90,
      content: text("Can you make it cheaper and suitable for a rainy weekend?"),
    },
    {
      key: "a2-first",
      parent: "u2-edited",
      role: "assistant",
      t: 95,
      content: text("For rain on a budget: the free maritime museum, a café crawl and a covered market."),
    },
    // Regenerated answer to the edited message (selected branch)
    {
      key: "a2-regenerated",
      parent: "u2-edited",
      role: "assistant",
      t: 130,
      content: text(
        "Rainy-day budget plan:\n\n- **Day 1:** Free maritime museum, then soup at the harbour café.\n- **Day 2:** Library reading room, covered market for lunch, a short walk if it clears.",
      ),
    },
    { key: "u3", parent: "a2-regenerated", role: "user", t: 200, content: text("Perfect, thanks!") },
    {
      key: "a3",
      parent: "u3",
      role: "assistant",
      t: 203,
      content: text("Enjoy the trip! Pack a light rain jacket just in case."),
    },
  ],
  currentKey: "a3",
});

// ---------------------------------------------------------------------------
// 3. Recipe, with an image upload (multimodal_text)
const recipeConversation = conversation({
  title: "Weeknight lentil soup",
  created: T0 + 86_400 * 5,
  model: "gpt-4o",
  nodes: [
    {
      key: "u1",
      role: "user",
      t: 0,
      content: {
        content_type: "multimodal_text",
        parts: [
          {
            content_type: "image_asset_pointer",
            asset_pointer: "file-service://file-FAKE0000000000000001",
            size_bytes: 184_233,
            width: 1024,
            height: 768,
            fovea: null,
            metadata: null,
          },
          "This is what's in my pantry. What soup can I make in 30 minutes?",
        ],
      },
    },
    {
      key: "a1",
      parent: "u1",
      role: "assistant",
      t: 9,
      content: text(
        "You have everything for a red lentil soup:\n\n1. Sauté onion, carrot and garlic for 5 minutes.\n2. Add 1 cup red lentils, 1 tsp cumin and 4 cups stock.\n3. Simmer 20 minutes, then blend half and add lemon juice.",
      ),
    },
    { key: "u2", parent: "a1", role: "user", t: 70, content: text("Can I freeze leftovers?") },
    {
      key: "a2",
      parent: "u2",
      role: "assistant",
      t: 74,
      content: text("Yes. Cool it fully, freeze in portions for up to 3 months, and add a splash of water when reheating."),
    },
  ],
  currentKey: "a2",
});

// ---------------------------------------------------------------------------
// 4. Writing help (fictional person and company)
const coverLetterConversation = conversation({
  title: "Cover letter for bakery manager role",
  created: T0 + 86_400 * 9,
  model: "gpt-4o-mini",
  nodes: [
    {
      key: "u1",
      role: "user",
      t: 0,
      content: text(
        "Help me write a short cover letter. I'm Jordan Example, 4 years as shift lead at a café, applying to be assistant manager at Northwind Bakery Co.",
      ),
    },
    {
      key: "a1",
      parent: "u1",
      role: "assistant",
      t: 7,
      content: text(
        "Dear Hiring Team at Northwind Bakery Co.,\n\nI'm excited to apply for the Assistant Manager role. Over four years as a shift lead, I've trained new staff, managed opening and closing, and cut weekly waste by planning bakes around sales trends.\n\nI'd love to bring that same care to Northwind.\n\nSincerely,\nJordan Example",
      ),
    },
    { key: "u2", parent: "a1", role: "user", t: 50, content: text("Make it a bit warmer and mention I love sourdough.") },
    {
      key: "a2",
      parent: "u2",
      role: "assistant",
      t: 55,
      content: text(
        "Dear Northwind Bakery Team,\n\nI've admired your sourdough for years, and baking it at home has become my favourite weekend ritual. I'd be thrilled to join you as Assistant Manager, bringing four years of shift-lead experience and a genuine love for the craft.\n\nWarm regards,\nJordan Example",
      ),
    },
  ],
  currentKey: "a2",
});

// ---------------------------------------------------------------------------
// 5. Explanation with reasoning content types (thoughts / reasoning_recap)
const reasoningConversation = conversation({
  title: "How does a TCP handshake work?",
  created: T0 + 86_400 * 14,
  model: "o3-mini",
  nodes: [
    { key: "u1", role: "user", t: 0, content: text("Explain the TCP three-way handshake simply.") },
    {
      key: "th",
      parent: "u1",
      role: "assistant",
      t: 2,
      content: {
        content_type: "thoughts",
        thoughts: [
          {
            summary: "Choosing an analogy",
            content: "A phone-call analogy maps cleanly onto SYN, SYN-ACK and ACK.",
            finished: true,
          },
        ],
        source_analysis_msg_id: "fake-analysis-0001",
      },
    },
    {
      key: "rr",
      parent: "th",
      role: "assistant",
      t: 4,
      content: { content_type: "reasoning_recap", content: "Thought for 4 seconds" },
    },
    {
      key: "a1",
      parent: "rr",
      role: "assistant",
      t: 5,
      content: text(
        "Think of it like starting a phone call:\n\n1. **SYN:** the client says \"Can you hear me?\"\n2. **SYN-ACK:** the server replies \"Yes, can you hear me?\"\n3. **ACK:** the client says \"Yes!\" and the conversation begins.\n\nEach side also picks a starting sequence number so data can be ordered and acknowledged.",
      ),
    },
    { key: "u2", parent: "a1", role: "user", t: 40, content: text("And how does the connection close?") },
    {
      key: "a2",
      parent: "u2",
      role: "assistant",
      t: 44,
      content: text(
        "With a four-step goodbye: each side sends **FIN** and the other replies **ACK**, so both directions close independently.",
      ),
    },
  ],
  currentKey: "a2",
});

// ---------------------------------------------------------------------------
// 6. Archived conversation, short, with a different model
const archivedConversation = conversation({
  title: "Name ideas for a houseplant",
  created: T0 + 86_400 * 20,
  model: "gpt-4o-mini",
  extra: { is_archived: true },
  nodes: [
    { key: "u1", role: "user", t: 0, content: text("Give me 3 funny names for a fern.") },
    { key: "a1", parent: "u1", role: "assistant", t: 3, content: text("1. Fernando\n2. Fern Gully Jr.\n3. Sir Leafs-a-Lot") },
    { key: "u2", parent: "a1", role: "user", t: 20, content: text("Fernando it is.") },
    { key: "a2", parent: "u2", role: "assistant", t: 22, content: text("Great choice. Fernando thrives in indirect light!") },
  ],
  currentKey: "a2",
});

// Exports list the most recently updated conversation first.
const conversations = [
  archivedConversation,
  reasoningConversation,
  coverLetterConversation,
  recipeConversation,
  branchConversation,
  codeConversation,
];

const user = {
  id: "user-FAKE00000000000000000000",
  email: "jordan.example@example.com",
  chatgpt_plus_user: false,
  phone_number: null,
};

const zip = new JSZip();
const add = (name, content) => zip.file(name, content, { date: FIXED_DATE });
add("conversations.json", JSON.stringify(conversations, null, 2));
add("user.json", JSON.stringify(user, null, 2));
add("message_feedback.json", "[]");
add("shared_conversations.json", "[]");
add(
  "chat.html",
  "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>ChatGPT Data Export (synthetic)</title></head><body><p>Synthetic test export. All content is fictional.</p></body></html>",
);

const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, bytes);
console.log(`Wrote ${OUT} (${bytes.length} bytes, ${conversations.length} conversations)`);
