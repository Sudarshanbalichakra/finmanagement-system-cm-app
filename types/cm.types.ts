export interface NomineeInfo {
  nomineeName?: string;
  nomineeNumber?: string;
  nomineeRelation?: string;
}

export interface LoanItem {
  loanId: string;
  loanAmount: number;
  interestRate?: number;
  durationMonths?: number;
  repaymentAmount: number;
  pendingAmount: number;
  startDate?: string;
  endDate?: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED" | string;
  isPaid?: boolean;
  todayCollected?: boolean;
  todayCollectionAmount?: number;
  collectedBy?: string;
  collectionManagerId?: string;
}

export interface PigmyAccountItem {
  pigmyId: string;
  schemeId?: string;
  schemeName?: string;
  duration?: number;
  durationUnit?: "DAYS" | "MONTHS" | string;
  startDate?: string;
  maturityDate?: string;
  totalSavedAmount: number;
  status: "ACTIVE" | "MATURED" | "CLOSED" | string;
  isPaid?: boolean;
  todayCollected?: boolean;
  todayCollectionAmount?: number;
  collectedBy?: string;
  collectionManagerId?: string;
}

export interface CustomerFeedItem {
  customerId: string;
  customerName: string;
  mobile: string;
  address?: string;
  customerPhoto?: string;
  idProofType?: string;
  idProofPhoto?: string;
  nominee?: NomineeInfo;
  hasActiveLoan?: boolean;
  hasActivePigmy?: boolean;
  isPaid?: boolean;
  todayVisited?: boolean;
  todayCollected?: boolean;
  todayCollectionAmount?: number;
  collectedBy?: string;
  collectionManagerId?: string;
  loans: LoanItem[];
  pigmyAccounts: PigmyAccountItem[];
}

export interface MobileFeedStats {
  totalCustomers: number;
  customersWithLoans: number;
  customersWithPigmy: number;
  visitedCustomersToday: number;
  totalLoanCollectedToday: number;
  totalPigmyCollectedToday: number;
  totalCashCollectedToday: number;
}

export interface MobileFeedData {
  date: string;
  collectionManagerId: string;
  stats: MobileFeedStats;
  customers: CustomerFeedItem[];
}

export interface MobileFeedResponse {
  success: boolean;
  data: MobileFeedData;
  message?: string;
}

export interface RecordLoanCollectionPayload {
  loanId: string;
  customerId: string;
  amount: number;
  collectionDate?: string;
  collectionManagerId?: string;
}

export interface LoanCollectionResult {
  collectionId: string;
  loanId: string;
  customerId: string;
  collectionManagerId: string;
  amount: number;
  collectionDate: string;
  isPaid?: boolean;
  approvalStatus?: string;
}

export interface RecordPigmyCollectionPayload {
  amount: number;
  collectionDate?: string;
  customerId?: string;
  collectionManagerId?: string;
}

export interface PigmyCollectionResult {
  collectionId: string;
  pigmyId: string;
  customerId: string;
  collectionManagerId: string;
  amount: number;
  collectionDate: string;
  totalSavedAmount: number;
  isPaid?: boolean;
}

export interface DailySummaryCM {
  collectionManagerId: string;
  name: string;
  totalAmount: number;
  collectionsCount: number;
}

export interface DailySummaryData {
  date: string;
  totalAmount: number;
  totalCollections: number;
  collectionManagers: DailySummaryCM[];
}

export interface DailySummaryResponse {
  success: boolean;
  data: DailySummaryData;
  message?: string;
}

export interface LoanLedgerItem {
  collectionId?: string;
  _id?: string;
  amount: number;
  collectionDate: string;
  collectedBy?: string;
  approvalStatus?: string;
  createdAt?: string;
}

export interface PigmyLedgerItem {
  collectionId?: string;
  _id?: string;
  amount: number;
  collectionDate: string;
  collectedBy?: string;
  totalSavedAmount?: number;
  createdAt?: string;
}
