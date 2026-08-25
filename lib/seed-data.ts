import type {
  RestaurantTable,
  MenuItem,
  Ingredient,
  Vendor,
  Recipe,
  StaffMember,
  ShiftEntry,
  StaffRole,
  TableOrder,
  TableSession,
  OrderLineItem,
} from "./types";

export const SECTIONS = ["Patio", "Main Hall", "Bar"] as const;

// Demo-grade shared passwords, one per role — same security level as the
// old 4-digit PIN (not real auth). A manager settings screen to change
// these is a reasonable follow-up if ever needed.
export const seedRolePasswords: Record<StaffRole, string> = {
  Waiter: "waiter123",
  "Bar Staff": "bar123",
  Chef: "chef123",
  Manager: "manager123",
  Cashier: "cashier123",
};

export const seedTables: RestaurantTable[] = [
  { id: "t1", number: 1, seats: 2, section: "Patio", status: "free" },
  { id: "t2", number: 2, seats: 4, section: "Patio", status: "occupied" },
  { id: "t3", number: 3, seats: 4, section: "Patio", status: "free" },
  { id: "t4", number: 4, seats: 6, section: "Patio", status: "reserved" },
  { id: "t5", number: 5, seats: 2, section: "Main Hall", status: "free" },
  { id: "t6", number: 6, seats: 4, section: "Main Hall", status: "needs-bill" },
  { id: "t7", number: 7, seats: 4, section: "Main Hall", status: "free" },
  { id: "t8", number: 8, seats: 8, section: "Main Hall", status: "occupied" },
  { id: "t9", number: 9, seats: 2, section: "Main Hall", status: "free" },
  { id: "t10", number: 10, seats: 4, section: "Main Hall", status: "free" },
  { id: "t11", number: 11, seats: 2, section: "Bar", status: "occupied" },
  { id: "t12", number: 12, seats: 2, section: "Bar", status: "free" },
  { id: "t13", number: 13, seats: 4, section: "Bar", status: "reserved" },
  { id: "t14", number: 14, seats: 6, section: "Bar", status: "free" },
];

