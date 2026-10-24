import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import {
  Check,
  Dumbbell,
  Film,
  History,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  Trash2,
  Wrench,
} from "lucide-react-native";
import * as Crypto from "expo-crypto";
import { calculateBarbellSetup } from "../../../shared/training-tools.js";
import { validateWorkout } from "../../../shared/workouts.js";
import type { ExerciseCatalog } from "./catalog";
import { API_BASE } from "./api";
import { today, type Workout } from "./model";
import { workoutPosters } from "./workout-posters";
import { disciplineArt, LiftGlyph } from "./art";
import {
  AttachMediaModal,
  ExerciseMediaBanner,
  useMediaVault,
} from "./media-vault";
import {
  buildUniversalExerciseAtlas,
  builtInExerciseVideoUri,
  generateSmartWorkout,
  loadCustomExercises,
  loadVaultWorkouts,
  removeVaultWorkout,
  saveCustomExercise,
  saveVaultWorkout,
  searchUniversalExercises,
  type GeneratedWorkoutPlan,
  type LoggedWorkoutSet,
  type UniversalExercise,
  type VaultWorkoutSession,
  type WorkoutGenPreferences,
} from "./global-exercises";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Chips,
  Disclosure,
  Field,
  Label,
  ModalSheet,
  Notice,
  Screen,
  SegmentedTabs,
  Title,
  s,
} from "./ui";

const ACTIVE_DRAFT_KEY = "montewo.active_universal_draft.v1";

type ActiveExerciseBlock = {
  blockId: string;
  exercise: UniversalExercise;
  restSec: number;
  showMedia: boolean;
  sets: {
    id: string;
    weight: string;
    reps: string;
    rpe: string;
    completed: boolean;
  }[];
};

const packOrigin =
  Platform.OS === "web" && process.env.EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA === "true"
    ? API_BASE
    : undefined;

