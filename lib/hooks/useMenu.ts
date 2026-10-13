import useSWR from "swr";
import { fetchMenu } from "@/lib/api/menu";
import { MENU_SWR_CONFIG } from "./swrConfig";

export function useMenu() {
  const { data, error, isLoading, mutate } = useSWR("/api/menu", fetchMenu, MENU_SWR_CONFIG);
  return { menu: data ?? [], error, isLoading, mutate };
}
