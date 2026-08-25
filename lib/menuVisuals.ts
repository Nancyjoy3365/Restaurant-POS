import type { MenuCategory } from "./types";

export const CATEGORY_EMOJI: Record<MenuCategory, string> = {
  Starters: "🥟",
  Mains: "🍛",
  Grills: "🍢",
  Beverages: "🥤",
  Desserts: "🍰",
};

export const CATEGORY_GRADIENT: Record<MenuCategory, string> = {
  Starters: "from-amber-300 to-amber-500",
  Mains: "from-orange-300 to-orange-500",
  Grills: "from-rose-400 to-red-500",
  Beverages: "from-sky-300 to-cyan-500",
  Desserts: "from-pink-300 to-fuchsia-500",
};

export const CATEGORY_ICON_BG: Record<MenuCategory, string> = {
  Starters: "bg-amber-100 text-amber-700",
  Mains: "bg-orange-100 text-orange-700",
  Grills: "bg-rose-100 text-rose-700",
  Beverages: "bg-sky-100 text-sky-700",
  Desserts: "bg-pink-100 text-pink-700",
};
