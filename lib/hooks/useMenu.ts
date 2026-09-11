import useSWR from "swr";
import { fetchMenu } from "@/lib/api/menu";
import { SHARED_SWR_CONFIG } from "./swrConfig";

export function useMenu() {
  const { data, error, isLoading, mutate } = useSWR("/api/menu", fetchMenu, SHARED_SWR_CONFIG);
  return { menu: data ?? [], error, isLoading, mutate };
}
