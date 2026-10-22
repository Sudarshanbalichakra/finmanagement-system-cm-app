import { useFocusEffect } from "expo-router";
import * as Network from "expo-network";
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { CollectCashModal } from "@/components/collection/collect-cash-modal";
import { OfflineFallback } from "@/components/common/offline-fallback";
import { CustomerCard } from "@/components/customer/customer-card";
import { CustomerDetailsModal } from "@/components/customer/customer-details-modal";
import { MobileApi } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CustomerFeedItem,
  MobileFeedData,
  MobileFeedStats,
} from "@/types/cm.types";
import { getCustomerVisitedStatus } from "@/utils/collection-status";
import { getFriendlyErrorMessage } from "@/utils/error-handler";
import { checkNetworkConnectivity } from "@/utils/network";

type FilterType = "ALL" | "OVERDUE" | "PENDING" | "VISITED" | "LOANS" | "PIGMY";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const currentCMId = user?.collectionManagerId;

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [feedData, setFeedData] = useState<MobileFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  // Modals state
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerFeedItem | null>(null);
  const [initialCollectType, setInitialCollectType] = useState<
    "LOAN" | "PIGMY"
  >("LOAN");
  const [initialTargetId, setInitialTargetId] = useState<string | undefined>(
    undefined,
  );

  const fetchFeed = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      // 1. Pre-flight Internet & Wi-Fi Check
      const netStatus = await checkNetworkConnectivity();
      if (!netStatus.isOnline) {
        setIsOffline(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setIsOffline(false);

      try {
        const [feedRes, loanCollectionsRes, pigmyCollectionsRes] =
          await Promise.allSettled([
            MobileApi.getMobileFeed(selectedDate),
            MobileApi.getDailyCollections(selectedDate),
            MobileApi.getDailyPigmyCollections(selectedDate),
          ]);

        if (
          feedRes.status === "fulfilled" &&
          feedRes.value.success &&
          feedRes.value.data
        ) {
          let feed = feedRes.value.data;

          // Extract daily loan collections if available
          let rawLoanCollections: any[] = [];
          if (
            loanCollectionsRes.status === "fulfilled" &&
            loanCollectionsRes.value
          ) {
            const val = loanCollectionsRes.value;
            if (Array.isArray(val)) {
              rawLoanCollections = val;
            } else if (Array.isArray(val.data)) {
              rawLoanCollections = val.data;
            } else if (Array.isArray(val.collections)) {
              rawLoanCollections = val.collections;
            } else if (Array.isArray(val.dailyCollections)) {
              rawLoanCollections = val.dailyCollections;
            }
          }

          // Extract daily pigmy collections if available
          let rawPigmyCollections: any[] = [];
          if (
            pigmyCollectionsRes.status === "fulfilled" &&
            pigmyCollectionsRes.value
          ) {
            const val = pigmyCollectionsRes.value;
            if (Array.isArray(val)) {
              rawPigmyCollections = val;
            } else if (Array.isArray(val.data)) {
              rawPigmyCollections = val.data;
            } else if (Array.isArray(val.collections)) {
              rawPigmyCollections = val.collections;
            } else if (Array.isArray(val.pigmyCollections)) {
              rawPigmyCollections = val.pigmyCollections;
            }
          }

          const hasCollections =
            rawLoanCollections.length > 0 || rawPigmyCollections.length > 0;

          if (hasCollections && feed.customers) {
            const updatedCustomers = feed.customers.map((cust) => {
              // Loan Matching
              const updatedLoans = (cust.loans || []).map((l) => {
                const matchedLoan =
                  rawLoanCollections.find(
                    (c) =>
                      c.loanId &&
                      String(c.loanId).trim() === String(l.loanId).trim(),
                  ) ||
                  rawLoanCollections.find(
                    (c) =>
                      !c.pigmyId &&
                      c.customerId &&
                      String(c.customerId).trim() ===
                        String(cust.customerId).trim(),
                  );

                if (matchedLoan) {
                  return {
                    ...l,
                    isPaid: true,
                    todayCollected: true,
                    todayCollectionAmount:
                      matchedLoan.amount || l.todayCollectionAmount || 0,
                    collectedBy:
                      matchedLoan.collectionManagerId ||
                      matchedLoan.collectedBy ||
                      l.collectedBy,
                    collectionManagerId:
                      matchedLoan.collectionManagerId || l.collectionManagerId,
                  };
                }
                return l;
              });

              // Pigmy Matching
              const updatedPigmy = (cust.pigmyAccounts || []).map((p) => {
                const matchedPigmy =
                  rawPigmyCollections.find(
                    (c) =>
                      c.pigmyId &&
                      String(c.pigmyId).trim() === String(p.pigmyId).trim(),
                  ) ||
                  rawPigmyCollections.find(
                    (c) =>
                      c.customerId &&
                      String(c.customerId).trim() ===
                        String(cust.customerId).trim(),
                  );

                if (matchedPigmy) {
                  return {
                    ...p,
                    isPaid: true,
                    todayCollected: true,
                    todayCollectionAmount:
                      matchedPigmy.amount || p.todayCollectionAmount || 0,
                    collectedBy:
                      matchedPigmy.collectionManagerId ||
                      matchedPigmy.collectedBy ||
                      p.collectedBy,
                    collectionManagerId:
                      matchedPigmy.collectionManagerId || p.collectionManagerId,
                  };
                }
                return p;
              });

              const isAnyLoanPaid = updatedLoans.some(
                (l) => l.isPaid || l.todayCollected,
              );
              const isAnyPigmyPaid = updatedPigmy.some(
                (p) => p.isPaid || p.todayCollected,
              );
              const isCustomerPaid =
                isAnyLoanPaid || isAnyPigmyPaid || cust.todayVisited || cust.isPaid;

              return {
                ...cust,
                isPaid: isCustomerPaid,
                todayVisited: isCustomerPaid,
                todayCollected: isCustomerPaid,
                loans: updatedLoans,
                pigmyAccounts: updatedPigmy,
              };
            });

            feed = {
              ...feed,
              customers: updatedCustomers,
            };
          }

          setFeedData(feed);
        } else {
          setErrorMessage(
            getFriendlyErrorMessage(
              feedRes.status === "fulfilled"
                ? feedRes.value.message
                : (feedRes as any).reason,
              "Unable to load today's collection route. Please try again.",
            ),
          );
        }
      } catch (err: any) {
        // If network error occurred
        if (err.message === "Network Error" || !err.response) {
          const recheck = await checkNetworkConnectivity();
          if (!recheck.isOnline) {
            setIsOffline(true);
          }
        }
        const msg = getFriendlyErrorMessage(
          err,
          "Unable to load today's collection route. Please try again.",
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
      fetchFeed();
    }, [fetchFeed]),
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
            fetchFeed();
          } else {
            setIsOffline(true);
          }
        });
      }
    } catch {}

    return () => {
      subscription?.remove?.();
    };
  }, [fetchFeed]);

  const handleOpenCollect = useCallback(
    (
      customer: CustomerFeedItem,
      type?: "LOAN" | "PIGMY",
      targetId?: string,
    ) => {
      setSelectedCustomer(customer);
      if (type) setInitialCollectType(type);
      setInitialTargetId(targetId);
      setCollectModalVisible(true);
    },
    [],
  );

  const handleOpenDetails = useCallback((customer: CustomerFeedItem) => {
    setSelectedCustomer(customer);
    setDetailsModalVisible(true);
  }, []);

  const handleCall = useCallback((phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleCollectSuccess = useCallback(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  const handleCloseCollect = useCallback(() => {
    setCollectModalVisible(false);
    setSelectedCustomer(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsModalVisible(false);
    setSelectedCustomer(null);
  }, []);

  const handleDetailsToCollect = useCallback(
    (cust: CustomerFeedItem, type?: "LOAN" | "PIGMY", targetId?: string) => {
      setDetailsModalVisible(false);
      handleOpenCollect(cust, type, targetId);
    },
    [handleOpenCollect],
  );

  // High-performance memoized filter list using getCustomerVisitedStatus
  const filteredCustomers = useMemo(() => {
    const rawList = feedData?.customers;
    if (!rawList || rawList.length === 0) return [];

    const q = deferredSearchQuery.trim().toLowerCase();

    return rawList.filter((c) => {
      // Search match
      if (q) {
        const matches =
          c.customerName?.toLowerCase().includes(q) ||
          c.mobile?.includes(q) ||
          c.customerId?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      const status = getCustomerVisitedStatus(c, currentCMId);

      // Filter category match
      if (activeFilter === "OVERDUE") {
        return Boolean(
          c.loans &&
            c.loans.some(
              (l) => String(l.status || "").toUpperCase() === "OVERDUE",
            ),
        );
      }
      if (activeFilter === "PENDING") {
        return !status.isVisited;
      }
      if (activeFilter === "VISITED") {
        return status.isVisited;
      }
      if (activeFilter === "LOANS") {
        return c.hasActiveLoan || (c.loans && c.loans.length > 0);
      }
      if (activeFilter === "PIGMY") {
        return (
          c.hasActivePigmy || (c.pigmyAccounts && c.pigmyAccounts.length > 0)
        );
      }
      return true;
    });
  }, [feedData?.customers, deferredSearchQuery, activeFilter, currentCMId]);

  const overdueCount = useMemo(() => {
    if (!feedData?.customers) return 0;
    return feedData.customers.filter((c) =>
      c.loans?.some(
        (l) => String(l.status || "").toUpperCase() === "OVERDUE",
      ),
    ).length;
  }, [feedData?.customers]);

  const stats: MobileFeedStats = useMemo(() => {
    return (
      feedData?.stats || {
        totalCustomers: 0,
        customersWithLoans: 0,
        customersWithPigmy: 0,
        visitedCustomersToday: 0,
        totalLoanCollectedToday: 0,
        totalPigmyCollectedToday: 0,
        totalCashCollectedToday: 0,
      }
    );
  }, [feedData?.stats]);

  // Compute dynamic visited count across all CMs
  const effectiveVisitedCount = useMemo(() => {
    if (!feedData?.customers) return stats.visitedCustomersToday || 0;
    const visitedCount = feedData.customers.filter(
      (c) => getCustomerVisitedStatus(c, currentCMId).isVisited,
    ).length;
    return Math.max(stats.visitedCustomersToday || 0, visitedCount);
  }, [feedData?.customers, stats.visitedCustomersToday, currentCMId]);

  const keyExtractor = useCallback(
    (item: CustomerFeedItem) => item.customerId,
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: CustomerFeedItem }) => (
      <CustomerCard
        item={item}
        onPress={handleOpenDetails}
        onCall={handleCall}
        onCollect={handleOpenCollect}
      />
    ),
    [handleOpenDetails, handleCall, handleOpenCollect],
  );

  const renderHeader = useMemo(
    () => (
      <View style={styles.topSection}>
        {/* CM Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.cmRoleBadge}>COLLECTION MANAGER</Text>
              <Text
                variant="headlineSmall"
                style={[styles.heroTitle, { textTransform: "capitalize" }]}
              >
                {user?.name || user?.collectionManagerId || "CM Dashboard"}
              </Text>
              <Text style={styles.heroSubtitle}>
                Route Date: {selectedDate}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => fetchFeed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.refreshIconText}>🔄</Text>
            </TouchableOpacity>
          </View>

          {/* KPI Stats Box (Rendered directly from API) */}
          <View style={styles.kpiTotalBox}>
            <Text style={styles.kpiTotalLabel}>TOTAL CASH COLLECTED TODAY</Text>
            <Text style={styles.kpiTotalValue}>
              ₹{stats.totalCashCollectedToday.toLocaleString("en-IN")}
            </Text>
            <View style={styles.kpiSplitRow}>
              <Text style={styles.kpiSplitText}>
                Loans: ₹{stats.totalLoanCollectedToday.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.kpiSplitDivider}>|</Text>
              <Text style={styles.kpiSplitText}>
                Pigmy: ₹{stats.totalPigmyCollectedToday.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Sub-KPI Row */}
          <View style={styles.subKpiRow}>
            <View style={styles.subKpiItem}>
              <Text style={styles.subKpiVal}>
                {effectiveVisitedCount} /{" "}
                {stats.totalCustomers || feedData?.customers?.length || 0}
              </Text>
              <Text style={styles.subKpiLabel}>Visited</Text>
            </View>
            <View style={styles.subKpiItem}>
              <Text style={styles.subKpiVal}>{stats.customersWithLoans}</Text>
              <Text style={styles.subKpiLabel}>With Loans</Text>
            </View>
            <View style={styles.subKpiItem}>
              <Text style={styles.subKpiVal}>{stats.customersWithPigmy}</Text>
              <Text style={styles.subKpiLabel}>With Pigmy</Text>
            </View>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search by name, phone, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "ALL" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("ALL")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "ALL" && styles.filterChipTextActive,
              ]}
            >
              All ({feedData?.customers?.length || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              overdueCount > 0 && styles.filterChipOverduePending,
              activeFilter === "OVERDUE" && styles.filterChipOverdueActive,
            ]}
            onPress={() => setActiveFilter("OVERDUE")}
          >
            <Text
              style={[
                styles.filterChipText,
                overdueCount > 0 && styles.filterChipTextOverduePending,
                activeFilter === "OVERDUE" && styles.filterChipTextOverdueActive,
              ]}
            >
              ⚠️ Overdue ({overdueCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "PENDING" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("PENDING")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "PENDING" && styles.filterChipTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "VISITED" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("VISITED")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "VISITED" && styles.filterChipTextActive,
              ]}
            >
              Visited
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "LOANS" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("LOANS")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "LOANS" && styles.filterChipTextActive,
              ]}
            >
              Loans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "PIGMY" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("PIGMY")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "PIGMY" && styles.filterChipTextActive,
              ]}
            >
              Pigmy
            </Text>
          </TouchableOpacity>
        </View>

        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              📶 Offline Mode • Connect to Wi-Fi/Data to sync latest collections
            </Text>
            <TouchableOpacity
              style={styles.offlineBannerBtn}
              onPress={() => fetchFeed(true)}
            >
              <Text style={styles.offlineBannerBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {errorMessage && !isOffline ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>⚠️ {errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchFeed()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    ),
    [
      user?.name,
      user?.collectionManagerId,
      selectedDate,
      fetchFeed,
      stats,
      searchQuery,
      activeFilter,
      feedData?.customers?.length,
      isOffline,
      errorMessage,
    ],
  );

  // If offline and no cache is available, show full-screen Fallback UI
  if (isOffline && !feedData) {
    return (
      <OfflineFallback
        isRetrying={loading || refreshing}
        onRetry={() => fetchFeed(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A859" />
          <Text style={styles.loadingFeedText}>
            Loading today's collection route...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFeed(true)}
              colors={["#00A859"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "Try changing your search terms or filter."
                  : "No customers scheduled for collection on this route."}
              </Text>
            </View>
          }
        />
      )}

      {/* Collect Cash Modal */}
      <CollectCashModal
        visible={collectModalVisible}
        customer={selectedCustomer}
        initialType={initialCollectType}
        initialLoanId={initialTargetId}
        initialPigmyId={initialTargetId}
        onClose={handleCloseCollect}
        onSuccess={handleCollectSuccess}
        onRefreshFeed={() => fetchFeed(true)}
      />

      {/* Customer Passbook Modal */}
      <CustomerDetailsModal
        visible={detailsModalVisible}
        customer={selectedCustomer}
        onClose={handleCloseDetails}
        onOpenCollect={handleDetailsToCollect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fff9",
  },
  listContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: "#00A859",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#00A859",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cmRoleBadge: {
    color: "#d1fae5",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "800",
    marginTop: 2,
  },
  heroSubtitle: {
    color: "#ecfdf5",
    fontSize: 12,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshIconText: {
    fontSize: 16,
  },
  kpiTotalBox: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  kpiTotalLabel: {
    color: "#ecfdf5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  kpiTotalValue: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  kpiSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  kpiSplitText: {
    color: "#f0fdf4",
    fontSize: 12,
    fontWeight: "600",
  },
  kpiSplitDivider: {
    color: "rgba(255,255,255,0.4)",
  },
  subKpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  subKpiItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  subKpiVal: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  subKpiLabel: {
    color: "#d1fae5",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  clearSearch: {
    fontSize: 14,
    color: "#9ca3af",
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#00A859",
    borderColor: "#00A859",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filterChipOverduePending: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff5f5",
  },
  filterChipTextOverduePending: {
    color: "#dc2626",
    fontWeight: "700",
  },
  filterChipOverdueActive: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  filterChipTextOverdueActive: {
    color: "#fff",
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingFeedText: {
    color: "#6b7280",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorBoxText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  offlineBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offlineBannerText: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  offlineBannerBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  offlineBannerBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
});
