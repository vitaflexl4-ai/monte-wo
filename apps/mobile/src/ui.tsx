import React, { PropsWithChildren } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";

export const C = {
  bg: "#000000",
  card: "#090c12",
  surface: "#05070b",
  elevated: "#101622",
  border: "#1b2434",
  borderBright: "#2578ff",
  text: "#ffffff",
  muted: "#8e9eb5",
  dim: "#586880",
  blue: "#0084ff",
  cyan: "#38bdf8",
  red: "#ff2442",
  redSoft: "#1f070d",
  redBorder: "#6e1727",
  green: "#10b981",
  amber: "#f59e0b",
  gold: "#facc15",
};

export function Card({
  children,
  style,
  accent,
}: PropsWithChildren<{
  style?: any;
  accent?: "blue" | "red" | "gold" | "green";
}>) {
  const accentBorder =
    accent === "red"
      ? "#4d1522"
      : accent === "gold"
        ? "#524114"
        : accent === "green"
          ? "#144938"
          : accent === "blue"
            ? "#1c4a82"
            : C.border;
  const topBar =
    accent === "red"
      ? C.red
      : accent === "gold"
        ? C.gold
        : accent === "green"
          ? C.green
          : accent === "blue"
            ? C.blue
            : null;
  return (
    <View style={[s.card, { borderColor: accentBorder }, style]}>
      {topBar ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: topBar,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}

export function Label({
  children,
  color,
}: PropsWithChildren<{ color?: string }>) {
  return (
    <Text style={[s.label, color ? { color } : undefined]}>{children}</Text>
  );
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

export function Badge({
  text,
  tone = "blue",
}: {
  text: string;
  tone?: "blue" | "red" | "amber" | "green" | "muted" | "gold";
}) {
  const palette = {
    blue: { bg: "#071d36", border: "#1a528a", fg: "#7cc8ff" },
    red: { bg: "#260810", border: "#7a1a2d", fg: "#ff8496" },
    amber: { bg: "#241706", border: "#6e4813", fg: "#fcd37d" },
    green: { bg: "#052219", border: "#145943", fg: "#6ee7b7" },
    gold: { bg: "#241d07", border: "#735a15", fg: "#fde047" },
    muted: { bg: "#0d121c", border: "#222d40", fg: "#9cb0c9" },
  }[tone];
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text style={[s.badgeText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

export function ProgressBar({
  percent,
  color = C.blue,
  height = 8,
}: {
  percent: number;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: "#0f1520",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: "100%",
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function SegmentedTabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#0a0e16",
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: C.border,
        gap: 4,
      }}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "#162236" : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? "#2d6cdf" : "transparent",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontWeight: active ? "800" : "600",
                color: active ? "#ffffff" : C.muted,
              }}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  title,
  onPress,
  secondary = false,
  crimson = false,
  danger = false,
  disabled = false,
  busy = false,
  small = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  crimson?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        small && { minHeight: 38, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
        secondary && s.secondary,
        crimson && {
          backgroundColor: "#e01e3c",
          borderColor: "#ff5c74",
        },
        danger && {
          backgroundColor: C.redSoft,
          borderColor: C.redBorder,
        },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={C.text} />
      ) : (
        <Text style={[s.buttonText, small && { fontSize: 12.5 }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  onChange,
  placeholder,
  numeric = false,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  onChange?: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  keyboardType?: any;
  multiline?: boolean;
}) {
  const handleChange = onChangeText || onChange || (() => {});
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label || placeholder || "Input"}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#4e5f78"
        keyboardType={keyboardType || (numeric ? "decimal-pad" : "default")}
        multiline={multiline}
        style={[
          s.input,
          multiline && { minHeight: 82, textAlignVertical: "top" },
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
      {items.map((i) => {
        const active = i.id === value;
        return (
          <Pressable
            key={i.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(i.id)}
            style={[s.chip, active && s.chipOn]}
          >
            <Text style={[s.chipText, active && { color: "#ffffff" }]}>
              {i.name}
            </Text>
          </Pressable>
        );
      })}
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
        contentContainerStyle={[s.screen, wide && { maxWidth: 840 }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function ModalSheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.82)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 560,
            maxHeight: "90%",
            alignSelf: "center",
            backgroundColor: "#080b11",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#223047",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: "#162030",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800" }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: "#131b29",
              }}
            >
              <Text style={{ color: C.muted, fontWeight: "700", fontSize: 12 }}>
                Close
              </Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 18, gap: 14 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
      style={[
        s.notice,
        error && { borderColor: C.redBorder, backgroundColor: C.redSoft },
      ]}
    >
      <Body
        style={{
          fontSize: 12.5,
          lineHeight: 18,
          ...(error ? { color: "#ff9aa8" } : {}),
        }}
      >
        {text}
      </Body>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 42,
    gap: 14,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    gap: 12,
    overflow: "hidden",
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: C.cyan,
    textTransform: "uppercase",
  },
  body: { fontSize: 13.5, color: C.muted, lineHeight: 20 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: C.text,
    lineHeight: 33,
    letterSpacing: -0.7,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  button: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#007aff",
    borderWidth: 1,
    borderColor: "#389bff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    overflow: "hidden",
  },
  secondary: {
    backgroundColor: "#0d121c",
    borderColor: "#222e42",
  },
  buttonText: { color: "#ffffff", fontWeight: "800", fontSize: 13.5 },
  fieldLabel: { color: "#b6c5db", fontSize: 11.5, fontWeight: "700" },
  input: {
    minHeight: 45,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2a3d",
    backgroundColor: "#05070c",
    color: "#ffffff",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3e",
    backgroundColor: "#0b0f17",
  },
  chipOn: { backgroundColor: "#0077f5", borderColor: "#4da6ff" },
  chipText: { color: C.muted, fontSize: 12, fontWeight: "700" },
  notice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2a3d",
    backgroundColor: "#0a0e17",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heading: { fontSize: 17, fontWeight: "800", color: C.text },
  small: { fontSize: 11.5, color: C.muted },
  value: {
    fontSize: 28,
    color: C.text,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  half: { width: "48%", flexGrow: 1 },
  link: { color: C.cyan, fontSize: 13, fontWeight: "700" },
});
