import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { CustomerFeedItem } from "@/types/cm.types";

interface CustomerCardProps {
  item: CustomerFeedItem;
  onPress: (item: CustomerFeedItem) => void;
  onCall: (phone?: string) => void;
  onCollect: (item: CustomerFeedItem) => void;
}

export const CustomerCard = React.memo(
  function CustomerCard({
    item,
    onPress,
    onCall,
    onCollect,
  }: CustomerCardProps) {
    const hasLoans = item.loans && item.loans.length > 0;
    const hasPigmy = item.pigmyAccounts && item.pigmyAccounts.length > 0;
    const initialChar = item.customerName
      ? item.customerName.charAt(0).toUpperCase()
      : "C";

    return (
      <TouchableOpacity
        style={styles.customerCard}
        activeOpacity={0.88}
        onPress={() => onPress(item)}
      >
        {/* Customer Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initialChar}</Text>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text
                variant="titleMedium"
                style={styles.customerName}
                numberOfLines={1}
              >
                {item.customerName}
              </Text>
              {item.todayVisited ? (
                <View style={styles.visitedBadge}>
                  <Text style={styles.visitedBadgeText}>✅ Visited</Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>⏳ Pending</Text>
                </View>
              )}
            </View>

            <View style={styles.subInfoRow}>
              <Text style={styles.customerIdText}>{item.customerId}</Text>
              {item.mobile ? (
                <TouchableOpacity
                  onPress={() => onCall(item.mobile)}
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

        {/* Account Details Pills */}
        <View style={styles.accountsContainer}>
          {hasLoans && (
            <View style={styles.accountPill}>
              <View>
                <Text style={styles.pillLabel}>Active Loan</Text>
                <Text style={styles.pillValueRed}>
                  ₹{item.loans[0].pendingAmount?.toLocaleString("en-IN") || "0"}{" "}
                  Due
                </Text>
              </View>
              <Text
                style={[
                  styles.pillStatus,
                  item.loans[0].todayCollected
                    ? styles.pillStatusDone
                    : styles.pillStatusPending,
                ]}
              >
                {item.loans[0].todayCollected ? "✅ Paid" : "⏳ Due"}
              </Text>
            </View>
          )}

          {hasPigmy && (
            <View style={styles.accountPill}>
              <View>
                <Text style={styles.pillLabel}>Pigmy Savings</Text>
                <Text style={styles.pillValueGreen}>
                  ₹
                  {item.pigmyAccounts[0].totalSavedAmount?.toLocaleString(
                    "en-IN"
                  ) || "0"}{" "}
                  Saved
                </Text>
              </View>
              <Text
                style={[
                  styles.pillStatus,
                  item.pigmyAccounts[0].todayCollected
                    ? styles.pillStatusDone
                    : styles.pillStatusPending,
                ]}
              >
                {item.pigmyAccounts[0].todayCollected
                  ? "✅ Deposited"
                  : "⏳ Due"}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => onPress(item)}
          >
            <Text style={styles.detailsBtnText}>Passbook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.collectBtn}
            onPress={() => onCollect(item)}
          >
            <Text style={styles.collectBtnText}>+ Collect Cash</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    // Custom shallow comparator to prevent re-rendering when other items change
    return (
      prev.item.customerId === next.item.customerId &&
      prev.item.customerName === next.item.customerName &&
      prev.item.mobile === next.item.mobile &&
      prev.item.address === next.item.address &&
      prev.item.todayVisited === next.item.todayVisited &&
      prev.item.hasActiveLoan === next.item.hasActiveLoan &&
      prev.item.hasActivePigmy === next.item.hasActivePigmy &&
      prev.item.loans === next.item.loans &&
      prev.item.pigmyAccounts === next.item.pigmyAccounts
    );
  }
);

const styles = StyleSheet.create({
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
  visitedBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visitedBadgeText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
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
  accountsContainer: {
    marginTop: 12,
    gap: 8,
  },
  accountPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  pillValueRed: {
    fontSize: 13,
    fontWeight: "800",
    color: "#dc2626",
    marginTop: 1,
  },
  pillValueGreen: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
    marginTop: 1,
  },
  pillStatus: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillStatusDone: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  pillStatusPending: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
  },
  detailsBtnText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 13,
  },
  collectBtn: {
    flex: 1.6,
    paddingVertical: 10,
    backgroundColor: "#00A859",
    borderRadius: 12,
    alignItems: "center",
  },
  collectBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
});
