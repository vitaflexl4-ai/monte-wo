import React, { useEffect, useId, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import Svg, {
  Path,
  Circle,
  G,
  Rect,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  Ellipse,
} from "react-native-svg";
import {
  premiumMap,
  visibleRegions,
  toggleRegion,
  type BodyView,
  type MuscleRegion,
  type MuscleSelection,
  type RegionDefinition,
  type SvgShape,
} from "./muscle-map";
import { rankArt } from "./art";
import { rankNames } from "./model";
import { C } from "./ui";
const tags: Record<string, any> = {
  path: Path,
  circle: Circle,
  g: G,
  rect: Rect,
  defs: Defs,
  clipPath: ClipPath,
  linearGradient: LinearGradient,
  stop: Stop,
  ellipse: Ellipse,
};
const attrNames: Record<string, string> = {
  "stroke-width": "strokeWidth",
  "stroke-opacity": "strokeOpacity",
  "fill-opacity": "fillOpacity",
  "stop-color": "stopColor",
  "clip-path": "clipPath",
};
function backgroundShape(
  shape: SvgShape,
  key: string,
  prefix: string,
  view: BodyView,
): React.ReactNode {
  if (shape.attrs["data-v"] && shape.attrs["data-v"] !== view) return null;
  const props: Record<string, any> = { key };
  if (shape.attrs.class === "b")
    Object.assign(props, {
      fill: "#0B1424",
      stroke: "#2C4B7C",
      strokeOpacity: 0.6,
      strokeWidth: 1.4,
    });
  for (const [name, raw] of Object.entries(shape.attrs)) {
    if (name === "class" || name.startsWith("data-")) continue;
    props[attrNames[name] || name] =
      name === "id"
        ? prefix + raw
        : raw.replace(/url\(#([^)]*)\)/g, (_, id) => `url(#${prefix + id})`);
  }
  const Tag = tags[shape.tag];
  return (
    <Tag {...props}>
      {shape.children.map((child, i) =>
        backgroundShape(child, key + "-" + i, prefix, view),
      )}
    </Tag>
  );
}
export function PremiumFigure({
  view,
  selected,
  active,
  onSelect,
  onHover,
}: {
  view: BodyView;
  selected: MuscleRegion | null;
  active: MuscleRegion | null;
  onSelect: (event: MuscleSelection) => void;
  onHover: (id: MuscleRegion | null) => void;
}) {
  const prefix = "premium-" + useId().replace(/[^a-zA-Z0-9_-]/g, "") + "-";
  return (
    <Svg
      id="fig"
      width="100%"
      height="100%"
      viewBox={premiumMap.viewBox.join(" ")}
      style={{ position: "relative" }}
      accessibilityLabel={
        view === "f"
          ? "Front muscle region diagram"
          : "Back muscle region diagram"
      }
    >
      {premiumMap.background.map((shape, i) =>
        backgroundShape(shape, String(i), prefix, view),
      )}
      <G id="mg">
        {visibleRegions(view).map((region) => (
          <G
            key={region.id}
            id={"muscle-" + view + "-" + region.id}
            {...(Platform.OS === "web"
              ? {
                  "data-m": region.id,
                  "data-v": view,
                  className: "m",
                  onMouseEnter: () => onHover(region.id),
                  onMouseLeave: () => onHover(null),
                }
              : {})}
            opacity={active && active !== region.id ? 0.4 : 1}
            onPress={() => onSelect(toggleRegion(selected, region.id, view))}
          >
            {region.paths[view]!.map((d, i) => (
              <Path
                key={i}
                d={d}
                fill={region.color}
                fillOpacity={active === region.id ? 0.82 : 0.5}
                stroke={region.color}
                strokeOpacity={0.95}
                strokeWidth={active === region.id ? 1.8 : 1.2}
                strokeLinejoin="round"
              />
            ))}
          </G>
        ))}
      </G>
    </Svg>
  );
}
function RegionCard({
  region,
  selected,
  active,
  view,
  onSelect,
  onHover,
  onLayout,
}: {
  region: RegionDefinition;
  selected: MuscleRegion | null;
  active: MuscleRegion | null;
  view: BodyView;
  onSelect: (event: MuscleSelection) => void;
  onHover: (id: MuscleRegion | null) => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  return (
    <Pressable
      testID={"premium-region-" + region.id}
      accessibilityRole="button"
      accessibilityLabel={
        region.name + " · " + rankNames[region.tierId] + " · example tier"
      }
      accessibilityState={{ selected: selected === region.id }}
      {...(Platform.OS === "web"
        ? { "aria-pressed": selected === region.id }
        : {})}
      onLayout={onLayout}
      onPress={() => onSelect(toggleRegion(selected, region.id, view))}
      onHoverIn={() => onHover(region.id)}
      onHoverOut={() => onHover(null)}
      onFocus={() => onHover(region.id)}
      onBlur={() => onHover(null)}
      style={({ pressed }) => [
        m.regionCard,
        {
          borderColor: region.color,
          backgroundColor: active === region.id ? "#10233b" : "#081321",
          opacity: pressed ? 0.8 : 1,
        },
        active === region.id && { boxShadow: `0px 0px 18px ${region.color}33` },
      ]}
    >
      <View style={m.cardRow}>
        <Svg width={27} height={27} viewBox="0 0 28 28">
          <G
            fill="none"
            stroke="#DCE6F8"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {region.iconPaths.map((d, i) => (
              <Path key={i} d={d} />
            ))}
          </G>
        </Svg>
        <Text style={m.regionName}>{region.name}</Text>
      </View>
      <View
        style={[
          m.tier,
          {
            borderColor: region.color + "80",
            backgroundColor: region.color + "15",
          },
        ]}
      >
        <Image
          source={rankArt[region.tierId]}
          style={m.badge}
          resizeMode="contain"
        />
        <Text style={[m.tierName, { color: region.color }]}>
          {rankNames[region.tierId]}
        </Text>
      </View>
      <Text style={m.example}>Example tier · not awarded</Text>
    </Pressable>
  );
}
export function PremiumMuscleMap({
  view,
  selected,
  onSelect,
}: {
  view: BodyView;
  selected: MuscleRegion | null;
  onSelect: (event: MuscleSelection) => void;
}) {
  const [width, setWidth] = useState(340),
    [hover, setHover] = useState<MuscleRegion | null>(null),
    [cards, setCards] = useState<Record<string, { y: number; height: number }>>(
      {},
    );
  const frame = useRef<number | undefined>(undefined),
    pending = useRef<{
      width?: number;
      cards: Record<string, { y: number; height: number }>;
    }>({ cards: {} });
  const schedule = () => {
    if (frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      const updates = pending.current;
      pending.current = { cards: {} };
      frame.current = undefined;
      if (updates.width) setWidth(updates.width);
      if (Object.keys(updates.cards).length)
        setCards((previous) => ({ ...previous, ...updates.cards }));
    });
  };
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => setHover(null), [view]);
  const measure = (event: LayoutChangeEvent) => {
    const w = Math.floor(event.nativeEvent.layout.width);
    if (w > 0 && w !== width) {
      pending.current.width = w;
      schedule();
    }
  };
  const record = (id: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    const value = { y: Math.round(y), height: Math.round(height) };
    if (cards[id]?.y !== value.y || cards[id]?.height !== value.height) {
      pending.current.cards[id] = value;
      schedule();
    }
  };
  const wide = width > 700,
    figureWidth = wide ? 300 : Math.min(width, 340),
    figureHeight = (figureWidth * 640) / 420,
    sideWidth = (width - figureWidth - 36) / 2,
    active = hover || selected,
    regions = visibleRegions(view);
  const column = (side: string) => (
    <View
      style={[
        m.column,
        wide
          ? {
              width: sideWidth,
              paddingVertical: 26,
              ...(side === "l"
                ? { justifyContent: "space-between" as const }
                : { gap: 48 }),
            }
          : { flex: 1, gap: 12 },
      ]}
    >
      {regions
        .filter((r) => r.side === side)
        .map((r) => (
          <RegionCard
            key={r.id}
            region={r}
            view={view}
            active={active}
            selected={selected}
            onSelect={onSelect}
            onHover={setHover}
            onLayout={(e) => record(r.id, e)}
          />
        ))}
    </View>
  );
  const figure = (
    <View
      style={{ width: figureWidth, height: figureHeight, alignSelf: "center" }}
    >
      <PremiumFigure
        view={view}
        selected={selected}
        active={active}
        onSelect={onSelect}
        onHover={setHover}
      />
    </View>
  );
  return (
    <View
      testID="premium-map-stage"
      nativeID="stage"
      onLayout={measure}
      style={{ width: "100%", position: "relative" }}
    >
      {wide && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg testID="premium-connectors" width="100%" height="100%">
            {regions.map((r) => {
              const c = cards[r.id],
                anchor = r.anchors[view];
              if (!c || !anchor) return null;
              const x1 =
                  r.side === "l" ? sideWidth : sideWidth + figureWidth + 36,
                y1 = c.y + c.height / 2,
                x2 = sideWidth + 18 + (anchor.x / 420) * figureWidth,
                y2 = (anchor.y / 640) * figureHeight;
              return (
                <G key={r.id} id={"connector-" + view + "-" + r.id}>
                  <Path
                    d={`M${x1} ${y1}L${x1 + (r.side === "l" ? 24 : -24)} ${y1}L${x2} ${y2}`}
                    fill="none"
                    stroke={active === r.id ? r.color : "#6ea5ff61"}
                    strokeWidth={active === r.id ? 1.8 : 1.3}
                  />
                  <Circle cx={x2} cy={y2} r={4.5} fill={r.color} />
                </G>
              );
            })}
          </Svg>
        </View>
      )}
      {wide ? (
        <View style={{ flexDirection: "row", gap: 18 }}>
          {column("l")}
          {figure}
          {column("r")}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {figure}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {column("l")}
            {column("r")}
          </View>
        </View>
      )}
    </View>
  );
}
const m = StyleSheet.create({
  column: { position: "relative" },
  regionCard: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    minHeight: 130,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  regionName: { color: C.text, fontSize: 16, fontWeight: "700" },
  tier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badge: { width: 25, height: 25 },
  tierName: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  example: { color: "#9fb2ca", fontSize: 9, lineHeight: 14 },
});
