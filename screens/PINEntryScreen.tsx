// screens/PINEntryScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  mode?: "app" | "darkSide" | "setup";
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
};

export default function PINEntryScreenPlaceholder({ onSuccess, title }: Props) {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        {title ?? "Enter PIN"}
      </Text>
      <TouchableOpacity
        onPress={() => onSuccess?.()}
        style={{ padding: 12, backgroundColor: "#eee", borderRadius: 8 }}
      >
        <Text>Simulate Unlock</Text>
      </TouchableOpacity>
    </View>
  );
}
