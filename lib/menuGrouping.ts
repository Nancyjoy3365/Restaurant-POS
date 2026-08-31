import type { MenuItem } from "./types";

export type MenuGridEntry =
  | { kind: "single"; item: MenuItem }
  | { kind: "group"; groupName: string; variants: MenuItem[] };

// Collapses variants sharing the same variantGroup (e.g. every "Fish"
// preparation) into one grid entry, in first-seen order. Items with no
// variantGroup pass through unchanged — this only ever affects the
// waiter-facing browsing grid, never Menu Management or search results.
export function groupMenuItems(items: MenuItem[]): MenuGridEntry[] {
  const seenGroups = new Set<string>();
  const entries: MenuGridEntry[] = [];
  for (const item of items) {
    if (item.variantGroup) {
      if (seenGroups.has(item.variantGroup)) continue;
      seenGroups.add(item.variantGroup);
      const variants = items.filter((i) => i.variantGroup === item.variantGroup);
      entries.push({ kind: "group", groupName: item.variantGroup, variants });
    } else {
      entries.push({ kind: "single", item });
    }
  }
  return entries;
}