export const seedMenu: MenuItem[] = [
  // Starters
  {
    id: "m1",
    name: "Samosa (3pc)",
    aliases: ["samos", "sambusa"],
    category: "Starters",
    price: 300,
    veg: false,
    available: true,
    addOns: [{ name: "Extra chili sauce", price: 0 }],
  },
  {
    id: "m2",
    name: "Vegetable Spring Rolls",
    aliases: ["spring roll", "veggie rolls"],
    category: "Starters",
    price: 350,
    veg: true,
    available: true,
  },
  {
    id: "m3",
    name: "Chicken Wings",
    aliases: ["wings", "kuku wings"],
    category: "Starters",
    price: 600,
    veg: false,
    available: true,
    spiceLevels: ["Mild", "Medium", "Hot"],
  },
  {
    id: "m4",
    name: "Bhajia",
    aliases: ["potato bhajia", "crisps"],
    category: "Starters",
    price: 250,
    veg: true,
    available: true,
  },
  {
    id: "m5",
    name: "Kachumbari Salad",
    aliases: ["salad", "kachumbari"],
    category: "Starters",
    price: 200,
    veg: true,
    available: true,
  },
  // Mains
  {
    id: "m6",
    name: "Ugali with Sukuma & Beef Stew",
    aliases: ["ugali", "ugali sukuma", "ugali beef"],
    category: "Mains",
    price: 550,
    veg: false,
    available: true,
  },
  {
    id: "m7",
    name: "Pilau",
    aliases: ["pilau rice", "spiced rice"],
    category: "Mains",
    price: 500,
    veg: false,
    available: true,
  },
  {
    id: "m8",
    name: "Chapati & Beans",
    aliases: ["chapo", "chapo beans"],
    category: "Mains",
    price: 400,
    veg: true,
    available: true,
  },
  {
    id: "m9",
    name: "Beef Biryani",
    aliases: ["biryani", "biriani"],
    category: "Mains",
    price: 650,
    veg: false,
    available: true,
    spiceLevels: ["Mild", "Medium", "Hot"],
  },
  {
    id: "m10",
    name: "Vegetable Curry & Rice",
    aliases: ["veg curry", "curry rice"],
    category: "Mains",
    price: 450,
    veg: true,
    available: true,
  },
  {
    id: "m11",
    name: "Grilled Tilapia & Ugali",
    aliases: ["fish", "tilapia", "samaki"],
    category: "Mains",
    price: 750,
    veg: false,
    available: true,
  },
  // Grills
  {
    id: "m12",
    name: "Nyama Choma (Goat, 1kg)",
    aliases: ["nyama choma", "goat meat", "choma"],
    category: "Grills",
    price: 1800,
    veg: false,
    available: true,
  },
  {
    id: "m13",
    name: "Grilled Chicken Half",
    aliases: ["chicken", "kuku choma"],
    category: "Grills",
    price: 700,
    veg: false,
    available: true,
    spiceLevels: ["Mild", "Medium", "Hot"],
  },
  {
    id: "m14",
    name: "Mixed Grill Platter",
    aliases: ["mixed grill", "platter", "grill combo"],
    category: "Grills",
    price: 2200,
    veg: false,
    available: true,
    comboTag: "Combo",
    comboComponents: [
      { name: "Grilled Chicken", qty: "1/2 chicken" },
      { name: "Beef Sausages", qty: "4 pieces" },
      { name: "Grilled Ribs", qty: "300g" },
      { name: "Kachumbari", qty: "1 serving" },
      { name: "Ugali", qty: "2 servings" },
    ],
  },
  {
    id: "m15",
    name: "Grilled Pork Chops",
    aliases: ["pork", "pork chops"],
    category: "Grills",
    price: 900,
    veg: false,
    available: true,
  },
  // Beverages
  {
    id: "m16",
    name: "Tusker Lager",
    aliases: ["tusker", "beer"],
    category: "Beverages",
    price: 300,
    veg: true,
    available: true,
  },
  {
    id: "m17",
    name: "Fresh Passion Juice",
    aliases: ["passion juice", "juice"],
    category: "Beverages",
    price: 250,
    veg: true,
    available: true,
  },
  {
    id: "m18",
    name: "Dawa Cocktail",
    aliases: ["dawa", "cocktail"],
    category: "Beverages",
    price: 550,
    veg: true,
    available: true,
  },
  {
    id: "m19",
    name: "Kenyan Coffee",
    aliases: ["coffee", "kahawa"],
    category: "Beverages",
    price: 200,
    veg: true,
    available: true,
  },
  {
    id: "m20",
    name: "Soda (350ml)",
    aliases: ["soda", "coke", "fanta", "sprite"],
    category: "Beverages",
    price: 150,
    veg: true,
    available: true,
  },
  {
    id: "m21",
    name: "Mineral Water",
    aliases: ["water"],
    category: "Beverages",
    price: 150,
    veg: true,
    available: true,
  },
  // Desserts
  {
    id: "m22",
    name: "Mandazi (3pc)",
    aliases: ["mandazi", "donut"],
    category: "Desserts",
    price: 200,
    veg: true,
    available: true,
  },
  {
    id: "m23",
    name: "Chocolate Fudge Cake",
    aliases: ["cake", "chocolate cake"],
    category: "Desserts",
    price: 400,
    veg: true,
    available: true,
  },
  {
    id: "m24",
    name: "Vanilla Ice Cream",
    aliases: ["ice cream"],
    category: "Desserts",
    price: 300,
    veg: true,
    available: true,
  },
  {
    id: "m25",
    name: "Fruit Salad",
    aliases: ["fruits", "fruit"],
    category: "Desserts",
    price: 300,
    veg: true,
    available: true,
  },
  // Additional Starters
  {
    id: "m26",
    name: "Beef Mishkaki Skewers",
    aliases: ["mishkaki", "skewers", "beef skewers"],
    category: "Starters",
    price: 450,
    veg: false,
    available: true,
  },
  {
    id: "m27",
    name: "Onion Rings",
    aliases: ["onion rings"],
    category: "Starters",
    price: 280,
    veg: true,
    available: true,
  },
  // Additional Mains
  {
    id: "m28",
    name: "Matoke (Plantain Stew)",
    aliases: ["matoke", "plantain", "green banana stew"],
    category: "Mains",
    price: 480,
    veg: true,
    available: true,
  },
  {
    id: "m29",
    name: "Coconut Fish Curry & Rice",
    aliases: ["fish curry", "coconut curry"],
    category: "Mains",
    price: 700,
    veg: false,
    available: true,
    spiceLevels: ["Mild", "Medium", "Hot"],
  },
  // Additional Grills
  {
    id: "m30",
    name: "Grilled Beef Ribs",
    aliases: ["ribs", "beef ribs"],
    category: "Grills",
    price: 950,
    veg: false,
    available: true,
  },
  {
    id: "m31",
    name: "BBQ Chicken Wings",
    aliases: ["bbq wings", "grilled wings"],
    category: "Grills",
    price: 650,
    veg: false,
    available: true,
    spiceLevels: ["Mild", "Medium", "Hot"],
  },
  // Additional Beverages
  {
    id: "m32",
    name: "Iced Tea",
    aliases: ["ice tea", "iced tea"],
    category: "Beverages",
    price: 220,
    veg: true,
    available: true,
  },
  {
    id: "m33",
    name: "Chocolate Milkshake",
    aliases: ["milkshake", "shake"],
    category: "Beverages",
    price: 350,
    veg: true,
    available: true,
  },
  // Additional Desserts
  {
    id: "m34",
    name: "Baked Cheesecake",
    aliases: ["cheesecake"],
    category: "Desserts",
    price: 450,
    veg: true,
    available: true,
  },
  {
    id: "m35",
    name: "Tropical Fruit Parfait",
    aliases: ["parfait"],
    category: "Desserts",
    price: 350,
    veg: true,
    available: true,
  },
];

