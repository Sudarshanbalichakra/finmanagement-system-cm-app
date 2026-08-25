import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { CustomerFeedItem, LoanItem, PigmyAccountItem } from "@/types/cm.types";
import { MobileApi } from "@/services/api";
import { Input } from "@/components/forms/input";
import { PrimaryButton } from "@/components/forms/primary-button";

interface CollectCashModalProps {
  visible: boolean;
  customer: CustomerFeedItem | null;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: "LOAN" | "PIGMY";
  initialLoanId?: string;
  initialPigmyId?: string;
}

export function CollectCashModal({
  visible,
  customer,
  onClose,
  onSuccess,
  initialType,
  initialLoanId,
  initialPigmyId,
}: CollectCashModalProps) {
  const [collectionType, setCollectionType] = useState<"LOAN" | "PIGMY">("LOAN");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [selectedPigmyId, setSelectedPigmyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Synchronize state when customer or modal opens
  useEffect(() => {
    if (customer && visible) {
      setError(null);
      setSuccessMsg(null);
      setAmount("");
      setCollectionDate(new Date().toISOString().split("T")[0]);

      const hasLoans = customer.loans && customer.loans.length > 0;
      const hasPigmy = customer.pigmyAccounts && customer.pigmyAccounts.length > 0;

      if (initialType) {
        setCollectionType(initialType);
      } else if (hasLoans) {
        setCollectionType("LOAN");
      } else if (hasPigmy) {
        setCollectionType("PIGMY");
      }

      if (initialLoanId) {
        setSelectedLoanId(initialLoanId);
      } else if (hasLoans) {
        setSelectedLoanId(customer.loans[0].loanId);
      }

      if (initialPigmyId) {
        setSelectedPigmyId(initialPigmyId);
      } else if (hasPigmy) {
        setSelectedPigmyId(customer.pigmyAccounts[0].pigmyId);
      }
    }
  }, [customer, visible, initialType, initialLoanId, initialPigmyId]);

  if (!customer) return null;

  const activeLoans = customer.loans || [];
  const activePigmyAccounts = customer.pigmyAccounts || [];

  const selectedLoan = activeLoans.find((l) => l.loanId === selectedLoanId) || activeLoans[0];
  const selectedPigmy =
    activePigmyAccounts.find((p) => p.pigmyId === selectedPigmyId) ||
    activePigmyAccounts[0];

  const handleAddAmount = (add: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + add).toString());
    setError(null);
  };

  const handleSetAmount = (val: number) => {
    setAmount(val.toString());
    setError(null);
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid collection amount greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (collectionType === "LOAN") {
        if (!selectedLoan?.loanId) {
          throw new Error("No loan account selected");
        }
        await MobileApi.recordLoanCollection({
          loanId: selectedLoan.loanId,
          customerId: customer.customerId,
          amount: numAmount,
          collectionDate: collectionDate,
        });
      } else {
        if (!selectedPigmy?.pigmyId) {
          throw new Error("No pigmy savings account selected");
        }
        await MobileApi.recordPigmyCollection(selectedPigmy.pigmyId, {
          amount: numAmount,
          collectionDate: collectionDate,
        });
      }

      setSuccessMsg(
        `₹${numAmount.toLocaleString("en-IN")} collected successfully!`
      );

      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Collection error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to record collection. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
            <View>
              <Text variant="titleLarge" style={styles.title}>
                Collect Daily Cash
              </Text>
              <Text style={styles.customerName}>
                {customer.customerName} ({customer.customerId})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* Status messages */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>✅ {successMsg}</Text>
              </View>
            ) : null}

            {/* Product Type Tabs */}
            <View style={styles.typeTabs}>
              <TouchableOpacity
                disabled={activeLoans.length === 0}
                style={[
                  styles.tabButton,
                  collectionType === "LOAN" && styles.tabButtonActive,
                  activeLoans.length === 0 && styles.tabButtonDisabled,
                ]}
                onPress={() => {
                  setCollectionType("LOAN");
                  setError(null);
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
                disabled={activePigmyAccounts.length === 0}
                style={[
                  styles.tabButton,
                  collectionType === "PIGMY" && styles.tabButtonActive,
                  activePigmyAccounts.length === 0 && styles.tabButtonDisabled,
                ]}
                onPress={() => {
                  setCollectionType("PIGMY");
                  setError(null);
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
                  <Text style={styles.cardIdBadge}>Loan: {selectedLoan.loanId}</Text>
                  <Text
                    style={[
                      styles.statusPill,
                      selectedLoan.todayCollected
                        ? styles.statusPillDone
                        : styles.statusPillPending,
                    ]}
                  >
                    {selectedLoan.todayCollected ? "✅ Paid Today" : "⏳ Pending"}
                  </Text>
                </View>

                {/* Multiple Loans Dropdown/Selector if > 1 */}
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
                          {l.loanId}
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
                  <Text style={styles.cardIdBadge}>Pigmy: {selectedPigmy.pigmyId}</Text>
                  <Text
                    style={[
                      styles.statusPill,
                      selectedPigmy.todayCollected
                        ? styles.statusPillDone
                        : styles.statusPillPending,
                    ]}
                  >
                    {selectedPigmy.todayCollected ? "✅ Deposited Today" : "⏳ Pending"}
                  </Text>
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
                          {p.pigmyId}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Total Saved</Text>
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

            {/* Collection Date Field */}
            <Input
              label="Collection Date (YYYY-MM-DD)"
              value={collectionDate}
              onChangeText={setCollectionDate}
              placeholder="YYYY-MM-DD"
              leftIcon="calendar"
              editable={!loading}
            />

            {/* Cash Amount Field */}
            <Input
              label="Cash Amount (₹)"
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                setError(null);
              }}
              placeholder="Enter collected cash (e.g. 500)"
              keyboardType="numeric"
              leftIcon="currency-inr"
              editable={!loading}
            />

            {/* Quick Amount Chips */}
            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleAddAmount(100)}
              >
                <Text style={styles.quickChipText}>+₹100</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleAddAmount(200)}
              >
                <Text style={styles.quickChipText}>+₹200</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleAddAmount(500)}
              >
                <Text style={styles.quickChipText}>+₹500</Text>
              </TouchableOpacity>
              {collectionType === "LOAN" && selectedLoan?.pendingAmount ? (
                <TouchableOpacity
                  style={[styles.quickChip, styles.quickChipFull]}
                  onPress={() => handleSetAmount(selectedLoan.pendingAmount)}
                >
                  <Text style={styles.quickChipFullText}>Full Due</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Submit Action */}
            <View style={styles.submitContainer}>
              <PrimaryButton
                title={
                  collectionType === "LOAN"
                    ? "Record Loan Payment"
                    : "Record Pigmy Deposit"
                }
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
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
  successBanner: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "700",
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
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillDone: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  statusPillPending: {
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
  quickChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
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
  submitContainer: {
    marginTop: 4,
  },
});
