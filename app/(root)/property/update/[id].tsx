import { useSupabase } from "@/hooks/useSupabase";
import { useUserStore } from "@/store/userStore";
import { Property } from "@/types";
import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TYPES = ["apartment", "house", "villa", "studio"] as const;
type PropertyType = (typeof TYPES)[number];

const MIN_PRICE = 1;
const MAX_PRICE = 999_999_999;

const inputClass =
  "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-neutral-100";
const labelClass =
  "text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-1.5";
const sectionClass = "mb-5";

interface FormState {
  title: string;
  description: string;
  price: string;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  areaSqft: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  isFeatured: boolean;
  isSold: boolean;
  images: string[];
  localImages: string[];
}

function normalizeType(raw: string | null | undefined): PropertyType {
  const t = (raw ?? "apartment").toLowerCase();
  return (TYPES as readonly string[]).includes(t) ? (t as PropertyType) : "apartment";
}

function propertyToForm(p: Property): FormState {
  const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  return {
    title: p.title ?? "",
    description: p.description ?? "",
    price: String(p.price ?? ""),
    type: normalizeType(p.type),
    bedrooms: Math.max(1, p.bedrooms ?? 1),
    bathrooms: Math.max(1, p.bathrooms ?? 1),
    areaSqft: p.area_sqft != null ? String(p.area_sqft) : "",
    address: p.address ?? "",
    city: p.city ?? "",
    latitude: p.latitude != null ? String(p.latitude) : "",
    longitude: p.longitude != null ? String(p.longitude) : "",
    isFeatured: Boolean(p.is_featured),
    isSold: Boolean(p.is_sold),
    images: imgs as string[],
    localImages: imgs as string[],
  };
}

