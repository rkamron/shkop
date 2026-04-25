import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type FilterSelectProps = {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
};

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <Pressable
          style={styles.trigger}
          onPress={() => {
            setOpen(true);
          }}
        >
          <ThemedText
            style={[styles.triggerText, !value && styles.placeholderText]}
            numberOfLines={1}
          >
            {value ?? "All"}
          </ThemedText>
          <Ionicons name="chevron-down" size={18} color="#667085" />
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setOpen(false);
          }}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ThemedText type="subtitle">{label}</ThemedText>
            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsContent}
            >
              <Pressable
                style={[styles.optionRow, value === null && styles.optionRowActive]}
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <ThemedText
                  style={value === null ? styles.optionLabelActive : styles.optionLabel}
                >
                  All
                </ThemedText>
              </Pressable>
              {options.map((option) => (
                <Pressable
                  key={`${label}-${option}`}
                  style={[
                    styles.optionRow,
                    value === option && styles.optionRowActive,
                  ]}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <ThemedText
                    style={value === option ? styles.optionLabelActive : styles.optionLabel}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setOpen(false);
              }}
            >
              <ThemedText style={styles.closeLabel}>Done</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#475467",
  },
  trigger: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  triggerText: {
    flex: 1,
    color: "#101828",
    fontWeight: "600",
  },
  placeholderText: {
    color: "#667085",
    fontWeight: "500",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 18,
    gap: 14,
    maxHeight: "70%",
  },
  optionsScroll: {
    maxHeight: 280,
  },
  optionsContent: {
    gap: 8,
  },
  optionRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eaecf0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  optionRowActive: {
    borderColor: "#0a7ea4",
    backgroundColor: "#e6f4fe",
  },
  optionLabel: {
    color: "#101828",
  },
  optionLabelActive: {
    color: "#0a7ea4",
    fontWeight: "600",
  },
  closeButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeLabel: {
    color: "#0a7ea4",
    fontWeight: "600",
  },
});