export const seedIngredients: Ingredient[] = [
  { id: "i1", name: "Unga (Maize Flour)", sku: "UNG-001", packaging: "Bale", quantity: 6, piecesPerPackage: 12, totalCost: 17280, unit: "kg", reorderThreshold: 2, unitCost: 120 },
  { id: "i2", name: "Sukuma Wiki", sku: "SUK-002", packaging: "Crate", quantity: 4, piecesPerPackage: 10, totalCost: 2400, unit: "kg", reorderThreshold: 5, unitCost: 60 },
  { id: "i3", name: "Beef", sku: "BEF-003", packaging: "Carton", quantity: 5, piecesPerPackage: 4, totalCost: 16250, unit: "kg", reorderThreshold: 3, unitCost: 650 },
  { id: "i4", name: "Cooking Oil", sku: "OIL-004", packaging: "Carton (12x2L)", quantity: 3, piecesPerPackage: 12, totalCost: 20160, unit: "litre", reorderThreshold: 2, unitCost: 280 },
  { id: "i5", name: "Rice", sku: "RIC-005", packaging: "Bag", quantity: 7, piecesPerPackage: 1, totalCost: 22680, unit: "kg", reorderThreshold: 3, unitCost: 180 },
  { id: "i6", name: "Whole Chicken", sku: "CHK-006", packaging: "Tray", quantity: 6, piecesPerPackage: 1, totalCost: 4500, unit: "pc", reorderThreshold: 8, unitCost: 750 },
  { id: "i7", name: "Tilapia (fresh)", sku: "FSH-007", packaging: "Iced Tray", quantity: 12, piecesPerPackage: 1, totalCost: 5400, unit: "pc", reorderThreshold: 10, unitCost: 450 },
  { id: "i8", name: "Tomatoes", sku: "TOM-008", packaging: "Crate", quantity: 4, piecesPerPackage: 8, totalCost: 1260, unit: "kg", reorderThreshold: 3, unitCost: 90 },
  { id: "i9", name: "Onions", sku: "ONI-009", packaging: "Net Bag", quantity: 5, piecesPerPackage: 1, totalCost: 1600, unit: "kg", reorderThreshold: 3, unitCost: 80 },
  { id: "i10", name: "Goat Meat", sku: "GTM-010", packaging: "Carton", quantity: 3, piecesPerPackage: 5, totalCost: 12750, unit: "kg", reorderThreshold: 2, unitCost: 850 },
];

