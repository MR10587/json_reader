#!/usr/bin/env node
/**
 * Generates test-fixtures/chatgpt-large.zip for manual search/filter testing.
 *
 * The export is deterministic and entirely fictional. It includes missing
 * titles, undated conversations, and user-only/assistant-only conversations so
 * the Stage 3 filters can be exercised without using a real ChatGPT export.
 *
 * Usage: node scripts/generate-large-export.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "test-fixtures", "chatgpt-large.zip");
const COUNT = 2_500;
const T0 = 1_700_000_000; // 2023-11-14T22:13:20Z, in Unix seconds.
const FIXED_DATE = new Date("2025-01-01T00:00:00Z");

const text = (...parts) => ({ content_type: "text", parts });

function makeConversation(index) {
  const id = `large-conv-${index}`;
  const created = T0 + index * 3_600;
  const updated = created + 300 + (index % 500) * 15;
  const undated = index % 149 === 0;
  const title =
    index % 97 === 0
      ? ""
      : index % 250 === 0
        ? `Needle project ${index}`
        : `Synthetic conversation ${index}`;

  const roles =
    index % 11 === 0
      ? ["user"]
      : index % 13 === 0
        ? ["assistant"]
        : ["user", "assistant", "user", "assistant"];

  const nodes = [];
  let parent = `${id}-root`;

  // Hidden system node, as found at the start of many real exports.
  nodes.push({
    id: `${id}-system`,
    parent,
    role: "system",
    content: text(""),
    hidden: true,
    createTime: null,
  });
  parent = `${id}-system`;

  roles.forEach((role, messageIndex) => {
    const nodeId = `${id}-m${messageIndex}`;
    const mentionsNeedle = (index + messageIndex) % 333 === 0;
    const body = mentionsNeedle
      ? `This message mentions marmalade and needle ${index}.`
      : `${role === "user" ? "Question" : "Answer"} ${messageIndex} for conversation ${index}.`;

    nodes.push({
      id: nodeId,
      parent,
      role,
      content: text(body),
      hidden: false,
      createTime: created + 10 + messageIndex * 20 + 0.5,
    });
    parent = nodeId;
  });

  const mapping = {
    [`${id}-root`]: {
      id: `${id}-root`,
      parent: null,
      children: [`${id}-system`],
      message: null,
    },
  };

  nodes.forEach((node) => {
    const child = nodes.find((candidate) => candidate.parent === node.id);
    mapping[node.id] = {
      id: node.id,
      parent: node.parent,
      children: child ? [child.id] : [],
      message: {
        id: node.id,
        author: { role: node.role, name: null, metadata: {} },
        create_time: node.createTime,
        update_time: null,
        content: node.content,
        status: "finished_successfully",
        end_turn: null,
        weight: 1,
        metadata: node.hidden ? { is_visually_hidden_from_conversation: true } : {},
        recipient: "all",
      },
    };
  });

  return {
    title,
    create_time: undated ? null : created + 0.25,
    update_time: undated ? null : updated + 0.75,
    mapping,
    moderation_results: [],
    current_node: parent,
    plugin_ids: null,
    conversation_id: id,
    conversation_template_id: null,
    gizmo_id: null,
    is_archived: false,
    safe_urls: [],
    default_model_slug: index % 3 === 0 ? "gpt-4o" : "gpt-4o-mini",
    id,
  };
}

const conversations = Array.from({ length: COUNT }, (_, index) => makeConversation(index));

const zip = new JSZip();
zip.file("conversations.json", JSON.stringify(conversations), { date: FIXED_DATE });
zip.file("user.json", JSON.stringify({ id: "user-FAKE-LARGE" }), { date: FIXED_DATE });
zip.file("chat.html", "<html><body>Synthetic large export</body></html>", {
  date: FIXED_DATE,
});

const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, bytes);
console.log(`Wrote ${OUT} (${bytes.length} bytes, ${COUNT} conversations)`);
