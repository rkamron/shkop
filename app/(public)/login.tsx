import { Stack } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {
    authError,
    isAuthActionLoading,
    signInWithPassword,
    signUpWithPassword,
  } = useAuthContext();

  const isFormValid = email.trim().length > 0 && password.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: "Login", headerShown: true }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">Login</ThemedText>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {isAuthActionLoading ? (
          <ThemedText>Submitting...</ThemedText>
        ) : null}
        {authError ? (
          <ThemedText style={styles.errorText}>{authError}</ThemedText>
        ) : null}
        <ThemedView style={styles.buttonGroup}>
          <Button
            title="Sign in"
            disabled={!isFormValid || isAuthActionLoading}
            onPress={() => {
              void signInWithPassword(email.trim(), password);
            }}
          />
          <Button
            title="Sign up"
            disabled={!isFormValid || isAuthActionLoading}
            onPress={() => {
              void signUpWithPassword(email.trim(), password);
            }}
          />
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#c7c7c7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
    backgroundColor: "#ffffff",
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
    marginTop: 16,
  },
  errorText: {
    color: "#b42318",
    marginTop: 12,
  },
});
