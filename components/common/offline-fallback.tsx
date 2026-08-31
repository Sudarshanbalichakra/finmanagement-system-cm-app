import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

interface OfflineFallbackProps {
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  title?: string;
  description?: string;
  showTips?: boolean;
}

export function OfflineFallback({
  onRetry,
  isRetrying = false,
  title = "No Internet Connection",
  description = "Wi-Fi or Mobile Data is turned off. Please enable your internet connection to load the daily route and record collections.",
  showTips = true,
}: OfflineFallbackProps) {
  const handlePressRetry = async () => {
    if (onRetry && !isRetrying) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      onRetry();
    }
  };
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Visual Icon with Glowing Ring */}
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerCircle}>
              <MaterialCommunityIcons
                name="wifi-off"
                size={54}
                color="#dc2626"
              />
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>OFFLINE MODE</Text>
          </View>

          {/* Heading & Subtitle */}
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>

          {/* Checklist / Tips Box */}
          {showTips && (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsHeader}>Troubleshooting Steps:</Text>

              <View style={styles.tipItem}>
                <MaterialCommunityIcons
                  name="cellphone-wireless"
                  size={20}
                  color="#4b5563"
                  style={styles.tipIcon}
                />
                <Text style={styles.tipText}>
                  Turn on <Text style={styles.tipTextBold}>Mobile Data</Text> in your quick settings.
                </Text>
              </View>

              <View style={styles.tipItem}>
                <MaterialCommunityIcons
                  name="wifi"
                  size={20}
                  color="#4b5563"
                  style={styles.tipIcon}
                />
                <Text style={styles.tipText}>
                  Connect to an active <Text style={styles.tipTextBold}>Wi-Fi network</Text>.
                </Text>
              </View>

              <View style={styles.tipItem}>
                <MaterialCommunityIcons
                  name="airplane-off"
                  size={20}
                  color="#4b5563"
                  style={styles.tipIcon}
                />
                <Text style={styles.tipText}>
                  Ensure <Text style={styles.tipTextBold}>Airplane Mode</Text> is disabled.
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          {onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
              onPress={handlePressRetry}
              disabled={isRetrying}
              activeOpacity={0.8}
            >
              {isRetrying ? (
                <View style={styles.buttonContentRow}>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.retryButtonText}>Checking Connection...</Text>
                </View>
              ) : (
                <View style={styles.buttonContentRow}>
                  <MaterialCommunityIcons
                    name="refresh"
                    size={22}
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.footerNote}>
            Collection Manager Mobile Portal • Client Isolated
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  contentContainer: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  iconOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 4,
    borderColor: "#fecaca",
  },
  iconInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#dc2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc2626",
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#991b1b",
    letterSpacing: 0.5,
  },
  title: {
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tipsBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipsHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tipIcon: {
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
  tipTextBold: {
    fontWeight: "700",
    color: "#111827",
  },
  retryButton: {
    width: "100%",
    backgroundColor: "#00A859",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#00A859",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  retryButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
});
