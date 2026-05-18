import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import { useUserStore } from "@/store/userStore";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F9FAFB",
    card: "#F9FAFB",
  },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0a0a0a",
    card: "#0a0a0a",
  },
};

export default function NativeTabsLayout() {
  const isAdmin = useUserStore((state) => state.isAdmin);
  const scheme = useAppColorScheme();

  return (
    <ThemeProvider value={scheme === "dark" ? AppDarkTheme : AppLightTheme}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf="house.fill" />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="search">
          <Icon sf="magnifyingglass" />
          <Label>Search</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="create" hidden={!isAdmin}>
          <Icon sf="plus.circle.fill" />
          <Label>Add Property</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="saved">
          <Icon sf="heart.fill" />
          <Label>Saved</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
