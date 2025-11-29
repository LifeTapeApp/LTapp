import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Vibration,
  Dimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Theme + Zustand stores
import { useTheme } from "../App";
import { typography, spacing, dimensions, shadows } from "../constants/theme";
import { usePINStore } from "../stores/pinStore";

type Props = {
  mode: "app" | "darkSide" | "setup" | "darkSideSetup";
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
};

export default function PINEntryScreen({
  mode,
  onSuccess,
  onCancel,
  title,
  subtitle,
}: Props) {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    verifyAppPIN,
    verifyDarkSidePIN,
    setAppPIN,
    setDarkSidePIN,
    unlockApp,
    unlockDarkSide,
  } = usePINStore();

  const isSetup = mode === "setup" || mode === "darkSideSetup";
  const maxLength = 6;
  const activePin = isConfirming ? confirmPin : pin;

  // --------------------------
  // Dynamic Text
  // --------------------------
  const displayTitle =
    title ||
    (isSetup
      ? mode === "setup"
        ? "Create Your PIN"
        : "Create Dark Side PIN"
      : mode === "app"
      ? "Enter Your PIN"
      : "Enter Dark Side PIN");

  const displaySubtitle =
    subtitle ||
    (isSetup
      ? isConfirming
        ? "Confirm your 6-digit PIN"
        : "Enter a 6-digit PIN to secure your Life Tape"
      : "Enter your 6-digit PIN to continue");

  // --------------------------
  // Keypad Logic
  // --------------------------
  const handlePress = useCallback(
    (key: string) => {
      setError(null);
      Vibration.vibrate(10);

      if (key === "delete") {
        if (isConfirming) setConfirmPin((p) => p.slice(0, -1));
        else setPin((p) => p.slice(0, -1));
        return;
      }

      if (activePin.length >= maxLength) return;

      const next = activePin + key;

      if (isConfirming) {
        setConfirmPin(next);
        if (next.length === maxLength) {
          if (next === pin) {
            // ✔ Save & unlock
            if (mode === "setup") {
              setAppPIN(next);
              unlockApp();
            } else {
              setDarkSidePIN(next);
              unlockDarkSide();
            }
            onSuccess();
          } else {
            // ✘ mismatch error
            setError("PINs do not match. Try again.");
            setConfirmPin("");
            Vibration.vibrate([0, 50, 50, 50]);
          }
        }
      } else {
        setPin(next);
        if (isSetup && next.length === maxLength) {
          setIsConfirming(true);
          return;
        }

        if (!isSetup && next.length === maxLength) {
          const valid =
            mode === "app"
              ? verifyAppPIN(next)
              : verifyDarkSidePIN(next);

          if (valid) {
            mode === "app" ? unlockApp() : unlockDarkSide();
            onSuccess();
          } else {
            setError("Incorrect PIN. Try again.");
            setPin("");
            Vibration.vibrate([0, 50, 50, 50]);
          }
        }
      }
    },
    [
      activePin,
      pin,
      isConfirming,
      isSetup,
      mode,
      verifyAppPIN,
      verifyDarkSidePIN,
      setAppPIN,
      setDarkSidePIN,
      unlockApp,
      unlockDarkSide,
      onSuccess,
    ]
  );

  const keypad = ["1","2","3","4","5","6","7","8","9","","0","delete"];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.canvas }]}
    >
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xl }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: themeColors.textPrimary, fontFamily: typography.fonts.bold },
            ]}
          >
            {displayTitle}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: themeColors.textSecondary, fontFamily: typography.fonts.regular },
            ]}
          >
            {displaySubtitle}
          </Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {Array.from({ length: maxLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < activePin.length
                      ? themeColors.buttonPrimary
                      : "transparent",
                  borderColor:
                    i < activePin.length
                      ? themeColors.buttonPrimary
                      : themeColors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Error */}
        {error && (
          <Text
            style={[
              styles.error,
              { color: themeColors.error, fontFamily: typography.fonts.medium },
            ]}
          >
            {error}
          </Text>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {keypad.map((k, i) =>
            k === "" ? (
              <View key={i} style={styles.emptyKey} />
            ) : (
              <TouchableOpacity
                key={i}
                style={[
                  styles.key,
                  { backgroundColor: themeColors.card },
                ]}
                onPress={() => handlePress(k)}
                activeOpacity={0.75}
              >
                {k === "delete" ? (
                  <Ionicons
                    name="backspace-outline"
                    size={28}
                    color={themeColors.textPrimary}
                  />
                ) : (
                  <Text
                    style={[
                      styles.keyText,
                      { color: themeColors.textPrimary, fontFamily: typography.fonts.medium },
                    ]}
                  >
                    {k}
                  </Text>
                )}
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Cancel */}
        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            style={styles.cancel}
          >
            <Text
              style={[
                styles.cancelText,
                { color: themeColors.buttonPrimary, fontFamily: typography.fonts.medium },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------
const { width } = Dimensions.get("window");
const KEY_SIZE = Math.min(
  (width - spacing.xl * 2 - spacing.md * 2) / 3,
  dimensions.pinKeySize
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },

  header: { alignItems: "center", marginBottom: spacing.xxxl },

  title: { fontSize: typography.sizes.h2, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.body, textAlign: "center" },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  dot: {
    width: dimensions.pinDotSize,
    height: dimensions.pinDotSize,
    borderRadius: dimensions.pinDotSize / 2,
    borderWidth: 2,
    marginHorizontal: dimensions.pinDotSpacing / 2,
  },

  error: {
    fontSize: typography.sizes.bodySmall,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: KEY_SIZE * 3 + spacing.md * 2,
    marginTop: spacing.xl,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    margin: spacing.xs,
    ...shadows.sm,
  },
  keyText: { fontSize: typography.sizes.h2 },

  emptyKey: { width: KEY_SIZE, height: KEY_SIZE, margin: spacing.xs },

  cancel: { marginTop: spacing.xxl, padding: spacing.md },
  cancelText: { fontSize: typography.sizes.body },
});
