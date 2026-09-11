import type { IncentiveRecord, LeaveRecord, ShiftEntry, StaffMember } from "@/lib/types";
import { request, ApiError } from "./client";

export { ApiError };

export const fetchStaff = () => request<StaffMember[]>("/api/staff");

export const createStaffMember = (member: Omit<StaffMember, "id">) =>
  request<StaffMember>("/api/staff", { method: "POST", body: JSON.stringify(member) });

export const updateStaffMember = (staffId: string, updates: Omit<StaffMember, "id">) =>
  request<{ ok: true }>(`/api/staff/${staffId}`, { method: "PATCH", body: JSON.stringify(updates) });

export const clockIn = (staffId: string) =>
  request<{ ok: true }>(`/api/staff/${staffId}/clock-in`, { method: "POST" });

export const clockOut = (staffId: string) =>
  request<{ ok: true }>(`/api/staff/${staffId}/clock-out`, { method: "POST" });

export const fetchShifts = () => request<ShiftEntry[]>("/api/shifts");

export const fetchLeaveRecords = () => request<LeaveRecord[]>("/api/leave-records");

export const createLeaveRecord = (record: Omit<LeaveRecord, "id">) =>
  request<LeaveRecord>("/api/leave-records", { method: "POST", body: JSON.stringify(record) });

export const updateLeaveRecord = (leaveId: string, updates: Omit<LeaveRecord, "id">) =>
  request<{ ok: true }>(`/api/leave-records/${leaveId}`, { method: "PATCH", body: JSON.stringify(updates) });

export const deleteLeaveRecord = (leaveId: string) =>
  request<{ ok: true }>(`/api/leave-records/${leaveId}`, { method: "DELETE" });

export const fetchIncentiveRecords = () => request<IncentiveRecord[]>("/api/incentive-records");

export const createIncentiveRecord = (record: Omit<IncentiveRecord, "id">) =>
  request<IncentiveRecord>("/api/incentive-records", { method: "POST", body: JSON.stringify(record) });

export const fetchStaffPin = () => request<{ pin: string | null }>("/api/staff-pin");

export const changeStaffPin = (currentPin: string, newPin: string) =>
  request<{ ok: true }>("/api/staff-pin", { method: "POST", body: JSON.stringify({ currentPin, newPin }) });
