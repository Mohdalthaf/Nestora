import { useNestoraLogo } from '@/hooks/useNestoraLogo';
import { useAuth, useSignUp } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    if ("errors" in error && Array.isArray(error.errors) && error.errors.length > 0) {
      const [firstError] = error.errors;

      if (firstError && typeof firstError === "object") {
        if ("longMessage" in firstError && typeof firstError.longMessage === "string" && firstError.longMessage.trim()) {
          return firstError.longMessage;
        }

        if ("message" in firstError && typeof firstError.message === "string" && firstError.message.trim()) {
          return firstError.message;
        }
      }
    }
  }

  return fallback;
}

function logAuthError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`${context}: ${getErrorMessage(error, "Authentication error")}`);
  }
}

export default function SignUp() {

const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();

  const router = useRouter();
  const nestoraLogo = useNestoraLogo();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isResending, setIsResending] = useState(false);

  const isLoading = fetchStatus === "fetching";

  useEffect(() => {
    if (signUp.status === "complete" || isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn, router, signUp.status]);

  if (signUp.status === "complete" || isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950 px-6">
        <ActivityIndicator color="#2563EB" />
        <Text className="mt-4 text-gray-500 dark:text-neutral-400">Redirecting...</Text>
      </View>
    );
  }

  const onSignUpPress = async () => {
    setGeneralError("");

    try {
      const { error } = await signUp.password({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (error) {
        const message = getErrorMessage(error, "An unexpected error occurred.");
        setGeneralError(message);
        logAuthError("Sign-up failed", error);
        return;
      }

      await signUp.verifications.sendEmailCode();
    } catch (error) {
      const message = getErrorMessage(error, "An unexpected error occurred.");
      setGeneralError(message);
      logAuthError("Sign-up error", error);
    }
  };

  const onVerifyPress = async () => {
    setGeneralError("");

    try {
      await signUp.verifications.verifyEmailCode({ code });

      if(signUp.status === "complete") {
        await signUp.finalize({
            navigate:() =>{
                router.replace("/");
            },
        });
      } else {
        setGeneralError("Verification is not complete yet. Please try again.");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Unable to verify the code. Please try again.");
      setGeneralError(message);
      logAuthError("Sign-up verification failed", error);
    }
  };

  const onResendCodePress = async () => {
    setGeneralError("");
    setIsResending(true);

    try {
      await signUp.verifications.sendEmailCode();
      Alert.alert("Code sent", "We sent a new verification code to your email.");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to send a new verification code.");
      setGeneralError(message);
      logAuthError("Resending sign-up code failed", error);
    } finally {
      setIsResending(false);
    }
  };

  // OTP verification screen
  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-white dark:bg-neutral-950"
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View className="flex-1 justify-center bg-white dark:bg-neutral-950 px-6 py-12">
        <Image
          source={nestoraLogo}
          className="w-32 h-20 mb-4"
          // resizeMode="contain"
        />
        <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Verify your account
        </Text>
        <Text className="text-gray-500 dark:text-neutral-400 mb-8">
          We sent a code to {email}
        </Text>
        {generalError ? (
          <Text className="text-red-500 mb-4">{generalError}</Text>
        ) : null}

        <TextInput
          className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
          placeholder="Enter verification code"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          accessibilityLabel="Verification code"
          accessibilityHint="Enter the email verification code sent to your inbox."
        />
        {errors.fields.code && (
          <Text className="text-red-500 mb-4">
            {errors.fields.code.message}
          </Text>
        )}

        <TouchableOpacity
          onPress={onVerifyPress}
          disabled={isLoading}
          className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
          accessibilityRole="button"
          accessibilityLabel="Verify account"
          accessibilityHint="Submits your verification code and completes account setup."
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onResendCodePress}
          disabled={isResending}
          className="py-2"
          style={{ opacity: isResending ? 0.6 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Send new code"
          accessibilityHint="Requests a fresh email verification code."
        >
          {isResending ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text className="text-blue-600">I need a new code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => signUp.reset()}
          className="py-2"
          accessibilityRole="button"
          accessibilityLabel="Start sign-up over"
          accessibilityHint="Clears your current sign-up progress so you can start again."
        >
          <Text className="text-blue-600">Start over</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    );
  }



  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-950"
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView contentContainerStyle={{ flexGrow: 1}}
    className='bg-white dark:bg-neutral-950'
    keyboardShouldPersistTaps='handled'>
        <View className='flex-1 justify-center px-6 py-12'>
            <Image source={nestoraLogo} 
            className='w-32 h-20 mb-4'
            // resizeMode='contain'
            />

            <Text className='text-3xl font-bold text-gray-800 dark:text-white mb-2'>Create account</Text>
            <Text className='text-gray-500 dark:text-neutral-400 mb-8'>find your dream home today</Text>
            {generalError ? (
                <Text className="text-red-500 mb-4">{generalError}</Text>
            ) : null}

            <View className='flex-row gap-3 mb-4'>
                <TextInput
                    className="flex-1 border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                    placeholder="First name"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    accessibilityLabel="First name"
                    accessibilityHint="Enter your given name."
                />

                <TextInput
                    className="flex-1 border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                    placeholder="Last name"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    accessibilityLabel="Last name"
                    accessibilityHint="Enter your family name."
                />
            </View>

            <TextInput
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email address"
                accessibilityHint="Enter the email address you want to use for this account."
            />
                {errors.fields.emailAddress && (
                    <Text className="text-red-500 mb-4">
                        {errors.fields.emailAddress.message}
                    </Text>
                )}

            <TextInput
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-6 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                accessibilityLabel="Password"
                accessibilityHint="Enter a password for your new account."
            />
                {errors.fields.password && (
                    <Text className="text-red-500 mb-4">
                        {errors.fields.password.message}
                    </Text>
                )}

                <TouchableOpacity
                        onPress={onSignUpPress}
                        disabled={isLoading}
                        className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
                        accessibilityRole="button"
                        accessibilityLabel="Create account"
                        accessibilityHint="Submits your details and starts email verification."
                        >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-base">Sign Up</Text>
                        )}
                </TouchableOpacity>

                <View className="flex-row justify-center">
                    <Text className="text-gray-500 dark:text-neutral-400">Already have an account? </Text>
                    <Link
                      href="/sign-in"
                      accessibilityRole="link"
                      accessibilityLabel="Go to sign in"
                      accessibilityHint="Opens the sign-in screen for existing accounts."
                    >
                        <Text className="text-blue-600 font-semibold">Sign In</Text>
                    </Link>
                </View>

                <View nativeID="clerk-captcha" />

        </View>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}