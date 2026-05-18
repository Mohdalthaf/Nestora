import { useNestoraLogo } from "@/hooks/useNestoraLogo";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
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
} from 'react-native';

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
  const nestoraLogo = useNestoraLogo();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [sendEmailLoading, setSendEmailLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [forgotFlow, setForgotFlow] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotSendLoading, setForgotSendLoading] = useState(false);
  const [forgotVerifyLoading, setForgotVerifyLoading] = useState(false);
  const [forgotSubmitLoading, setForgotSubmitLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";

  const exitForgotPassword = () => {
    setForgotFlow(false);
    setResetCodeSent(false);
    setResetCode("");
    setNewPassword("");
    setGeneralError("");
    try {
      signIn.reset();
    } catch {
      /* ignore */
    }
  };

  const onForgotPasswordSendCode = async () => {
    setGeneralError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setGeneralError("Enter your email address to receive a reset code.");
      return;
    }

    setForgotSendLoading(true);
    try {
      try {
        signIn.reset();
      } catch {
        /* ignore */
      }

      const { error: createError } = await signIn.create({
        identifier: trimmed,
      });
      if (createError) {
        const message = getErrorMessage(
          createError,
          "Unable to start password reset. Check your email and try again."
        );
        setGeneralError(message);
        logAuthError("Forgot password create", createError);
        return;
      }

      const { error: sendError } =
        await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        const message = getErrorMessage(
          sendError,
          "Unable to send reset code. Please try again."
        );
        setGeneralError(message);
        logAuthError("Forgot password sendCode", sendError);
        return;
      }

      setResetCodeSent(true);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Something went wrong. Please try again."
      );
      setGeneralError(message);
      logAuthError("Forgot password send", error);
    } finally {
      setForgotSendLoading(false);
    }
  };

  const onForgotPasswordVerifyCode = async () => {
    setGeneralError("");
    if (!resetCode.trim()) {
      setGeneralError("Enter the code from your email.");
      return;
    }

    setForgotVerifyLoading(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({
        code: resetCode.trim(),
      });
      if (error) {
        const message = getErrorMessage(
          error,
          "Invalid or expired code. Please try again."
        );
        setGeneralError(message);
        logAuthError("Forgot password verifyCode", error);
        return;
      }
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to verify the code. Please try again."
      );
      setGeneralError(message);
      logAuthError("Forgot password verify", error);
    } finally {
      setForgotVerifyLoading(false);
    }
  };

  const onForgotPasswordResendCode = async () => {
    setGeneralError("");
    setForgotSendLoading(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) {
        const message = getErrorMessage(
          error,
          "Unable to resend the code. Please try again."
        );
        setGeneralError(message);
        logAuthError("Forgot password resend", error);
        return;
      }
      Alert.alert("Code sent", "We sent a new code to your email.");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to resend the code. Please try again."
      );
      setGeneralError(message);
      logAuthError("Forgot password resend", error);
    } finally {
      setForgotSendLoading(false);
    }
  };

  const onForgotPasswordSubmit = async () => {
    setGeneralError("");
    if (!newPassword.trim()) {
      setGeneralError("Enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setGeneralError("Password must be at least 8 characters.");
      return;
    }

    setForgotSubmitLoading(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (error) {
        const message = getErrorMessage(
          error,
          "Unable to set password. Please try again."
        );
        setGeneralError(message);
        logAuthError("Forgot password submitPassword", error);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setGeneralError(
                "Additional verification is required before you can continue."
              );
              return;
            }

            const url = decorateUrl("/");
            router.replace(url as any);
          },
        });
      } else if (signIn.status === "needs_second_factor") {
        setGeneralError(
          "This account requires two-factor authentication. Sign in with your password, then complete 2FA."
        );
        exitForgotPassword();
      } else {
        const message =
          "Password was updated but sign-in did not complete. Try signing in.";
        setGeneralError(message);
        logAuthError("Forgot password incomplete status", signIn.status);
      }
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to complete password reset. Please try again."
      );
      setGeneralError(message);
      logAuthError("Forgot password submit", error);
    } finally {
      setForgotSubmitLoading(false);
    }
  };


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

  // Forgot password (Clerk resetPasswordEmailCode)
  if (forgotFlow) {
    const busyForgot =
      forgotSendLoading || forgotVerifyLoading || forgotSubmitLoading || isLoading;

    return (
      <KeyboardAvoidingView
        className="flex-1 bg-white dark:bg-neutral-950"
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="bg-white dark:bg-neutral-950"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-12">
            <Image
              source={nestoraLogo}
              className="w-32 h-20 mb-4"
            />

            <Text className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Reset password
            </Text>
            <Text className="text-gray-500 dark:text-neutral-400 mb-8">
              {!resetCodeSent
                ? "Enter your email and we will send you a reset code."
                : signIn.status === "needs_new_password"
                  ? "Choose a new password for your account."
                  : `Enter the code we sent to ${email.trim() || "your email"}.`}
            </Text>

            {generalError ? (
              <Text className="text-red-500 mb-4">{generalError}</Text>
            ) : null}

            {!resetCodeSent ? (
              <>
                <TextInput
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.fields.identifier ? (
                  <Text className="text-red-500 mb-4">
                    {errors.fields.identifier.message}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={onForgotPasswordSendCode}
                  disabled={busyForgot}
                  className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
                >
                  {forgotSendLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Send reset code
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {resetCodeSent && signIn.status !== "needs_new_password" ? (
              <>
                <TextInput
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                  placeholder="Reset code"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={resetCode}
                  onChangeText={setResetCode}
                  autoCapitalize="none"
                />
                {errors.fields.code ? (
                  <Text className="text-red-500 mb-4">
                    {errors.fields.code.message}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={onForgotPasswordVerifyCode}
                  disabled={busyForgot}
                  className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
                >
                  {forgotVerifyLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Verify code
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onForgotPasswordResendCode}
                  disabled={forgotSendLoading}
                  className="py-2 mb-2"
                >
                  {forgotSendLoading ? (
                    <ActivityIndicator color="#2563EB" />
                  ) : (
                    <Text className="text-blue-600">Resend code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {signIn.status === "needs_new_password" ? (
              <>
                <TextInput
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                  placeholder="New password"
                  placeholderTextColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                {errors.fields.password ? (
                  <Text className="text-red-500 mb-4">
                    {errors.fields.password.message}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={onForgotPasswordSubmit}
                  disabled={busyForgot}
                  className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
                >
                  {forgotSubmitLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Set new password
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity onPress={exitForgotPassword} className="py-2 mt-2">
              <Text className="text-blue-600 text-center font-semibold">
                Back to sign in
              </Text>
            </TouchableOpacity>

            <View nativeID="clerk-captcha" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // OTP verification screen
  if (signIn.status === "needs_client_trust") {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-white dark:bg-neutral-950"
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View className="flex-1 justify-center bg-white dark:bg-neutral-950 px-6 py-12">
        <Image
          source={nestoraLogo}
          className="w-32 h-16 mb-8"
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Verify your account
        </Text>
        <Text className="text-gray-500 dark:text-neutral-400 mb-8 text-center">
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

            <Text className='text-3xl font-bold text-gray-800 dark:text-white mb-2'>Welcome Back</Text>
            <Text className='text-gray-500 dark:text-neutral-400 mb-8'>Sign in to your account</Text>
            {generalError ? (
                <Text className="text-red-500 mb-4">{generalError}</Text>
            ) : null}

            <TextInput
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
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
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 mb-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
                {errors.fields.password && (
                    <Text className="text-red-500 mb-2">
                        {errors.fields.password.message}
                    </Text>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setGeneralError("");
                    setResetCodeSent(false);
                    setResetCode("");
                    setNewPassword("");
                    try {
                      signIn.reset();
                    } catch {
                      /* ignore */
                    }
                    setForgotFlow(true);
                  }}
                  className="self-end mb-4"
                >
                  <Text className="text-blue-600 text-sm font-semibold">
                    Forgot password?
                  </Text>
                </TouchableOpacity>

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
                    <Text className="text-gray-500 dark:text-neutral-400">Don't have an account? </Text>
                    <Link href="/sign-up">
                        <Text className="text-blue-600 font-semibold">Sign Up</Text>
                    </Link>
                </View>

                <View nativeID="clerk-captcha" />

        </View>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}