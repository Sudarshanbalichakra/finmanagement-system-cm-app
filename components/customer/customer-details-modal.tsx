import { MobileApi } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CustomerFeedItem,
  LoanLedgerItem,
  PigmyLedgerItem,
} from "@/types/cm.types";
import {
  getLoanCollectionStatus,
  getPigmyCollectionStatus,
} from "@/utils/collection-status";
import { getFriendlyErrorMessage } from "@/utils/error-handler";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";

interface CustomerDetailsModalProps {
  visible: boolean;
  customer: CustomerFeedItem | null;
  onClose: () => void;
  onOpenCollect: (
    customer: CustomerFeedItem,
    type?: "LOAN" | "PIGMY",
    targetId?: string,
  ) => void;
}

export function CustomerDetailsModal({
  visible,
  customer,
  onClose,
  onOpenCollect,
}: CustomerDetailsModalProps) {
  const currentCMId = useAuthStore((state) => state.user?.collectionManagerId);
  const [activeTab, setActiveTab] = useState<"LOANS" | "PIGMY">("LOANS");
  const [loanLedgers, setLoanLedgers] = useState<{
    [loanId: string]: {
      loading: boolean;
      items: LoanLedgerItem[];
      error?: string;
    };
  }>({});
  const [pigmyLedgers, setPigmyLedgers] = useState<{
    [pigmyId: string]: {
      loading: boolean;
      items: PigmyLedgerItem[];
      error?: string;
    };
  }>({});

  useEffect(() => {
    if (customer && visible) {
      if (customer.loans && customer.loans.length > 0) {
        setActiveTab("LOANS");
      } else if (customer.pigmyAccounts && customer.pigmyAccounts.length > 0) {
        setActiveTab("PIGMY");
      } else {
        setActiveTab("LOANS");
      }
    }
  }, [customer, visible]);

  if (!customer) return null;

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const loadLoanLedger = async (loanId: string) => {
    setLoanLedgers((prev) => ({
      ...prev,
      [loanId]: { loading: true, items: prev[loanId]?.items || [] },
    }));

    try {
      const res = await MobileApi.getLoanCollectionsLedger(loanId);
      setLoanLedgers((prev) => ({
        ...prev,
        [loanId]: { loading: false, items: res.data || [] },
      }));
    } catch (err: any) {
      setLoanLedgers((prev) => ({
        ...prev,
        [loanId]: {
          loading: false,
          items: [],
          error: getFriendlyErrorMessage(
            err,
            "Unable to load collection ledger history.",
          ),
        },
      }));
    }
  };

  const loadPigmyLedger = async (pigmyId: string) => {
    setPigmyLedgers((prev) => ({
      ...prev,
      [pigmyId]: { loading: true, items: prev[pigmyId]?.items || [] },
    }));

    try {
      const res = await MobileApi.getPigmyCollectionsLedger(pigmyId);
      setPigmyLedgers((prev) => ({
        ...prev,
        [pigmyId]: { loading: false, items: res.data || [] },
      }));
    } catch (err: any) {
      setPigmyLedgers((prev) => ({
        ...prev,
        [pigmyId]: {
          loading: false,
          items: [],
          error: getFriendlyErrorMessage(
            err,
            "Unable to load pigmy passbook history.",
          ),
        },
      }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Customer Passbook
          </Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {customer.customerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text
                  variant="titleLarge"
                  style={[styles.customerName, { textTransform: "capitalize" }]}
                >
                  {customer.customerName}
                </Text>
                <Text style={styles.customerId}>ID: {customer.customerId}</Text>
                <TouchableOpacity
                  onPress={() => handleCall(customer.mobile)}
                  style={styles.callRow}
                >
                  <Text style={styles.phoneText}>📞 {customer.mobile}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {customer.address ? (
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>📍 Address:</Text>
                <Text style={styles.addressText}>{customer.address}</Text>
              </View>
            ) : null}
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "LOANS" && styles.tabActive]}
              onPress={() => setActiveTab("LOANS")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "LOANS" && styles.tabTextActive,
                ]}
              >
                Loans ({customer.loans?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "PIGMY" && styles.tabActive]}
              onPress={() => setActiveTab("PIGMY")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "PIGMY" && styles.tabTextActive,
                ]}
              >
                Pigmy ({customer.pigmyAccounts?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOANS TAB */}
          {activeTab === "LOANS" && (
            <View style={styles.sectionContainer}>
              {customer.loans && customer.loans.length > 0 ? (
                customer.loans.map((loan) => {
                  const ledger = loanLedgers[loan.loanId];
                  return (
                    <View key={loan.loanId} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View>
                          <Text style={styles.cardId}>Loan #{loan.loanId}</Text>
                          <Text style={styles.cardStatus}>{loan.status}</Text>
                        </View>
                        {(() => {
                          const status = getLoanCollectionStatus(
                            loan,
                            customer,
                            currentCMId,
                          );

                          if (status.isPaid) {
                            return (
                              <View
                                style={[
                                  styles.collectMiniButtonDisabled,
                                  !status.isSelf &&
                                    styles.collectMiniButtonColleague,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.collectMiniTextDisabled,
                                    !status.isSelf &&
                                      styles.collectMiniTextColleague,
                                  ]}
                                >
                                  {status.isSelf
                                    ? `✅ Paid (₹${status.collectedAmount || loan.todayCollectionAmount || 0})`
                                    : `👥 Collected by Colleague`}
                                </Text>
                              </View>
                            );
                          }

                          return (
                            <TouchableOpacity
                              style={styles.collectMiniButton}
                              onPress={() =>
                                onOpenCollect(customer, "LOAN", loan.loanId)
                              }
                            >
                              <Text style={styles.collectMiniText}>
                                + Collect
                              </Text>
                            </TouchableOpacity>
                          );
                        })()}
                      </View>

                      {/* Loan Figures (Directly from API) */}
                      <View style={styles.figuresGrid}>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Pending Amount</Text>
                          <Text style={styles.figValRed}>
                            ₹{loan.pendingAmount.toLocaleString("en-IN")}
                          </Text>
                        </View>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Repayment Total</Text>
                          <Text style={styles.figVal}>
                            ₹{loan.repaymentAmount.toLocaleString("en-IN")}
                          </Text>
                        </View>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Disbursed</Text>
                          <Text style={styles.figVal}>
                            ₹{loan.disbursedCash?.toLocaleString("en-IN")}
                          </Text>
                        </View>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Today Paid</Text>
                          <Text
                            style={
                              loan.todayCollected
                                ? styles.figValGreen
                                : styles.figValMuted
                            }
                          >
                            {loan.todayCollected
                              ? `₹${loan.todayCollectionAmount || 0}`
                              : "₹0"}
                          </Text>
                        </View>
                      </View>

                      {/* Assurity Details for Loan */}
                      {loan.assurity?.name ? (
                        <View style={styles.loanAssurityBox}>
                          <Text style={styles.loanAssurityLabel}>
                            Assurity Details
                          </Text>
                          <Text style={styles.loanAssurityText}>
                            {loan.assurity.name} (
                            {loan.assurity.relationship || "Relation"}) - 📞{" "}
                            {loan.assurity.mobile || "N/A"}
                          </Text>
                        </View>
                      ) : null}

                      {/* Ledger Accordion */}
                      <TouchableOpacity
                        style={styles.ledgerToggle}
                        onPress={() => {
                          if (!ledger?.items?.length) {
                            loadLoanLedger(loan.loanId);
                          }
                        }}
                      >
                        <Text style={styles.ledgerToggleText}>
                          📖 Collection Ledger History
                        </Text>
                      </TouchableOpacity>

                      {ledger?.loading && (
                        <ActivityIndicator
                          style={{ marginVertical: 8 }}
                          color="#00A859"
                        />
                      )}

                      {ledger?.items && ledger.items.length > 0 && (
                        <View style={styles.ledgerList}>
                          {ledger.items.map((item, idx) => (
                            <View key={idx} style={styles.ledgerRow}>
                              <Text style={styles.ledgerDate}>
                                {item.collectionDate}
                              </Text>
                              <Text style={styles.ledgerAmount}>
                                +₹{item.amount.toLocaleString("en-IN")}
                              </Text>
                              <Text style={styles.ledgerStatus}>
                                {item.approvalStatus || "Approved"}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {ledger?.items &&
                        ledger.items.length === 0 &&
                        !ledger.loading && (
                          <Text style={styles.emptyLedgerText}>
                            No collection history recorded yet for this loan.
                          </Text>
                        )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No loans registered.</Text>
                </View>
              )}
            </View>
          )}

          {/* PIGMY TAB */}
          {activeTab === "PIGMY" && (
            <View style={styles.sectionContainer}>
              {customer.pigmyAccounts && customer.pigmyAccounts.length > 0 ? (
                customer.pigmyAccounts.map((pigmy) => {
                  const ledger = pigmyLedgers[pigmy.pigmyId];
                  return (
                    <View key={pigmy.pigmyId} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View>
                          <Text style={styles.cardId}>
                            Pigmy #{pigmy.pigmyId}
                          </Text>
                        </View>
                        {(() => {
                          const status = getPigmyCollectionStatus(
                            pigmy,
                            customer,
                            currentCMId,
                          );

                          if (status.isPaid) {
                            return (
                              <View
                                style={[
                                  styles.collectMiniButtonDisabled,
                                  !status.isSelf &&
                                    styles.collectMiniButtonColleague,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.collectMiniTextDisabled,
                                    !status.isSelf &&
                                      styles.collectMiniTextColleague,
                                  ]}
                                >
                                  {status.isSelf
                                    ? `✅ Deposited (₹${status.collectedAmount || pigmy.todayCollectionAmount || 0})`
                                    : `👥 Collected by Colleague`}
                                </Text>
                              </View>
                            );
                          }

                          return (
                            <TouchableOpacity
                              style={styles.collectMiniButton}
                              onPress={() =>
                                onOpenCollect(customer, "PIGMY", pigmy.pigmyId)
                              }
                            >
                              <Text style={styles.collectMiniText}>
                                + Deposit
                              </Text>
                            </TouchableOpacity>
                          );
                        })()}
                      </View>

                      {/* Pigmy Figures */}
                      <View style={styles.figuresGrid}>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Total Saved</Text>
                          <Text style={styles.figValGreen}>
                            ₹{pigmy.totalSavedAmount.toLocaleString("en-IN")}
                          </Text>
                        </View>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Start Date</Text>
                          <Text style={styles.figVal}>
                            {pigmy.startDate || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.figBox}>
                          <Text style={styles.figLabel}>Today Deposited</Text>
                          <Text
                            style={
                              pigmy.todayCollected
                                ? styles.figValGreen
                                : styles.figValMuted
                            }
                          >
                            {pigmy.todayCollected
                              ? `₹${pigmy.todayCollectionAmount || 0}`
                              : "₹0"}
                          </Text>
                        </View>
                      </View>

                      {/* Passbook Toggle */}
                      <TouchableOpacity
                        style={styles.ledgerToggle}
                        onPress={() => {
                          if (!ledger?.items?.length) {
                            loadPigmyLedger(pigmy.pigmyId);
                          }
                        }}
                      >
                        <Text style={styles.ledgerToggleText}>
                          📖 View Savings Passbook
                        </Text>
                      </TouchableOpacity>

                      {ledger?.loading && (
                        <ActivityIndicator
                          style={{ marginVertical: 8 }}
                          color="#00A859"
                        />
                      )}

                      {ledger?.items && ledger.items.length > 0 && (
                        <View style={styles.ledgerList}>
                          {ledger.items.map((item, idx) => (
                            <View key={idx} style={styles.ledgerRow}>
                              <Text style={styles.ledgerDate}>
                                {item.collectionDate}
                              </Text>
                              <Text style={styles.ledgerAmount}>
                                +₹{item.amount.toLocaleString("en-IN")}
                              </Text>
                              <Text style={styles.ledgerStatus}>
                                Bal: ₹
                                {(
                                  item.totalSavedAmount || item.amount
                                ).toLocaleString("en-IN")}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {ledger?.items &&
                        ledger.items.length === 0 &&
                        !ledger.loading && (
                          <Text style={styles.emptyLedgerText}>
                            No deposits recorded yet for this pigmy account.
                          </Text>
                        )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No active pigmy accounts found.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fff9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00A859",
  },
  headerTitle: {
    fontWeight: "800",
    color: "#111827",
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  customerName: {
    fontWeight: "800",
    color: "#111827",
  },
  customerId: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  callRow: {
    marginTop: 4,
  },
  phoneText: {
    color: "#00A859",
    fontSize: 13,
    fontWeight: "700",
  },
  addressRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  addressText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  assurityCard: {
    marginTop: 12,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  assurityTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4b5563",
    textTransform: "uppercase",
  },
  assurityText: {
    fontSize: 13,
    color: "#1f2937",
    marginTop: 2,
  },
  loanAssurityBox: {
    marginTop: 12,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  loanAssurityLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  loanAssurityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#00A859",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b5563",
  },
  tabTextActive: {
    color: "#fff",
  },
  sectionContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  cardStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
    marginTop: 2,
  },
  cardScheme: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  collectMiniButton: {
    backgroundColor: "#00A859",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  collectMiniText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  collectMiniButtonDisabled: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  collectMiniTextDisabled: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 12,
  },
  collectMiniButtonColleague: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  collectMiniTextColleague: {
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 12,
  },
  figuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  figBox: {
    flexBasis: "46%",
  },
  figLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  figVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  figValRed: {
    fontSize: 16,
    fontWeight: "800",
    color: "#dc2626",
    marginTop: 2,
  },
  figValGreen: {
    fontSize: 15,
    fontWeight: "800",
    color: "#059669",
    marginTop: 2,
  },
  figValMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
    marginTop: 2,
  },
  ledgerToggle: {
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  ledgerToggleText: {
    color: "#00A859",
    fontWeight: "700",
    fontSize: 13,
  },
  ledgerList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  ledgerDate: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "600",
  },
  ledgerAmount: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "700",
  },
  ledgerStatus: {
    fontSize: 12,
    color: "#6b7280",
  },
  emptyLedgerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },
  infoLine: {
    fontSize: 14,
    color: "#374151",
    marginTop: 8,
  },
  infoLineMuted: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
});
