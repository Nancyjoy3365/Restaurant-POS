import { useSyncExternalStore } from "react";
import { usePosStore } from "./store";

function subscribe(callback: () => void) {
  return usePosStore.persist.onFinishHydration(callback);
}

function getSnapshot() {
  return usePosStore.persist.hasHydrated();
}

function getServerSnapshot() {
  return false;
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
