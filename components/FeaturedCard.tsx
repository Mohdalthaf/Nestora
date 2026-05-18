import { useSavedProperty } from "@/hooks/useSavedProperty";
import { formatPrice } from "@/lib/utils";
import { Property } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function FeaturedCard({
  property,
  showSave = false,
}: {
  property: Property;
  showSave?: boolean;
}) {
  const router = useRouter();
  const imageUrl = property.images?.[0];
  const { isSaved, saveLoading, toggleSave } = useSavedProperty(property.id);

  return (
    <View
      className="w-72 mr-4 rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        opacity: property.is_sold ? 0.5 : 1,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push(`/(root)/property/${property.id}`)}
      >
        {/* Image */}
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require("@/assets/images/kribb.png")
          }
          className="w-full h-44"
          resizeMode="cover"
        />

        {/* Badge */}
        <View className="absolute top-3 left-3 bg-white/90 dark:bg-neutral-900/90 px-3 py-1 rounded-full">
          <Text className="text-xs font-semibold text-blue-600 capitalize">
            {property.type}
          </Text>
        </View>

        {/* Info */}
        <View className="p-4">
          <Text
            className="text-base font-bold text-gray-800 dark:text-neutral-100 mb-1"
            numberOfLines={1}
          >
            {property.title}
          </Text>

          <View className="flex-row items-center gap-1 mb-3">
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text className="text-xs text-gray-500 dark:text-neutral-400" numberOfLines={1}>
              {property.address}, {property.city}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-blue-600 font-bold text-base">
              {formatPrice(property.price)}
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Ionicons name="bed-outline" size={13} color="#6B7280" />
                <Text className="text-xs text-gray-500 dark:text-neutral-400">{property.bedrooms}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="water-outline" size={13} color="#6B7280" />
                <Text className="text-xs text-gray-500 dark:text-neutral-400">
                  {property.bathrooms}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View className="absolute top-3 right-3 flex-row items-center gap-2">
        {showSave && (
          <TouchableOpacity
            onPress={toggleSave}
            disabled={saveLoading}
            className="w-9 h-9 bg-white/95 dark:bg-neutral-900/95 rounded-full items-center justify-center border border-gray-200/80 dark:border-neutral-700"
            style={{ elevation: 2 }}
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={18}
              color={isSaved ? "#EF4444" : "#9CA3AF"}
            />
          </TouchableOpacity>
        )}
        {property.is_sold && (
          <View className="bg-red-500 px-3 py-1 rounded-full">
            <Text className="text-xs font-semibold text-white">Sold</Text>
          </View>
        )}
      </View>
    </View>
  );
}