export default function UpdatePropertyScreen() {
  const router = useRouter();
  const { isLoaded } = useAuth();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const authSupabase = useSupabase();

  const [form, setForm] = useState<FormState | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "forbidden" | "notfound" | "missing"
  >("loading");

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const updateForm = (fields: Partial<FormState>) =>
    setForm((prev) => (prev ? { ...prev, ...fields } : prev));

  useEffect(() => {
    if (!id) {
      setLoadState("missing");
      return;
    }

    if (!isLoaded) {
      setLoadState("loading");
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadState("loading");
      setForm(null);

      if (!isAdmin) {
        if (!cancelled) setLoadState("forbidden");
        return;
      }

      const { data: row, error } = await authSupabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error || !row) {
        setLoadState("notfound");
        return;
      }

      setForm(propertyToForm(row as Property));
      setLoadState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isAdmin, isLoaded]);

  const handlePickImages = async () => {
    if (!form) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: 6,
    });

    if (result.canceled) return;

    setUploadingImages(true);

    const uploadedUrls: string[] = [];
    const previewUris: string[] = [];

    for (const asset of result.assets) {
      try {
        const filename = `property_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.jpg`;

        const base64 = asset.base64!;
        const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const { error } = await authSupabase.storage
          .from("property-images")
          .upload(filename, buffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (error) throw error;

        const { data: urlData } = authSupabase.storage
          .from("property-images")
          .getPublicUrl(filename);

        uploadedUrls.push(urlData.publicUrl);
        previewUris.push(asset.uri);
      } catch (err) {
        console.error("Upload error:", err);
        Alert.alert("Upload Failed", "One or more images failed to upload.");
      }
    }

    updateForm({
      images: [...form.images, ...uploadedUrls],
      localImages: [...form.localImages, ...previewUris],
    });
    setUploadingImages(false);
  };

  const handleRemoveImage = (index: number) => {
    if (!form) return;
    updateForm({
      images: form.images.filter((_, i) => i !== index),
      localImages: form.localImages.filter((_, i) => i !== index),
    });
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to detect coordinates."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      updateForm({
        latitude: String(location.coords.latitude),
        longitude: String(location.coords.longitude),
      });
    } catch {
      Alert.alert("Error", "Could not detect location. Enter manually.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!form || !id) return;

    if (!form.title.trim())
      return Alert.alert("Validation", "Title is required.");

    if (!form.price.trim())
      return Alert.alert("Validation", "Price is required.");

    const priceNum = Number(form.price);
    if (isNaN(priceNum) || priceNum < MIN_PRICE)
      return Alert.alert("Validation", "Price must be greater than ₹0.");
    if (priceNum > MAX_PRICE)
      return Alert.alert(
        "Validation",
        `Price cannot exceed ₹${MAX_PRICE.toLocaleString("en-IN")}.`
      );

    if (!form.address.trim())
      return Alert.alert("Validation", "Address is required.");
    if (!form.city.trim())
      return Alert.alert("Validation", "City is required.");
    if (form.images.length === 0)
      return Alert.alert("Validation", "Please keep at least one image.");

    setSubmitting(true);

    const { error } = await authSupabase
      .from("properties")
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        price: priceNum,
        type: form.type,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        area_sqft: form.areaSqft ? Number(form.areaSqft) : null,
        address: form.address.trim(),
        city: form.city.trim(),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        images: form.images,
        is_featured: form.isFeatured,
        is_sold: form.isSold,
      })
      .eq("id", id);

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", "Failed to update property. Please try again.");
      console.error(error);
      return;
    }

    Alert.alert("Saved", "Property details were updated.", [
      {
        text: "OK",
        onPress: () =>
          router.replace({
            pathname: "/(root)/property/[id]",
            params: { id },
          }),
      },
    ]);
  };

  const Counter = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <View className="flex-1">
      <Text className={labelClass}>{label}</Text>
      <View className="flex-row items-center bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl overflow-hidden">
        <TouchableOpacity
          onPress={() => onChange(Math.max(1, value - 1))}
          className="w-11 h-11 items-center justify-center"
        >
          <Ionicons name="remove" size={18} color="#374151" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-gray-800 dark:text-neutral-100 font-bold text-base">
          {value}
        </Text>
        <TouchableOpacity
          onPress={() => onChange(value + 1)}
          className="w-11 h-11 items-center justify-center"
        >
          <Ionicons name="add" size={18} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const Toggle = ({
    label,
    value,
    onChange,
    description,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    description?: string;
  }) => (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      className={`flex-row items-center justify-between p-4 rounded-2xl border ${
        value
          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
          : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700"
      }`}
    >
      <View className="flex-1 mr-3">
        <Text
          className={`font-semibold ${
            value
              ? "text-blue-700 dark:text-blue-300"
              : "text-gray-700 dark:text-neutral-300"
          }`}
        >
          {label}
        </Text>
        {description && (
          <Text className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
            {description}
          </Text>
        )}
      </View>
      <View
        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          value
            ? "bg-blue-600 border-blue-600"
            : "border-gray-300 dark:border-neutral-600"
        }`}
      >
        {value && <Ionicons name="checkmark" size={14} color="white" />}
      </View>
    </TouchableOpacity>
  );

  if (loadState === "forbidden") {
    return <Redirect href="/(root)/(tabs)" />;
  }

  if (loadState === "missing") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950 items-center justify-center px-6">
        <Text className="text-gray-600 dark:text-neutral-400 text-center mb-4">
          No property was selected.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-600 px-5 py-3 rounded-2xl"
        >
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadState === "notfound") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950 items-center justify-center px-6">
        <Text className="text-gray-600 dark:text-neutral-400 text-center mb-4">
          This property could not be loaded.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(root)/(tabs)")}
          className="bg-blue-600 px-5 py-3 rounded-2xl"
        >
          <Text className="text-white font-semibold">Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadState === "loading" || !form) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center px-5 pt-4 pb-3 gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700"
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            Edit property
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className={sectionClass}>
            <Text className={labelClass}>
              Photos{" "}
              <Text className="text-gray-400 dark:text-neutral-500 font-normal">
                (up to 6)
              </Text>
            </Text>

            <View className="flex-row flex-wrap gap-3">
              {form.localImages.map((uri, index) => (
                <View key={`${uri}-${index}`} className="relative">
                  <Image
                    source={{ uri }}
                    className="w-24 h-24 rounded-2xl"
                    resizeMode="cover"
                  />
                  {index === 0 && (
                    <View className="absolute top-1 left-1 bg-blue-600 px-1.5 py-0.5 rounded-full">
                      <Text className="text-white text-[9px] font-bold">
                        COVER
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={11} color="white" />
                  </TouchableOpacity>
                </View>
              ))}

              {form.localImages.length < 6 && (
                <TouchableOpacity
                  onPress={handlePickImages}
                  disabled={uploadingImages}
                  className="w-24 h-24 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-gray-300 dark:border-neutral-600 items-center justify-center"
                >
                  {uploadingImages ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Ionicons
                        name="camera-outline"
                        size={22}
                        color="#9CA3AF"
                      />
                      <Text className="text-gray-400 dark:text-neutral-500 text-xs mt-1">
                        Add
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>Title</Text>
            <TextInput
              className={inputClass}
              placeholder="e.g. Modern 3BHK in Bandra"
              placeholderTextColor="#9CA3AF"
              value={form.title}
              onChangeText={(v) => updateForm({ title: v })}
            />
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>Description</Text>
            <TextInput
              className={`${inputClass} h-24`}
              placeholder="Describe the property..."
              placeholderTextColor="#9CA3AF"
              value={form.description}
              onChangeText={(v) => updateForm({ description: v })}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>Price (₹)</Text>
            <TextInput
              className={inputClass}
              placeholder="e.g. 5000000"
              placeholderTextColor="#9CA3AF"
              value={form.price}
              onChangeText={(v) => updateForm({ price: v })}
              keyboardType="numeric"
            />
            <Text className="text-xs text-gray-400 dark:text-neutral-500 mt-1.5 ml-1">
              Valid range: ₹1 – ₹{MAX_PRICE.toLocaleString("en-IN")}
            </Text>
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>Property Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => updateForm({ type: t })}
                  className={`px-4 py-2 rounded-full border ${
                    form.type === t
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold capitalize ${
                      form.type === t
                        ? "text-white"
                        : "text-gray-600 dark:text-neutral-300"
                    }`}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row gap-4 mb-5">
            <Counter
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(v) => updateForm({ bedrooms: v })}
            />
            <Counter
              label="Bathrooms"
              value={form.bathrooms}
              onChange={(v) => updateForm({ bathrooms: v })}
            />
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>Area (sq ft)</Text>
            <TextInput
              className={inputClass}
              placeholder="e.g. 1200"
              placeholderTextColor="#9CA3AF"
              value={form.areaSqft}
              onChangeText={(v) => updateForm({ areaSqft: v })}
              keyboardType="numeric"
            />
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>Address</Text>
            <TextInput
              className={inputClass}
              placeholder="Street address"
              placeholderTextColor="#9CA3AF"
              value={form.address}
              onChangeText={(v) => updateForm({ address: v })}
            />
          </View>

          <View className={sectionClass}>
            <Text className={labelClass}>City</Text>
            <TextInput
              className={inputClass}
              placeholder="e.g. Mumbai"
              placeholderTextColor="#9CA3AF"
              value={form.city}
              onChangeText={(v) => updateForm({ city: v })}
            />
          </View>

          <View className={sectionClass}>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className={labelClass}>Coordinates</Text>
              <TouchableOpacity
                onPress={handleDetectLocation}
                disabled={detectingLocation}
                className="flex-row items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full"
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Ionicons name="locate-outline" size={13} color="#2563EB" />
                )}
                <Text className="text-blue-600 text-xs font-semibold">
                  {detectingLocation ? "Detecting..." : "Detect Location"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  className={inputClass}
                  placeholder="Latitude"
                  placeholderTextColor="#9CA3AF"
                  value={form.latitude}
                  onChangeText={(v) => updateForm({ latitude: v })}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <TextInput
                  className={inputClass}
                  placeholder="Longitude"
                  placeholderTextColor="#9CA3AF"
                  value={form.longitude}
                  onChangeText={(v) => updateForm({ longitude: v })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View className="gap-3 mb-5">
            <Toggle
              label="Featured Property"
              description="Show this in the Featured section on home"
              value={form.isFeatured}
              onChange={(v) => updateForm({ isFeatured: v })}
            />
            <Toggle
              label="Mark as sold"
              description="Hide from active listings when sold"
              value={form.isSold}
              onChange={(v) => updateForm({ isSold: v })}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || uploadingImages}
            className="bg-blue-600 rounded-2xl py-4 items-center"
            style={{
              shadowColor: "#2563EB",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
              opacity: submitting || uploadingImages ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Save changes
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
