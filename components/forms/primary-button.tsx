import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { Button } from "react-native-paper";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      contentStyle={styles.content}
      style={[styles.button, style]}
      labelStyle={styles.label}
      buttonColor="#00A859"
    >
      {loading ? "Please wait" : title}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    elevation: 0,
  },
  content: {
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});