export function WorkoutScreen({
  navigation,
  route,
  trainingCatalog,
  exerciseCatalog,
  localWorkouts,
  saveLocal,
  deleteLocal,
  me,
  onCopyToAccount,
  onVaultChanged,
}: {
  navigation: any;
  route?: any;
  trainingCatalog: ExerciseCatalog;
  exerciseCatalog: ExerciseCatalog;
  localWorkouts: Workout[];
  localReady?: boolean;
  localStatus?: string;
  saveLocal: (w: Workout) => Promise<void>;
  deleteLocal: (id: string) => Promise<void>;
  me: any;
  onCopyToAccount: (w: Workout) => void;
  onVaultChanged?: () => void;
}) {
  const initialSection = route?.params?.section || "logger";
  const [tab, setTab] = useState<"logger" | "generator" | "library" | "tools">(
    initialSection,
  );

  useEffect(() => {
    if (route?.params?.section) setTab(route.params.section);
  }, [route?.params?.section]);

  const { mediaMap } = useMediaVault();
  const [customExercises, setCustomExercises] = useState<UniversalExercise[]>(
    loadCustomExercises,
  );
  const atlas = useMemo(
    () =>
      buildUniversalExerciseAtlas(
        exerciseCatalog,
        trainingCatalog,
        customExercises,
      ),
    [exerciseCatalog, trainingCatalog, customExercises],
  );

  const [vaultWorkouts, setVaultWorkouts] =
    useState<VaultWorkoutSession[]>(loadVaultWorkouts);

  // Active Logger State
  const [sessionTitle, setSessionTitle] = useState("Strength Session");
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [notes, setNotes] = useState("");
  const [blocks, setBlocks] = useState<ActiveExerciseBlock[]>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ACTIVE_DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.blocks) && parsed.blocks.length) {
            return parsed.blocks;
          }
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Persist draft automatically
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(
        ACTIVE_DRAFT_KEY,
        JSON.stringify({ sessionTitle, unit, notes, blocks }),
      );
    }
  }, [sessionTitle, unit, notes, blocks]);

  // Seed default first exercise if blocks start empty and atlas is ready
  useEffect(() => {
    if (blocks.length === 0 && atlas.length > 0 && route?.params?.exercise) {
      const found = atlas.find((e) => e.id === route.params.exercise);
      if (found) addExerciseToSession(found);
    }
  }, [route?.params?.exercise, atlas.length]);

  // Rest Timer
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);

  useEffect(() => {
    if (!restRunning || restSeconds <= 0) return;
    const t = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          setRestRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [restRunning, restSeconds]);

  function triggerRest(sec = 120) {
    setRestSeconds(sec);
    setRestRunning(true);
  }

  // Modals
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerGroup, setPickerGroup] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExGroup, setNewExGroup] = useState("chest");
  const [newExEquip, setNewExEquip] = useState("Barbell");
  const [mediaTarget, setMediaTarget] = useState<UniversalExercise | null>(null);
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((c) => (c === msg ? "" : c)), 3200);
  }

  function addExerciseToSession(ex: UniversalExercise, numSets = 3, defaultReps = "8", restSec = 120) {
    const setRows = Array.from({ length: numSets }, (_, idx) => ({
      id: `set-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      weight: "",
      reps: defaultReps,
      rpe: "8",
      completed: false,
    }));
    setBlocks((prev) => [
      ...prev,
      {
        blockId: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exercise: ex,
        restSec,
        showMedia: false,
        sets: setRows,
      },
    ]);
  }

  async function finishWorkout() {
    const flatSets: LoggedWorkoutSet[] = [];
    for (const b of blocks) {
      for (const st of b.sets) {
        const reps = Number(st.reps);
        const weight = st.weight.trim() === "" ? 0 : Number(st.weight);
        if (Number.isFinite(reps) && reps > 0 && Number.isFinite(weight) && weight >= 0) {
          flatSets.push({
            id: st.id,
            exerciseId: b.exercise.id,
            exerciseName: b.exercise.name,
            group: b.exercise.group,
            reps: Math.round(reps),
            weight: Math.round(weight * 100) / 100,
            unit,
            rpe: st.rpe ? Number(st.rpe) : null,
            completed: true,
          });
        }
      }
    }
    if (!flatSets.length) {
      flash("Enter reps (and load) on at least one set before saving.");
      return;
    }

    const sessionId = Crypto.randomUUID();
    const record: VaultWorkoutSession = {
      id: sessionId,
      title: sessionTitle.trim() || "Strength Session",
      performedOn: today(),
      notes: notes.trim() || undefined,
      sets: flatSets,
      createdAt: new Date().toISOString(),
    };
    const nextVault = saveVaultWorkout(record);
    setVaultWorkouts(nextVault);
    onVaultChanged?.();

    // Also mirror to canonical deviceWorkouts if all exercise IDs are canonical
    const allCanonical = flatSets.every((s) =>
      trainingCatalog.exercises.some((c) => c.id === s.exerciseId),
    );
    if (allCanonical) {
      try {
        const grouped = new Map<string, { exerciseId: string; sets: any[] }>();
        for (const sRow of flatSets) {
          if (!grouped.has(sRow.exerciseId)) {
            grouped.set(sRow.exerciseId, { exerciseId: sRow.exerciseId, sets: [] });
          }
          grouped.get(sRow.exerciseId)!.sets.push({
            reps: sRow.reps,
            load: String(sRow.weight),
            unit: sRow.unit,
          });
        }
        const validated = validateWorkout(
          {
            id: sessionId,
            title: record.title,
            performedOn: record.performedOn,
            exercises: Array.from(grouped.values()),
          },
          new Set(trainingCatalog.exercises.map((e) => e.id)),
          today(),
        );
        await saveLocal(validated as Workout);
      } catch {
        // ignore if canonical bounds differ
      }
    }

    setBlocks([]);
    setNotes("");
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_DRAFT_KEY);
    }
    flash(`Saved "${record.title}" (${flatSets.length} sets)!`);
  }

  // =========================================================================
  // TAB 2: SMART WORKOUT GENERATOR
  // =========================================================================
  const [genPref, setGenPref] = useState<WorkoutGenPreferences>({
    split: "climb_power",
    equipment: "full_gym",
    durationMin: 60,
    level: "intermediate",
    focusLift: "squat",
  });

  const [generatedPlan, setGeneratedPlan] = useState<GeneratedWorkoutPlan>(() =>
    generateSmartWorkout(atlas, genPref),
  );

  useEffect(() => {
    setGeneratedPlan(generateSmartWorkout(atlas, genPref));
  }, [atlas.length]);

  function regeneratePlan(nextPref = genPref) {
    setGeneratedPlan(generateSmartWorkout(atlas, nextPref));
  }

  function swapSlotExercise(slotIndex: number) {
    setGeneratedPlan((cur) => {
      const slot = cur.slots[slotIndex];
      if (!slot || !slot.alternatives.length) return cur;
      const [nextPrimary, ...restAlts] = slot.alternatives;
      const updated = {
        ...slot,
        exercise: nextPrimary,
        alternatives: [...restAlts, slot.exercise],
      };
      return {
        ...cur,
        slots: cur.slots.map((s, idx) => (idx === slotIndex ? updated : s)),
      };
    });
  }

  function loadPlanIntoLogger() {
    setSessionTitle(generatedPlan.title);
    const nextBlocks: ActiveExerciseBlock[] = generatedPlan.slots.map((slot, i) => ({
      blockId: `gen-${Date.now()}-${i}`,
      exercise: slot.exercise,
      restSec: slot.restSec,
      showMedia: false,
      sets: Array.from({ length: slot.sets }, (_, sIdx) => ({
        id: `gset-${Date.now()}-${i}-${sIdx}`,
        weight: "",
        reps: String(slot.targetReps),
        rpe: slot.rpe.replace("RPE ", ""),
        completed: false,
      })),
    }));
    setBlocks(nextBlocks);
    setTab("logger");
    flash(`Loaded ${generatedPlan.slots.length} exercises into Active Logger!`);
  }

  // =========================================================================
  // TAB 3: UNIVERSAL EXERCISE ENCYCLOPEDIA + MEDIA STUDIO
  // =========================================================================
  const [libQuery, setLibQuery] = useState("");
  const [libGroup, setLibGroup] = useState("all");
  const [libMediaFilter, setLibMediaFilter] = useState<"all" | "ready" | "needs">("all");
  const [expandedExId, setExpandedExId] = useState<string | null>(null);
  const [showNotesField, setShowNotesField] = useState(false);

  const filteredLibrary = useMemo(() => {
    const base = searchUniversalExercises(atlas, libQuery, libGroup, "all");
    return base.filter((ex) => {
      const hasMedia = Boolean(ex.pack || mediaMap[ex.id]);
      if (libMediaFilter === "ready") return hasMedia;
      if (libMediaFilter === "needs") return !hasMedia;
      return true;
    });
  }, [atlas, libQuery, libGroup, libMediaFilter, mediaMap]);

  const pickerResults = useMemo(
    () => searchUniversalExercises(atlas, pickerQuery, pickerGroup, "all"),
    [atlas, pickerQuery, pickerGroup],
  );

  // =========================================================================
  // TAB 4: BARBELL PLATE CALCULATOR
  // =========================================================================
  const [plateTarget, setPlateTarget] = useState("225");
  const [plateUnit, setPlateUnit] = useState<"lb" | "kg">("lb");
  const plateSetup = useMemo(() => {
    try {
      return calculateBarbellSetup({
        targetLoad: Number(plateTarget) || 0,
        unit: plateUnit,
      });
    } catch {
      return null;
    }
  }, [plateTarget, plateUnit]);

  const builtInMediaCount = useMemo(
    () => atlas.filter((e) => Boolean(e.pack)).length,
    [atlas],
  );
  const customMediaCount = Object.keys(mediaMap).length;

  return (
    <Screen wide>
      {/* Top Bar */}
      <View style={s.row}>
        <View style={{ gap: 2 }}>
          <Label>MONTE WO TRAINING</Label>
          <Title>Train & Build</Title>
        </View>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Chips
            items={[
              { id: "lb", name: "LB" },
              { id: "kg", name: "KG" },
            ]}
            value={unit}
            onChange={(v) => setUnit(v as "lb" | "kg")}
          />
        </View>
      </View>

      {toast ? <Notice text={toast} /> : null}

      {/* Floating Rest Timer Bar (when active) */}
      {restSeconds > 0 ? (
        <Card accent="red" style={{ padding: 12 }}>
          <View style={s.row}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Timer size={18} color={C.red} />
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: "900",
                  fontVariant: ["tabular-nums"],
                }}
              >
                Rest {Math.floor(restSeconds / 60)}:
                {String(restSeconds % 60).padStart(2, "0")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Button
                small
                secondary
                title="-15s"
                onPress={() => setRestSeconds((x) => Math.max(0, x - 15))}
              />
              <Button
                small
                secondary
                title="+30s"
                onPress={() => setRestSeconds((x) => x + 30)}
              />
              <Button
                small
                crimson
                title="Skip"
                onPress={() => {
                  setRestRunning(false);
                  setRestSeconds(0);
                }}
              />
            </View>
          </View>
        </Card>
      ) : null}

      <SegmentedTabs
        items={[
          { id: "logger", name: `Workout (${blocks.length})` },
          { id: "generator", name: "AI Generator" },
          { id: "library", name: `Exercises (${atlas.length})` },
          { id: "tools", name: "Plates & Log" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as any)}
      />

      {/* =================================================================== */}
      {/* TAB 1: FAST ACTIVE WORKOUT LOGGER                                   */}
      {/* =================================================================== */}
      {tab === "logger" ? (
        <>
          <Card accent="blue">
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Field
                  label="Session Name"
                  value={sessionTitle}
                  onChangeText={setSessionTitle}
                  placeholder="e.g. Heavy Squat & Upper Pull"
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignSelf: "flex-end" }}>
                <Button
                  small
                  secondary
                  title="90s Timer"
                  onPress={() => triggerRest(90)}
                />
                <Button
                  small
                  secondary
                  title="3m Timer"
                  onPress={() => triggerRest(180)}
                />
              </View>
            </View>
          </Card>

          {blocks.length === 0 ? (
            <Card style={{ alignItems: "center", paddingVertical: 28, gap: 14 }}>
              <Dumbbell size={32} color={C.cyan} />
              <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "800" }}>
                Ready to Train
              </Text>
              <Body style={{ textAlign: "center", maxWidth: 380 }}>
                Add any of {atlas.length}+ exercises (or create any workout name on the spot), or generate a tailored session in 1 tap.
              </Body>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <Button
                  title="+ Add Exercise"
                  onPress={() => setPickerOpen(true)}
                />
                <Button
                  crimson
                  title="Generate Workout"
                  onPress={() => setTab("generator")}
                />
              </View>
            </Card>
          ) : (
            blocks.map((b, bIdx) => {
              const videoUri = builtInExerciseVideoUri(b.exercise, packOrigin);
              const customMedia = mediaMap[b.exercise.id] || null;
              const poster = workoutPosters[b.exercise.id];
              return (
                <Card key={b.blockId}>
                  <View style={s.row}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ color: "#ffffff", fontSize: 16.5, fontWeight: "800" }}>
                        {b.exercise.name}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 11.5 }}>
                        {b.exercise.equipment} · {b.exercise.muscles.join(", ")}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          setBlocks((prev) =>
                            prev.map((row, idx) =>
                              idx === bIdx ? { ...row, showMedia: !row.showMedia } : row,
                            ),
                          )
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: "#111927",
                          borderWidth: 1,
                          borderColor: "#25354f",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Film size={13} color={customMedia || videoUri ? C.green : C.cyan} />
                        <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
                          {b.showMedia
                            ? "Hide Clip"
                            : customMedia || videoUri
                              ? "Demo"
                              : "+ GIF/MP4"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          setBlocks((prev) => prev.filter((_, idx) => idx !== bIdx))
                        }
                        style={{ padding: 6 }}
                      >
                        <Trash2 size={15} color="#ff6b81" />
                      </Pressable>
                    </View>
                  </View>

                  {b.showMedia ? (
                    <ExerciseMediaBanner
                      exerciseId={b.exercise.id}
                      exerciseName={b.exercise.name}
                      builtInVideoUri={videoUri}
                      posterSource={poster}
                      customMedia={customMedia}
                      height={180}
                      onManageMedia={() => setMediaTarget(b.exercise)}
                    />
                  ) : null}

                  {/* Set Table Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ width: 34, color: C.muted, fontSize: 10.5, fontWeight: "800" }}>
                      SET
                    </Text>
                    <Text style={{ flex: 1, color: C.muted, fontSize: 10.5, fontWeight: "800" }}>
                      {unit.toUpperCase()}
                    </Text>
                    <Text style={{ flex: 1, color: C.muted, fontSize: 10.5, fontWeight: "800" }}>
                      REPS
                    </Text>
                    <Text style={{ width: 54, color: C.muted, fontSize: 10.5, fontWeight: "800" }}>
                      RPE
                    </Text>
                    <Text style={{ width: 38, color: C.muted, fontSize: 10.5, fontWeight: "800", textAlign: "center" }}>
                      DONE
                    </Text>
                  </View>

                  {b.sets.map((st, sIdx) => (
                    <View
                      key={st.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingVertical: 4,
                        paddingHorizontal: 6,
                        borderRadius: 10,
                        backgroundColor: st.completed ? "#062118" : "#05070c",
                        borderWidth: 1,
                        borderColor: st.completed ? "#155e45" : "#161f2e",
                      }}
                    >
                      <Text
                        style={{
                          width: 28,
                          color: st.completed ? C.green : C.muted,
                          fontWeight: "800",
                          fontSize: 13,
                          textAlign: "center",
                        }}
                      >
                        {sIdx + 1}
                      </Text>
                      <TextInput
                        value={st.weight}
                        onChangeText={(val) =>
                          setBlocks((prev) =>
                            prev.map((row, idx) =>
                              idx === bIdx
                                ? {
                                    ...row,
                                    sets: row.sets.map((sRow, j) =>
                                      j === sIdx ? { ...sRow, weight: val } : sRow,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        placeholder="0"
                        placeholderTextColor="#475569"
                        keyboardType="decimal-pad"
                        style={[s.input, { flex: 1, minHeight: 38, paddingVertical: 6 }]}
                      />
                      <TextInput
                        value={st.reps}
                        onChangeText={(val) =>
                          setBlocks((prev) =>
                            prev.map((row, idx) =>
                              idx === bIdx
                                ? {
                                    ...row,
                                    sets: row.sets.map((sRow, j) =>
                                      j === sIdx ? { ...sRow, reps: val } : sRow,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        placeholder="8"
                        placeholderTextColor="#475569"
                        keyboardType="decimal-pad"
                        style={[s.input, { flex: 1, minHeight: 38, paddingVertical: 6 }]}
                      />
                      <TextInput
                        value={st.rpe}
                        onChangeText={(val) =>
                          setBlocks((prev) =>
                            prev.map((row, idx) =>
                              idx === bIdx
                                ? {
                                    ...row,
                                    sets: row.sets.map((sRow, j) =>
                                      j === sIdx ? { ...sRow, rpe: val } : sRow,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        placeholder="8"
                        placeholderTextColor="#475569"
                        keyboardType="decimal-pad"
                        style={[s.input, { width: 54, minHeight: 38, paddingVertical: 6 }]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          const willComplete = !st.completed;
                          setBlocks((prev) =>
                            prev.map((row, idx) =>
                              idx === bIdx
                                ? {
                                    ...row,
                                    sets: row.sets.map((sRow, j) =>
                                      j === sIdx
                                        ? { ...sRow, completed: willComplete }
                                        : sRow,
                                    ),
                                  }
                                : row,
                            ),
                          );
                          if (willComplete) triggerRest(b.restSec || 120);
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: st.completed ? C.green : "#131c2b",
                        }}
                      >
                        <Check size={16} color={st.completed ? "#000000" : "#94a3b8"} />
                      </Pressable>
                    </View>
                  ))}

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button
                      small
                      secondary
                      title="+ Add Set"
                      onPress={() =>
                        setBlocks((prev) =>
                          prev.map((row, idx) => {
                            if (idx !== bIdx) return row;
                            const last = row.sets[row.sets.length - 1];
                            return {
                              ...row,
                              sets: [
                                ...row.sets,
                                {
                                  id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                  weight: last?.weight || "",
                                  reps: last?.reps || "8",
                                  rpe: last?.rpe || "8",
                                  completed: false,
                                },
                              ],
                            };
                          }),
                        )
                      }
                    />
                    {b.sets.length > 1 ? (
                      <Button
                        small
                        secondary
                        title="- Set"
                        onPress={() =>
                          setBlocks((prev) =>
                            prev.map((row, idx) =>
                              idx === bIdx
                                ? { ...row, sets: row.sets.slice(0, -1) }
                                : row,
                            ),
                          )
                        }
                      />
                    ) : null}
                  </View>
                </Card>
              );
            })
          )}

          {blocks.length > 0 ? (
            <Card>
              {showNotesField || notes.trim() ? (
                <Field
                  label="Session Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Bar speed, cues, PR notes…"
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowNotesField(true)}
                >
                  <Text style={s.link}>+ Add session note</Text>
                </Pressable>
              )}
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <View style={{ flex: 1, minWidth: 150 }}>
                  <Button
                    secondary
                    title="+ Add Exercise"
                    onPress={() => setPickerOpen(true)}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 170 }}>
                  <Button
                    crimson
                    title="Finish & Save Workout"
                    onPress={finishWorkout}
                  />
                </View>
              </View>
            </Card>
          ) : null}
        </>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 2: INTELLIGENT WORKOUT GENERATOR                                */}
      {/* =================================================================== */}
      {tab === "generator" ? (
        <>
          <Card accent="red">
            <View style={s.row}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Sparkles size={17} color="#ff6b81" />
                <Text style={s.heading}>Smart Workout Generator</Text>
              </View>
              <Badge text={`~${generatedPlan.estimatedMinutes} MIN`} tone="blue" />
            </View>

            <Chips
              items={[
                { id: "climb_power", name: "Climb Peak" },
                { id: "push", name: "Push" },
                { id: "pull", name: "Pull" },
                { id: "legs", name: "Legs" },
                { id: "upper", name: "Upper" },
                { id: "lower", name: "Lower" },
                { id: "full_body", name: "Full Body" },
                { id: "arms_curl", name: "Strict Curl" },
              ]}
              value={genPref.split}
              onChange={(v) => {
                const next = { ...genPref, split: v as any };
                setGenPref(next);
                regeneratePlan(next);
              }}
            />

            {genPref.split === "climb_power" ? (
              <Chips
                items={[
                  { id: "squat", name: "Squat" },
                  { id: "bench", name: "Bench" },
                  { id: "deadlift", name: "Deadlift" },
                  { id: "curl", name: "Strict Curl" },
                ]}
                value={genPref.focusLift}
                onChange={(v) => {
                  const next = { ...genPref, focusLift: v as any };
                  setGenPref(next);
                  regeneratePlan(next);
                }}
              />
            ) : null}

            <Button
              crimson
              title="Load Plan into Logger →"
              onPress={loadPlanIntoLogger}
            />
          </Card>

          <Disclosure
            title="Customize Equipment, Duration & Level"
            summary={`${genPref.equipment.replace(/_/g, " ")} · ${genPref.durationMin} min · ${genPref.level}`}
          >
            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>Available Equipment</Text>
              <Chips
                items={[
                  { id: "full_gym", name: "Full Gym" },
                  { id: "barbell", name: "Barbell + Rack" },
                  { id: "dumbbell", name: "Dumbbells Only" },
                  { id: "cables_machines", name: "Cables & Machines" },
                  { id: "bodyweight", name: "Bodyweight" },
                ]}
                value={genPref.equipment}
                onChange={(v) => {
                  const next = { ...genPref, equipment: v as any };
                  setGenPref(next);
                  regeneratePlan(next);
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>Session Duration</Text>
              <Chips
                items={[
                  { id: "30", name: "30 min" },
                  { id: "45", name: "45 min" },
                  { id: "60", name: "60 min" },
                  { id: "75", name: "75 min" },
                ]}
                value={String(genPref.durationMin)}
                onChange={(v) => {
                  const next = {
                    ...genPref,
                    durationMin: Number(v) as 30 | 45 | 60 | 75,
                  };
                  setGenPref(next);
                  regeneratePlan(next);
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>Experience Tier</Text>
              <Chips
                items={[
                  { id: "foundation", name: "Debitan–Bati" },
                  { id: "intermediate", name: "Solid–Avanse" },
                  { id: "advanced", name: "Mèt–Lejand" },
                ]}
                value={genPref.level}
                onChange={(v) => {
                  const next = { ...genPref, level: v as any };
                  setGenPref(next);
                  regeneratePlan(next);
                }}
              />
            </View>
          </Disclosure>

          <Card>
            <View style={s.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800" }}>
                  {generatedPlan.title}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  Warm-up: {generatedPlan.warmupNote}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              {generatedPlan.slots.map((slot, idx) => (
                <View
                  key={slot.slotId}
                  style={{
                    padding: 12,
                    borderRadius: 13,
                    backgroundColor: "#04060a",
                    borderWidth: 1,
                    borderColor: "#162032",
                    gap: 4,
                  }}
                >
                  <View style={s.row}>
                    <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14.5, flex: 1 }}>
                      {idx + 1}. {slot.exercise.name}
                    </Text>
                    {slot.alternatives.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => swapSlotExercise(idx)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <RefreshCw size={12} color={C.cyan} />
                        <Text style={s.link}>Swap</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {slot.sets} × {slot.repRange} · {slot.rpe} · Rest {slot.restSec}s · {slot.exercise.equipment}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 3: UNIVERSAL EXERCISE LIBRARY + TUCKED MEDIA PREVIEW            */}
      {/* =================================================================== */}
      {tab === "library" ? (
        <>
          <Card accent="blue" style={{ gap: 10 }}>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <View style={{ gap: 2 }}>
                <Text style={s.heading}>
                  Exercises ({filteredLibrary.length})
                </Text>
                <Text style={{ color: C.muted, fontSize: 11.5 }}>
                  {builtInMediaCount} built-in clips · {customMediaCount} custom
                </Text>
              </View>
              <Button
                small
                secondary
                title="+ New Exercise"
                onPress={() => setCreateModalOpen(true)}
              />
            </View>

            <Field
              label=""
              value={libQuery}
              onChangeText={setLibQuery}
              placeholder="Search exercise or muscle…"
            />

            <Chips
              items={[
                { id: "all", name: "All" },
                { id: "chest", name: "Chest" },
                { id: "back", name: "Back" },
                { id: "legs", name: "Legs" },
                { id: "shoulders", name: "Shoulders" },
                { id: "arms", name: "Arms" },
                { id: "core", name: "Core" },
                { id: "cardio", name: "Cardio" },
              ]}
              value={libGroup}
              onChange={setLibGroup}
            />
          </Card>

          <Disclosure
            title="Media Filter"
            summary={
              libMediaFilter === "all"
                ? "Showing all movements"
                : libMediaFilter === "ready"
                  ? "Only movements with MP4 / GIF"
                  : "Movements without attached media"
            }
          >
            <Chips
              items={[
                { id: "all", name: "All Exercises" },
                { id: "ready", name: "Has MP4 / GIF" },
                { id: "needs", name: "Media Slot Open" },
              ]}
              value={libMediaFilter}
              onChange={(v) => setLibMediaFilter(v as any)}
            />
          </Disclosure>

          <Card style={{ padding: 10, gap: 6 }}>
            {filteredLibrary.slice(0, 28).map((ex, idx) => {
              const videoUri = builtInExerciseVideoUri(ex, packOrigin);
              const custom = mediaMap[ex.id] || null;
              const isOpen = expandedExId === ex.id;
              const poster =
                (ex.climbDiscipline ? disciplineArt[ex.climbDiscipline] : null) ||
                workoutPosters[ex.id];
              const glyphKind =
                ex.climbDiscipline ||
                (ex.group === "legs"
                  ? "squat"
                  : ex.group === "chest" || ex.group === "shoulders"
                    ? "bench"
                    : ex.group === "arms"
                      ? "curl"
                      : "deadlift");
              return (
                <View
                  key={ex.id}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderBottomWidth:
                      idx < Math.min(28, filteredLibrary.length) - 1 ? 1 : 0,
                    borderBottomColor: "#121a28",
                    gap: 10,
                  }}
                >
                  <View style={s.row}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setExpandedExId((cur) => (cur === ex.id ? null : ex.id))
                      }
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: "#060b14",
                          borderWidth: 1,
                          borderColor: "#18263b",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LiftGlyph id={glyphKind} size={20} color={C.cyan} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontSize: 14.5,
                              fontWeight: "800",
                            }}
                          >
                            {ex.name}
                          </Text>
                          {ex.climbDiscipline ? (
                            <Badge text="RANKED" tone="red" />
                          ) : null}
                        </View>
                        <Text style={{ color: C.muted, fontSize: 11.5 }}>
                          {ex.equipment} · {ex.muscles.slice(0, 2).join(", ")} ·{" "}
                          <Text style={{ color: C.cyan }}>
                            {isOpen ? "Hide demo ▲" : "Demo & cue ▾"}
                          </Text>
                        </Text>
                      </View>
                    </Pressable>

                    <Button
                      small
                      title="+ Log"
                      onPress={() => {
                        addExerciseToSession(ex);
                        setTab("logger");
                        flash(`Added ${ex.name} to active workout`);
                      }}
                    />
                  </View>

                  {isOpen ? (
                    <View style={{ gap: 8, paddingTop: 2 }}>
                      <ExerciseMediaBanner
                        exerciseId={ex.id}
                        exerciseName={ex.name}
                        builtInVideoUri={videoUri}
                        posterSource={poster}
                        customMedia={custom}
                        height={175}
                        onManageMedia={() => setMediaTarget(ex)}
                      />
                      {ex.cues[0] ? (
                        <Text style={{ color: C.muted, fontSize: 12 }}>
                          {ex.cues[0]}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 4: BARBELL PLATE LAB & SAVED WORKOUT HISTORY                    */}
      {/* =================================================================== */}
      {tab === "tools" ? (
        <>
          <Card accent="blue">
            <View style={s.row}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Wrench size={17} color={C.cyan} />
                <Text style={s.heading}>Barbell Plate & Warm-Up Calculator</Text>
              </View>
              <Chips
                items={[
                  { id: "lb", name: "45 lb Bar" },
                  { id: "kg", name: "20 kg Bar" },
                ]}
                value={plateUnit}
                onChange={(v) => setPlateUnit(v as any)}
              />
            </View>
            <Field
              label={`Target Working Load (${plateUnit})`}
              value={plateTarget}
              onChangeText={setPlateTarget}
              numeric
            />
            {plateSetup ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 15 }}>
                  Loadable: {plateSetup.actualLoad} {plateUnit} · Per Side:{" "}
                  {plateSetup.platesPerSide.length
                    ? plateSetup.platesPerSide
                        .map((p) => `${p.count}×${p.weight}`)
                        .join(" + ")
                    : "Empty Bar"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {plateSetup.warmups.map((w, i) => (
                    <View
                      key={i}
                      style={{
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: "#05070c",
                        borderWidth: 1,
                        borderColor: "#1b263b",
                      }}
                    >
                      <Text style={{ color: C.cyan, fontSize: 11, fontWeight: "800" }}>
                        {w.label}
                      </Text>
                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13 }}>
                        {w.load} {w.unit} × {w.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>

          <Card>
            <Text style={s.heading}>
              Saved Workouts ({vaultWorkouts.length})
            </Text>
            {vaultWorkouts.length === 0 ? (
              <Body style={{ fontSize: 12.5 }}>
                Your finished workouts appear here with every exercise, set, rep, and load.
              </Body>
            ) : (
              <View style={{ gap: 10 }}>
                {vaultWorkouts.map((w) => {
                  const canonicalMatch = localWorkouts.find((lw) => lw.id === w.id);
                  return (
                    <View
                      key={w.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: "#05070c",
                        borderWidth: 1,
                        borderColor: "#192334",
                        gap: 6,
                      }}
                    >
                      <View style={s.row}>
                        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 15 }}>
                          {w.title}
                        </Text>
                        <Text style={s.small}>{w.performedOn}</Text>
                      </View>
                      <Text style={{ color: C.muted, fontSize: 12 }}>
                        {w.sets.length} sets ·{" "}
                        {Array.from(new Set(w.sets.map((s) => s.exerciseName))).join(", ")}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                        {me && canonicalMatch ? (
                          <Button
                            small
                            secondary
                            title="Save a copy to account"
                            onPress={() => onCopyToAccount(canonicalMatch)}
                          />
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setVaultWorkouts(removeVaultWorkout(w.id));
                            deleteLocal(w.id).catch(() => {});
                            onVaultChanged?.();
                          }}
                          style={{ paddingVertical: 6, paddingHorizontal: 10 }}
                        >
                          <Text style={{ color: "#ff6b81", fontWeight: "700", fontSize: 12 }}>
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </>
      ) : null}

      {/* =================================================================== */}
      {/* MODAL: UNIVERSAL EXERCISE PICKER                                    */}
      {/* =================================================================== */}
      <ModalSheet
        visible={pickerOpen}
        title="Add Any Exercise"
        onClose={() => setPickerOpen(false)}
      >
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Field
              label=""
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Type any workout name (300+ built-in or create new)…"
            />
          </View>
          <Button
            small
            secondary
            title="+ Create"
            onPress={() => {
              setNewExName(pickerQuery);
              setPickerOpen(false);
              setCreateModalOpen(true);
            }}
          />
        </View>
        <Chips
          items={[
            { id: "all", name: "All" },
            { id: "chest", name: "Chest" },
            { id: "back", name: "Back" },
            { id: "legs", name: "Legs" },
            { id: "shoulders", name: "Shoulders" },
            { id: "arms", name: "Arms" },
            { id: "core", name: "Core" },
          ]}
          value={pickerGroup}
          onChange={setPickerGroup}
        />

        {pickerResults.length === 0 && pickerQuery.trim() ? (
          <View style={{ gap: 10, paddingVertical: 10 }}>
            <Body>No exact match for "{pickerQuery}" yet—create it in 1 tap:</Body>
            <Button
              title={`+ Create "${pickerQuery.trim()}" & Add to Workout`}
              onPress={() => {
                const created = saveCustomExercise({
                  name: pickerQuery.trim(),
                  group: pickerGroup === "all" ? "chest" : pickerGroup,
                  equipment: "Barbell",
                });
                setCustomExercises(loadCustomExercises());
                addExerciseToSession(created);
                setPickerQuery("");
                setPickerOpen(false);
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {pickerResults.slice(0, 25).map((ex) => (
              <Pressable
                key={ex.id}
                accessibilityRole="button"
                onPress={() => {
                  addExerciseToSession(ex);
                  setPickerOpen(false);
                }}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: "#0d1320",
                  borderWidth: 1,
                  borderColor: "#1f2c42",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13.5 }}>
                    {ex.name}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>
                    {ex.equipment} · {ex.muscles.join(", ")}
                  </Text>
                </View>
                <Plus size={16} color={C.cyan} />
              </Pressable>
            ))}
          </View>
        )}
      </ModalSheet>

      {/* =================================================================== */}
      {/* MODAL: CREATE CUSTOM EXERCISE                                       */}
      {/* =================================================================== */}
      <ModalSheet
        visible={createModalOpen}
        title="Create Custom Exercise"
        onClose={() => setCreateModalOpen(false)}
      >
        <Field
          label="Exercise Name"
          value={newExName}
          onChangeText={setNewExName}
          placeholder="e.g. Cambered Bar Bench Press"
        />
        <Text style={s.fieldLabel}>Primary Muscle Group</Text>
        <Chips
          items={[
            { id: "chest", name: "Chest" },
            { id: "back", name: "Back" },
            { id: "legs", name: "Legs" },
            { id: "shoulders", name: "Shoulders" },
            { id: "arms", name: "Arms" },
            { id: "core", name: "Core" },
            { id: "cardio", name: "Conditioning" },
          ]}
          value={newExGroup}
          onChange={setNewExGroup}
        />
        <Text style={s.fieldLabel}>Equipment</Text>
        <Chips
          items={[
            { id: "Barbell", name: "Barbell" },
            { id: "Dumbbell", name: "Dumbbell" },
            { id: "Cable", name: "Cable" },
            { id: "Machine", name: "Machine" },
            { id: "Bodyweight", name: "Bodyweight" },
          ]}
          value={newExEquip}
          onChange={setNewExEquip}
        />
        <Button
          title="Save Exercise & Add Media / Sets"
          onPress={() => {
            try {
              const created = saveCustomExercise({
                name: newExName,
                group: newExGroup,
                equipment: newExEquip,
              });
              setCustomExercises(loadCustomExercises());
              setCreateModalOpen(false);
              setNewExName("");
              addExerciseToSession(created);
              flash(`Created "${created.name}"!`);
            } catch (e: any) {
              flash(e?.message || "Enter a valid exercise name.");
            }
          }}
        />
      </ModalSheet>

      {/* =================================================================== */}
      {/* MODAL: ATTACH VIDEO / GIF / MP4 TO EXERCISE                         */}
      {/* =================================================================== */}
      <AttachMediaModal
        visible={Boolean(mediaTarget)}
        exerciseId={mediaTarget?.id || ""}
        exerciseName={mediaTarget?.name || ""}
        existing={mediaTarget ? mediaMap[mediaTarget.id] : null}
        onClose={() => setMediaTarget(null)}
      />
    </Screen>
  );
}
