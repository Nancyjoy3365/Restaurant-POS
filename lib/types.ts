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
  imageUrl?: string;
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
}

export interface Round {
  id: string;
  index: number;
  createdAt: number;
  items: OrderLineItem[];
}

export type OrderPaymentStatus = "unpaid" | "partially_paid" | "paid";

export interface BillTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export interface TableOrder {
  id: string;
  tableId: string;
  sessionId: string;
  waiterId?: string;
  rounds: Round[];
  paymentStatus: OrderPaymentStatus;
  billTotals?: BillTotals;
}

export interface TableSession {
  id: string;
  tableId: string;
  waiterId: string;
  openedAt: number;
  closedAt?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  sku: string;
  packaging: string;
  quantity: number;
  piecesPerPackage: number;
  totalCost: number;
  unit: string;
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
  menuItemId: string;
  components: RecipeComponent[];
}

export type PayType = "daily" | "monthly" | "commission";
export type StaffRole = "Waiter" | "Bar Staff" | "Manager" | "Chef" | "Cashier";
export type CommissionType = "percent_of_sales" | "flat_per_order";

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
  commissionType?: CommissionType;
  commissionValue?: number;
}

export type PaymentMethod = "mpesa" | "card" | "cash";

export interface ReceiptLineItem {
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  roundIndex: number;
}

export interface Payment {
  id: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  waiterId?: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
  paidAt: number;
}

export interface ReceiptPaymentLine {
  method: PaymentMethod;
  amount: number;
  reference: string;
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
  payments: ReceiptPaymentLine[];
  qrDataUrl: string;
  issuedAt: number;
}
