import type { CashDrop, Payment, PaymentMethod, Receipt, RestaurantSettings } from "@/lib/types";
import type { TicketAndOrder } from "./orders";
import { request, ApiError } from "./client";

export { ApiError };

export const fetchPayments = () => request<Payment[]>("/api/payments");

export const fetchReceipts = () => request<Receipt[]>("/api/receipts");

export const startBilling = (ticketId: string) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/start-billing`, { method: "POST" });

export const recordPayment = (
  ticketId: string,
  payment: {
    method: PaymentMethod;
    amount: number;
    reference: string;
    customerName?: string;
    isCashSubstitution?: boolean;
    collectedByStaffId?: string;
  }
) => request<TicketAndOrder>(`/api/orders/${ticketId}/payments`, { method: "POST", body: JSON.stringify(payment) });

export const confirmOrderComplete = (ticketId: string) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/confirm-complete`, { method: "POST" });

export const reverseLastPayment = (ticketId: string) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/reverse-last-payment`, { method: "POST" });

export const reverseCompletedPayment = (paymentId: string) =>
  request<TicketAndOrder>(`/api/payments/${paymentId}/reverse`, { method: "POST" });

export const finalizeReceipt = (ticketId: string) =>
  request<TicketAndOrder & { receipt: Receipt }>(`/api/orders/${ticketId}/finalize-receipt`, { method: "POST" });

export const fetchCashDrops = () => request<CashDrop[]>("/api/cash-drops");

export const recordCashDrop = (
  waiterId: string,
  amount: number,
  expectedAmount: number,
  method: PaymentMethod,
  reference?: string,
  note?: string
) =>
  request<CashDrop>("/api/cash-drops", {
    method: "POST",
    body: JSON.stringify({ waiterId, amount, expectedAmount, method, reference, note }),
  });

export const deleteCashDrop = (dropId: string) =>
  request<{ ok: true }>(`/api/cash-drops/${dropId}`, { method: "DELETE" });

export const fetchRestaurantSettings = () => request<RestaurantSettings>("/api/restaurant-settings");

export const updateRestaurantSettings = (settings: RestaurantSettings) =>
  request<{ ok: true }>("/api/restaurant-settings", { method: "PATCH", body: JSON.stringify(settings) });
