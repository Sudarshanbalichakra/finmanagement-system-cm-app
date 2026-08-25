import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth.store";

const PRIMARY = "#00A859";

export default function SplashScreen() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const isAuthed = await initializeAuth();
      if (!isMounted) return;

      // Brief delay for smooth branding display
      setTimeout(() => {
        if (!isMounted) return;
        if (isAuthed) {
          router.replace("/(tabs)");
        } else {
          router.replace("/login");
        }
      }, 1000);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [initializeAuth]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>CM</Text>
          </View>
          <Text variant="titleMedium" style={styles.appSubtitle}>
            COLLECTION MANAGER
          </Text>
          <Text variant="displaySmall" style={styles.brandTitle}>
            Finance Portal
          </Text>
          <Text variant="bodyMedium" style={styles.brandTagline}>
            Smart, secure loan & collection operations
          </Text>
        </View>

        <View style={styles.loaderBox}>
          <ActivityIndicator animating size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Initializing secure workspace...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fff9",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  brandBox: {
    alignItems: "center",
    marginTop: 80,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logoText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  appSubtitle: {
    color: PRIMARY,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 12,
    marginBottom: 4,
  },
  brandTitle: {
    color: "#111827",
    fontWeight: "800",
  },
  brandTagline: {
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  loaderBox: {
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "500",
  },
});
