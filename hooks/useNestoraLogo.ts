import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import type { ImageSourcePropType } from "react-native";

const nestoraLogoLight = require("@/assets/images/nestora.png");
const nestoraLogoDark = require("@/assets/images/nestora-dark.png");

export function useNestoraLogo(): ImageSourcePropType {
  const scheme = useAppColorScheme();
  return scheme === "dark" ? nestoraLogoDark : nestoraLogoLight;
}
