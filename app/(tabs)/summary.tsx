import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth.store";
import { MobileApi } from "@/services/api";
import { DailySummaryData } from "@/types/cm.types";
import { getFriendlyErrorMessage } from "@/utils/error-handler";

export default function SummaryScreen() {
  const user = useAuthStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const res = await MobileApi.getDailySummary(selectedDate);
        if (res.success && res.data) {
          setSummaryData(res.data);
        } else {
          setErrorMessage(
            getFriendlyErrorMessage(
              res.message,
              "Unable to load daily summary. Please try again."
            )
          );
        }
      } catch (err: any) {
        const msg = getFriendlyErrorMessage(
          err,
          "Unable to load daily summary. Please try again."
        );
        setErrorMessage(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSummary(true)}
            colors={["#00A859"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badgeText}>FINANCIAL RECONCILIATION</Text>
          <Text variant="headlineMedium" style={styles.title}>
            Day Close Summary
          </Text>
          <Text style={styles.subtitle}>
            Reconcile physical cash collected today ({selectedDate})
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00A859" />
            <Text style={styles.loadingText}>Fetching reconciliation ledger...</Text>
          </View>
        ) : (
          <>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchSummary()}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Total Cash Reconcile Card */}
            <View style={styles.cashHeroCard}>
              <Text style={styles.cashHeroLabel}>TOTAL CASH TO HANDOVER</Text>
              <Text style={styles.cashHeroValue}>
                ₹{(summaryData?.totalAmount || 0).toLocaleString("en-IN")}
              </Text>
              <View style={styles.cashHeroBadge}>
                <Text style={styles.cashHeroBadgeText}>
                  {summaryData?.totalCollections || 0} Total Receipts Today
                </Text>
              </View>
            </View>

            {/* CM Collection Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>CM Collection Breakdown</Text>
              <Text style={styles.sectionSubtitle}>
                Verified collections logged under your CM account
              </Text>

              <View style={styles.cmRow}>
                <View style={styles.cmAvatar}>
                  <Text style={styles.cmAvatarText}>
                    {(user?.name || user?.collectionManagerId || "CM")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cmInfo}>
                  <Text style={styles.cmName}>
                    {user?.name || "Collection Manager"}
                  </Text>
                  <Text style={styles.cmId}>
                    ID: {user?.collectionManagerId || "CM-User"} | Client:{" "}
                    {user?.clientId || "CLI"}
                  </Text>
                </View>
                <View style={styles.cmAmountBox}>
                  <Text style={styles.cmAmount}>
                    ₹{(summaryData?.totalAmount || 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.cmCount}>
                    {summaryData?.totalCollections || 0} collections
                  </Text>
                </View>
              </View>
            </View>

            {/* Reconciliation Checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>Handover Verification Checklist</Text>

              <View style={styles.checkItem}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.checkText}>
                  Count physical currency notes to match total amount exactly.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.checkText}>
                  Ensure all collected receipts are synced with the server.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.checkText}>
                  Deposit collected cash with the Client Branch Administrator.
                </Text>
              </View>
            </View>

            {/* Admin Handover Note */}
            <View style={styles.handoverNote}>
              <Text style={styles.noteTitle}>🔒 Client Data Isolation</Text>
              <Text style={styles.noteBody}>
                All collections are automatically sealed and attributed to Client{" "}
                <Text style={{ fontWeight: "700" }}>{user?.clientId}</Text>.
                Once handed over, your branch admin will verify and approve the
                physical cash ledger.
              </Text>
            </View>
          </>
        )}
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
  header: {
    marginBottom: 4,
  },
  badgeText: {
    color: "#00A859",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 11,
    marginBottom: 4,
  },
  title: {
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  cashHeroCard: {
    backgroundColor: "#00A859",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#00A859",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cashHeroLabel: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cashHeroValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    marginVertical: 8,
  },
  cashHeroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cashHeroBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 16,
  },
  cmRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cmAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
  },
  cmAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  cmInfo: {
    flex: 1,
  },
  cmName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  cmId: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  cmAmountBox: {
    alignItems: "flex-end",
  },
  cmAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  cmCount: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  checklistCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  checkItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  checkIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  checkText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
    lineHeight: 18,
  },
  handoverNote: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 18,
  },
});
