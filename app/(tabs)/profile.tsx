import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth.store";
import { PrimaryButton } from "@/components/forms/primary-button";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {(user?.name || user?.collectionManagerId || "CM")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
          <Text variant="titleLarge" style={styles.userName}>
            {user?.name || "Collection Manager"}
          </Text>
          <Text style={styles.userRoleBadge}>
            {user?.role || "COLLECTION_MANAGER"}
          </Text>
        </View>

        {/* Identity & Client Scoping Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardSectionTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Collection Manager ID</Text>
            <Text style={styles.infoValueHighlight}>
              {user?.collectionManagerId || "N/A"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Client ID</Text>
            <Text style={styles.infoValueBold}>
              {user?.clientId || "N/A"}
            </Text>
          </View>

          {user?.mobile ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registered Mobile</Text>
              <Text style={styles.infoValue}>{user.mobile}</Text>
            </View>
          ) : null}

          {user?.email ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          ) : null}
        </View>

        {/* Security & System Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardSectionTitle}>Security & Workspace</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Authentication</Text>
            <Text style={styles.infoValueGreen}>🔒 JWT Encrypted</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tenant Isolation</Text>
            <Text style={styles.infoValue}>Auto-Scoped to Client</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Expo SDK 54)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Sign Out from Workspace</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fff9",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
    gap: 16,
  },
  profileHeaderCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#00A859",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLargeText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  userName: {
    fontWeight: "800",
    color: "#111827",
  },
  userRoleBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#ecfdf5",
    color: "#065f46",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 8,
    letterSpacing: 0.8,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  infoValueBold: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
  },
  infoValueHighlight: {
    fontSize: 14,
    color: "#00A859",
    fontWeight: "800",
  },
  infoValueGreen: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "700",
  },
  logoutContainer: {
    marginTop: 8,
  },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  logoutBtnText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800",
  },
});
