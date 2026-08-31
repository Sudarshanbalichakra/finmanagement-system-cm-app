import { useFocusEffect } from "expo-router";
import * as Network from "expo-network";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { OfflineFallback } from "@/components/common/offline-fallback";
import { MobileApi } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import {
  MyDayCloseSummaryData,
  MySummaryLoanCollection,
  MySummaryPigmyCollection,
} from "@/types/cm.types";
import { getFriendlyErrorMessage } from "@/utils/error-handler";
import { checkNetworkConnectivity } from "@/utils/network";

type ActivityTab = "ALL" | "LOANS" | "PIGMY";

interface UnifiedTransactionItem {
  id: string;
  type: "LOAN" | "PIGMY";
  accountId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  createdAt?: string;
  isPaid?: boolean;
  approvalStatus?: string;
}

export default function SummaryScreen() {
  const user = useAuthStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [summaryData, setSummaryData] = useState<MyDayCloseSummaryData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityTab>("ALL");

  const fetchSummary = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      // Pre-flight internet & Wi-Fi check
      const netStatus = await checkNetworkConnectivity();
      if (!netStatus.isOnline) {
        setIsOffline(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setIsOffline(false);

      try {
        const res = await MobileApi.getMyDayCloseSummary(selectedDate);
        if (res.success && res.data) {
          setSummaryData(res.data);
        } else {
          setErrorMessage(
            getFriendlyErrorMessage(
              res.message,
              "Unable to load daily summary. Please try again.",
            ),
          );
        }
      } catch (err: any) {
        if (err.message === "Network Error" || !err.response) {
          const recheck = await checkNetworkConnectivity();
          if (!recheck.isOnline) {
            setIsOffline(true);
          }
        }
        const msg = getFriendlyErrorMessage(
          err,
          "Unable to load daily summary. Please try again.",
        );
        setErrorMessage(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate],
  );

  // Auto-refresh every time this tab is focused/switched to
  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary]),
  );

  // Auto-detect when network reconnects in real-time
  useEffect(() => {
    let subscription: any = null;
    try {
      if (typeof Network.addNetworkStateListener === "function") {
        subscription = Network.addNetworkStateListener((state) => {
          const isOnline =
            state.isConnected === true &&
            state.type !== Network.NetworkStateType.NONE &&
            state.isInternetReachable !== false;
          if (isOnline) {
            setIsOffline(false);
            fetchSummary();
          } else {
            setIsOffline(true);
          }
        });
      }
    } catch {}

    return () => {
      subscription?.remove?.();
    };
  }, [fetchSummary]);

  // Overall Stats with Safe Fallbacks
  const stats = useMemo(() => {
    const raw = summaryData?.overallStats;
    return {
      totalCashInHand: raw?.totalCashInHand ?? 0,
      totalTransactions: raw?.totalTransactions ?? 0,
      uniqueCustomersVisited: raw?.uniqueCustomersVisited ?? 0,
      totalLoanCollected: raw?.totalLoanCollected ?? 0,
      loanTransactionsCount: raw?.loanTransactionsCount ?? 0,
      totalPigmyCollected: raw?.totalPigmyCollected ?? 0,
      pigmyTransactionsCount: raw?.pigmyTransactionsCount ?? 0,
    };
  }, [summaryData?.overallStats]);

  // Unified Transactions List for Activity Feed
  const unifiedTransactions = useMemo<UnifiedTransactionItem[]>(() => {
    const loans = (summaryData?.loanCollections || []).map(
      (l: MySummaryLoanCollection, idx: number) => ({
        id: l.collectionId || `loan-${l.loanId}-${idx}`,
        type: "LOAN" as const,
        accountId: l.loanId,
        customerId: l.customerId,
        customerName: l.customerName,
        amount: l.amount,
        createdAt: l.createdAt,
        isPaid: l.isPaid,
        approvalStatus: l.approvalStatus,
      }),
    );

    const pigmy = (summaryData?.pigmyCollections || []).map(
      (p: MySummaryPigmyCollection, idx: number) => ({
        id: p.collectionId || `pigmy-${p.pigmyId}-${idx}`,
        type: "PIGMY" as const,
        accountId: p.pigmyId,
        customerId: p.customerId,
        customerName: p.customerName,
        amount: p.amount,
        createdAt: p.createdAt,
        isPaid: p.isPaid,
      }),
    );

    const combined = [...loans, ...pigmy];

    // Sort by createdAt desc if available
    combined.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return combined;
  }, [summaryData?.loanCollections, summaryData?.pigmyCollections]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (activeTab === "LOANS") {
      return unifiedTransactions.filter((t) => t.type === "LOAN");
    }
    if (activeTab === "PIGMY") {
      return unifiedTransactions.filter((t) => t.type === "PIGMY");
    }
    return unifiedTransactions;
  }, [unifiedTransactions, activeTab]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return "Today";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Today";
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Today";
    }
  };

  // If offline and no data in cache, render full-screen Fallback UI
  if (isOffline && !summaryData) {
    return (
      <OfflineFallback
        isRetrying={loading || refreshing}
        onRetry={() => fetchSummary(true)}
        title="No Internet Connection"
        description="Wi-Fi or Mobile Data is turned off. Please connect to the internet to load and sync your Day Close Summary."
      />
    );
  }

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
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.badgeText}>FINANCIAL RECONCILIATION</Text>
              <Text variant="headlineMedium" style={styles.title}>
                Day Close Summary
              </Text>
              <Text style={styles.subtitle}>
                Route Date: {summaryData?.date || selectedDate}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => fetchSummary(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.refreshIconText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00A859" />
            <Text style={styles.loadingText}>
              Fetching reconciliation summary...
            </Text>
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

            {/* Total Cash in Hand Hero Card */}
            <View style={styles.cashHeroCard}>
              <Text style={styles.cashHeroLabel}>
                TOTAL CASH IN HAND (TO HANDOVER)
              </Text>
              <Text style={styles.cashHeroValue}>
                ₹{stats.totalCashInHand.toLocaleString("en-IN")}
              </Text>
              <View style={styles.heroBadgesRow}>
                <View style={styles.cashHeroBadge}>
                  <Text style={styles.cashHeroBadgeText}>
                    📝 {stats.totalTransactions} Entries Recorded
                  </Text>
                </View>
                <View style={styles.cashHeroBadge}>
                  <Text style={styles.cashHeroBadgeText}>
                    👥 {stats.uniqueCustomersVisited} Visited
                  </Text>
                </View>
              </View>
            </View>

            {/* Financial Breakdown Grid (Loans vs. Pigmy) */}
            <View style={styles.breakdownGrid}>
              {/* Loan Card */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <Text style={styles.breakdownIcon}>💵</Text>
                  <Text style={styles.breakdownCountBadge}>
                    {stats.loanTransactionsCount} rec
                  </Text>
                </View>
                <Text style={styles.breakdownLabel}>LOAN COLLECTIONS</Text>
                <Text style={styles.breakdownValueLoan}>
                  ₹{stats.totalLoanCollected.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.breakdownSub}>
                  {stats.loanTransactionsCount} Installments
                </Text>
              </View>

              {/* Pigmy Card */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <Text style={styles.breakdownIcon}>🏦</Text>
                  <Text style={styles.breakdownCountBadge}>
                    {stats.pigmyTransactionsCount} dep
                  </Text>
                </View>
                <Text style={styles.breakdownLabel}>PIGMY SAVINGS</Text>
                <Text style={styles.breakdownValuePigmy}>
                  ₹{stats.totalPigmyCollected.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.breakdownSub}>
                  {stats.pigmyTransactionsCount} Deposits
                </Text>
              </View>
            </View>

            {/* Today's Transactions Activity Ledger */}
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recorded Collections</Text>
                  <Text style={styles.sectionSubtitle}>
                    Receipts submitted under your CM ID today
                  </Text>
                </View>
              </View>

              {/* Tab Filters */}
              <View style={styles.tabFilterRow}>
                <TouchableOpacity
                  style={[
                    styles.tabFilterBtn,
                    activeTab === "ALL" && styles.tabFilterBtnActive,
                  ]}
                  onPress={() => setActiveTab("ALL")}
                >
                  <Text
                    style={[
                      styles.tabFilterText,
                      activeTab === "ALL" && styles.tabFilterTextActive,
                    ]}
                  >
                    All ({unifiedTransactions.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabFilterBtn,
                    activeTab === "LOANS" && styles.tabFilterBtnActive,
                  ]}
                  onPress={() => setActiveTab("LOANS")}
                >
                  <Text
                    style={[
                      styles.tabFilterText,
                      activeTab === "LOANS" && styles.tabFilterTextActive,
                    ]}
                  >
                    Loans ({stats.loanTransactionsCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabFilterBtn,
                    activeTab === "PIGMY" && styles.tabFilterBtnActive,
                  ]}
                  onPress={() => setActiveTab("PIGMY")}
                >
                  <Text
                    style={[
                      styles.tabFilterText,
                      activeTab === "PIGMY" && styles.tabFilterTextActive,
                    ]}
                  >
                    Pigmy ({stats.pigmyTransactionsCount})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <View style={styles.emptyTransactionsBox}>
                  <Text style={styles.emptyTransactionsIcon}>📋</Text>
                  <Text style={styles.emptyTransactionsTitle}>
                    No collections recorded yet
                  </Text>
                  <Text style={styles.emptyTransactionsSubtitle}>
                    Daily collections recorded on your route will appear here in
                    real time.
                  </Text>
                </View>
              ) : (
                <View style={styles.txListContainer}>
                  {filteredTransactions.map((tx) => (
                    <View key={tx.id} style={styles.txItem}>
                      <View style={styles.txLeft}>
                        <View
                          style={[
                            styles.txTypeIconBox,
                            tx.type === "LOAN"
                              ? styles.txTypeIconLoan
                              : styles.txTypeIconPigmy,
                          ]}
                        >
                          <Text style={styles.txTypeIcon}>
                            {tx.type === "LOAN" ? "💵" : "🏦"}
                          </Text>
                        </View>
                        <View style={styles.txDetails}>
                          <Text
                            style={[
                              styles.txCustomerName,
                              { textTransform: "capitalize" },
                            ]}
                            numberOfLines={1}
                          >
                            {tx.customerName || "Customer"}
                          </Text>
                          <Text style={styles.txSub}>
                            {tx.type === "LOAN" ? "Loan" : "Pigmy"} #
                            {tx.accountId} • {tx.customerId}
                          </Text>
                          <Text style={styles.txTime}>
                            🕒 {formatTime(tx.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={styles.txAmount}>
                          +₹{tx.amount.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Reconciliation Checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>
                Handover Verification Checklist
              </Text>

              <View style={styles.checkItem}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.checkText}>
                  Count physical currency notes to match{" "}
                  <Text style={{ fontWeight: "800" }}>
                    ₹{stats.totalCashInHand.toLocaleString("en-IN")}
                  </Text>{" "}
                  exactly.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.checkText}>
                  Ensure all {stats.totalTransactions} recorded entries match
                  your collection receipts.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.checkText}>
                  Deposit collected physical cash with the Client Branch
                  Administrator.
                </Text>
              </View>
            </View>

            {/* Admin Handover Note */}
            <View style={styles.handoverNote}>
              <Text style={styles.noteTitle}>🔒 Client Data Isolation</Text>
              <Text style={styles.noteBody}>
                All collections are automatically sealed and attributed to
                administrator Once handed over, your branch administrator will
                verify and approve the physical cash ledger.
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
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  refreshIconBtn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  refreshIconText: {
    fontSize: 16,
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
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cashHeroValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    marginVertical: 8,
  },
  heroBadgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  cashHeroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cashHeroBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownGrid: {
    flexDirection: "row",
    gap: 12,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  breakdownHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownIcon: {
    fontSize: 20,
  },
  breakdownCountBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 0.8,
  },
  breakdownValueLoan: {
    fontSize: 18,
    fontWeight: "900",
    color: "#3b00dd",
    marginVertical: 4,
  },
  breakdownValuePigmy: {
    fontSize: 18,
    fontWeight: "900",
    color: "#059669",
    marginVertical: 4,
  },
  breakdownSub: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
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
    marginBottom: 14,
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
  cmMobile: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "700",
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityHeader: {
    marginBottom: 12,
  },
  tabFilterRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabFilterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabFilterBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  tabFilterTextActive: {
    color: "#00A859",
    fontWeight: "800",
  },
  emptyTransactionsBox: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    gap: 6,
  },
  emptyTransactionsIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTransactionsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  emptyTransactionsSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
  txListContainer: {
    gap: 10,
  },
  txItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  txTypeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  txTypeIconLoan: {
    backgroundColor: "#fee2e2",
  },
  txTypeIconPigmy: {
    backgroundColor: "#ecfdf5",
  },
  txTypeIcon: {
    fontSize: 16,
  },
  txDetails: {
    flex: 1,
  },
  txCustomerName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  txSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 1,
  },
  txTime: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },
  txPaidBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txPaidBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#065f46",
  },
  checklistCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
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
