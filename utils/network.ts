import * as Network from "expo-network";
import { Platform } from "react-native";

export interface NetworkStatusResult {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType | string;
  isOnline: boolean;
}

/**
 * Checks current network and internet connection.
 * Returns true if the device has an active Wi-Fi or Cellular data connection.
 */
export async function checkNetworkConnectivity(): Promise<NetworkStatusResult> {
  try {
    // 1. Web Platform Check
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      typeof navigator.onLine === "boolean"
    ) {
      const isWebOnline = navigator.onLine;
      return {
        isConnected: isWebOnline,
        isInternetReachable: isWebOnline,
        type: isWebOnline
          ? Network.NetworkStateType.WIFI
          : Network.NetworkStateType.NONE,
        isOnline: isWebOnline,
      };
    }

    // 2. Native Mobile Network State Check
    const state = await Network.getNetworkStateAsync();

    // Check if network hardware (Wi-Fi or Cellular) is connected
    const isConnected =
      state.isConnected === true &&
      state.type !== Network.NetworkStateType.NONE;

    // Reachable is true unless explicitly reported as false by OS
    const isInternetReachable =
      state.isInternetReachable !== false && isConnected;

    const isOnline = isConnected && isInternetReachable;

    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable,
      type: state.type || Network.NetworkStateType.UNKNOWN,
      isOnline,
    };
  } catch (error) {
    console.warn("Network check error, falling back to assumed online:", error);
    // If native module fails, fail-safe to online so app doesn't get permanently blocked
    return {
      isConnected: true,
      isInternetReachable: true,
      type: Network.NetworkStateType.UNKNOWN,
      isOnline: true,
    };
  }
}
