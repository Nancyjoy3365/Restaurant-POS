import type {
  MenuItem,
  Ingredient,
  Vendor,
  Recipe,
  StaffMember,
  ShiftEntry,
  TicketOrder,
  Ticket,
} from "./types";

// Demo-grade shared PIN, same for every account (not real auth). A manager
// settings screen to change this is a reasonable follow-up if ever needed.
export const STAFF_PIN = "123";

// Ids use an "mn" prefix (rather than continuing the old "m1".."m35") so
// they can never collide with a menu item id an existing browser's
// persisted state might still reference from the previous menu.
export const seedMenu: MenuItem[] = [
  // Main
  { id: "mn1", name: "Fish (Dry)", aliases: ["fish"], category: "Main", price: 350, veg: false, available: true, variantGroup: "Fish", variantLabel: "Dry", spiceLevels: ["Mild", "Normal", "Hot"] },
  { id: "mn2", name: "Fish (Wet)", aliases: ["fish"], category: "Main", price: 350, veg: false, available: true, variantGroup: "Fish", variantLabel: "Wet", spiceLevels: ["Mild", "Normal", "Hot"] },
  { id: "mn3", name: "Fish (Boiled)", aliases: ["fish"], category: "Main", price: 400, veg: false, available: true, variantGroup: "Fish", variantLabel: "Boiled", spiceLevels: ["Mild", "Normal", "Hot"] },
  { id: "mn4", name: "Fish (Wet Special)", aliases: ["fish"], category: "Main", price: 400, veg: false, available: true, variantGroup: "Fish", variantLabel: "Wet Special", spiceLevels: ["Mild", "Normal", "Hot"] },
  { id: "mn5", name: "Fish (Dry Special)", aliases: ["fish"], category: "Main", price: 450, veg: false, available: true, variantGroup: "Fish", variantLabel: "Dry Special", spiceLevels: ["Mild", "Normal", "Hot"] },
  { id: "mn6", name: "Fish (Coconut)", aliases: ["fish", "coconut fish"], category: "Main", price: 500, veg: false, available: true, variantGroup: "Fish", variantLabel: "Coconut", spiceLevels: ["Mild", "Normal", "Hot"] },
  { id: "mn7", name: "Ugali (White)", aliases: ["ugali"], category: "Main", price: 50, veg: true, available: true, variantGroup: "Ugali", variantLabel: "White" },
  { id: "mn8", name: "Ugali (Brown)", aliases: ["ugali"], category: "Main", price: 100, veg: true, available: true, variantGroup: "Ugali", variantLabel: "Brown" },
  { id: "mn9", name: "Chips (Fries)", aliases: ["chips", "fries"], category: "Main", price: 150, veg: true, available: true, variantGroup: "Chips", variantLabel: "Fries" },
  { id: "mn10", name: "Chips (Masala)", aliases: ["chips", "masala chips"], category: "Main", price: 200, veg: true, available: true, variantGroup: "Chips", variantLabel: "Masala" },
  { id: "mn11", name: "Saute", aliases: ["saute chips"], category: "Main", price: 200, veg: true, available: true, variantGroup: "Chips", variantLabel: "Saute" },
  { id: "mn12", name: "Ugali Mayai (Eggs)", aliases: ["ugali mayai", "mayai"], category: "Main", price: 250, veg: true, available: true },

  // Extra
  { id: "mn13", name: "Kienyeji Greens (Half)", aliases: ["kienyeji", "greens", "sukuma"], category: "Extra", price: 50, veg: true, available: true, variantGroup: "Kienyeji Greens", variantLabel: "Half" },
  { id: "mn14", name: "Kienyeji Greens (Full)", aliases: ["kienyeji", "greens", "sukuma"], category: "Extra", price: 100, veg: true, available: true, variantGroup: "Kienyeji Greens", variantLabel: "Full" },
  { id: "mn15", name: "Kachumbari", aliases: ["salad", "kachumbari"], category: "Extra", price: 50, veg: true, available: true },

  // Drinks
  { id: "mn16", name: "Soda (300 ml)", aliases: ["soda", "coke", "fanta", "sprite"], category: "Drinks", price: 80, veg: true, available: true, variantGroup: "Soda", variantLabel: "300 ml" },
  { id: "mn17", name: "Soda (500 ml)", aliases: ["soda", "coke", "fanta", "sprite"], category: "Drinks", price: 100, veg: true, available: true, variantGroup: "Soda", variantLabel: "500 ml" },
  { id: "mn18", name: "Soda (1.25l)", aliases: ["soda", "coke", "fanta", "sprite"], category: "Drinks", price: 200, veg: true, available: true, variantGroup: "Soda", variantLabel: "1.25l" },
  { id: "mn19", name: "Minute Maid (400 ml)", aliases: ["minute maid"], category: "Drinks", price: 100, veg: true, available: true, variantGroup: "Minute Maid", variantLabel: "400 ml" },
  { id: "mn20", name: "Minute Maid (1l)", aliases: ["minute maid"], category: "Drinks", price: 200, veg: true, available: true, variantGroup: "Minute Maid", variantLabel: "1l" },

  // Water
  { id: "mn21", name: "Keringet Water (1l)", aliases: ["keringet", "water"], category: "Water", price: 150, veg: true, available: true },
  { id: "mn22", name: "Dasani Water (500 ml)", aliases: ["dasani", "water"], category: "Water", price: 60, veg: true, available: true, variantGroup: "Dasani Water", variantLabel: "500 ml" },
  { id: "mn23", name: "Dasani Water (1l)", aliases: ["dasani", "water"], category: "Water", price: 100, veg: true, available: true, variantGroup: "Dasani Water", variantLabel: "1l" },
  { id: "mn24", name: "Water (500 ml)", aliases: ["water"], category: "Water", price: 50, veg: true, available: true, variantGroup: "Water", variantLabel: "500 ml" },
  { id: "mn25", name: "Water (1l)", aliases: ["water"], category: "Water", price: 80, veg: true, available: true, variantGroup: "Water", variantLabel: "1l" },

  // Juice
  { id: "mn26", name: "Passion (Inhouse)", aliases: ["passion", "passion juice"], category: "Juice", price: 100, veg: true, available: true, variantGroup: "Passion", variantLabel: "Inhouse" },
  { id: "mn27", name: "Passion (Take away)", aliases: ["passion", "passion juice"], category: "Juice", price: 150, veg: true, available: true, variantGroup: "Passion", variantLabel: "Take away" },
  { id: "mn28", name: "Hibiscus (Inhouse)", aliases: ["hibiscus"], category: "Juice", price: 100, veg: true, available: true, variantGroup: "Hibiscus", variantLabel: "Inhouse" },
  { id: "mn29", name: "Hibiscus (Take away)", aliases: ["hibiscus"], category: "Juice", price: 150, veg: true, available: true, variantGroup: "Hibiscus", variantLabel: "Take away" },
  { id: "mn30", name: "Tamarind (Inhouse)", aliases: ["tamarind"], category: "Juice", price: 100, veg: true, available: true, variantGroup: "Tamarind", variantLabel: "Inhouse" },
  { id: "mn31", name: "Tamarind (Take away)", aliases: ["tamarind"], category: "Juice", price: 150, veg: true, available: true, variantGroup: "Tamarind", variantLabel: "Take away" },
  { id: "mn32", name: "Sugar cane (Inhouse)", aliases: ["sugarcane"], category: "Juice", price: 150, veg: true, available: true, variantGroup: "Sugar cane", variantLabel: "Inhouse" },
  { id: "mn33", name: "Sugar cane (Take away)", aliases: ["sugarcane"], category: "Juice", price: 200, veg: true, available: true, variantGroup: "Sugar cane", variantLabel: "Take away" },

  // Packaging
  { id: "mn34", name: "Container (Small)", aliases: ["container", "packaging"], category: "Packaging", price: 20, veg: true, available: true, variantGroup: "Container", variantLabel: "Small" },
  { id: "mn35", name: "Container (Large)", aliases: ["container", "packaging"], category: "Packaging", price: 50, veg: true, available: true, variantGroup: "Container", variantLabel: "Large" },
  { id: "mn36", name: "Khaki (Small)", aliases: ["khaki", "packaging"], category: "Packaging", price: 20, veg: true, available: true, variantGroup: "Khaki", variantLabel: "Small" },
  { id: "mn37", name: "Khaki (Large)", aliases: ["khaki", "packaging"], category: "Packaging", price: 50, veg: true, available: true, variantGroup: "Khaki", variantLabel: "Large" },
];

