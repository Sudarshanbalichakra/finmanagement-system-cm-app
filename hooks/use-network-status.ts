import { useCallback, useEffect, useState } from "react";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { checkNetworkConnectivity, NetworkStatusResult } from "@/utils/network";

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatusResult>({
    isConnected: true,
    isInternetReachable: true,
    type: Network.NetworkStateType.UNKNOWN,
    isOnline: true,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkNetwork = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkNetworkConnectivity();
      setStatus(result);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Check network immediately
    checkNetwork();

    // Listen to network changes if supported
    let subscription: any = null;
    try {
      if (typeof Network.addNetworkStateListener === "function") {
        subscription = Network.addNetworkStateListener((state) => {
          const isConnected =
            state.isConnected !== false &&
            state.type !== Network.NetworkStateType.NONE;
          const isInternetReachable = state.isInternetReachable !== false;
          setStatus({
            isConnected,
            isInternetReachable,
            type: state.type || Network.NetworkStateType.UNKNOWN,
            isOnline: isConnected && isInternetReachable,
          });
        });
      }
    } catch {
      // Listener may not be available on all platforms
    }

    // Web event listeners
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => checkNetwork();
      const handleOffline = () => checkNetwork();
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        subscription?.remove?.();
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    return () => {
      subscription?.remove?.();
    };
  }, [checkNetwork]);

  return {
    ...status,
    isChecking,
    checkNetwork,
  };
}
