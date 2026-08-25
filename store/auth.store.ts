import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export interface CMUser {
  collectionManagerId: string;
  clientId: string;
  role: string;
  name?: string;
  email?: string;
  mobile?: string;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: CMUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: CMUser) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<boolean>;
}

const TOKEN_KEY = "cm_access_token";
const USER_KEY = "cm_user_data";

// Helper for cross-platform secure storage
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return typeof window !== "undefined" ? localStorage.getItem(key) : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`Failed to store item securely: ${key}`, e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`Failed to delete item securely: ${key}`, e);
    }
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (token: string, user: CMUser) => {
    await storage.setItem(TOKEN_KEY, token);
    await storage.setItem(USER_KEY, JSON.stringify(user));
    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const storedToken = await storage.getItem(TOKEN_KEY);
      const storedUser = await storage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser: CMUser = JSON.parse(storedUser);
        set({
          token: storedToken,
          user: parsedUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
    } catch (e) {
      console.error("Auth initialization failed:", e);
    }

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return false;
  },
}));
