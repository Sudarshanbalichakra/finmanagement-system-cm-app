import { CMUser, useAuthStore } from "@/store/auth.store";
import {
  CustomerFeedItem,
  DailySummaryResponse,
  LoanCollectionResult,
  LoanLedgerItem,
  MobileFeedResponse,
  PigmyCollectionResult,
  PigmyLedgerItem,
  RecordLoanCollectionPayload,
  RecordPigmyCollectionPayload,
} from "@/types/cm.types";
import axios, { AxiosError } from "axios";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.10:3000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 and errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth on 401 unauthorized
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export interface CMLoginPayload {
  collectionManagerId: string;
  password: string;
}

export interface CMLoginResponse {
  success?: boolean;
  accessToken?: string;
  token?: string;
  user?: CMUser;
  data?: {
    accessToken?: string;
    token?: string;
    user?: CMUser;
    [key: string]: any;
  };
  message?: string;
}

export const MobileApi = {
  /**
   * 1. CM Login
   * Tries POST /auth/cm-login, with fallbacks to /cm/auth/login and /auth/login
   */
  loginCM: async (
    payload: CMLoginPayload,
  ): Promise<{ accessToken: string; user: CMUser }> => {
    let response;

    try {
      response = await apiClient.post<CMLoginResponse>(
        "/auth/cm-login",
        payload,
      );
    } catch (err: any) {
      if (err.response?.status === 404) {
        try {
          response = await apiClient.post<CMLoginResponse>(
            "/cm/auth/login",
            payload,
          );
        } catch (err2: any) {
          if (err2.response?.status === 404) {
            response = await apiClient.post<CMLoginResponse>(
              "/auth/login",
              payload,
            );
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    const resData = response.data;
    const token =
      resData.accessToken ||
      resData.token ||
      resData.data?.accessToken ||
      resData.data?.token;
    const user = resData.user || resData.data?.user;

    if (!token) {
      throw new Error(
        resData.message || "Authentication token not received from server.",
      );
    }

    const cmUser: CMUser = user || {
      collectionManagerId: payload.collectionManagerId,
      clientId: resData.data?.clientId || "CLI-AUTO",
      role: "COLLECTION_MANAGER",
      name: resData.data?.name || "Collection Manager",
    };

    return {
      accessToken: token,
      user: cmUser,
    };
  },

  /**
   * Get Logged-in User Profile from Token
   */
  getProfile: async (): Promise<CMUser> => {
    const response = await apiClient.get<{
      success: boolean;
      data: CMUser;
      user?: CMUser;
    }>("/auth/me");
    return response.data.data || response.data.user || (response.data as any);
  },

  /**
   * 2. Unified Mobile Feed
   * GET /customers/mobile-feed?date=YYYY-MM-DD
   */
  getMobileFeed: async (
    date?: string,
    signal?: AbortSignal,
  ): Promise<MobileFeedResponse> => {
    const response = await apiClient.get<MobileFeedResponse>(
      "/customers/mobile-feed",
      {
        params: date ? { date } : undefined,
        signal,
      },
    );
    return response.data;
  },

  /**
   * 3A. Record Loan Daily Cash Collection
   * POST /daily-collections
   */
  recordLoanCollection: async (
    payload: RecordLoanCollectionPayload,
  ): Promise<{
    success: boolean;
    data: LoanCollectionResult;
    message?: string;
  }> => {
    const response = await apiClient.post<{
      success: boolean;
      data: LoanCollectionResult;
      message?: string;
    }>("/daily-collections", payload);
    return response.data;
  },

  /**
   * 3B. Record Pigmy Daily Cash Collection
   * POST /pigmy-accounts/:pigmyId/collections
   */
  recordPigmyCollection: async (
    pigmyId: string,
    payload: RecordPigmyCollectionPayload,
  ): Promise<{
    success: boolean;
    data: PigmyCollectionResult;
    message?: string;
  }> => {
    const response = await apiClient.post<{
      success: boolean;
      data: PigmyCollectionResult;
      message?: string;
    }>(`/pigmy-accounts/${pigmyId}/collections`, payload);
    return response.data;
  },

  /**
   * 4. Get CM Daily Summary & Stats
   * GET /daily-collections/summary?date=YYYY-MM-DD
   */
  getDailySummary: async (
    date?: string,
    signal?: AbortSignal,
  ): Promise<DailySummaryResponse> => {
    const response = await apiClient.get<DailySummaryResponse>(
      "/daily-collections/summary",
      {
        params: date ? { date } : undefined,
        signal,
      },
    );
    return response.data;
  },

  /**
   * 5A. Get Single Customer Profile Details
   * GET /customers/:customerId
   */
  getCustomerDetails: async (
    customerId: string,
  ): Promise<{ success: boolean; data: CustomerFeedItem }> => {
    const response = await apiClient.get<{
      success: boolean;
      data: CustomerFeedItem;
    }>(`/customers/${customerId}`);
    return response.data;
  },

  /**
   * 5B. Get Loan Collections Ledger
   * GET /loans/:loanId/collections
   */
  getLoanCollectionsLedger: async (
    loanId: string,
  ): Promise<{ success: boolean; data: LoanLedgerItem[] }> => {
    const response = await apiClient.get<{
      success: boolean;
      data: LoanLedgerItem[];
    }>(`/loans/${loanId}/collections`);
    return response.data;
  },

  /**
   * 5C. Get Pigmy Savings Collections Ledger
   * GET /pigmy-accounts/:pigmyId/collections
   */
  getPigmyCollectionsLedger: async (
    pigmyId: string,
  ): Promise<{ success: boolean; data: PigmyLedgerItem[] }> => {
    const response = await apiClient.get<{
      success: boolean;
      data: PigmyLedgerItem[];
    }>(`/pigmy-accounts/${pigmyId}/collections`);
    return response.data;
  },
};

// Backwards compatibility alias for login
export const cmLoginApi = MobileApi.loginCM;