export const seedVendors: Vendor[] = [
  { id: "v1", name: "Wangige Grain Millers", category: "Grains & Flour", paymentMethod: "mpesa", lastPaymentAmount: 24000, lastPaymentDate: "2026-08-18" },
  { id: "v2", name: "Kiambu Fresh Greens", category: "Vegetables", paymentMethod: "cash", lastPaymentAmount: 8500, lastPaymentDate: "2026-08-22" },
  { id: "v3", name: "Farmers Choice Butchery", category: "Meat & Poultry", paymentMethod: "mpesa", lastPaymentAmount: 62000, lastPaymentDate: "2026-08-20" },
  { id: "v4", name: "Bidco Oil Distributors", category: "Cooking Oil", paymentMethod: "cash", lastPaymentAmount: 15400, lastPaymentDate: "2026-08-15" },
  { id: "v5", name: "Lake Naivasha Fish Suppliers", category: "Fish", paymentMethod: "mpesa", lastPaymentAmount: 18000, lastPaymentDate: "2026-08-19" },
];

export const seedRecipes: Recipe[] = [
  {
    id: "r1",
    menuItemId: "m6", // Ugali with Sukuma & Beef Stew
    components: [
      { ingredientId: "i1", qty: 0.3 },
      { ingredientId: "i2", qty: 0.2 },
      { ingredientId: "i3", qty: 0.25 },
      { ingredientId: "i4", qty: 0.05 },
    ],
  },
  {
    id: "r2",
    menuItemId: "m9", // Beef Biryani
    components: [
      { ingredientId: "i5", qty: 0.35 },
      { ingredientId: "i3", qty: 0.2 },
      { ingredientId: "i9", qty: 0.1 },
      { ingredientId: "i4", qty: 0.06 },
    ],
  },
  {
    id: "r3",
    menuItemId: "m11", // Grilled Tilapia & Ugali
    components: [
      { ingredientId: "i7", qty: 1 },
      { ingredientId: "i1", qty: 0.25 },
      { ingredientId: "i8", qty: 0.1 },
      { ingredientId: "i4", qty: 0.04 },
    ],
  },
  {
    id: "r4",
    menuItemId: "m12", // Nyama Choma (Goat, 1kg)
    components: [
      { ingredientId: "i10", qty: 1 },
      { ingredientId: "i9", qty: 0.1 },
    ],
  },
  {
    id: "r5",
    menuItemId: "m13", // Grilled Chicken Half
    components: [
      { ingredientId: "i6", qty: 0.5 },
      { ingredientId: "i8", qty: 0.08 },
      { ingredientId: "i9", qty: 0.05 },
    ],
  },
];

export const seedStaff: StaffMember[] = [
  { id: "s1", name: "Amina Otieno", role: "Waiter", payType: "commission", rate: 0, commissionType: "percent_of_sales", commissionValue: 10 },
  { id: "s2", name: "Brian Kiptoo", role: "Waiter", payType: "commission", rate: 0, commissionType: "percent_of_sales", commissionValue: 10 },
  { id: "s3", name: "Cynthia Wanjiru", role: "Waiter", payType: "commission", rate: 0, commissionType: "percent_of_sales", commissionValue: 8 },
  { id: "s4", name: "Dennis Mwangi", role: "Bar Staff", payType: "daily", rate: 950 },
  { id: "s5", name: "Esther Chebet", role: "Bar Staff", payType: "daily", rate: 950 },
  { id: "s6", name: "Felix Omondi", role: "Chef", payType: "monthly", rate: 45000 },
  { id: "s7", name: "Grace Njeri", role: "Chef", payType: "monthly", rate: 42000 },
  { id: "s8", name: "Harun Abdi", role: "Manager", payType: "monthly", rate: 65000 },
  { id: "s9", name: "Peter Mwangi", role: "Cashier", payType: "daily", rate: 1000 },
];

