import useSWR from "swr";
import {
  fetchIncentiveRecords,
  fetchLeaveRecords,
  fetchShifts,
  fetchStaff,
} from "@/lib/api/staff";
import { fetchStaffDirectory } from "@/lib/api/auth";
import { SHARED_SWR_CONFIG, STATIC_SWR_CONFIG } from "./swrConfig";

// Names and roles for the login screen — the one staff list available
// before logging in (no pay or phone details).
export function useStaffDirectory() {
  const { data, error, isLoading } = useSWR("/api/auth/staff-directory", fetchStaffDirectory, STATIC_SWR_CONFIG);
  return { directory: data ?? [], error, isLoading };
}

export function useStaff() {
  const { data, error, isLoading, mutate } = useSWR("/api/staff", fetchStaff, STATIC_SWR_CONFIG);
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
    STATIC_SWR_CONFIG
  );
  return { leaveRecords: data ?? [], error, isLoading, mutate };
}

export function useIncentiveRecords() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/incentive-records",
    fetchIncentiveRecords,
    STATIC_SWR_CONFIG
  );
  return { incentiveRecords: data ?? [], error, isLoading, mutate };
}
