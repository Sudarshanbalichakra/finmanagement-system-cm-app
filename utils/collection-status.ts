import { CustomerFeedItem, LoanItem, PigmyAccountItem } from "@/types/cm.types";

export interface AccountCollectionStatus {
  isPaid: boolean;
  isSelf: boolean;
  collectorName: string;
  collectedAmount: number;
}

/**
 * Evaluates whether a loan is paid today and identifies if it was collected by the current CM or a colleague.
 * Evaluates strictly at the loan account level.
 */
export function getLoanCollectionStatus(
  loan: LoanItem | null | undefined,
  customer?: CustomerFeedItem | null,
  currentCMId?: string,
): AccountCollectionStatus {
  if (!loan) {
    return {
      isPaid: false,
      isSelf: false,
      collectorName: "Colleague",
      collectedAmount: 0,
    };
  }

  // Account-level check for loan collection
  const isPaid = Boolean(
    loan.isPaid === true ||
    loan.isPaid === ("true" as any) ||
    loan.todayCollected === true ||
    loan.todayCollected === ("true" as any) ||
    (typeof loan.todayCollectionAmount === "number" &&
      loan.todayCollectionAmount > 0),
  );

  const collectedAmount =
    typeof loan.todayCollectionAmount === "number" &&
    loan.todayCollectionAmount > 0
      ? loan.todayCollectionAmount
      : 0;

  const rawCollector = loan.collectedBy || loan.collectionManagerId;

  const isSelf = Boolean(
    isPaid &&
    rawCollector &&
    currentCMId &&
    String(rawCollector).trim().toLowerCase() ===
      String(currentCMId).trim().toLowerCase(),
  );

  const collectorName = rawCollector ? String(rawCollector) : "Colleague";

  return { isPaid, isSelf, collectorName, collectedAmount };
}

/**
 * Evaluates whether a pigmy account is deposited today and identifies attribution.
 * Evaluates strictly at the pigmy account level to prevent cross-contamination from loans.
 */
export function getPigmyCollectionStatus(
  pigmy: PigmyAccountItem | null | undefined,
  customer?: CustomerFeedItem | null,
  currentCMId?: string,
): AccountCollectionStatus {
  if (!pigmy) {
    return {
      isPaid: false,
      isSelf: false,
      collectorName: "Colleague",
      collectedAmount: 0,
    };
  }

  // Account-level check for pigmy collection
  const isPaid = Boolean(
    pigmy.isPaid === true ||
    pigmy.isPaid === ("true" as any) ||
    pigmy.todayCollected === true ||
    pigmy.todayCollected === ("true" as any) ||
    (typeof pigmy.todayCollectionAmount === "number" &&
      pigmy.todayCollectionAmount > 0),
  );

  const collectedAmount =
    typeof pigmy.todayCollectionAmount === "number" &&
    pigmy.todayCollectionAmount > 0
      ? pigmy.todayCollectionAmount
      : 0;

  const rawCollector = pigmy.collectedBy || pigmy.collectionManagerId;

  const isSelf = Boolean(
    isPaid &&
    rawCollector &&
    currentCMId &&
    String(rawCollector).trim().toLowerCase() ===
      String(currentCMId).trim().toLowerCase(),
  );

  const collectorName = rawCollector ? String(rawCollector) : "Colleague";

  return { isPaid, isSelf, collectorName, collectedAmount };
}

/**
 * Evaluates overall customer visited status and colleague collection state.
 */
export function getCustomerVisitedStatus(
  customer: CustomerFeedItem | null | undefined,
  currentCMId?: string,
): {
  isVisited: boolean;
  allCollected: boolean;
  isColleagueCollected: boolean;
  primaryCollectorName: string;
} {
  if (!customer) {
    return {
      isVisited: false,
      allCollected: false,
      isColleagueCollected: false,
      primaryCollectorName: "Colleague",
    };
  }

  const hasLoans = Boolean(customer.loans && customer.loans.length > 0);
  const hasPigmy = Boolean(
    customer.pigmyAccounts && customer.pigmyAccounts.length > 0,
  );

  const loanStatuses = (customer.loans || []).map((l) =>
    getLoanCollectionStatus(l, customer, currentCMId),
  );
  const pigmyStatuses = (customer.pigmyAccounts || []).map((p) =>
    getPigmyCollectionStatus(p, customer, currentCMId),
  );

  const anyLoanPaid = loanStatuses.some((s) => s.isPaid);
  const allLoansPaid = hasLoans ? loanStatuses.every((s) => s.isPaid) : true;

  const anyPigmyPaid = pigmyStatuses.some((s) => s.isPaid);
  const allPigmyPaid = hasPigmy ? pigmyStatuses.every((s) => s.isPaid) : true;

  const isDirectlyVisited =
    customer.todayVisited === true || customer.todayVisited === ("true" as any);

  // Visited if at least one payment was made or visited
  const isVisited = Boolean(
    isDirectlyVisited ||
    anyLoanPaid ||
    anyPigmyPaid ||
    customer.isPaid === true,
  );

  // All collected ONLY when all active loans AND all active pigmy accounts are paid
  const allCollected = Boolean(
    hasLoans || hasPigmy
      ? allLoansPaid && allPigmyPaid
      : isDirectlyVisited || customer.isPaid === true,
  );

  const allPaidStatuses = [...loanStatuses, ...pigmyStatuses].filter(
    (s) => s.isPaid,
  );
  const hasAnyColleague =
    allPaidStatuses.some((s) => !s.isSelf) ||
    (allCollected &&
      allPaidStatuses.length === 0 &&
      Boolean(customer.collectedBy && customer.collectedBy !== currentCMId));

  const colleagueCollector =
    allPaidStatuses.find((s) => !s.isSelf)?.collectorName ||
    customer.collectedBy ||
    customer.collectionManagerId ||
    "Colleague";

  return {
    isVisited,
    allCollected,
    isColleagueCollected: hasAnyColleague,
    primaryCollectorName: colleagueCollector,
  };
}
