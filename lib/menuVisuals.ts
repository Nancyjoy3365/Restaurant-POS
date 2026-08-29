import type { MenuCategory } from "./types";

export const CATEGORY_EMOJI: Record<MenuCategory, string> = {
  Main: "🍽️",
  Extra: "🥗",
  Drinks: "🥤",
  Water: "💧",
  Juice: "🧃",
  Packaging: "📦",
};

export const CATEGORY_GRADIENT: Record<MenuCategory, string> = {
  Main: "from-orange-300 to-orange-500",
  Extra: "from-emerald-300 to-emerald-500",
  Drinks: "from-sky-300 to-cyan-500",
  Water: "from-blue-300 to-blue-500",
  Juice: "from-pink-300 to-fuchsia-500",
  Packaging: "from-slate-300 to-slate-500",
};

export const CATEGORY_ICON_BG: Record<MenuCategory, string> = {
  Main: "bg-orange-100 text-orange-700",
  Extra: "bg-emerald-100 text-emerald-700",
  Drinks: "bg-sky-100 text-sky-700",
  Water: "bg-blue-100 text-blue-700",
  Juice: "bg-pink-100 text-pink-700",
  Packaging: "bg-slate-100 text-slate-700",
};
