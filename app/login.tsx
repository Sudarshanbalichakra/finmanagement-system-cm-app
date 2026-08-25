import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Input } from "@/components/forms/input";
import { PrimaryButton } from "@/components/forms/primary-button";
import { cmLoginApi } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";

import { getFriendlyErrorMessage } from "@/utils/error-handler";

const loginSchema = z.object({
  collectionManagerId: z
    .string()
    .trim()
    .min(1, "Collection Manager ID is required"),
  password: z
    .string()
    .min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function CMLoginScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      collectionManagerId: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginFormValues) => {
    if (loading) return; // Prevent duplicate requests

    setLoading(true);
    setErrorMessage(null);

    const formattedPayload = {
      collectionManagerId: data.collectionManagerId.trim(),
      password: data.password,
    };

    try {
      const { accessToken, user } = await cmLoginApi(formattedPayload);

      // Save token and user details in secure storage & state
      await setAuth(accessToken, user);

      // Navigate to CM Dashboard
      router.replace("/(tabs)");
    } catch (error: any) {
      const friendlyMsg = getFriendlyErrorMessage(
        error,
        "Invalid Collection Manager ID or password."
      );
      setErrorMessage(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Branding */}
          <View style={styles.headerContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>CM</Text>
            </View>
            <Text variant="titleMedium" style={styles.appBadge}>
              COLLECTION MANAGER APP
            </Text>
            <Text variant="headlineMedium" style={styles.title}>
              Welcome Back
            </Text>
            <Text style={styles.subtitle}>
              Login to continue to your collection workspace
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerIcon}>⚠️</Text>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="collectionManagerId"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Collection Manager ID"
                  placeholder="Enter CM ID (e.g. CM-0001)"
                  value={value}
                  onChangeText={(text) => {
                    setErrorMessage(null);
                    onChange(text);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  leftIcon="account-badge-outline"
                  error={errors.collectionManagerId?.message}
                  editable={!loading}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter password"
                  value={value}
                  onChangeText={(text) => {
                    setErrorMessage(null);
                    onChange(text);
                  }}
                  secureTextEntry
                  showPasswordToggle
                  leftIcon="lock-outline"
                  error={errors.password?.message}
                  editable={!loading}
                />
              )}
            />

            <View style={styles.actionContainer}>
              <PrimaryButton
                title="Login"
                onPress={handleSubmit(handleLogin)}
                loading={loading}
                disabled={loading}
              />
            </View>
          </View>

          {/* Footer Security Badge */}
          <View style={styles.footerContainer}>
            <Text style={styles.securityText}>
              🔒 Secure Collection Management System
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fff9",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#00A859",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  logoText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
  },
  appBadge: {
    color: "#00A859",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: "#111827",
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerIcon: {
    fontSize: 16,
  },
  errorBannerText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  actionContainer: {
    marginTop: 12,
  },
  footerContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  securityText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});
