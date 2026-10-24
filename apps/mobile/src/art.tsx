import React, { useId } from "react";
import { Image, Text, View, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  G,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
} from "react-native-svg";

export function Glow({ strong = false }: { strong?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={strong ? "#178fff" : "#0b0f17"} />
            <Stop offset="0.5" stopColor={strong ? "#006fe8" : "#07090f"} />
            <Stop offset="1" stopColor={strong ? "#0052c4" : "#040508"} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function CardScrim({
  direction = "vertical",
  tint = "#000000",
}: {
  direction?: "vertical" | "horizontal";
  tint?: string;
}) {
  const id = useId().replace(/:/g, "");
  const isHoriz = direction === "horizontal";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient
            id={id}
            x1="0"
            y1="0"
            x2={isHoriz ? "1" : "0"}
            y2={isHoriz ? "0" : "1"}
          >
            <Stop offset="0" stopColor={tint} stopOpacity={isHoriz ? "0.94" : "0.14"} />
            <Stop offset="0.45" stopColor={tint} stopOpacity={isHoriz ? "0.76" : "0.48"} />
            <Stop offset="0.82" stopColor="#000000" stopOpacity="0.88" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.98" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <View
      style={{
        flexDirection: large ? "column" : "row",
        alignItems: "center",
        gap: large ? 6 : 10,
      }}
    >
      <View
        style={{
          backgroundColor: "#000000",
          borderRadius: large ? 18 : 10,
          paddingHorizontal: large ? 8 : 3,
          paddingVertical: large ? 4 : 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          accessibilityLabel="MONTE WO logo"
          source={require("../assets/brand-emblem.webp")}
          resizeMode="contain"
          style={{ width: large ? 116 : 42, height: large ? 64 : 26 }}
        />
      </View>
      <View style={{ alignItems: large ? "center" : "flex-start" }}>
        <Text
          style={{
            fontSize: large ? 34 : 18,
            fontWeight: "900",
            letterSpacing: large ? 1.8 : 0.9,
            color: "#ffffff",
          }}
        >
          MONTE <Text style={{ color: "#ff2442" }}>WO</Text>
        </Text>
        {large ? (
          <Text
            style={{
              color: "#7f93b0",
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2.2,
              marginTop: 4,
            }}
          >
            LEVE · KLASE · MONTE WO
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Precision-engineered industrial competition iron emblems (zero stick figures).
 * Crisp at both 22px tab icons and 56px+ equipment crests.
 */
export function LiftGlyph({
  id,
  color = "#4cc2ff",
  size = 44,
}: {
  id: string;
  color?: string;
  size?: number;
}) {
  const gradId = useId().replace(/:/g, "");
  const accent = "#ff2442";

  const emblems: Record<string, React.ReactNode> = {
    // Competition Squat Rack + Triple-Calibrated Barbell + Depth Drive Chevrons
    squat: (
      <>
        {/* Power rack uprights & base */}
        <Path
          d="M17 11v42M47 11v42M11 53h12M41 53h12"
          stroke={color}
          strokeOpacity="0.42"
          strokeWidth="2.4"
        />
        {/* J-cups */}
        <Path d="M17 24h5v4M47 24h-5v4" stroke={accent} strokeWidth="2.2" />
        {/* Loaded Olympic barbell */}
        <Path d="M4 23h56" stroke={color} strokeWidth="2.8" />
        {/* Left calibrated plates */}
        <Rect x="7.5" y="13.5" width="3.8" height="19" rx="1.4" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.5" />
        <Rect x="12.5" y="15.5" width="3.2" height="15" rx="1.2" fill="#07111f" stroke={color} strokeWidth="1.4" />
        {/* Right calibrated plates */}
        <Rect x="52.7" y="13.5" width="3.8" height="19" rx="1.4" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.5" />
        <Rect x="48.3" y="15.5" width="3.2" height="15" rx="1.2" fill="#07111f" stroke={color} strokeWidth="1.4" />
        {/* Concentric drive chevrons */}
        <Path d="M25 40l7-7 7 7" stroke={accent} strokeWidth="2.6" />
        <Path d="M25 48l7-7 7 7" stroke={color} strokeWidth="2.4" />
      </>
    ),

    // Competition Bench + J-Hooks + Heavy Loaded Bar + Vertical Press Vector
    bench: (
      <>
        {/* Bench uprights */}
        <Path d="M21 15v27M43 15v27" stroke={color} strokeOpacity="0.4" strokeWidth="2.2" />
        {/* Competition bench pad & legs */}
        <Rect x="15" y="42" width="34" height="5.5" rx="2.5" fill="#0b1628" stroke={color} strokeWidth="2" />
        <Path d="M20 47.5v7.5M44 47.5v7.5M16 55h8M40 55h8" stroke={color} strokeOpacity="0.65" strokeWidth="2.2" />
        {/* Heavy Olympic bar */}
        <Path d="M4 25h56" stroke={color} strokeWidth="2.8" />
        {/* Calibrated plates */}
        <Rect x="7.5" y="15" width="4" height="20" rx="1.5" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.5" />
        <Rect x="13" y="17.5" width="3.2" height="15" rx="1.2" fill="#07111f" stroke={color} strokeWidth="1.4" />
        <Rect x="52.5" y="15" width="4" height="20" rx="1.5" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.5" />
        <Rect x="47.8" y="17.5" width="3.2" height="15" rx="1.2" fill="#07111f" stroke={color} strokeWidth="1.4" />
        {/* Press drive arrow */}
        <Path d="M32 38V13M27 18l5-5 5 5" stroke={accent} strokeWidth="2.5" />
      </>
    ),

    // Heavy Bar Whip Deadlift + Competition Bumper Plates + Platform + Lockout Vector
    deadlift: (
      <>
        {/* Competition platform */}
        <Path d="M8 53h48" stroke={color} strokeOpacity="0.42" strokeWidth="2.4" />
        {/* Flexing heavy deadlift bar (authentic bar whip curve) */}
        <Path d="M5 40Q32 31 59 40" stroke={color} strokeWidth="2.8" fill="none" />
        {/* Deep-dish competition kilo plates */}
        <Rect x="7.5" y="26" width="4.5" height="25" rx="1.8" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.6" />
        <Rect x="13.5" y="28.5" width="3.5" height="20" rx="1.4" fill="#07111f" stroke={accent} strokeWidth="1.4" />
        <Rect x="52" y="26" width="4.5" height="25" rx="1.8" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.6" />
        <Rect x="47" y="28.5" width="3.5" height="20" rx="1.4" fill="#07111f" stroke={accent} strokeWidth="1.4" />
        {/* Explosive pull chevrons */}
        <Path d="M25 21l7-7 7 7" stroke={accent} strokeWidth="2.6" />
        <Path d="M26 29l6-6 6 6" stroke={color} strokeWidth="2.2" />
      </>
    ),

    // Cambered Strict EZ-Curl Bar + Calibrated Plates + Concentric Torque Arc
    curl: (
      <>
        {/* Concentric torque arc */}
        <Path
          d="M20 22A15 15 0 0 1 44 22"
          stroke={accent}
          strokeWidth="2.4"
          strokeDasharray="3 2.5"
          fill="none"
        />
        <Path d="M41 16l4.5 6-6 1.5" stroke={accent} strokeWidth="2.2" fill="none" />
        {/* Cambered EZ curl bar geometry */}
        <Path
          d="M5 36h11l6-5 6 7 4-4 4 4 6-7 6 5h11"
          stroke={color}
          strokeWidth="2.8"
          fill="none"
        />
        {/* Calibrated curl plates */}
        <Rect x="8" y="24.5" width="4.2" height="23" rx="1.6" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.6" />
        <Rect x="13.5" y="27.5" width="3" height="17" rx="1.2" fill="#07111f" stroke={color} strokeWidth="1.3" />
        <Rect x="51.8" y="24.5" width="4.2" height="23" rx="1.6" fill={`url(#${gradId})`} stroke={color} strokeWidth="1.6" />
        <Rect x="47.5" y="27.5" width="3" height="17" rx="1.2" fill="#07111f" stroke={color} strokeWidth="1.3" />
        {/* Center strict-posture anchor */}
        <Circle cx="32" cy="49" r="2.4" fill={color} />
      </>
    ),
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessibilityLabel={id + " discipline emblem"}
    >
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.55" />
          <Stop offset="1" stopColor="#091526" stopOpacity="0.95" />
        </LinearGradient>
      </Defs>
      <G
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {emblems[id] || emblems.squat}
      </G>
    </Svg>
  );
}

export const disciplineArt: Record<string, any> = {
  squat: require("../assets/disciplines/squat.jpg"),
  bench: require("../assets/disciplines/bench.jpg"),
  deadlift: require("../assets/disciplines/deadlift.jpg"),
  curl: require("../assets/disciplines/curl.jpg"),
};

export const rankArt: Record<string, any> = {
  debitan: require("../assets/ranks/debitan.webp"),
  bati: require("../assets/ranks/bati.webp"),
  solid: require("../assets/ranks/solid.webp"),
  fo: require("../assets/ranks/fo.webp"),
  avanse: require("../assets/ranks/avanse.webp"),
  met: require("../assets/ranks/met.webp"),
  chanpyon: require("../assets/ranks/chanpyon.webp"),
  titan: require("../assets/ranks/titan.webp"),
  lejand: require("../assets/ranks/lejand.webp"),
};

export function MuscleFigure({
  selected,
  onSelect,
  back = false,
  height = 350,
}: {
  selected: string;
  onSelect: (id: string) => void;
  back?: boolean;
  height?: number;
}) {
  const color = (id: string) =>
    selected === id
      ? "#16b9ff"
      : selected === "all"
        ? (
            {
              chest: "#a98933",
              shoulders: "#5654af",
              arms: "#814bc2",
              core: "#067da3",
              legs: "#225278",
              back: "#3571a3",
            } as any
          )[id]
        : "#121a28";
  const muscle = (id: string, children: React.ReactNode) => (
    <G
      key={id}
      onPress={() => onSelect(id)}
      fill={color(id)}
      stroke={selected === id ? "#8beaff" : "#4b607f"}
      strokeWidth="1.2"
    >
      {children}
    </G>
  );
  return (
    <Svg
      style={{ position: "relative" }}
      width="100%"
      height={height}
      viewBox="0 0 240 430"
      accessibilityLabel={
        back ? "Back muscle region diagram" : "Front muscle region diagram"
      }
    >
      <Defs>
        <LinearGradient id="body-base" x1="0" x2="1">
          <Stop offset="0" stopColor="#000000" />
          <Stop offset=".5" stopColor="#0d1522" />
          <Stop offset="1" stopColor="#000000" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="120" cy="414" rx="70" ry="5" fill="#087fff" opacity=".14" />
      <Path
        d="M105 50C95 44 98 15 107 9Q120 0 133 9C142 15 145 44 135 50L134 62 151 72Q170 70 181 88L192 131 205 180 218 229 212 249 204 247 200 224 183 185 170 145 162 143 155 183 154 214 163 243 158 288 151 323 147 364 143 398 151 409 144 417 128 414 126 393 128 353 125 316 120 275 115 316 112 353 114 393 112 414 96 417 89 409 97 398 93 364 89 323 82 288 77 243 86 214 86 183 78 143 70 145 57 185 40 224 36 247 28 249 22 229 35 180 48 131 59 88Q70 70 89 72L106 62Z"
        fill="url(#body-base)"
        stroke="#7b8fa8"
        strokeWidth="1.25"
      />
      <Path
        d="M106 52 112 68M134 52 128 68M120 74v145M91 217 120 244 149 217"
        stroke="#52647c"
        strokeWidth="1"
        fill="none"
      />
      {muscle(
        "shoulders",
        <>
          <Path d="M91 75C72 69 60 85 60 110L76 115 91 91Z" />
          <Path d="M149 75C168 69 180 85 180 110L164 115 149 91Z" />
        </>,
      )}
      {back
        ? muscle(
            "back",
            <>
              <Path d="M108 65 92 79 87 119 115 152 117 94Z" />
              <Path d="M132 65 148 79 153 119 125 152 123 94Z" />
              <Path d="M85 121 115 158 113 207 93 185 85 150Z" />
              <Path d="M155 121 125 158 127 207 147 185 155 150Z" />
            </>,
          )
        : muscle(
            "chest",
            <>
              <Path d="M95 83C102 79 113 86 117 92L116 124Q97 137 82 121L83 100Z" />
              <Path d="M145 83C138 79 127 86 123 92L124 124Q143 137 158 121L157 100Z" />
            </>,
          )}
      {muscle(
        "arms",
        <>
          <Path d="M59 115 73 120 68 151 56 174 47 169 49 145Z" />
          <Path d="M181 115 167 120 172 151 184 174 193 169 191 145Z" />
          <Path d="M46 176 55 181 42 216 34 226 31 220Z" />
          <Path d="M194 176 185 181 198 216 206 226 209 220Z" />
        </>,
      )}
      {!back &&
        muscle(
          "core",
          <>
            <Path d="M98 138 116 134 117 153 101 157ZM99 162 117 158 117 180 102 182ZM102 188 117 184 116 214 107 211ZM142 138 124 134 123 153 139 157ZM141 162 123 158 123 180 138 182ZM138 188 123 184 124 214 133 211Z" />
            <Path d="M83 136 94 143 99 189 101 207 90 185Z" />
            <Path d="M157 136 146 143 141 189 139 207 150 185Z" />
          </>,
        )}
      {muscle(
        "legs",
        <>
          <Path d="M89 224 115 245 109 298 94 313 85 283 82 250Z" />
          <Path d="M151 224 125 245 131 298 146 313 155 283 158 250Z" />
          <Path d="M94 326 107 321 108 352 101 388 96 361Z" />
          <Path d="M146 326 133 321 132 352 139 388 144 361Z" />
        </>,
      )}
      <Path
        d="M91 317Q99 324 108 312M132 312Q141 324 149 317M112 23h16M107 37q13 8 26 0"
        stroke="#52647c"
        strokeWidth="1"
        fill="none"
      />
    </Svg>
  );
}

export function WelcomeShade() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="welcome-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity=".12" />
            <Stop offset=".5" stopColor="#000000" stopOpacity="0" />
            <Stop offset=".75" stopColor="#000000" stopOpacity=".55" />
            <Stop offset="1" stopColor="#000000" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#welcome-fade)" />
      </Svg>
    </View>
  );
}
