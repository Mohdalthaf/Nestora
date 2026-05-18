import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import { ThemePreference, useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const resolved = useAppColorScheme();
  const iconMuted = resolved === "dark" ? "#E5E7EB" : "#111827";

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-5 pt-4 pb-3 gap-3 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <TouchableOpacity
          onPress={() => router.replace("/(root)/(tabs)/profile")}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={iconMuted} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">
          Settings
        </Text>
      </View>

      <View className="px-5 pt-6">
        <Text className="text-sm font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
          Appearance
        </Text>
        <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
          {OPTIONS.map((opt, index) => {
            const selected = preference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                className={`flex-row items-center px-4 py-4 gap-3 ${
                  index < OPTIONS.length - 1
                    ? "border-b border-gray-100 dark:border-neutral-800"
                    : ""
                }`}
                activeOpacity={0.7}
              >
                <Text className="flex-1 text-base font-semibold text-gray-900 dark:text-white">
                  {opt.label}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                ) : (
                  <View className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-neutral-600" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
