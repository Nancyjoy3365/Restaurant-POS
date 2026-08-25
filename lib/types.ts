export type TableStatus = "free" | "occupied" | "needs-bill" | "reserved";

export interface RestaurantTable {
  id: string;
  number: number;
  seats: number;
  section: string;
  status: TableStatus;
  customName?: string;
}

export type MenuCategory =
  | "Starters"
  | "Mains"
  | "Grills"
  | "Beverages"
  | "Desserts";

export interface AddOn {
  name: string;
  price: number;
}

export interface ComboComponent {
  name: string;
  qty: string;
}

export interface MenuItem {
  id: string;
  name: string;
  aliases: string[];
  category: MenuCategory;
  price: number;
  veg: boolean;
  available: boolean;
  comboTag?: string;
  comboComponents?: ComboComponent[];
  spiceLevels?: string[];
  addOns?: AddOn[];
}

export interface OrderLineItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  veg: boolean;
  comboTag?: string;
  spiceLevel?: string;
  addOns: AddOn[];
  assignedGuests: string[];
}

export interface Round {
  id: string;
  index: number;
  createdAt: number;
  items: OrderLineItem[];
}

export interface TableOrder {
  tableId: string;
  rounds: Round[];
  guestCount: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  reorderThreshold: number;
  unitCost: number;
}

export type VendorPaymentMethod = "cash" | "mpesa";

export interface Vendor {
  id: string;
  name: string;
  category: string;
  paymentMethod: VendorPaymentMethod;
  lastPaymentAmount: number;
  lastPaymentDate: string;
}

export interface RecipeComponent {
  ingredientId: string;
  qty: number;
}

export interface Recipe {
  id: string;
  dishName: string;
  menuPrice: number;
  components: RecipeComponent[];
}

export type PayType = "daily" | "monthly";
export type StaffRole = "Waiter" | "Bar Staff" | "Manager" | "Chef";

export interface ShiftEntry {
  id: string;
  staffId: string;
  clockIn: number;
  clockOut?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  payType: PayType;
  rate: number;
}

export type PaymentMethod = "mpesa" | "card" | "cash";

export interface GuestTotal {
  guestId: string;
  amount: number;
}

export interface SplitSummary {
  mode: "none" | "equal" | "item";
  guestCount?: number;
  guestTotals?: GuestTotal[];
}

export interface ReceiptLineItem {
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  roundIndex: number;
}

export interface Receipt {
  id: string;
  invoiceNumber: string;
  tableId: string;
  tableLabel: string;
  items: ReceiptLineItem[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentRef: string;
  qrDataUrl: string;
  issuedAt: number;
  splitSummary?: SplitSummary;
}