function at(dateStr: string, hour: number, minute = 0): number {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

// Demo history: a couple of completed daily shifts earlier this week, plus
// Amina currently clocked in so the Staff & Payroll screen has an "On Shift" example.
export const seedShifts: ShiftEntry[] = [
  { id: "sh1", staffId: "s1", clockIn: at("2026-08-24", 8), clockOut: at("2026-08-24", 17) },
  { id: "sh2", staffId: "s2", clockIn: at("2026-08-24", 9), clockOut: at("2026-08-24", 18) },
  { id: "sh3", staffId: "s2", clockIn: at("2026-08-25", 9), clockOut: at("2026-08-25", 18) },
  { id: "sh4", staffId: "s4", clockIn: at("2026-08-24", 12), clockOut: at("2026-08-24", 22) },
  { id: "sh5", staffId: "s1", clockIn: at("2026-08-25", 8, 15) },
];

// Demo history: a few tables already mid-service or awaiting payment on
// load, each with a real backing order/session — so the Floor View's
// "Opened by" label and a click-through into Order Entry both work for
// these tables out of the box, not just for ones opened during this session.
export const seedTableSessions: TableSession[] = [
  { id: "sess-t2", tableId: "t2", waiterId: "s1", openedAt: at("2026-08-25", 12, 30) },
  { id: "sess-t6", tableId: "t6", waiterId: "s2", openedAt: at("2026-08-25", 11, 15) },
  { id: "sess-t8", tableId: "t8", waiterId: "s3", openedAt: at("2026-08-25", 12, 45) },
  { id: "sess-t11", tableId: "t11", waiterId: "s4", openedAt: at("2026-08-25", 13, 0) },
];

function seedLine(
  id: string,
  menuItemId: string,
  name: string,
  price: number,
  qty: number,
  veg: boolean
): OrderLineItem {
  return { id, menuItemId, name, price, qty, veg, addOns: [] };
}

export const seedOrders: Record<string, TableOrder> = {
  t2: {
    id: "order-t2",
    tableId: "t2",
    sessionId: "sess-t2",
    waiterId: "s1",
    paymentStatus: "unpaid",
    rounds: [
      {
        id: "round-t2-1",
        index: 1,
        createdAt: at("2026-08-25", 12, 32),
        items: [
          seedLine("line-t2-1", "m1", "Samosa (3pc)", 300, 2, false),
          seedLine("line-t2-2", "m17", "Fresh Passion Juice", 250, 2, true),
        ],
      },
    ],
  },
  t6: {
    id: "order-t6",
    tableId: "t6",
    sessionId: "sess-t6",
    waiterId: "s2",
    paymentStatus: "unpaid",
    billTotals: { subtotal: 1400, vat: 224, total: 1624 },
    rounds: [
      {
        id: "round-t6-1",
        index: 1,
        createdAt: at("2026-08-25", 11, 20),
        items: [
          seedLine("line-t6-1", "m6", "Ugali with Sukuma & Beef Stew", 550, 2, false),
          seedLine("line-t6-2", "m20", "Soda (350ml)", 150, 2, true),
        ],
      },
    ],
  },
  t8: {
    id: "order-t8",
    tableId: "t8",
    sessionId: "sess-t8",
    waiterId: "s3",
    paymentStatus: "unpaid",
    rounds: [
      {
        id: "round-t8-1",
        index: 1,
        createdAt: at("2026-08-25", 12, 50),
        items: [
          seedLine("line-t8-1", "m12", "Nyama Choma (Goat, 1kg)", 1800, 1, false),
          seedLine("line-t8-2", "m16", "Tusker Lager", 300, 4, true),
        ],
      },
    ],
  },
  t11: {
    id: "order-t11",
    tableId: "t11",
    sessionId: "sess-t11",
    waiterId: "s4",
    paymentStatus: "unpaid",
    rounds: [
      {
        id: "round-t11-1",
        index: 1,
        createdAt: at("2026-08-25", 13, 5),
        items: [
          seedLine("line-t11-1", "m16", "Tusker Lager", 300, 2, true),
          seedLine("line-t11-2", "m18", "Dawa Cocktail", 550, 1, true),
        ],
      },
    ],
  },
};
