import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import { useThemeStore } from "@/store/themeStore";
import { colorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

function applyTheme(preference: "light" | "dark") {
  colorScheme.set(preference);
}

export function ThemeSync() {
  const preference = useThemeStore((s) => s.preference);
  const resolved = useAppColorScheme();

  useEffect(() => {
    applyTheme(useThemeStore.getState().preference);
    const unsub = useThemeStore.persist.onFinishHydration(() => {
      applyTheme(useThemeStore.getState().preference);
    });
    return unsub;
  }, []);

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  return <StatusBar style={resolved === "dark" ? "light" : "dark"} />;
}
