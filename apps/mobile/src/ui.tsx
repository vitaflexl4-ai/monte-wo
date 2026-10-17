import React, { PropsWithChildren } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Glow } from "./art";
export const C = {
  bg: "#02070e",
  card: "#061220",
  border: "#173c61",
  text: "#f0f5ff",
  muted: "#93abc5",
  blue: "#008cff",
  cyan: "#46d4ff",
  red: "#f63b58",
  green: "#4bdaaf",
};
export function Card({ children, style }: PropsWithChildren<{ style?: any }>) {
  return (
    <View style={[s.card, style]}>
      <Glow />
      {children}
    </View>
  );
}
export function Label({ children }: PropsWithChildren) {
  return <Text style={s.label}>{children}</Text>;
}
export function Body({ children, style }: PropsWithChildren<{ style?: any }>) {
  return <Text style={[s.body, style]}>{children}</Text>;
}
export function Title({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={s.title}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  busy = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && { borderColor: C.red },
        (disabled || busy) && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {!secondary && <Glow strong />}
      {busy ? (
        <ActivityIndicator color={C.text} />
      ) : (
        <Text style={[s.buttonText, danger && { color: C.red }]}>{title}</Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  keyboardType = "default",
  multiline = false,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={{ gap: 7, marginBottom: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={C.muted}
        style={[
          s.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Chips({
  items,
  value,
  onChange,
}: {
  items: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.chips}>
      {items.map((i) => (
        <Pressable
          key={i.id}
          accessibilityRole="button"
          accessibilityState={{ selected: i.id === value }}
          onPress={() => onChange(i.id)}
          style={[s.chip, i.id === value && s.chipOn]}
        >
          <Text style={[s.chipText, i.id === value && { color: C.text }]}>
            {i.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Screen({
  children,
  transparent = false,
  wide = false,
}: PropsWithChildren<{ transparent?: boolean; wide?: boolean }>) {
  return (
    <View
      style={{ flex: 1, backgroundColor: transparent ? "transparent" : C.bg }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={[s.screen, wide && { maxWidth: 1100 }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[s.notice, error && { borderColor: C.red }]}
    >
      <Body
        style={{
          fontSize: 12,
          lineHeight: 19,
          ...(error ? { color: "#ffb2bc" } : {}),
        }}
      >
        {text}
      </Body>
    </View>
  );
}
export const s = StyleSheet.create({
  screen: {
    padding: 20,
    paddingBottom: 32,
    gap: 18,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  card: {
    padding: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    gap: 12,
    overflow: "hidden",
  },
  label: { fontSize: 9, fontWeight: "700", letterSpacing: 1.6, color: C.cyan },
  body: { fontSize: 13, color: C.muted, lineHeight: 21 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  button: {
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: "#007bff",
    borderWidth: 1,
    borderColor: "#2c9aff",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    overflow: "hidden",
    boxShadow: "0px 3px 22px rgba(0,114,255,0.13)",
  },
  secondary: {
    backgroundColor: "#030c17",
    borderColor: C.border,
    boxShadow: "none",
  },
  buttonText: { color: C.text, fontWeight: "700", fontSize: 14 },
  fieldLabel: { color: "#b9cee4", fontSize: 12, fontWeight: "500" },
  input: {
    minHeight: 48,
    padding: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#04101e",
    color: C.text,
    fontSize: 15,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 5 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#04101d",
  },
  chipOn: { backgroundColor: "#087de6", borderColor: "#39baff" },
  chipText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  notice: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#20354d",
    backgroundColor: "#06101b",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heading: { fontSize: 16, fontWeight: "700", color: C.text },
  small: { fontSize: 11, color: C.muted },
  value: { fontSize: 28, color: C.text, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  half: { width: "47%", flexGrow: 1 },
  link: { color: C.cyan, fontSize: 13, fontWeight: "600" },
});
