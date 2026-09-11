import useSWR from "swr";
import {
  fetchIncentiveRecords,
  fetchLeaveRecords,
  fetchShifts,
  fetchStaff,
  fetchStaffPin,
} from "@/lib/api/staff";
import { SHARED_SWR_CONFIG } from "./swrConfig";

export function useStaff() {
  const { data, error, isLoading, mutate } = useSWR("/api/staff", fetchStaff, SHARED_SWR_CONFIG);
  return { staff: data ?? [], error, isLoading, mutate };
}

export function useShifts() {
  const { data, error, isLoading, mutate } = useSWR("/api/shifts", fetchShifts, SHARED_SWR_CONFIG);
  return { shifts: data ?? [], error, isLoading, mutate };
}

export function useLeaveRecords() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/leave-records",
    fetchLeaveRecords,
    SHARED_SWR_CONFIG
  );
  return { leaveRecords: data ?? [], error, isLoading, mutate };
}

export function useIncentiveRecords() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/incentive-records",
    fetchIncentiveRecords,
    SHARED_SWR_CONFIG
  );
  return { incentiveRecords: data ?? [], error, isLoading, mutate };
}

// Fetched fresh (not persisted to localStorage) so a PIN changed on one
// device is what every other device compares against — same shared-PIN
// behavior the app already had, just no longer stale across browsers.
export function useStaffPin() {
  const { data, error, isLoading, mutate } = useSWR("/api/staff-pin", fetchStaffPin, SHARED_SWR_CONFIG);
  return { staffPin: data?.pin ?? null, error, isLoading, mutate };
}
