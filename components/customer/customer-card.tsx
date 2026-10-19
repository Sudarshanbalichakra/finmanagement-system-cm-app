import { useAuthStore } from "@/store/auth.store";
import { CustomerFeedItem } from "@/types/cm.types";
import {
  getCustomerVisitedStatus,
  getLoanCollectionStatus,
  getPigmyCollectionStatus,
} from "@/utils/collection-status";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

interface CustomerCardProps {
  item: CustomerFeedItem;
  onPress: (item: CustomerFeedItem) => void;
  onCall: (phone?: string) => void;
  onCollect: (
    item: CustomerFeedItem,
    type?: "LOAN" | "PIGMY",
    targetId?: string,
  ) => void;
}

export const CustomerCard = React.memo(
  function CustomerCard({
    item,
    onPress,
    onCall,
    onCollect,
  }: CustomerCardProps) {
    const currentCMId = useAuthStore(
      (state) => state.user?.collectionManagerId,
    );

    const hasLoans = Boolean(item.loans && item.loans.length > 0);
    const hasPigmy = Boolean(
      item.pigmyAccounts && item.pigmyAccounts.length > 0,
    );
    const hasAnyAccount = hasLoans || hasPigmy;
    const initialChar = item.customerName
      ? item.customerName.charAt(0).toUpperCase()
      : "C";

    const activeLoan = hasLoans ? item.loans[0] : null;
    const activePigmy = hasPigmy ? item.pigmyAccounts[0] : null;

    // Evaluate statuses using shared utility
    const loanStatus = getLoanCollectionStatus(activeLoan, item, currentCMId);
    const pigmyStatus = getPigmyCollectionStatus(
      activePigmy,
      item,
      currentCMId,
    );
    const customerStatus = getCustomerVisitedStatus(item, currentCMId);

    const loanPending = hasLoans ? !loanStatus.isPaid : false;
    const pigmyPending = hasPigmy ? !pigmyStatus.isPaid : false;

    const handlePrimaryCollect = () => {
      if (loanPending && activeLoan) {
        onCollect(item, "LOAN", activeLoan.loanId);
      } else if (pigmyPending && activePigmy) {
        onCollect(item, "PIGMY", activePigmy.pigmyId);
      } else if (hasLoans && activeLoan) {
        onCollect(item, "LOAN", activeLoan.loanId);
      } else if (hasPigmy && activePigmy) {
        onCollect(item, "PIGMY", activePigmy.pigmyId);
      }
    };

    const getCollectButtonText = () => {
      if (loanPending && pigmyPending) return "+ Collect Cash";
      if (loanPending) return "+ Collect Loan Cash";
      if (pigmyPending) return "+ Collect Pigmy Cash";
      if (hasLoans) return "+ Collect Loan Cash";
      if (hasPigmy) return "+ Collect Pigmy Cash";
      return "+ Collect Cash";
    };

    return (
      <TouchableOpacity
        style={styles.customerCard}
        activeOpacity={hasAnyAccount ? 0.88 : 1}
        onPress={hasAnyAccount ? () => onPress(item) : undefined}
        disabled={!hasAnyAccount}
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
                style={[styles.customerName, { textTransform: "capitalize" }]}
                numberOfLines={1}
              >
                {item.customerName}
              </Text>
              {customerStatus.isVisited ? (
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
              {item.customerId ? (
                <Text style={styles.customerIdText}>ID: {item.customerId}</Text>
              ) : null}
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
        {hasAnyAccount && (
          <View style={styles.accountsContainer}>
            {hasLoans && activeLoan && (
              <View style={styles.accountPill}>
                <View style={styles.pillTextWrap}>
                  <Text style={styles.pillLabel}>Loan: {activeLoan.loanId}</Text>
                  <Text style={styles.pillValueRed}>
                    ₹{activeLoan.pendingAmount?.toLocaleString("en-IN") || "0"}{" "}
                    Due
                  </Text>
                </View>

                {loanStatus.isPaid ? (
                  loanStatus.isSelf ? (
                    <View style={styles.pillStatusDoneBox}>
                      <Text style={styles.pillStatusDoneText}>
                        ✅ Today Collection Collected
                        {loanStatus.collectedAmount > 0
                          ? ` (₹${loanStatus.collectedAmount})`
                          : ""}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.pillStatusColleagueBox}>
                      <Text style={styles.pillStatusColleagueText}>
                        👥 Collected by Colleague
                      </Text>
                    </View>
                  )
                ) : (
                  <TouchableOpacity
                    style={styles.pillActionBtn}
                    onPress={() => onCollect(item, "LOAN", activeLoan.loanId)}
                  >
                    <Text style={styles.pillActionBtnText}>Collect Loan</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {hasPigmy && activePigmy && (
              <View style={styles.accountPill}>
                <View style={styles.pillTextWrap}>
                  <Text style={styles.pillLabel}>
                    Pigmy: {activePigmy.pigmyId}
                  </Text>
                  <Text style={styles.pillValueGreen}>
                    ₹
                    {activePigmy.totalSavedAmount?.toLocaleString("en-IN") || "0"}{" "}
                    Saved
                  </Text>
                </View>

                {pigmyStatus.isPaid ? (
                  pigmyStatus.isSelf ? (
                    <View style={styles.pillStatusDoneBox}>
                      <Text style={styles.pillStatusDoneText}>
                        ✅ Today Collection Collected
                        {pigmyStatus.collectedAmount > 0
                          ? ` (₹${pigmyStatus.collectedAmount})`
                          : ""}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.pillStatusColleagueBox}>
                      <Text style={styles.pillStatusColleagueText}>
                        👥 Collected by Colleague
                      </Text>
                    </View>
                  )
                ) : (
                  <TouchableOpacity
                    style={styles.pillActionBtnPigmy}
                    onPress={() => onCollect(item, "PIGMY", activePigmy.pigmyId)}
                  >
                    <Text style={styles.pillActionBtnText}>Collect Pigmy</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Card Actions - Hidden when customer has no loan and no pigmy accounts */}
        {hasAnyAccount && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => onPress(item)}
            >
              <Text style={styles.detailsBtnText}>Passbook</Text>
            </TouchableOpacity>

            {customerStatus.allCollected ? (
              <View
                style={[
                  styles.collectBtnDisabled,
                  customerStatus.isColleagueCollected &&
                    styles.collectBtnColleagueDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.collectBtnDisabledText,
                    customerStatus.isColleagueCollected &&
                      styles.collectBtnColleagueDisabledText,
                  ]}
                >
                  {customerStatus.isColleagueCollected
                    ? `👥 Collected by Colleague`
                    : "✅ Today Collection Collected"}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.collectBtn}
                onPress={handlePrimaryCollect}
              >
                <Text style={styles.collectBtnText}>
                  {getCollectButtonText()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.item.customerId === next.item.customerId &&
      prev.item.customerName === next.item.customerName &&
      prev.item.mobile === next.item.mobile &&
      prev.item.address === next.item.address &&
      prev.item.isPaid === next.item.isPaid &&
      prev.item.todayVisited === next.item.todayVisited &&
      prev.item.todayCollected === next.item.todayCollected &&
      prev.item.todayCollectionAmount === next.item.todayCollectionAmount &&
      prev.item.collectedBy === next.item.collectedBy &&
      prev.item.collectionManagerId === next.item.collectionManagerId &&
      prev.item.hasActiveLoan === next.item.hasActiveLoan &&
      prev.item.hasActivePigmy === next.item.hasActivePigmy &&
      prev.item.loans === next.item.loans &&
      prev.item.pigmyAccounts === next.item.pigmyAccounts
    );
  },
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
  pillTextWrap: {
    flex: 1,
    paddingRight: 6,
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
  pillStatusDoneBox: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillStatusDoneText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  pillStatusColleagueBox: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillStatusColleagueText: {
    color: "#1e40af",
    fontSize: 11,
    fontWeight: "700",
  },
  pillActionBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillActionBtnPigmy: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f2937",
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
  collectBtnDisabled: {
    flex: 1.6,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  collectBtnDisabledText: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 12,
  },
  collectBtnColleagueDisabled: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  collectBtnColleagueDisabledText: {
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 12,
  },
});
