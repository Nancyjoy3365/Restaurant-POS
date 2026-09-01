export type MenuCategory =
  | "Main"
  | "Extra"
  | "Drinks"
  | "Water"
  | "Juice"
  | "Packaging";

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
  // Display-only grouping for the waiter-facing order screens: items
  // sharing the same variantGroup (e.g. "Fish") are shown as one card with
  // a picker listing each variantLabel (e.g. "Wet") — purely a browsing
  // convenience. Each variant is still its own full MenuItem with its own
  // id/price/availability; nothing about ordering, billing, or receipts
  // changes because of this.
  variantGroup?: string;
  variantLabel?: string;
  // Admin-toggleable flag marking a product management wants staff
  // actively pushing — feeds the Performance Tracker's per-waiter
  // priority-product-units-sold breakdown. Purely a flag; no effect on
  // ordering, pricing, or receipts.
  isPriority?: boolean;
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
  note?: string;
  sentToKitchen?: boolean;
  kitchenReady?: boolean;
}

export interface Round {
  id: string;
  index: number;
  createdAt: number;
  // When this round was actually sent to the kitchen (via
  // sendRoundToKitchen) — distinct from createdAt, since items can sit in
  // a round for a while before being sent. Drives the Kitchen Display's
  // elapsed-time urgency badge.
  sentAt?: number;
  items: OrderLineItem[];
}

export type OrderPaymentStatus = "unpaid" | "partially_paid" | "paid";

export interface BillTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export type TicketStatus = "open" | "paid";

// A ticket is one customer group's order and receipt, full stop — there is
// no physical table underneath it. Two people served at the same physical
// spot are two unrelated tickets, not two "tabs" sharing a "table"; nothing
// ties them together in the data. `waiterId` is set once at creation and
// never reassigned automatically. `locationNote` is a free-text breadcrumb
// only (e.g. "by the window") — never parsed or relied on for logic.
export interface Ticket {
  id: string;
  displayNumber: number;
  waiterId: string;
  locationNote?: string;
  status: TicketStatus;
  openedAt: number;
  closedAt?: number;
}

export interface TicketOrder {
  id: string;
  ticketId: string;
  // Inherited from the owning ticket at creation and never reassigned — see
  // Ticket.waiterId for the canonical, single source of truth.
  waiterId?: string;
  rounds: Round[];
  paymentStatus: OrderPaymentStatus;
  billTotals?: BillTotals;
  onHold?: boolean;
  billedThroughRoundIndex?: number;
}

export interface Ingredient {
  id: string;
  name: string;
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
export type StaffRole =
  | "Waiter"
  | "Admin"
  | "Chef"
  | "Cashier"
  | "Kitchen Assistant";
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
  // Optional, display-only job title (e.g. "Admin Chef", "Admin CX") shown
  // alongside the coarse `role` — never used for access control, since
  // every Admin gets the exact same dashboard/permissions regardless of
  // title.
  title?: string;
  payType: PayType;
  rate: number;
  phone?: string;
  commissionType?: CommissionType;
  commissionValue?: number;
}

export type LeaveStatus = "approved" | "pending";

// A leave record is a date-range event, not a static attribute — a staff
// member can have several over time. Only "approved" records affect login
// or payroll; "pending" ones are informational until approved. `isPaid`
// decides which direction that effect goes: an approved paid day still
// credits the staff member's daily rate with no clock-in required, while an
// approved unpaid day is simply not paid — same as an ordinary absence (see
// approvedLeaveDaysInRange and dailyPayout in payroll.ts).
export interface LeaveRecord {
  id: string;
  staffId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  reason: string;
  status: LeaveStatus;
  isPaid: boolean;
}

// A one-off payroll adjustment on top of normal earnings (e.g. a sales
// bonus) — recorded as its own event rather than folded into StaffMember,
// since there can be many per staff member over time.
export interface IncentiveRecord {
  id: string;
  staffId: string;
  amount: number;
  reason: string;
  dateGiven: number;
  givenBy?: string;
}

export type PaymentMethod = "mpesa" | "cash";

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
  ticketId: string;
  // Sales-credit owner — always copied from the ticket/order's waiterId,
  // never from whoever is logged in. Drives reconciliation and commission.
  waiterId?: string;
  // Who physically recorded/collected this payment (may be a different
  // staff member, e.g. a cashier collecting on behalf of the ticket's
  // waiter). Audit/display only ("Bill collected by ...") — must never
  // affect sales credit or reconciliation.
  collectedByStaffId?: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
  customerName?: string;
  // An M-Pesa payment that landed on the waiter's/staff's personal number
  // instead of the business till — functionally cash in the waiter's hand,
  // so it owes a physical drop to the cashier just like cash does. Never
  // set for a normal till-bound M-Pesa payment.
  isCashSubstitution?: boolean;
  billingCycle: number;
  paidAt: number;
}

export interface CashDrop {
  id: string;
  waiterId: string;
  // What the cashier actually counted/confirmed in hand.
  amount: number;
  // What was owed at the time of this drop: cash payments + M-Pesa
  // cash-substitution payments. Compared against `amount` to flag variance.
  expectedAmount: number;
  // How this collection was physically settled — reuses the same
  // cash/mpesa vocabulary as Payment.method.
  method: PaymentMethod;
  // Required only when method === "mpesa".
  reference?: string;
  // Required whenever amount !== expectedAmount, explaining the discrepancy.
  note?: string;
  droppedAt: number;
}

export interface ReceiptPaymentLine {
  method: PaymentMethod;
  amount: number;
  reference: string;
  customerName?: string;
}

export interface VoidEntry {
  id: string;
  ticketId: string;
  orderId: string;
  itemId: string;
  itemName: string;
  qty: number;
  reason: string;
  staffId?: string;
  voidedAt: number;
}

export interface Receipt {
  id: string;
  invoiceNumber: string;
  ticketId: string;
  ticketLabel: string;
  locationNote?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  vat: number;
  total: number;
  payments: ReceiptPaymentLine[];
  qrDataUrl: string;
  issuedAt: number;
}
