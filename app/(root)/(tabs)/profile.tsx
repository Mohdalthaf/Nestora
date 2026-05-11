import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function profile() {
  const router = useRouter();
  const {signOut} = useAuth();
  const handleSignOut = async () => {
    try{
      await signOut();
      router.replace("/sign-in");
    }
    catch(error){
      console.error("Error signing out", error);
    }
  };
  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
        <View>
            <Text>Profile</Text>
            <TouchableOpacity
              onPress={handleSignOut}
            >
              <Text>Sign Out</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  )
}