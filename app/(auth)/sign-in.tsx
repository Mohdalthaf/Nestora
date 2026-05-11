import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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



export default function SignIn() {

const { signIn, errors, fetchStatus } = useSignIn();

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [sendEmailLoading, setSendEmailLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";


  const onSignInPress = async () => {
    setGeneralError("");

    try {
      const { error } = await signIn.password({
        emailAddress: email,
        password,
      });

      if (error) {
        const message = getErrorMessage(error, "Unable to sign in. Please try again.");
        setGeneralError(message);
        logAuthError("Sign-in failed", error);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setGeneralError("Additional verification is required before you can continue.");
              return;
            }

            const url = decorateUrl("/");
            router.replace(url as any);
          },
        });
      } else if (signIn.status === "needs_second_factor") {
        const { error: phoneCodeError } = await signIn.mfa.sendPhoneCode();

        if (phoneCodeError) {
          const message = getErrorMessage(phoneCodeError, "Unable to send the phone verification code.");
          setGeneralError(message);
          logAuthError("Failed to send phone code", phoneCodeError);
        }
      } else if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code"
        );

        if (!emailCodeFactor) {
          const message = "Email verification is not available for this account.";
          setGeneralError(message);
          logAuthError("Missing email code factor", message);
          return;
        }

        try {
          await signIn.mfa.sendEmailCode();
        } catch (error) {
          const message = getErrorMessage(error, "Unable to send the email verification code.");
          setGeneralError(message);
          logAuthError("Failed to send email code", error);
        }
      } else {
        const message = "Sign-in could not be completed. Please try again.";
        setGeneralError(message);
        logAuthError("Unexpected sign-in status", signIn.status);
      }
    } catch (error) {
      const message = getErrorMessage(error, "Unable to sign in. Please try again.");
      setGeneralError(message);
      logAuthError("Unexpected sign-in error", error);
    }
  };

  const onVerifyPress = async () => {
    setGeneralError("");

    try {
      await signIn.mfa.verifyEmailCode({ code });

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setGeneralError("Additional verification is required before you can continue.");
              return;
            }

            const url = decorateUrl("/");
            router.replace(url as any);
          },
        });
      } else {
        const message = "Verification is not complete yet. Please try again.";
        setGeneralError(message);
        logAuthError("Unexpected verification status", signIn.status);
      }
    } catch (error) {
      const message = getErrorMessage(error, "Unable to verify the code. Please try again.");
      setGeneralError(message);
      logAuthError("Email code verification failed", error);
    }
  };

  const onResendCodePress = async () => {
    setGeneralError("");
    setSendEmailLoading(true);

    try {
      await signIn.mfa.sendEmailCode();
    } catch (error) {
      const message = getErrorMessage(error, "Unable to send a new verification code.");
      setGeneralError(message);
      logAuthError("Resending email code failed", error);
    } finally {
      setSendEmailLoading(false);
    }
  };

  const onResetPress = async () => {
    setGeneralError("");
    setResetLoading(true);

    try {
      signIn.reset();
      setCode("");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to restart sign-in. Please try again.");
      setGeneralError(message);
      logAuthError("Resetting sign-in failed", error);
    } finally {
      setResetLoading(false);
    }
  };

  // OTP verification screen
  if (signIn.status === "needs_client_trust") {
    return (
      <View className="flex-1 justify-center  bg-white px-6 py-12">
        <Image
          source={require("../../assets/images/kribb.png")}
          className="w-32 h-16 mb-8"
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          Verify your account
        </Text>
        <Text className="text-gray-500 mb-8 text-center">
          We sent a code to {email}
        </Text>
        {generalError ? (
          <Text className="text-red-500 mb-4">{generalError}</Text>
        ) : null}

        <TextInput
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="Enter verification code"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
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
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onResendCodePress}
          disabled={sendEmailLoading}
          className="py-2"
        >
          {sendEmailLoading ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text className="text-blue-600">I need a new code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onResetPress} disabled={resetLoading} className="py-2">
          {resetLoading ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text className="text-blue-600">Start over</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1}}
    className='bg-white'
    keyboardShouldPersistTaps='handled'>
        <View className='flex-1 justify-center px-6 py-12'>
            <Image source={require('../../assets/images/kribb.png')} 
            className='w-32 h-16 mb-8'
            resizeMode='contain'
            />

            <Text className='text-3xl font-bold text-gray-800 mb-2'>Welcome Back</Text>
            <Text className='text-gray-500 mb-8'>Sign in to your account</Text>
            {generalError ? (
                <Text className="text-red-500 mb-4">{generalError}</Text>
            ) : null}

            <TextInput
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
                {errors.fields.identifier && (
                    <Text className="text-red-500 mb-4">
                        {errors.fields.identifier.message}
                    </Text>
                )}

            <TextInput
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6"
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
                {errors.fields.password && (
                    <Text className="text-red-500 mb-4">
                        {errors.fields.password.message}
                    </Text>
                )}

                <TouchableOpacity
                        onPress={onSignInPress}
                        disabled={isLoading}
                        className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
                        >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-base">Sign In</Text>
                        )}
                </TouchableOpacity>

                <View className="flex-row justify-center">
                    <Text className="text-gray-500">Don't have an account? </Text>
                    <Link href="/sign-up">
                        <Text className="text-blue-600 font-semibold">Sign Up</Text>
                    </Link>
                </View>

                <View nativeID="clerk-captcha" />

        </View>
    </ScrollView>
  )
}