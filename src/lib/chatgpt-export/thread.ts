import { asString, isObject, type RawObject } from "./guards";

/**
 * A conversation's `mapping` is a tree of nodes keyed by id. Each node has
 * `parent` (id or null), `children` (ids) and `message` (object or null).
 * Edits and regenerations create sibling branches; `current_node` points to
 * the leaf of the branch the user last viewed.
 */

export interface ThreadResult {
  /** Nodes on the selected branch, root first. */
  nodes: RawObject[];
  notes: string[];
}

function parentId(node: RawObject): string | null {
  return asString(node.parent);
}

function childIds(node: RawObject): string[] {
  return Array.isArray(node.children)
    ? node.children.filter((c): c is string => typeof c === "string")
    : [];
}

/** Walks from `leafId` up through parents, guarding against cycles and dangling ids. */
function walkUp(mapping: RawObject, leafId: string, notes: string[]): RawObject[] {
  const path: RawObject[] = [];
  const seen = new Set<string>();
  let id: string | null = leafId;
  while (id !== null) {
    if (seen.has(id)) {
      notes.push("Cycle detected in message tree; thread was truncated.");
      break;
    }
    seen.add(id);
    const node = mapping[id];
    if (!isObject(node)) {
      if (path.length > 0) notes.push(`Message tree references missing node "${id}".`);
      break;
    }
    path.push(node);
    id = parentId(node);
  }
  return path.reverse();
}

/** Fallback leaf when `current_node` is missing: follow the last child from a root. */
function findFallbackLeaf(mapping: RawObject): string | null {
  const ids = Object.keys(mapping).filter((id) => isObject(mapping[id]));
  if (ids.length === 0) return null;

  const root =
    ids.find((id) => {
      const p = parentId(mapping[id] as RawObject);
      return p === null || !isObject(mapping[p]);
    }) ?? ids[0];

  const seen = new Set<string>();
  let current = root;
  for (;;) {
    seen.add(current);
    const children = childIds(mapping[current] as RawObject).filter(
      (c) => isObject(mapping[c]) && !seen.has(c),
    );
    const next = children[children.length - 1];
    if (next === undefined) return current;
    current = next;
  }
}

export function linearizeThread(mapping: unknown, currentNode: unknown): ThreadResult {
  const notes: string[] = [];
  if (!isObject(mapping)) {
    notes.push("Conversation has no message mapping.");
    return { nodes: [], notes };
  }

  let leaf = asString(currentNode);
  if (leaf === null || !isObject(mapping[leaf])) {
    if (leaf !== null) notes.push("current_node does not exist in mapping; using fallback branch.");
    leaf = findFallbackLeaf(mapping);
  }
  if (leaf === null) return { nodes: [], notes };

  return { nodes: walkUp(mapping, leaf, notes), notes };
}