// Demo stock/vendor rows were only ever placeholders — the real inventory
// gets entered through the Inventory page's own Add Item / Add Vendor forms.
export const seedIngredients: Ingredient[] = [];

export const seedVendors: Vendor[] = [];

// Ids the old demo seed used to use, kept only so migrate() in store.ts can
// recognize and drop them from a browser that persisted them before this
// data was cleared — a manually added ingredient/vendor never gets one of
// these ids, so this can't accidentally delete real data.
export const RETIRED_SEED_INGREDIENT_IDS = new Set([
  "i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10",
]);
export const RETIRED_SEED_VENDOR_IDS = new Set(["v1", "v2", "v3", "v4", "v5"]);

// No recipe-costing data was supplied for the new menu, and the old recipes
// pointed at dishes that no longer exist — starting empty avoids showing
// "Unknown dish" rows in Inventory's Recipe Costing tab.
export const seedRecipes: Recipe[] = [];

// Pay Type / Rate: the four Admin/Cashier staff are paid monthly with no
// rate supplied yet (still a placeholder 0); everyone else is paid a daily
// rate of KES 500, per the roster.
// Ids use an "st" prefix (rather than continuing "s1".."s9") so they can
// never collide with a staff id an existing browser's persisted tickets
// might still reference from the old placeholder roster.
export const seedStaff: StaffMember[] = [
  { id: "st1", name: "Linda O.", role: "Admin", payType: "monthly", rate: 0, phone: "0723021511" },
  { id: "st2", name: "Halima. K", role: "Admin", title: "Admin CX", payType: "monthly", rate: 0, phone: "0723303712" },
  { id: "st3", name: "Hadija. K", role: "Admin", title: "Admin Chef", payType: "monthly", rate: 0, phone: "0748360567" },
  { id: "st4", name: "Nancy Obuya", role: "Cashier", payType: "monthly", rate: 0, phone: "0702491234" },
  { id: "st5", name: "Innocent Bakabwa", role: "Chef", payType: "daily", rate: 500, phone: "0707792054" },
  { id: "st6", name: "Idah Nyakio", role: "Waiter", payType: "daily", rate: 500, phone: "0716221718" },
  { id: "st7", name: "Loise Wairimu", role: "Waiter", payType: "daily", rate: 500, phone: "0705670040" },
  { id: "st8", name: "Collins Odhiambo", role: "Waiter", payType: "daily", rate: 500, phone: "0725750785" },
  { id: "st9", name: "Sylvia Muthike", role: "Kitchen Assistant", payType: "daily", rate: 500, phone: "0715703928" },
  { id: "st10", name: "Robin Lukaku", role: "Kitchen Assistant", payType: "daily", rate: 500, phone: "0704046663" },
  { id: "st11", name: "Ephy Anyango", role: "Kitchen Assistant", payType: "daily", rate: 500, phone: "0710474882" },
];

// No demo shift/ticket/order history is seeded against this real roster —
// the previous placeholder staff's ids are gone, and there's no ticket/shift
// data to remap onto the new roster, so the app just starts with an empty
// queue that staff populate normally through the UI.
export const seedShifts: ShiftEntry[] = [];

export const seedTickets: Ticket[] = [];

export const seedOrders: Record<string, TicketOrder> = {};
