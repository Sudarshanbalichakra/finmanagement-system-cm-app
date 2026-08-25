import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export function Loader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00A859" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
