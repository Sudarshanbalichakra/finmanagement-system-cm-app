import React, { useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text, TextInput } from "react-native-paper";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  showPasswordToggle?: boolean;
  leftIcon?: string;
  editable?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  autoCorrect = false,
  error,
  containerStyle,
  showPasswordToggle = false,
  leftIcon,
  editable = true,
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry && !isPasswordVisible}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        editable={editable}
        outlineColor="#d1d5db"
        activeOutlineColor="#00A859"
        style={styles.input}
        theme={{ colors: { primary: "#00A859" } }}
        left={leftIcon ? <TextInput.Icon icon={leftIcon} /> : undefined}
        right={
          secureTextEntry && showPasswordToggle ? (
            <TextInput.Icon
              icon={isPasswordVisible ? "eye-off" : "eye"}
              onPress={() => setIsPasswordVisible((prev) => !prev)}
            />
          ) : undefined
        }
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#dc2626",
    marginTop: 6,
    marginLeft: 4,
    fontSize: 12,
  },
});
