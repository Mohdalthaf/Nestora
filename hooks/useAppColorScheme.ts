import { useThemeStore } from "@/store/themeStore";

/** Resolved app theme (light or dark) from user preference. */
export function useAppColorScheme(): "light" | "dark" {
  return useThemeStore((s) => s.preference);
}
