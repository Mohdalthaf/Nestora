import { themePersistStorage } from "@/lib/themePersistStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark";

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}

function normalizePreference(raw: unknown): ThemePreference {
  if (raw === "dark") return "dark";
  return "light";
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      preference: "light",
      setPreference: (value) => set({ preference: value }),
    }),
    {
      name: "nestora-theme-preference",
      storage: createJSONStorage(() => themePersistStorage),
      partialize: (state) => ({ preference: state.preference }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<ThemeStore> | undefined)?.preference;
        return {
          ...current,
          preference: normalizePreference(p),
        };
      },
    }
  )
);
