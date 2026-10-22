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
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { OfflineFallback } from "@/components/common/offline-fallback";
import { UpdatePhotosModal } from "@/components/customer/update-photos-modal";
import { MobileApi } from "@/services/api";
import { CustomerFeedItem, MobileFeedData } from "@/types/cm.types";
import { getFriendlyErrorMessage } from "@/utils/error-handler";
import { checkNetworkConnectivity } from "@/utils/network";

type KycFilter = "ALL" | "PENDING" | "VERIFIED" | "NO_PHOTO" | "NO_ID";

export default function CustomerKycScreen() {
  const [feedData, setFeedData] = useState<MobileFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeFilter, setActiveFilter] = useState<KycFilter>("ALL");

  // Selected customer for photo update modal
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerFeedItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchCustomers = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      // Pre-flight internet check
      const netStatus = await checkNetworkConnectivity();
      if (!netStatus.isOnline) {
        setIsOffline(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setIsOffline(false);

      try {
        const todayDate = new Date().toISOString().split("T")[0];
        const res = await MobileApi.getMobileFeed(todayDate);
        if (res.success && res.data) {
          setFeedData(res.data);
        } else {
          setErrorMessage(
            getFriendlyErrorMessage(
              res.message,
              "Unable to load customer list for KYC verification.",
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
        setErrorMessage(
          getFriendlyErrorMessage(
            err,
            "Unable to load customer list for KYC verification.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Auto-refresh every time the tab is switched to
  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [fetchCustomers]),
  );

  // Auto-detect when network reconnects
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
            fetchCustomers();
          } else {
            setIsOffline(true);
          }
        });
      }
    } catch {}

    return () => {
      subscription?.remove?.();
    };
  }, [fetchCustomers]);

  const allCustomers = useMemo(() => {
    return feedData?.customers || [];
  }, [feedData?.customers]);

  // KYC Stats calculations
  const stats = useMemo(() => {
    const total = allCustomers.length;
    let verifiedCount = 0;
    let pendingCount = 0;
    let noPhotoCount = 0;
    let noIdCount = 0;

    allCustomers.forEach((c) => {
      const hasPhoto = Boolean(c.customerPhoto);
      const hasId = Boolean(c.idProofPhoto);

      if (hasPhoto && hasId) {
        verifiedCount++;
      } else {
        pendingCount++;
      }

      if (!hasPhoto) noPhotoCount++;
      if (!hasId) noIdCount++;
    });

    return {
      total,
      verifiedCount,
      pendingCount,
      noPhotoCount,
      noIdCount,
    };
  }, [allCustomers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let result = allCustomers;

    // Apply Filter
    if (activeFilter === "PENDING") {
      result = result.filter((c) => !c.customerPhoto || !c.idProofPhoto);
    } else if (activeFilter === "VERIFIED") {
      result = result.filter((c) => Boolean(c.customerPhoto && c.idProofPhoto));
    } else if (activeFilter === "NO_PHOTO") {
      result = result.filter((c) => !c.customerPhoto);
    } else if (activeFilter === "NO_ID") {
      result = result.filter((c) => !c.idProofPhoto);
    }

    // Apply Search
    const q = deferredSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(q) ||
          c.customerId?.toLowerCase().includes(q) ||
          c.mobile?.includes(q),
      );
    }

    return result;
  }, [allCustomers, activeFilter, deferredSearchQuery]);

  const handleOpenUpdateModal = (customer: CustomerFeedItem) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
  };

  const handleUpdateSuccess = (updatedData?: any) => {
    // Immediately update local feed data if customerId matches
    if (selectedCustomer) {
      setFeedData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          customers: prev.customers.map((c) => {
            if (c.customerId === selectedCustomer.customerId) {
              return {
                ...c,
                customerPhoto:
                  updatedData?.customerPhoto !== undefined
                    ? Boolean(updatedData.customerPhoto)
                    : true,
                idProofPhoto:
                  updatedData?.idProofPhoto !== undefined
                    ? Boolean(updatedData.idProofPhoto)
                    : true,
              };
            }
            return c;
          }),
        };
      });
    }

    // Fetch latest feed from backend
    fetchCustomers(true);
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {});
  };

  // Render Item for Customer KYC Card
  const renderItem = useCallback(
    ({ item }: { item: CustomerFeedItem }) => {
      const hasPhoto = Boolean(item.customerPhoto);
      const hasId = Boolean(item.idProofPhoto);
      const isComplete = hasPhoto && hasId;
      const initialChar = item.customerName
        ? item.customerName.charAt(0).toUpperCase()
        : "C";

      return (
        <View style={styles.kycCard}>
          {/* Card Top: Avatar, Name, and Overall Status */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initialChar}</Text>
            </View>

            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text
                  variant="titleMedium"
                  style={[styles.customerName, { textTransform: "capitalize" }]}
                  numberOfLines={1}
                >
                  {item.customerName}
                </Text>
                {isComplete ? (
                  <View style={styles.badgeVerified}>
                    <Text style={styles.badgeVerifiedText}>✅ KYC Complete</Text>
                  </View>
                ) : (
                  <View style={styles.badgeIncomplete}>
                    <Text style={styles.badgeIncompleteText}>⚠️ KYC Pending</Text>
                  </View>
                )}
              </View>

              <View style={styles.subInfoRow}>
                <Text style={styles.customerIdText}>ID: {item.customerId}</Text>
                {item.mobile ? (
                  <TouchableOpacity
                    onPress={() => handleCall(item.mobile)}
                    style={styles.callBadge}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.callBadgeText}>📞 {item.mobile}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {item.address ? (
            <Text style={styles.addressText} numberOfLines={1}>
              📍 {item.address}
            </Text>
          ) : null}

          {/* Verification Status Breakdown */}
          <View style={styles.statusSection}>
            <View
              style={[
                styles.statusPillItem,
                hasPhoto ? styles.statusPillItemDone : styles.statusPillItemMissing,
              ]}
            >
              <MaterialCommunityIcons
                name={hasPhoto ? "check-circle" : "alert-circle-outline"}
                size={18}
                color={hasPhoto ? "#059669" : "#d97706"}
                style={{ marginRight: 6 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusPillLabel}>Customer Portrait</Text>
                <Text
                  style={[
                    styles.statusPillValue,
                    hasPhoto
                      ? styles.statusPillValueDone
                      : styles.statusPillValueMissing,
                  ]}
                >
                  {hasPhoto ? "Photo Uploaded" : "Missing Photo"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusPillItem,
                hasId ? styles.statusPillItemDone : styles.statusPillItemMissing,
              ]}
            >
              <MaterialCommunityIcons
                name={hasId ? "check-circle" : "alert-circle-outline"}
                size={18}
                color={hasId ? "#059669" : "#d97706"}
                style={{ marginRight: 6 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusPillLabel}>ID Proof Document</Text>
                <Text
                  style={[
                    styles.statusPillValue,
                    hasId
                      ? styles.statusPillValueDone
                      : styles.statusPillValueMissing,
                  ]}
                >
                  {hasId ? "ID Uploaded" : "Missing ID Proof"}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenUpdateModal(item)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="camera-plus-outline"
              size={18}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.actionBtnText}>
              {isComplete ? "Update KYC Photos" : "Upload Missing Photos"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [],
  );

  const keyExtractor = useCallback((item: CustomerFeedItem) => item.customerId, []);

  // Header Component for FlatList
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.listHeaderContainer}>
        {/* Top Title Banner */}
        <View style={styles.topBanner}>
          <View>
            <Text style={styles.badgeText}>CUSTOMER VERIFICATION</Text>
            <Text variant="headlineMedium" style={styles.screenTitle}>
              Customer KYC
            </Text>
            <Text style={styles.screenSubtitle}>
              Capture and update customer portraits & ID proofs
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={() => fetchCustomers(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.refreshIconText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Warning Banner */}
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              📶 Offline Mode • Connect to Wi-Fi/Data to sync and upload photos
            </Text>
            <TouchableOpacity
              style={styles.offlineBannerBtn}
              onPress={() => fetchCustomers(true)}
            >
              <Text style={styles.offlineBannerBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Error Box */}
        {errorMessage && !isOffline ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>⚠️ {errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchCustomers()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* KPI Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>TOTAL</Text>
            <Text style={styles.statsValue}>{stats.total}</Text>
            <Text style={styles.statsSub}>Customers</Text>
          </View>
          <View style={[styles.statsCard, styles.statsCardVerified]}>
            <Text style={[styles.statsLabel, styles.statsLabelVerified]}>
              VERIFIED
            </Text>
            <Text style={[styles.statsValue, styles.statsValueVerified]}>
              {stats.verifiedCount}
            </Text>
            <Text style={styles.statsSub}>Both on file</Text>
          </View>
          <View style={[styles.statsCard, styles.statsCardPending]}>
            <Text style={[styles.statsLabel, styles.statsLabelPending]}>
              PENDING
            </Text>
            <Text style={[styles.statsValue, styles.statsValuePending]}>
              {stats.pendingCount}
            </Text>
            <Text style={styles.statsSub}>Needs upload</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name, mobile, or ID..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
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
              All ({stats.total})
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
              Pending ({stats.pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "VERIFIED" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("VERIFIED")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "VERIFIED" && styles.filterChipTextActive,
              ]}
            >
              Verified ({stats.verifiedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "NO_PHOTO" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("NO_PHOTO")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "NO_PHOTO" && styles.filterChipTextActive,
              ]}
            >
              No Photo ({stats.noPhotoCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "NO_ID" && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter("NO_ID")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "NO_ID" && styles.filterChipTextActive,
              ]}
            >
              No ID ({stats.noIdCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    isOffline,
    errorMessage,
    stats,
    searchQuery,
    activeFilter,
    fetchCustomers,
  ]);

  // Offline Fallback screen when no cache exists
  if (isOffline && !feedData) {
    return (
      <OfflineFallback
        isRetrying={loading || refreshing}
        onRetry={() => fetchCustomers(true)}
        title="No Internet Connection"
        description="Wi-Fi or Mobile Data is turned off. Please connect to the internet to load customers and upload KYC photos."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A859" />
          <Text style={styles.loadingText}>Loading customer KYC list...</Text>
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
              onRefresh={() => fetchCustomers(true)}
              colors={["#00A859"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🪪</Text>
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "No matching customers found for your search query."
                  : activeFilter === "PENDING"
                    ? "All customer KYC photos and ID proofs are verified!"
                    : "No customers assigned to this route."}
              </Text>
            </View>
          }
        />
      )}

      {/* Update Photos Modal */}
      <UpdatePhotosModal
        visible={modalVisible}
        customer={selectedCustomer}
        onClose={() => {
          setModalVisible(false);
          setSelectedCustomer(null);
        }}
        onSuccess={handleUpdateSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  listContent: {
    paddingBottom: 40,
  },
  listHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00A859",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
  screenSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 6,
  },
  refreshIconText: {
    fontSize: 18,
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
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsCardVerified: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  statsCardPending: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  statsLabelVerified: {
    color: "#059669",
  },
  statsLabelPending: {
    color: "#b45309",
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginVertical: 2,
  },
  statsValueVerified: {
    color: "#059669",
  },
  statsValuePending: {
    color: "#b45309",
  },
  statsSub: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  searchClear: {
    color: "#9ca3af",
    fontSize: 14,
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
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
    color: "#4b5563",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  kycCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#00A859",
    fontSize: 20,
    fontWeight: "800",
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerName: {
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badgeVerified: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeVerifiedText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeIncomplete: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIncompleteText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "700",
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  customerIdText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
  },
  callBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  callBadgeText: {
    color: "#00A859",
    fontSize: 11,
    fontWeight: "700",
  },
  addressText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 8,
  },
  statusSection: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  statusPillItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  statusPillItemDone: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  statusPillItemMissing: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  statusPillLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusPillValue: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  statusPillValueDone: {
    color: "#059669",
  },
  statusPillValueMissing: {
    color: "#d97706",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00A859",
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 14,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
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
});
