import FeaturedCard from '@/components/FeaturedCard';
import PropertyCard from '@/components/PropertyCard';
import { useNestoraLogo } from '@/hooks/useNestoraLogo';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { TAB_SCROLL_BOTTOM_PADDING, TabScreen } from '@/components/TabScreen';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

export default function HomeScreen() {

  const { user } = useUser();
  const router = useRouter();
  const nestoraLogo = useNestoraLogo();

  const [featured, setFeatured] = useState<Property[]>([]);
  const [recommended, setRecommended] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const featuredResponse = await supabase
        .from("properties")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (featuredResponse.error) {
        setError(`Failed to load featured properties: ${featuredResponse.error.message}`);
        setFeatured([]);
        setRecommended([]);
        return;
      }

      const recommendedResponse = await supabase
        .from("properties")
        .select("*")
        .eq("is_featured", false)
        .order("created_at", { ascending: false });

      if (recommendedResponse.error) {
        setError(`Failed to load recommended properties: ${recommendedResponse.error.message}`);
        setFeatured([]);
        setRecommended([]);
        return;
      }

      setFeatured(featuredResponse.data ?? []);
      setRecommended(recommendedResponse.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load properties");
      setFeatured([]);
      setRecommended([]);
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [])
  );

  
  return (
    <TabScreen>
        <FlatList
        className="flex-1"
        data={recommended}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: TAB_SCROLL_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
              <Image
                source={nestoraLogo}
                style={{ width: 90, height: 65 }}
                // contentFit='contain'
              />
              <View className="items-end">
                <Text className="text-gray-500 dark:text-neutral-400 text-sm">
                  {getTimeBasedGreeting()} 👋
                </Text>
                <Text className="text-gray-900 dark:text-white text-base font-bold">
                  {user?.firstName ?? "User"}
                </Text>
              </View>
            </View>

            {/* Search Bar */}
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/search")}
              className="mx-5 mb-6 flex-row items-center bg-white dark:bg-neutral-900 rounded-2xl px-4 py-3 gap-3 border border-gray-100 dark:border-neutral-800"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <Text className="text-gray-400 dark:text-neutral-500 text-sm flex-1">
                Search properties, cities...
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/(root)/(tabs)/search?openFilters=true")
                }
                className="w-8 h-8 bg-blue-600 rounded-xl items-center justify-center"
              >
                <Ionicons name="options-outline" size={15} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* featured properties */}
            <View className="mb-6">
              <Text className="text-gray-900 dark:text-white text-lg font-bold px-5 mb-4">
                Featured
              </Text>

              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                  className="py-10"
                />
              ) : (
                <FlatList
                  data={featured}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <FeaturedCard property={item} showSave />
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                />
              )}
            </View>

            {/* recommended properties */}
            <Text className="text-gray-900 dark:text-white text-lg font-bold px-5 mb-4">
              Recommended
            </Text>

            {error ? (
                <Text className="text-red-500 dark:text-red-400 px-5 mb-4">{error}</Text>
            ) : null}

          </View>
        }

        renderItem={({item})=>(
          <View className="px-5 mb-3">
            <PropertyCard property={item} showSave />
          </View>
        )}

        ListEmptyComponent={
          !loading ? (
            <View className="items-center py-10">
              <Text className="text-gray-400 dark:text-neutral-500">No properties found</Text>
            </View>
          ) : null
        }
        />
    </TabScreen>
  )
}