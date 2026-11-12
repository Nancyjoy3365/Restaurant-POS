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

// Takeaway versions of dishes are separate menu items named "… Takeaway".
export function isTakeawayItem(m: MenuItem): boolean {
  return /\btakeaway\b/i.test(m.variantGroup ?? m.name);
}

function menuBaseKey(m: MenuItem): string {
  return (m.variantGroup ?? m.name).replace(/\btakeaway\b/i, "").trim().toLowerCase();
}

export type MenuMode = "dine_in" | "takeaway";

// Dine-in hides the "… Takeaway" items; Takeaway shows those in place of
// their dine-in counterparts. Items with no takeaway version (sodas, water…)
// show in both. Purely a menu filter — the ticket's order type is unchanged.
export function filterMenuForMode(items: MenuItem[], allMenu: MenuItem[], mode: MenuMode): MenuItem[] {
  if (mode === "dine_in") return items.filter((m) => !isTakeawayItem(m));
  const takeawayBases = new Set(allMenu.filter(isTakeawayItem).map(menuBaseKey));
  return items.filter((m) => isTakeawayItem(m) || !takeawayBases.has(menuBaseKey(m)));
}
