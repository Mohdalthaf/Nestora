import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const inputClass =
  "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-neutral-100";
const labelClass =
  "text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-1.5";

function getClerkErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    if (
      "message" in error &&
      typeof (error as Error).message === "string" &&
      (error as Error).message.trim()
    ) {
      return (error as Error).message;
    }
    if (
      "errors" in error &&
      Array.isArray((error as { errors: unknown }).errors)
    ) {
      const [first] = (error as { errors: { longMessage?: string; message?: string }[] })
        .errors;
      if (first?.longMessage?.trim()) return first.longMessage;
      if (first?.message?.trim()) return first.message;
    }
  }
  return fallback;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const authSupabase = useSupabase();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signOutOtherSessions, setSignOutOtherSessions] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user?.id, user?.firstName, user?.lastName]);

  const handleSave = async () => {
    if (!user) return;

    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!fn) {
      Alert.alert("Validation", "First name is required.");
      return;
    }

    setSaving(true);
    try {
      await user.update({ firstName: fn, lastName: ln });

      const { error: dbError } = await authSupabase
        .from("users")
        .update({
          first_name: fn,
          last_name: ln || null,
        })
        .eq("clerk_id", user.id);

      if (dbError && __DEV__) {
        console.warn("Supabase profile sync:", dbError.message);
      }

      Alert.alert("Saved", "Your profile was updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        "Could not update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!next) {
      Alert.alert("Validation", "Enter a new password.");
      return;
    }
    if (next.length < 8) {
      Alert.alert("Validation", "New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      Alert.alert("Validation", "New password and confirmation do not match.");
      return;
    }

    if (user.passwordEnabled && !currentPassword.trim()) {
      Alert.alert("Validation", "Enter your current password.");
      return;
    }

    setPasswordSaving(true);
    try {
      await user.updatePassword({
        newPassword: next,
        ...(user.passwordEnabled
          ? { currentPassword: currentPassword.trim() }
          : {}),
        signOutOfOtherSessions: signOutOtherSessions,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSignOutOtherSessions(false);

      Alert.alert("Password updated", "Your password was changed successfully.");
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        getClerkErrorMessage(err, "Could not update your password. Try again.")
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center px-5 pt-4 pb-3 gap-3 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">
            Update profile
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5">
            <Text className={labelClass}>First name</Text>
            <TextInput
              className={inputClass}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>

          <View className="mb-5">
            <Text className={labelClass}>Last name</Text>
            <TextInput
              className={inputClass}
              placeholder="Last name"
              placeholderTextColor="#9CA3AF"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          <View className="mb-6">
            <Text className={labelClass}>Email</Text>
            <TextInput
              className={`${inputClass} text-gray-500 dark:text-neutral-400`}
              value={email}
              editable={false}
            />
            <Text className="text-xs text-gray-400 dark:text-neutral-500 mt-2">
              Email cannot be changed here. Use account settings on the web if
              you need to update it.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-blue-600 rounded-2xl py-4 items-center"
            style={{
              opacity: saving ? 0.7 : 1,
              shadowColor: "#2563EB",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Save changes</Text>
            )}
          </TouchableOpacity>

          <View className="h-px bg-gray-200 dark:bg-neutral-800 my-8" />

          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Change password
          </Text>
          {!user.passwordEnabled ? (
            <Text className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
              Add a password so you can sign in with email and password as well
              as your other sign-in methods.
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
              Enter your current password, then choose a new one.
            </Text>
          )}

          {user.passwordEnabled ? (
            <View className="mb-4">
              <Text className={labelClass}>Current password</Text>
              <TextInput
                className={inputClass}
                placeholder="Current password"
                placeholderTextColor="#9CA3AF"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          ) : null}

          <View className="mb-4">
            <Text className={labelClass}>New password</Text>
            <TextInput
              className={inputClass}
              placeholder="At least 8 characters"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View className="mb-4">
            <Text className={labelClass}>Confirm new password</Text>
            <TextInput
              className={inputClass}
              placeholder="Re-enter new password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row items-center justify-between bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3 mb-6">
            <View className="flex-1 pr-3">
              <Text className="text-gray-800 dark:text-neutral-100 font-medium text-sm">
                Sign out other sessions
              </Text>
              <Text className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                After changing password, sign out everywhere else you are logged
                in.
              </Text>
            </View>
            <Switch
              value={signOutOtherSessions}
              onValueChange={setSignOutOtherSessions}
              trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
              thumbColor={signOutOtherSessions ? "#2563EB" : "#F3F4F6"}
            />
          </View>

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={passwordSaving}
            className="bg-white dark:bg-neutral-900 border-2 border-blue-600 rounded-2xl py-4 items-center"
            style={{ opacity: passwordSaving ? 0.7 : 1 }}
          >
            {passwordSaving ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Text className="text-blue-600 font-bold text-base">
                Update password
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
