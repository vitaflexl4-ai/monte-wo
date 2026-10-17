import React, { useState, useRef, useEffect } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { ArrowUpRight, Play, BookOpen } from "lucide-react-native";
import { C } from "./ui";
import { Glow, LiftGlyph } from "./art";
import { workoutPosters } from "./workout-posters";
import { mediaUri, type ExerciseRecord } from "./catalog";
import { gridColumns } from "./library-index";
function ExerciseTile({
  exercise: e,
  width,
  onOpen,
  apiBase,
}: {
  exercise: ExerciseRecord;
  width: number;
  onOpen: () => void;
  apiBase: string;
}) {
  const [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false),
    [failed, setFailed] = useState(false);
  const remote = e.media?.type === "image" ? mediaUri(e, apiBase) : null;
  return (
    <Pressable
      testID={"exercise-card-" + e.id}
      accessibilityRole="button"
      accessibilityLabel={
        "Open " +
        e.name +
        " " +
        e.muscles.join(" · ") +
        (e.pack ? " animation" : " written guide")
      }
      onPress={onOpen}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={({ pressed }) => [
        g.tile,
        {
          width,
          borderColor: focus || hover ? C.cyan : "#17416a",
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Glow />
      <View style={g.art}>
        {e.pack ? (
          <Image
            source={workoutPosters[e.id]}
            accessibilityLabel={e.name + " source poster"}
            style={g.poster}
            resizeMode="contain"
          />
        ) : remote && !failed ? (
          <Image
            source={{ uri: remote }}
            onError={() => setFailed(true)}
            style={g.poster}
            resizeMode="contain"
          />
        ) : (
          <LiftGlyph
            id={
              e.group === "legs"
                ? "squat"
                : e.group === "chest"
                  ? "bench"
                  : e.group === "arms"
                    ? "curl"
                    : "deadlift"
            }
            size={64}
          />
        )}
        <View style={g.type}>
          <Text style={g.typeText}>
            {e.pack ? "ANIMATION" : "WRITTEN GUIDE"}
          </Text>
        </View>
        <View style={g.play}>
          {e.pack ? (
            <Play color="#e0f6ff" size={15} />
          ) : (
            <BookOpen color="#a3c6e6" size={15} />
          )}
        </View>
      </View>
      <View style={g.info}>
        <Text style={g.equipment}>{e.equipment.toUpperCase()}</Text>
        <Text style={g.name}>{e.name}</Text>
        <Text style={g.muscles} numberOfLines={2}>
          {e.muscles.join(" · ")}
        </Text>
        <View style={g.bottom}>
          <Text style={g.duration}>
            {e.pack
              ? e.pack.manifest.demo_duration_s + "s · demo + loop"
              : "Read the guide"}
          </Text>
          <ArrowUpRight color={C.cyan} size={17} />
        </View>
      </View>
    </Pressable>
  );
}
export function ExerciseGrid({
  exercises,
  onOpen,
  apiBase,
}: {
  exercises: ExerciseRecord[];
  onOpen: (id: string) => void;
  apiBase: string;
}) {
  const [width, setWidth] = useState(320);
  const pendingFrame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (pendingFrame.current !== undefined)
        cancelAnimationFrame(pendingFrame.current);
    },
    [],
  );
  const measure = (nextWidth: number) => {
    const measured = Math.floor(nextWidth);
    if (measured <= 0 || measured === width) return;
    if (pendingFrame.current !== undefined)
      cancelAnimationFrame(pendingFrame.current);
    // ResizeObserver callbacks must not synchronously cause another layout.
    pendingFrame.current = requestAnimationFrame(() => {
      setWidth(measured);
      pendingFrame.current = undefined;
    });
  };
  const cols = gridColumns(width),
    tileWidth = Math.max(0, (width - (cols - 1) * 12) / cols);
  return (
    <View
      testID="exercise-grid"
      onLayout={(event) => measure(event.nativeEvent.layout.width)}
      style={g.grid}
    >
      {exercises.map((e) => (
        <ExerciseTile
          key={e.id}
          exercise={e}
          width={tileWidth}
          apiBase={apiBase}
          onOpen={() => onOpen(e.id)}
        />
      ))}
    </View>
  );
}
const g = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "stretch",
    width: "100%",
  },
  tile: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#061220",
    minHeight: 312,
  },
  art: {
    height: 194,
    backgroundColor: "#090e17",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#18304a",
  },
  poster: { width: "100%", height: "100%" },
  type: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "#07182c",
    borderWidth: 1,
    borderColor: "#25496c",
  },
  typeText: {
    color: "#abd6f8",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  play: {
    position: "absolute",
    right: 9,
    bottom: 9,
    height: 29,
    width: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b2b48",
    borderWidth: 1,
    borderColor: "#24648e",
  },
  info: { padding: 12, gap: 7, flex: 1 },
  equipment: {
    color: C.cyan,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  name: { color: C.text, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  muscles: { color: C.muted, fontSize: 10, lineHeight: 16 },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingTop: 10,
    marginTop: "auto",
  },
  duration: { color: "#a2bbd2", fontSize: 9, flex: 1 },
});
