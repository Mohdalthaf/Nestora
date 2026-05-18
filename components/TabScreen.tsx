import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

/** Shared tab screen shell — top safe area only; native tab bar handles the bottom. */
export const TAB_SCREEN_CLASS = "flex-1 bg-gray-50 dark:bg-neutral-950";

/** Bottom padding so scroll content clears the native tab bar. */
export const TAB_SCROLL_BOTTOM_PADDING = 100;

export function TabScreen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SafeAreaView
      edges={["top"]}
      className={[TAB_SCREEN_CLASS, className].filter(Boolean).join(" ")}
    >
      {children}
    </SafeAreaView>
  );
}
