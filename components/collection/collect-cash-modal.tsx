import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { CustomerFeedItem } from "@/types/cm.types";
import { MobileApi } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import {
  getLoanCollectionStatus,
  getPigmyCollectionStatus,
} from "@/utils/collection-status";
import { getFriendlyErrorMessage } from "@/utils/error-handler";

interface CollectCashModalProps {
  visible: boolean;
  customer: CustomerFeedItem | null;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: "LOAN" | "PIGMY";
  initialLoanId?: string;
  initialPigmyId?: string;
}

export const CollectCashModal = React.memo(function CollectCashModal({
  visible,
  customer,
  onClose,
  onSuccess,
  initialType,
  initialLoanId,
  initialPigmyId,
}: CollectCashModalProps) {
  const currentCMId = useAuthStore((state) => state.user?.collectionManagerId);

  const [collectionType, setCollectionType] = useState<"LOAN" | "PIGMY">("LOAN");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [selectedPigmyId, setSelectedPigmyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Strictly locked today's date (YYYY-MM-DD)
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Synchronize state when customer or modal opens
  useEffect(() => {
    if (customer && visible) {
      setInlineError(null);
      setAmount("");

      const allLoans = customer.loans || [];
      const allPigmy = customer.pigmyAccounts || [];

      const unpaidLoans = allLoans.filter(
        (l) => !getLoanCollectionStatus(l, customer, currentCMId).isPaid
      );
      const unpaidPigmy = allPigmy.filter(
        (p) => !getPigmyCollectionStatus(p, customer, currentCMId).isPaid
      );

      if (initialType) {
        setCollectionType(initialType);
      } else if (unpaidLoans.length > 0) {
        setCollectionType("LOAN");
      } else if (unpaidPigmy.length > 0) {
        setCollectionType("PIGMY");
      } else if (allLoans.length > 0) {
        setCollectionType("LOAN");
      } else if (allPigmy.length > 0) {
        setCollectionType("PIGMY");
      }

      if (initialLoanId) {
        setSelectedLoanId(initialLoanId);
      } else if (allLoans.length > 0) {
        setSelectedLoanId(unpaidLoans[0]?.loanId || allLoans[0].loanId);
      }

      if (initialPigmyId) {
        setSelectedPigmyId(initialPigmyId);
      } else if (allPigmy.length > 0) {
        setSelectedPigmyId(unpaidPigmy[0]?.pigmyId || allPigmy[0].pigmyId);
      }
    }
  }, [customer, visible, initialType, initialLoanId, initialPigmyId, currentCMId]);

  if (!customer) return null;

  const activeLoans = customer.loans || [];
  const activePigmyAccounts = customer.pigmyAccounts || [];

  const selectedLoan =
    activeLoans.find((l) => l.loanId === selectedLoanId) || activeLoans[0];
  const selectedPigmy =
    activePigmyAccounts.find((p) => p.pigmyId === selectedPigmyId) ||
    activePigmyAccounts[0];

  // Evaluate current account status independently
  const loanStatus = getLoanCollectionStatus(selectedLoan, customer, currentCMId);
  const pigmyStatus = getPigmyCollectionStatus(selectedPigmy, customer, currentCMId);

  const currentAccountStatus =
    collectionType === "LOAN" ? loanStatus : pigmyStatus;

  const isCurrentAccountCollected = currentAccountStatus.isPaid;
  const isCurrentAccountSelfCollected = currentAccountStatus.isSelf;
  const currentAccountCollector = currentAccountStatus.collectorName;
  const collectedTodayAmount = currentAccountStatus.collectedAmount;

  const handleAddAmount = (add: number) => {
    if (isCurrentAccountCollected) return;
    const current = parseFloat(amount) || 0;
    setAmount((current + add).toString());
    setInlineError(null);
  };

  const handleSetAmount = (val: number) => {
    if (isCurrentAccountCollected) return;
    setAmount(val.toString());
    setInlineError(null);
  };

  const handleConfirmAndSave = () => {
    if (isCurrentAccountCollected) {
      Alert.alert(
        "Already Collected",
        "A daily collection has already been recorded for this account today and cannot be modified."
      );
      return;
    }

    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      setInlineError("Please enter a valid cash amount greater than 0.");
      Alert.alert("Validation Error", "Please enter a valid cash amount greater than 0.");
      return;
    }

    if (collectionType === "LOAN" && selectedLoan?.pendingAmount && numAmount > selectedLoan.pendingAmount) {
      const errMsg = `Amount cannot exceed pending loan balance of ₹${selectedLoan.pendingAmount.toLocaleString("en-IN")}`;
      setInlineError(errMsg);
      Alert.alert("Validation Error", errMsg);
      return;
    }

    const typeLabel = collectionType === "LOAN" ? "Loan Payment" : "Pigmy Deposit";
    const accountCode = collectionType === "LOAN" ? selectedLoan?.loanId : selectedPigmy?.pigmyId;

    // Immutability confirmation popup
    Alert.alert(
      "Confirm Cash Collection",
      `Record ₹${numAmount.toLocaleString("en-IN")} ${typeLabel} (${accountCode}) for ${customer.customerName}?\n\n🔒 Note: Once saved, this collection entry is immutable and cannot be edited or deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Save Cash",
          style: "default",
          onPress: async () => {
            setLoading(true);
            setInlineError(null);

            try {
              if (collectionType === "LOAN") {
                if (!selectedLoan?.loanId) {
                  throw new Error("No loan account selected");
                }
                await MobileApi.recordLoanCollection({
                  loanId: selectedLoan.loanId,
                  customerId: customer.customerId,
                  amount: numAmount,
                  collectionDate: todayDateStr,
                });
              } else {
                if (!selectedPigmy?.pigmyId) {
                  throw new Error("No pigmy savings account selected");
                }
                await MobileApi.recordPigmyCollection(selectedPigmy.pigmyId, {
                  amount: numAmount,
                  collectionDate: todayDateStr,
                  customerId: customer.customerId,
                });
              }

              Alert.alert(
                "Collection Recorded",
                `₹${numAmount.toLocaleString("en-IN")} collection successfully saved for ${customer.customerName}.`
              );
              onSuccess();
              onClose();
            } catch (err: any) {
              const displayMsg = getFriendlyErrorMessage(
                err,
                "Unable to record collection. Please check your network and try again."
              );
              setInlineError(displayMsg);
              Alert.alert("Collection Failed", displayMsg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text variant="titleLarge" style={styles.title}>
                {isCurrentAccountCollected ? "Collection Details (View Only)" : "Collect Cash"}
              </Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {customer.customerName} ({customer.customerId})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={loading}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* View-Only Collected Banner */}
            {isCurrentAccountCollected ? (
              <View
                style={[
                  styles.collectedBanner,
                  !isCurrentAccountSelfCollected && styles.collectedBannerColleague,
                ]}
              >
                <View style={styles.collectedBannerTop}>
                  <Text style={styles.collectedBannerIcon}>
                    {isCurrentAccountSelfCollected ? "✅" : "👥"}
                  </Text>
                  <Text
                    style={[
                      styles.collectedBannerTitle,
                      !isCurrentAccountSelfCollected && styles.collectedBannerColleagueTitle,
                    ]}
                  >
                    {isCurrentAccountSelfCollected
                      ? "Today Collection Collected"
                      : "Collected by Colleague"}
                  </Text>
                </View>
                {collectedTodayAmount > 0 ? (
                  <Text
                    style={[
                      styles.collectedBannerAmount,
                      !isCurrentAccountSelfCollected && styles.collectedBannerColleagueAmount,
                    ]}
                  >
                    ₹{collectedTodayAmount.toLocaleString("en-IN")}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.collectedBannerSubtitle,
                    !isCurrentAccountSelfCollected && styles.collectedBannerColleagueSubtitle,
                  ]}
                >
                  {isCurrentAccountSelfCollected
                    ? `Recorded by you for today (${todayDateStr}). This transaction is locked and immutable.`
                    : `Recorded by colleague for today (${todayDateStr}). Duplicate entries are restricted.`}
                </Text>
              </View>
            ) : null}

            {/* Inline Error Banner */}
            {inlineError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {inlineError}</Text>
              </View>
            ) : null}

            {/* Product Type Tabs */}
            <View style={styles.typeTabs}>
              <TouchableOpacity
                disabled={activeLoans.length === 0 || loading}
                style={[
                  styles.tabButton,
                  collectionType === "LOAN" && styles.tabButtonActive,
                  activeLoans.length === 0 && styles.tabButtonDisabled,
                ]}
                onPress={() => {
                  setCollectionType("LOAN");
                  setInlineError(null);
                }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    collectionType === "LOAN" && styles.tabButtonTextActive,
                    activeLoans.length === 0 && styles.tabButtonTextDisabled,
                  ]}
                >
                  💵 Loan Collection
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={activePigmyAccounts.length === 0 || loading}
                style={[
                  styles.tabButton,
                  collectionType === "PIGMY" && styles.tabButtonActive,
                  activePigmyAccounts.length === 0 && styles.tabButtonDisabled,
                ]}
                onPress={() => {
                  setCollectionType("PIGMY");
                  setInlineError(null);
                }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    collectionType === "PIGMY" && styles.tabButtonTextActive,
                    activePigmyAccounts.length === 0 && styles.tabButtonTextDisabled,
                  ]}
                >
                  🏦 Pigmy Savings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Account Card Details */}
            {collectionType === "LOAN" && selectedLoan ? (
              <View style={styles.accountCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardIdBadge}>Loan #{selectedLoan.loanId}</Text>
                  {loanStatus.isPaid ? (
                    loanStatus.isSelf ? (
                      <Text style={[styles.statusPill, styles.statusPillDone]}>
                        ✅ Today Collection Collected
                      </Text>
                    ) : (
                      <Text style={[styles.statusPill, styles.statusPillColleague]}>
                        👥 Collected by Colleague
                      </Text>
                    )
                  ) : (
                    <Text style={[styles.statusPill, styles.statusPillPending]}>
                      🔴 Pending Today
                    </Text>
                  )}
                </View>

                {/* Multiple Loans Selector if > 1 */}
                {activeLoans.length > 1 && (
                  <View style={styles.multiAccountRow}>
                    {activeLoans.map((l) => (
                      <TouchableOpacity
                        key={l.loanId}
                        style={[
                          styles.chip,
                          selectedLoanId === l.loanId && styles.chipActive,
                        ]}
                        onPress={() => setSelectedLoanId(l.loanId)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedLoanId === l.loanId && styles.chipTextActive,
                          ]}
                        >
                          {l.loanId} {getLoanCollectionStatus(l, customer, currentCMId).isPaid ? "✓" : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Pending Balance</Text>
                    <Text style={styles.metricValueRed}>
                      ₹{selectedLoan.pendingAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Repayment Total</Text>
                    <Text style={styles.metricValue}>
                      ₹{selectedLoan.repaymentAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {collectionType === "PIGMY" && selectedPigmy ? (
              <View style={styles.accountCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardIdBadge}>Pigmy #{selectedPigmy.pigmyId}</Text>
                  {pigmyStatus.isPaid ? (
                    pigmyStatus.isSelf ? (
                      <Text style={[styles.statusPill, styles.statusPillDone]}>
                        ✅ Today Collection Collected
                      </Text>
                    ) : (
                      <Text style={[styles.statusPill, styles.statusPillColleague]}>
                        👥 Collected by Colleague
                      </Text>
                    )
                  ) : (
                    <Text style={[styles.statusPill, styles.statusPillPendingPigmy]}>
                      🟡 Pending Deposit
                    </Text>
                  )}
                </View>

                {/* Multiple Pigmy Accounts */}
                {activePigmyAccounts.length > 1 && (
                  <View style={styles.multiAccountRow}>
                    {activePigmyAccounts.map((p) => (
                      <TouchableOpacity
                        key={p.pigmyId}
                        style={[
                          styles.chip,
                          selectedPigmyId === p.pigmyId && styles.chipActive,
                        ]}
                        onPress={() => setSelectedPigmyId(p.pigmyId)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedPigmyId === p.pigmyId && styles.chipTextActive,
                          ]}
                        >
                          {p.pigmyId} {getPigmyCollectionStatus(p, customer, currentCMId).isPaid ? "✓" : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Total Saved Amount</Text>
                    <Text style={styles.metricValueGreen}>
                      ₹{selectedPigmy.totalSavedAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Scheme</Text>
                    <Text style={styles.metricValue}>
                      {selectedPigmy.schemeName || "Daily Savings"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* 🔒 2. Date Field (Strictly Locked to Today) */}
            <View style={styles.lockedDateContainer}>
              <View style={styles.lockedDateHeader}>
                <Text style={styles.lockedDateLabel}>Collection Date (Locked)</Text>
                <Text style={styles.lockedBadge}>🔒 TODAY</Text>
              </View>
              <View style={styles.lockedInputBox}>
                <Text style={styles.lockedInputText}>{todayDateStr}</Text>
              </View>
              <Text style={styles.lockedDateHint}>
                Collections are strictly recorded for today's business date.
              </Text>
            </View>

            {/* 💵 3. Amount Input Field (Disabled / Hidden when already collected) */}
            {!isCurrentAccountCollected ? (
              <>
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Collected Cash Amount (₹) *</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.rupeePrefix}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="Enter amount (e.g. 500)"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={(text) => {
                        setAmount(text);
                        setInlineError(null);
                      }}
                      editable={!loading}
                      autoFocus
                    />
                  </View>
                  {collectionType === "LOAN" && selectedLoan?.pendingAmount ? (
                    <Text style={styles.pendingHint}>
                      Pending Loan Balance: ₹{selectedLoan.pendingAmount.toLocaleString("en-IN")}
                    </Text>
                  ) : null}
                </View>

                {/* Quick Amount Chips */}
                <View style={styles.quickChipsRow}>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleAddAmount(100)}
                    disabled={loading}
                  >
                    <Text style={styles.quickChipText}>+₹100</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleAddAmount(200)}
                    disabled={loading}
                  >
                    <Text style={styles.quickChipText}>+₹200</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleAddAmount(500)}
                    disabled={loading}
                  >
                    <Text style={styles.quickChipText}>+₹500</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleAddAmount(1000)}
                    disabled={loading}
                  >
                    <Text style={styles.quickChipText}>+₹1000</Text>
                  </TouchableOpacity>
                  {collectionType === "LOAN" && selectedLoan?.pendingAmount ? (
                    <TouchableOpacity
                      style={[styles.quickChip, styles.quickChipFull]}
                      onPress={() => handleSetAmount(selectedLoan.pendingAmount)}
                      disabled={loading}
                    >
                      <Text style={styles.quickChipFullText}>Full Balance</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>
                  {isCurrentAccountCollected ? "Close" : "Cancel"}
                </Text>
              </TouchableOpacity>

              {isCurrentAccountCollected ? (
                <View
                  style={[
                    styles.disabledCollectedBtn,
                    !isCurrentAccountSelfCollected && styles.disabledColleagueBtn,
                  ]}
                >
                  <Text
                    style={[
                      styles.disabledCollectedBtnText,
                      !isCurrentAccountSelfCollected && styles.disabledColleagueBtnText,
                    ]}
                  >
                    {isCurrentAccountSelfCollected
                      ? `✅ Today Collection Collected`
                      : `👥 Collected by Colleague`}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.confirmBtn, loading && styles.disabledBtn]}
                  onPress={handleConfirmAndSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm & Save Cash</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#111827",
    fontWeight: "800",
  },
  customerName: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 16,
    color: "#4b5563",
    fontWeight: "700",
  },
  body: {
    padding: 24,
  },
  collectedBanner: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  collectedBannerColleague: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  collectedBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  collectedBannerIcon: {
    fontSize: 16,
  },
  collectedBannerTitle: {
    color: "#065f46",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  collectedBannerColleagueTitle: {
    color: "#1e40af",
  },
  collectedBannerAmount: {
    color: "#047857",
    fontSize: 28,
    fontWeight: "900",
    marginVertical: 4,
  },
  collectedBannerColleagueAmount: {
    color: "#1d4ed8",
  },
  collectedBannerSubtitle: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  collectedBannerColleagueSubtitle: {
    color: "#2563eb",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
  typeTabs: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#00A859",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonDisabled: {
    opacity: 0.4,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  tabButtonTextDisabled: {
    color: "#9ca3af",
  },
  accountCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIdBadge: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
  },
  statusPill: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillDone: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  statusPillColleague: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  statusPillPending: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  statusPillPendingPigmy: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  multiAccountRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#00A859",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  chipTextActive: {
    color: "#fff",
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  metricValueRed: {
    fontSize: 16,
    fontWeight: "800",
    color: "#dc2626",
    marginTop: 2,
  },
  metricValueGreen: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
    marginTop: 2,
  },
  lockedDateContainer: {
    marginBottom: 18,
  },
  lockedDateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  lockedDateLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  lockedBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00A859",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedInputBox: {
    height: 48,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  lockedInputText: {
    fontSize: 15,
    color: "#4b5563",
    fontWeight: "600",
  },
  lockedDateHint: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  amountContainer: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#00A859",
    paddingHorizontal: 14,
    height: 52,
  },
  rupeePrefix: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00A859",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  pendingHint: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
    marginTop: 6,
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  quickChipFull: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },
  quickChipFullText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
  },
  confirmBtn: {
    flex: 1.8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#00A859",
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  disabledCollectedBtn: {
    flex: 1.8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  disabledCollectedBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  disabledColleagueBtn: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  disabledColleagueBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e40af",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
