import { useUserSync } from '@/hooks/useUserSync';
import { useAuth } from '@clerk/expo';
import { Redirect, Slot } from 'expo-router';
export default function RootLayout() {
    const { isSignedIn, isLoaded } = useAuth();


    //TODO: sync clerk user-> supabase     if (!isLoaded) return null;
    useUserSync();

    if (!isSignedIn) return <Redirect href="/sign-in" />;

    return <Slot />;

}