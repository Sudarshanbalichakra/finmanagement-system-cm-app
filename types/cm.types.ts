export interface Assurity {
  name: string | null;
  mobile?: string | number | null;
  relationship?: string | null;
}

export interface LoanItem {
  loanId: string;
  loanAmount: number;
  interestRate?: number;
  durationMonths?: number;
  disbursedCash?: number;
  repaymentAmount: number;
  pendingAmount: number;
  startDate?: string;
  endDate?: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED" | string;
  assurity?: Assurity;
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
  depositMode?: "FLEXIBLE" | "FIXED" | string;
  depositFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | string;
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
  hasActiveLoan?: boolean;
  hasActivePigmy?: boolean;
  todayVisited?: boolean;
  isPaid?: boolean;
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

export interface MySummaryCM {
  collectionManagerId: string;
  name: string;
  mobile?: string;
  email?: string;
  clientId?: string;
}

export interface MySummaryOverallStats {
  totalCashInHand: number;
  totalTransactions: number;
  uniqueCustomersVisited: number;
  totalLoanCollected: number;
  loanTransactionsCount: number;
  totalPigmyCollected: number;
  pigmyTransactionsCount: number;
}

export interface MySummaryLoanCollection {
  collectionId?: string;
  loanId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  isPaid?: boolean;
  approvalStatus?: string;
  createdAt?: string;
}

export interface MySummaryPigmyCollection {
  collectionId?: string;
  pigmyId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  isPaid?: boolean;
  createdAt?: string;
}

export interface MyDayCloseSummaryData {
  date: string;
  collectionManager?: MySummaryCM;
  overallStats?: MySummaryOverallStats;
  loanCollections?: MySummaryLoanCollection[];
  pigmyCollections?: MySummaryPigmyCollection[];
}

export interface MyDayCloseSummaryResponse {
  success: boolean;
  data: MyDayCloseSummaryData;
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
