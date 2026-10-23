import React, { useEffect, useId, useMemo, useRef, useState } from "react";
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

function computeRegionBounds(paths: readonly string[]) {
  let minX = 420,
    minY = 640,
    maxX = 0,
    maxY = 0;
  const numRx = /-?\d+(?:\.\d+)?/g;
  for (const d of paths) {
    const nums = d.match(numRx);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i]),
        y = Number(nums[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) {
    return { leftPct: 25, topPct: 20, widthPct: 50, heightPct: 20 };
  }
  const pad = 8;
  const x0 = Math.max(0, minX - pad),
    y0 = Math.max(0, minY - pad),
    x1 = Math.min(420, maxX + pad),
    y1 = Math.min(640, maxY + pad);
  return {
    leftPct: (x0 / 420) * 100,
    topPct: (y0 / 640) * 100,
    widthPct: ((x1 - x0) / 420) * 100,
    heightPct: ((y1 - y0) / 640) * 100,
  };
}

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
  pressedId,
  onSelectRegion,
  onHover,
  onPressChange,
}: {
  view: BodyView;
  selected: MuscleRegion | null;
  active: MuscleRegion | null;
  pressedId: MuscleRegion | null;
  onSelectRegion: (id: MuscleRegion) => void;
  onHover: (id: MuscleRegion | null) => void;
  onPressChange: (id: MuscleRegion | null) => void;
}) {
  const prefix = "premium-" + useId().replace(/[^a-zA-Z0-9_-]/g, "") + "-";
  const regions = useMemo(() => visibleRegions(view), [view]);

  return (
    <View style={{ width: "100%", height: "100%", position: "relative" }}>
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
          {regions.map((region) => {
            const isPressed = pressedId === region.id;
            const isActive = active === region.id || isPressed;
            return (
              <G
                key={region.id}
                id={"muscle-" + view + "-" + region.id}
                {...(Platform.OS === "web"
                  ? {
                      "data-m": region.id,
                      "data-v": view,
                      className: "m",
                      onMouseEnter: () => onHover(region.id),
                      onMouseLeave: () => {
                        onHover(null);
                        onPressChange(null);
                      },
                    }
                  : {})}
                opacity={active && !isActive ? 0.36 : 1}
                onPressIn={() => onPressChange(region.id)}
                onPressOut={() => onPressChange(null)}
                onPress={() => onSelectRegion(region.id)}
              >
                {region.paths[view]!.map((d, i) => (
                  <Path
                    key={i}
                    d={d}
                    fill={isPressed ? "#FFFFFF" : region.color}
                    fillOpacity={isPressed ? 0.94 : isActive ? 0.84 : 0.5}
                    stroke={isPressed ? "#FDE047" : region.color}
                    strokeOpacity={1}
                    strokeWidth={isPressed ? 2.5 : isActive ? 1.85 : 1.2}
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Cross-Platform Native <Pressable> Touch Targets with Ripple & Visual Feedback */}
      <View
        pointerEvents={Platform.OS === "web" ? "box-none" : "auto"}
        style={StyleSheet.absoluteFill}
      >
        {regions.map((region) => {
          const box = computeRegionBounds(region.paths[view] || []);
          const isPressed = pressedId === region.id;
          return (
            <Pressable
              key={"touch-" + view + "-" + region.id}
              testID={"premium-svg-touch-" + region.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${region.name} muscle group`}
              accessibilityState={{ selected: selected === region.id }}
              android_ripple={{
                color: region.color + "66",
                borderless: true,
              }}
              onPressIn={() => onPressChange(region.id)}
              onPressOut={() => onPressChange(null)}
              onHoverIn={() => onHover(region.id)}
              onHoverOut={() => onHover(null)}
              onPress={() => onSelectRegion(region.id)}
              style={({ pressed }) => ({
                position: "absolute",
                left: `${box.leftPct}%` as any,
                top: `${box.topPct}%` as any,
                width: `${box.widthPct}%` as any,
                height: `${box.heightPct}%` as any,
                borderRadius: 16,
                backgroundColor:
                  pressed || isPressed ? region.color + "26" : "transparent",
                borderWidth: pressed || isPressed ? 1.2 : 0,
                borderColor: pressed || isPressed ? region.color + "AA" : "transparent",
              })}
            />
          );
        })}
      </View>
    </View>
  );
}

function RegionCard({
  region,
  selected,
  active,
  pressedId,
  onSelectRegion,
  onHover,
  onPressChange,
  onLayout,
}: {
  region: RegionDefinition;
  selected: MuscleRegion | null;
  active: MuscleRegion | null;
  pressedId: MuscleRegion | null;
  onSelectRegion: (id: MuscleRegion) => void;
  onHover: (id: MuscleRegion | null) => void;
  onPressChange: (id: MuscleRegion | null) => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const isPressed = pressedId === region.id;
  const isActive = active === region.id || isPressed;

  return (
    <Pressable
      testID={"premium-region-" + region.id}
      accessibilityRole="button"
      accessibilityLabel={
        region.name + " · " + rankNames[region.tierId] + " · example tier"
      }
      accessibilityState={{ selected: selected === region.id }}
      android_ripple={{ color: region.color + "44", borderless: false }}
      {...(Platform.OS === "web"
        ? { "aria-pressed": selected === region.id }
        : {})}
      onLayout={onLayout}
      onPressIn={() => onPressChange(region.id)}
      onPressOut={() => onPressChange(null)}
      onPress={() => onSelectRegion(region.id)}
      onHoverIn={() => onHover(region.id)}
      onHoverOut={() => onHover(null)}
      onFocus={() => onHover(region.id)}
      onBlur={() => onHover(null)}
      style={({ pressed }) => [
        m.regionCard,
        {
          borderColor: pressed || isPressed ? "#FDE047" : region.color,
          backgroundColor:
            pressed || isPressed
              ? region.color + "2E"
              : isActive
                ? "#10233b"
                : "#081321",
          transform: [{ scale: pressed || isPressed ? 0.985 : 1 }],
        },
        isActive && { boxShadow: `0px 0px 18px ${region.color}40` },
      ]}
    >
      <View style={m.cardRow}>
        <Svg width={27} height={27} viewBox="0 0 28 28">
          <G
            fill="none"
            stroke={isPressed ? "#FDE047" : "#DCE6F8"}
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
    [pressedId, setPressedId] = useState<MuscleRegion | null>(null),
    [cards, setCards] = useState<Record<string, { y: number; height: number }>>(
      {},
    );

  // Instant zero-latency selection handler shared across SVG <Pressable> & RegionCard
  const select = (id: MuscleRegion) => {
    onSelect(toggleRegion(selected, id, view));
  };

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

  useEffect(() => {
    setHover(null);
    setPressedId(null);
  }, [view]);

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
    active = pressedId || hover || selected,
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
            active={active}
            pressedId={pressedId}
            selected={selected}
            onSelectRegion={select}
            onHover={setHover}
            onPressChange={setPressedId}
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
        pressedId={pressedId}
        onSelectRegion={select}
        onHover={setHover}
        onPressChange={setPressedId}
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
                    strokeWidth={active === r.id ? 2 : 1.3}
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
