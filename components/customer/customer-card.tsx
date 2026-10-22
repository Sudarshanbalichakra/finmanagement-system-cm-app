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

function formatLoanDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const cleanStr = dateStr.split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return cleanStr;
  } catch {
    return dateStr.split("T")[0] || dateStr;
  }
}

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

    // Prioritize OVERDUE or ACTIVE loans so CM sees actionable accounts
    const activeLoan =
      item.loans?.find((l) =>
        ["OVERDUE", "ACTIVE"].includes(String(l.status || "").toUpperCase()),
      ) ||
      item.loans?.[0] ||
      null;
    const activePigmy = hasPigmy ? item.pigmyAccounts[0] : null;

    const isActionableLoan =
      Boolean(activeLoan) &&
      (!activeLoan?.status ||
        ["ACTIVE", "OVERDUE"].includes(
          String(activeLoan.status).toUpperCase(),
        ));

    // Evaluate statuses using shared utility
    const loanStatus = getLoanCollectionStatus(activeLoan, item, currentCMId);
    const pigmyStatus = getPigmyCollectionStatus(
      activePigmy,
      item,
      currentCMId,
    );
    const customerStatus = getCustomerVisitedStatus(item, currentCMId);

    const loanPending =
      hasLoans && isActionableLoan ? !loanStatus.isPaid : false;
    const pigmyPending = hasPigmy ? !pigmyStatus.isPaid : false;

    const handlePrimaryCollect = () => {
      if (loanPending && activeLoan) {
        onCollect(item, "LOAN", activeLoan.loanId);
      } else if (pigmyPending && activePigmy) {
        onCollect(item, "PIGMY", activePigmy.pigmyId);
      } else if (hasLoans && isActionableLoan && activeLoan) {
        onCollect(item, "LOAN", activeLoan.loanId);
      } else if (hasPigmy && activePigmy) {
        onCollect(item, "PIGMY", activePigmy.pigmyId);
      }
    };

    const getCollectButtonText = () => {
      const isOverdue = String(activeLoan?.status).toUpperCase() === "OVERDUE";
      if (loanPending && pigmyPending) return "+ Collect Cash";
      if (loanPending)
        return isOverdue ? "+ Collect Overdue" : "+ Collect Loan Cash";
      if (pigmyPending) return "+ Collect Pigmy Cash";
      if (hasLoans && isActionableLoan)
        return isOverdue ? "+ Collect Overdue" : "+ Collect Loan Cash";
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

        {/* Loan Dates (Replacing KYC photo & ID badges) */}
        {activeLoan && (activeLoan.startDate || activeLoan.endDate) ? (
          <View style={styles.loanDatesRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeLabel}>Start Date: </Text>
              <Text style={styles.dateBadgeValue}>
                {formatLoanDate(activeLoan.startDate)}
              </Text>
            </View>

            {String(activeLoan.status).toUpperCase() === "OVERDUE" ? (
              <View style={[styles.dateBadge, styles.dateBadgeOverdue]}>
                <Text style={styles.dateBadgeLabelOverdue}>⚠️ Matured: </Text>
                <Text style={styles.dateBadgeValueOverdue}>
                  {formatLoanDate(activeLoan.endDate)} (Due date passed)
                </Text>
              </View>
            ) : (
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeLabel}>End Date: </Text>
                <Text style={styles.dateBadgeValue}>
                  {formatLoanDate(activeLoan.endDate)}
                </Text>
              </View>
            )}
          </View>
        ) : activePigmy &&
          (activePigmy.startDate || activePigmy.maturityDate) ? (
          <View style={styles.loanDatesRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeLabel}>Start Date: </Text>
              <Text style={styles.dateBadgeValue}>
                {formatLoanDate(activePigmy.startDate)}
              </Text>
            </View>

            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeLabel}>End Date: </Text>
              <Text style={styles.dateBadgeValue}>
                {formatLoanDate(activePigmy.maturityDate)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Account Details Pills */}
        {hasAnyAccount && (
          <View style={styles.accountsContainer}>
            {hasLoans && activeLoan && (
              <View style={styles.accountPill}>
                <View style={styles.pillTextWrap}>
                  <View style={styles.loanIdStatusRow}>
                    <Text style={styles.pillLabel}>
                      Loan: {activeLoan.loanId}
                    </Text>
                    {String(activeLoan.status).toUpperCase() === "OVERDUE" ? (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueBadgeText}>⚠️ OVERDUE</Text>
                      </View>
                    ) : String(activeLoan.status).toUpperCase() === "ACTIVE" ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>● ACTIVE</Text>
                      </View>
                    ) : String(activeLoan.status).toUpperCase() ===
                      "RENEWED" ? (
                      <View style={styles.renewedBadge}>
                        <Text style={styles.renewedBadgeText}>🔄 RENEWED</Text>
                      </View>
                    ) : activeLoan.status ? (
                      <View style={styles.neutralStatusBadge}>
                        <Text style={styles.neutralStatusText}>
                          {activeLoan.status}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.pillValueRed}>
                    ₹{activeLoan.pendingAmount?.toLocaleString("en-IN") || "0"}{" "}
                    Due
                  </Text>
                </View>

                {loanStatus.isPaid ? (
                  loanStatus.isSelf ? (
                    <View style={styles.pillStatusDoneBox}>
                      <Text style={styles.pillStatusDoneText}>
                        ✅ Collected
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
                ) : isActionableLoan ? (
                  <TouchableOpacity
                    style={[
                      styles.pillActionBtn,
                      String(activeLoan.status).toUpperCase() === "OVERDUE" &&
                        styles.pillActionBtnOverdue,
                    ]}
                    onPress={() => onCollect(item, "LOAN", activeLoan.loanId)}
                  >
                    <Text
                      style={[
                        styles.pillActionBtnText,
                        String(activeLoan.status).toUpperCase() === "OVERDUE" &&
                          styles.pillActionBtnTextOverdue,
                      ]}
                    >
                      {String(activeLoan.status).toUpperCase() === "OVERDUE"
                        ? "Collect Overdue"
                        : "Collect Loan"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.pillStatusClosedBox}>
                    <Text style={styles.pillStatusClosedText}>
                      {String(activeLoan.status).toUpperCase() === "RENEWED"
                        ? "Rolled Over"
                        : "Closed"}
                    </Text>
                  </View>
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
                    {activePigmy.totalSavedAmount?.toLocaleString("en-IN") ||
                      "0"}{" "}
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
                    onPress={() =>
                      onCollect(item, "PIGMY", activePigmy.pigmyId)
                    }
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
  loanDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  dateBadgeValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  dateBadgeOverdue: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  dateBadgeLabelOverdue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#e11d48",
  },
  dateBadgeValueOverdue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#be123c",
  },
  loanIdStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  overdueBadge: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  overdueBadgeText: {
    color: "#dc2626",
    fontSize: 10,
    fontWeight: "800",
  },
  activeBadge: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "800",
  },
  renewedBadge: {
    backgroundColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  renewedBadgeText: {
    color: "#7c3aed",
    fontSize: 10,
    fontWeight: "700",
  },
  neutralStatusBadge: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  neutralStatusText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
  },
  pillActionBtnOverdue: {
    backgroundColor: "#fee2e2",
  },
  pillActionBtnTextOverdue: {
    color: "#b91c1c",
  },
  pillStatusClosedBox: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillStatusClosedText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
});
