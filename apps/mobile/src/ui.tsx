import React, { PropsWithChildren, useState } from "react";
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
import { ChevronDown, ChevronUp } from "lucide-react-native";

export const C = {
  bg: "#000000",
  card: "#070a10",
  surface: "#04060a",
  elevated: "#0d131f",
  border: "#161f2e",
  borderBright: "#2578ff",
  text: "#ffffff",
  muted: "#8b9bb2",
  dim: "#55657d",
  blue: "#0084ff",
  cyan: "#38bdf8",
  red: "#ff2442",
  redSoft: "#1c070c",
  redBorder: "#5c1523",
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
      ? "#3d131e"
      : accent === "gold"
        ? "#453712"
        : accent === "green"
          ? "#123d2f"
          : accent === "blue"
            ? "#183b68"
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
            height: 1.5,
            backgroundColor: topBar,
            opacity: 0.9,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}

export function Disclosure({
  title,
  summary,
  badge,
  badgeTone = "muted",
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
}: PropsWithChildren<{
  title: string;
  summary?: string;
  badge?: string;
  badgeTone?: "blue" | "red" | "amber" | "green" | "muted" | "gold";
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (next: boolean) => void;
}>) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <Card style={{ padding: 14, gap: isOpen ? 12 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={toggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Text style={{ color: C.text, fontSize: 14.5, fontWeight: "800" }}>
              {title}
            </Text>
            {badge ? <Badge text={badge} tone={badgeTone} /> : null}
          </View>
          {summary ? (
            <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: "#0d131f",
            borderWidth: 1,
            borderColor: "#1b2638",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isOpen ? (
            <ChevronUp size={15} color={C.muted} />
          ) : (
            <ChevronDown size={15} color={C.muted} />
          )}
        </View>
      </Pressable>
      {isOpen ? (
        <View
          style={{
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#121a28",
            gap: 12,
          }}
        >
          {children}
        </View>
      ) : null}
    </Card>
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
    blue: { bg: "#071a30", border: "#164473", fg: "#7cc8ff" },
    red: { bg: "#21070e", border: "#661727", fg: "#ff8496" },
    amber: { bg: "#201505", border: "#5c3d10", fg: "#fcd37d" },
    green: { bg: "#051f17", border: "#124d3a", fg: "#6ee7b7" },
    gold: { bg: "#201a06", border: "#614c12", fg: "#fde047" },
    muted: { bg: "#0b1019", border: "#1d2738", fg: "#9cb0c9" },
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
  height = 6,
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
        backgroundColor: "#0e1420",
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
        backgroundColor: "#070a10",
        borderRadius: 13,
        padding: 3,
        borderWidth: 1,
        borderColor: C.border,
        gap: 3,
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
              paddingVertical: 9,
              paddingHorizontal: 8,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "#121c2d" : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? "#2454a6" : "transparent",
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
        small && {
          minHeight: 36,
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderRadius: 10,
        },
        secondary && s.secondary,
        crimson && {
          backgroundColor: "#d91c38",
          borderColor: "#f44d66",
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
    <View style={{ gap: 5 }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label || placeholder || "Input"}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#4b5b73"
        keyboardType={keyboardType || (numeric ? "decimal-pad" : "default")}
        multiline={multiline}
        style={[
          s.input,
          multiline && { minHeight: 80, textAlignVertical: "top" },
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
        contentContainerStyle={[s.screen, wide && { maxWidth: 800 }]}
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
          backgroundColor: "rgba(0,0,0,0.84)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 540,
            maxHeight: "90%",
            alignSelf: "center",
            backgroundColor: "#070a10",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#1d293d",
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
              borderColor: "#141d2b",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 16.5, fontWeight: "800" }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: "#101724",
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
    paddingBottom: 40,
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
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: C.cyan,
    textTransform: "uppercase",
  },
  body: { fontSize: 13, color: C.muted, lineHeight: 19 },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: C.text,
    lineHeight: 30,
    letterSpacing: -0.6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#007aff",
    borderWidth: 1,
    borderColor: "#3395ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: "hidden",
  },
  secondary: {
    backgroundColor: "#0b1019",
    borderColor: "#1d283a",
  },
  buttonText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  fieldLabel: { color: "#b0c0d6", fontSize: 11.5, fontWeight: "700" },
  input: {
    minHeight: 43,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#1b2536",
    backgroundColor: "#04060a",
    color: "#ffffff",
    fontSize: 14.5,
    fontVariant: ["tabular-nums"],
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1a2536",
    backgroundColor: "#090d14",
  },
  chipOn: { backgroundColor: "#0073eb", borderColor: "#4da6ff" },
  chipText: { color: C.muted, fontSize: 11.5, fontWeight: "700" },
  notice: {
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a2536",
    backgroundColor: "#080c14",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heading: { fontSize: 16, fontWeight: "800", color: C.text },
  small: { fontSize: 11.5, color: C.muted },
  value: {
    fontSize: 26,
    color: C.text,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  half: { width: "48%", flexGrow: 1 },
  link: { color: C.cyan, fontSize: 12.5, fontWeight: "700" },
});
