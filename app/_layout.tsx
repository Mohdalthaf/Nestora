import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ThemeSync } from '@/components/ThemeSync';
import { Slot } from 'expo-router';
import { colorScheme } from 'nativewind';
import "../global.css";

// Expo only allows Appearance.setColorScheme when userInterfaceStyle is "automatic".
// Default to light until ThemeSync reads the saved preference.
colorScheme.set('light');

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeSync />
      <Slot />
    </ClerkProvider>
  )
}