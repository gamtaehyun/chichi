import { sampleState } from "../data/sampleData";
import type { ChichiState } from "../domain/types";

const storageKey = "chichi-state-v1";
const cleanSlateKey = "chichi-clean-slate-v2";

export function loadState(): ChichiState {
  if (localStorage.getItem(cleanSlateKey) !== "done") {
    localStorage.removeItem(storageKey);
    localStorage.setItem(cleanSlateKey, "done");
    return sampleState;
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) return sampleState;

  try {
    return JSON.parse(raw) as ChichiState;
  } catch {
    return sampleState;
  }
}

export function saveState(state: ChichiState): void {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
