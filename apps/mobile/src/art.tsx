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
            <Stop offset="0" stopColor={strong ? "#179bff" : "#071729"} />
            <Stop offset="0.5" stopColor={strong ? "#007bff" : "#04101e"} />
            <Stop offset="1" stopColor={strong ? "#005ee0" : "#02080f"} />
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
        gap: large ? 4 : 9,
      }}
    >
      <Image
        accessibilityLabel="MONTE WO logo"
        source={require("../assets/brand-emblem.webp")}
        resizeMode="contain"
        style={{ width: large ? 112 : 45, height: large ? 62 : 28 }}
      />
      <View style={{ alignItems: large ? "center" : "flex-start" }}>
        <Text
          style={{
            fontSize: large ? 32 : 17,
            fontWeight: "900",
            letterSpacing: large ? 1.4 : 0.6,
            color: "#20b2ff",
          }}
        >
          MONTE <Text style={{ color: "#fa304e" }}>WO</Text>
        </Text>
        {large && (
          <Text
            style={{
              color: "#9cbedb",
              fontSize: 9,
              letterSpacing: 1.45,
              marginTop: 5,
            }}
          >
            MEASURE. PROVE. RANK. CLIMB.
          </Text>
        )}
      </View>
    </View>
  );
}
export function LiftGlyph({
  id,
  color = "#bddef4",
  size = 62,
}: {
  id: string;
  color?: string;
  size?: number;
}) {
  const poses: Record<string, React.ReactNode> = {
    squat: (
      <>
        <Circle cx="37" cy="15" r="6" />
        <Path d="M35 22 31 40 47 51 36 70M31 40 21 52 27 69M33 26 20 24 15 31M34 26 48 24 54 30M29 70h12M22 70h10" />
        <Path d="M8 24h51M10 18v12M15 16v16M53 17v15M58 19v11" />
      </>
    ),
    bench: (
      <>
        <Circle cx="48" cy="46" r="6" />
        <Path d="M42 47H24L13 59 13 70M25 48 34 59 34 69M30 44 32 28 38 20M37 43 44 28 47 20M10 53h46M17 54v17M46 54v17M19 20h40M19 13v14M24 11v17M54 12v16M59 14v12" />
      </>
    ),
    deadlift: (
      <>
        <Circle cx="46" cy="20" r="6" />
        <Path d="M40 25 24 40 30 54 23 72M24 40 14 54 17 72M38 28 41 55M30 33 33 55M17 72h12M12 72h10M6 58h56M7 51v14M13 48v19M55 49v19M61 52v13" />
      </>
    ),
    curl: (
      <>
        <Circle cx="33" cy="14" r="6" />
        <Path d="M33 21v25M33 28 21 39 12 31M33 27 45 39 56 31M33 45 24 70M33 45 42 70M20 70h10M38 70h10M6 28h13M7 23v10M17 23v10M49 28h14M50 23v10M61 23v10" />
      </>
    ),
  };
  return (
    <Svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 70 80"
      accessibilityLabel={id + " illustration"}
    >
      <G
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {poses[id] || poses.squat}
      </G>
    </Svg>
  );
}
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
        : "#102b42";
  const muscle = (id: string, children: React.ReactNode) => (
    <G
      key={id}
      onPress={() => onSelect(id)}
      fill={color(id)}
      stroke={selected === id ? "#8beaff" : "#6484a5"}
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
          <Stop offset="0" stopColor="#02070e" />
          <Stop offset=".5" stopColor="#102239" />
          <Stop offset="1" stopColor="#02070e" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="120" cy="414" rx="70" ry="5" fill="#087fff" opacity=".12" />
      <Path
        d="M105 50C95 44 98 15 107 9Q120 0 133 9C142 15 145 44 135 50L134 62 151 72Q170 70 181 88L192 131 205 180 218 229 212 249 204 247 200 224 183 185 170 145 162 143 155 183 154 214 163 243 158 288 151 323 147 364 143 398 151 409 144 417 128 414 126 393 128 353 125 316 120 275 115 316 112 353 114 393 112 414 96 417 89 409 97 398 93 364 89 323 82 288 77 243 86 214 86 183 78 143 70 145 57 185 40 224 36 247 28 249 22 229 35 180 48 131 59 88Q70 70 89 72L106 62Z"
        fill="url(#body-base)"
        stroke="#91a2bc"
        strokeWidth="1.25"
      />
      <Path
        d="M106 52 112 68M134 52 128 68M120 74v145M91 217 120 244 149 217"
        stroke="#6e829b"
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
        stroke="#607e9b"
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
            <Stop offset="0" stopColor="#02070e" stopOpacity=".1" />
            <Stop offset=".5" stopColor="#02070e" stopOpacity="0" />
            <Stop offset=".75" stopColor="#02070e" stopOpacity=".3" />
            <Stop offset="1" stopColor="#02070e" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#welcome-fade)" />
      </Svg>
    </View>
  );
}
