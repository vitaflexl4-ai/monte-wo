import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  PropsWithChildren,
} from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Alert,
  Linking,
  Platform,
  ImageBackground,
  StyleSheet,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  House,
  Dumbbell,
  BookOpen,
  History,
  UserRound,
  ChevronRight,
  ShieldCheck,
  Trophy,
  Plus,
  LockKeyhole,
  Bell,
  ScanLine,
  Utensils,
  ArrowRight,
  Layers3,
  Barcode,
  ChefHat,
  Sparkles,
  Film,
  Flame,
  ArrowUpRight,
  Activity,
  Camera,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { VideoView, useVideoPlayer } from "expo-video";
import { telemetry } from "./src/telemetry";
import {
  API_BASE,
  request,
  post,
  signIn,
  signOut,
  restoreSession,
  errorMessage,
  authorization,
  onSessionCleared,
  getSessionRevision,
  saveAccountWorkout,
} from "./src/api";
import {
  catalog as bundledCatalog,
  disciplines,
  rankNames,
  ruleFor,
  today,
  workoutSummary,
  Workout,
} from "./src/model";
import {
  C,
  s,
  Card,
  Disclosure,
  Label,
  Body,
  Title,
  Button,
  Field,
  Chips,
  Screen,
  Notice,
  Badge,
  ProgressBar,
} from "./src/ui";

import {
  Brand,
  Glow,
  LiftGlyph,
  disciplineArt,
  CardScrim,
  rankArt,
  WelcomeShade,
} from "./src/art";
import {
  fetchPublicCatalog,
  mediaUri,
  type ExerciseCatalog,
} from "./src/catalog";

import {
  mergeWorkoutLibrary,
  packMediaUri,
  workoutLibrary,
  type PackRecord,
} from "./src/workout-library";
import { workoutPosters } from "./src/workout-posters";
import { ExerciseGrid } from "./src/ExerciseGrid";
import {
  equipmentGroups,
  indexLibrary,
  filterLibrary,
  type LibraryFilters,
} from "./src/library-index";
import { PremiumMuscleMap } from "./src/PremiumMuscleMap";
import {
  selectionFor,
  premiumMap,
  type BodyView,
  type MuscleRegion,
  type MuscleSelection,
} from "./src/muscle-map";
import { deviceWorkouts } from "./src/workout-storage";
import { workoutVolume } from "../../shared/workouts.js";
import { analyzeWorkouts, summarizeMeals } from "../../shared/training-tools.js";
import { interpolateDisciplineLadder } from "../../shared/proposed-climb-scale.js";
import climbDataset from "./src/climb-scale-data.json";
import {
  DEFAULT_CLIMB_PROFILE,
  loadClimbProfile,
  saveClimbProfile,
  loadSelfReportedLifts,
  recordSelfReportedLift,
  removeSelfReportedLift,
  bestCandidateForDiscipline,
  loadDailyFuel,
  type DailyFuelStore,
  type LocalClimbProfile,
  type SelfReportedLift,
} from "./src/device-prefs";
import { RankScreen } from "./src/RankScreen";
import { WorkoutScreen } from "./src/WorkoutScreen";
import { NutritionScreen } from "./src/NutritionScreen";
import { MuscleDefinitionCamera } from "./src/MuscleDefinitionCamera";
import {
  buildUniversalExerciseAtlas,
  loadCustomExercises,
  loadVaultWorkouts,
} from "./src/global-exercises";
import {
  AttachMediaModal,
  ExerciseMediaBanner,
  useMediaVault,
} from "./src/media-vault";

const packPreviewOrigin =
  Platform.OS === "web" &&
  process.env.EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA === "true"
    ? API_BASE
    : undefined;

const volumeLabel = (workout: Workout) => {
  const vol = workoutVolume(workout);
  return `${vol.kg} kg·reps / ${vol.lb} lb·reps`;
};

const FULL_DISCIPLINE_NAMES: Record<string, string> = {
  squat: "Barbell Squat",
  bench: "Barbell Bench Press",
  deadlift: "Barbell Deadlift",
  curl: "Strict Biceps Curl",
};

type AppState = {
  exerciseCatalog: ExerciseCatalog;
  trainingCatalog: ExerciseCatalog;
  catalogStatus: string;
  refreshCatalog: () => Promise<void>;
  me: any;
  workouts: Workout[];
  localWorkouts: Workout[];
  localStatus: string;
  localReady: boolean;
  refreshLocal: () => Promise<void>;
  saveLocal: (workout: Workout) => Promise<void>;
  deleteLocal: (id: string) => Promise<void>;
  localProfile: LocalClimbProfile;
  updateLocalProfile: (next: LocalClimbProfile) => Promise<void>;
  selfLifts: SelfReportedLift[];
  addSelfLift: (input: Parameters<typeof recordSelfReportedLift>[0]) => Promise<SelfReportedLift>;
  deleteSelfLift: (id: string) => Promise<void>;
  next: string | null;
  available: boolean;
  status: string;
  loading: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  logout: () => Promise<void>;
};

const Context = createContext<AppState>(null as any);
const useApp = () => useContext(Context);

function Provider({ children }: PropsWithChildren) {
  const [localWorkouts, setLocalWorkouts] = useState<Workout[]>([]);
  const [localStatus, setLocalStatus] = useState("Loading device history…");
  const [localReady, setLocalReady] = useState(false);

  const [localProfile, setLocalProfile] =
    useState<LocalClimbProfile>(DEFAULT_CLIMB_PROFILE);
  const [selfLifts, setSelfLifts] = useState<SelfReportedLift[]>([]);

  async function refreshLocal() {
    try {
      const result = await deviceWorkouts.list();
      setLocalWorkouts(result.workouts);
      setLocalReady(true);
      setLocalStatus(
        result.warning || "Saved on this device · not synced to an account",
      );
    } catch (error) {
      setLocalReady(false);
      setLocalStatus(errorMessage(error));
    }
  }
  async function saveLocal(workout: Workout) {
    const result = await deviceWorkouts.save(workout);
    setLocalWorkouts(result.workouts);
    setLocalReady(true);
    setLocalStatus(
      result.warning || "Saved on this device · not synced to an account",
    );
  }
  async function deleteLocal(id: string) {
    const result = await deviceWorkouts.remove(id);
    setLocalWorkouts(result.workouts);
    setLocalStatus(
      result.warning || "Deleted from device history and its recovery copy.",
    );
  }

  async function updateLocalProfile(next: LocalClimbProfile) {
    setLocalProfile(next);
    await saveClimbProfile(next);
  }

  async function addSelfLift(
    input: Parameters<typeof recordSelfReportedLift>[0],
  ) {
    const res = await recordSelfReportedLift(input);
    setSelfLifts(res.all);
    return res.record;
  }

  async function deleteSelfLift(id: string) {
    const next = await removeSelfReportedLift(id);
    setSelfLifts(next);
  }

  const [me, setMe] = useState<any>(null),
    [workouts, setWorkouts] = useState<Workout[]>([]),
    [next, setNext] = useState<string | null>(null),
    [available, setAvailable] = useState(false),
    [status, setStatus] = useState("Checking account services…"),
    [loading, setLoading] = useState(false);

  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalog>(
    mergeWorkoutLibrary(bundledCatalog as ExerciseCatalog),
  );
  const [trainingCatalog, setTrainingCatalog] = useState<ExerciseCatalog>(
    bundledCatalog as ExerciseCatalog,
  );
  const [catalogStatus, setCatalogStatus] = useState("Bundled guides");

  async function refreshCatalog() {
    try {
      const result = await fetchPublicCatalog(API_BASE);
      setExerciseCatalog(mergeWorkoutLibrary(result));
      if (!process.env.EXPO_PUBLIC_EXERCISE_CATALOG_URL)
        setTrainingCatalog(result);
      setCatalogStatus("Shared catalog");
    } catch {
      setCatalogStatus((previous) =>
        previous.startsWith("Bundled")
          ? "Bundled guides · remote catalog unavailable"
          : "Last loaded catalog · refresh unavailable",
      );
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const config = await request("/config");
      setAvailable(config.available === true && config.workoutSync === true);
      if (!config.available || !config.workoutSync) {
        setMe(null); setWorkouts([]); setNext(null);
        setStatus(
          "Account services are not configured. Device training, calculators, and Climb Scale preview work offline.",
        );
        return;
      }
      const session = await restoreSession();
      if (!session) {
        setMe(null); setWorkouts([]); setNext(null);
        setStatus("Sign in to your enrolled pilot account to sync training.");
        return;
      }
      const [profile, history] = await Promise.all([
        request("/strength/me"),
        request("/workouts"),
      ]);
      setMe(profile);
      setWorkouts(history.workouts);
      setNext(history.nextCursor);
      setStatus("Connected · private account data");
    } catch (e) {
      setMe(null);
      setWorkouts([]);
      setNext(null);
      setStatus(errorMessage(e));
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!next) return;
    const history = await request(
      "/workouts?before=" + encodeURIComponent(next),
    );
    setWorkouts((previous) => [...previous, ...history.workouts]);
    setNext(history.nextCursor);
  }

  async function logout() {
    try {
      await signOut();
    } finally {
      setMe(null);
      setWorkouts([]);
      setNext(null);
      setStatus("Signed out on this device.");
    }
  }

  useEffect(() => {
    const stop = onSessionCleared(() => {
      setMe(null);
      setWorkouts([]);
      setNext(null);
      setStatus("Session ended. Sign in again to sync.");
    });
    refresh();
    refreshCatalog();
    refreshLocal();
    loadClimbProfile().then((p) => {
      setLocalProfile(p);
      telemetry.setConsent(!!p.telemetryConsent);
      if (p.telemetryConsent) telemetry.sessionStart();
    });
    loadSelfReportedLifts().then(setSelfLifts);
    return stop;
  }, []);

  return (
    <Context.Provider
      value={{
        me,
        exerciseCatalog,
        trainingCatalog,
        catalogStatus,
        refreshCatalog,
        workouts,
        localWorkouts,
        localStatus,
        localReady,
        refreshLocal,
        saveLocal,
        deleteLocal,
        localProfile,
        updateLocalProfile,
        selfLifts,
        addSelfLift,
        deleteSelfLift,
        next,
        available,
        status,
        loading,
        refresh,
        loadMore,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}

function useOperation() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return {
    busy,
    message,
    run: async (fn: () => Promise<void>) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      setMessage("");
      try {
        await fn();
      } catch (e) {
        setMessage(errorMessage(e));
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    setMessage,
  };
}

const confirm = (title: string, message: string, action: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm(title + "\n\n" + message)) action();
  } else
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", style: "destructive", onPress: action },
    ]);
};

const legal = (path: string) => Linking.openURL(API_BASE + path);

function SignInCard({ navigation }: any) {
  const a = useApp();
  return (
    <Card>
      <Label>YOUR PRIVATE TRAINING SPACE</Label>
      <Text style={s.heading}>Keep your work. Own your progress.</Text>
      <Body>{a.status}</Body>
      <Button title="Sign in" onPress={() => navigation.navigate("SignIn")} />
    </Card>
  );
}

function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Label>{eyebrow}</Label>
      <Title>{title}</Title>
      {subtitle && <Body>{subtitle}</Body>}
    </View>
  );
}

const v = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: C.bg },
  welcomeArt: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "76%",
  },
  welcomeInner: {
    flexGrow: 1,
    paddingHorizontal: 27,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
    minHeight: 720,
  },
  welcomeCopy: { gap: 14, marginTop: 260 },
  welcomeTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -0.9,
    color: C.text,
  },
  tagline: {
    fontSize: 10,
    color: "#91b2cc",
    letterSpacing: 1.1,
    fontWeight: "700",
    textAlign: "center",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  iconButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#0a0e16",
  },
  sectionTitle: { fontSize: 16.5, fontWeight: "800", color: C.text },
  subtle: { fontSize: 11.5, color: C.muted, lineHeight: 17 },
  pill: {
    borderWidth: 1,
    borderColor: "#24324a",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
    backgroundColor: "#0d1320",
  },
  pillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#9ccaff",
    letterSpacing: 0.6,
  },
  discipline: {
    width: "47%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1b263b",
    backgroundColor: "#000000",
    overflow: "hidden",
    gap: 10,
    minHeight: 158,
  },
  stat: {
    color: C.text,
    fontSize: 25,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  quick: {
    width: "47%",
    flexGrow: 1,
    minHeight: 96,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1d283d",
    backgroundColor: "#090c12",
    gap: 7,
  },
  tiny: { fontSize: 9.5, color: C.muted },
  rankItem: { width: "18%", alignItems: "center", gap: 3 },
  rankName: { fontSize: 9.5, color: "#b6c9dd", fontWeight: "700" },
  rankImage: { width: 44, height: 44 },
  mediaFrame: {
    height: 210,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#020911",
  },
  subheading: { color: C.text, fontSize: 20, fontWeight: "800" },
  footer: {
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "#10283f",
    alignItems: "center",
    gap: 6,
  },
});

function Welcome({ navigation }: any) {
  return (
    <SafeAreaView
      style={[v.welcome, { width: "100%", maxWidth: 540, alignSelf: "center" }]}
    >
      <ImageBackground
        source={require("./assets/training-hero.jpg")}
        style={v.welcomeArt}
        imageStyle={{ opacity: 0.78, width: "100%", height: "100%" }}
      >
        <WelcomeShade />
      </ImageBackground>
      <Screen transparent>
        <View style={v.welcomeInner}>
          <Brand large />
          <View style={v.welcomeCopy}>
            <Badge text="SERIOUS STRENGTH SPORT" tone="red" />
            <Text style={v.welcomeTitle}>
              Measure. Prove.{"\n"}Earn the Climb.
            </Text>
            <Body style={{ fontSize: 14, color: "#c3d7ec", maxWidth: 320 }}>
              Nine earned ranks across Squat, Bench Press, Deadlift, and Strict Curl. No attendance trophies—only strict performance.
            </Body>
            <View style={{ gap: 11, marginTop: 12 }}>
              <Button
                title="Enter MONTE WO Dashboard"
                onPress={() => navigation.replace("Main")}
              />
              <Button
                title="Sign In to Pilot Account"
                secondary
                onPress={() => navigation.navigate("SignIn")}
              />
            </View>
            <Text style={[v.tagline, { marginTop: 18 }]}>
              LEVE. KLASE. MONTE WO.
            </Text>
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const DISCIPLINE_META: Record<
  string,
  { code: string; tag: string; standard: string; accent: string }
> = {
  squat: {
    code: "01",
    tag: "LOWER · RACK",
    standard: "Hip crease below top of knee · full stand",
    accent: "#38bdf8",
  },
  bench: {
    code: "02",
    tag: "PRESS · BENCH",
    standard: "Controlled chest pause · locked elbows",
    accent: "#60a5fa",
  },
  deadlift: {
    code: "03",
    tag: "PULL · PLATFORM",
    standard: "Dead stop from floor · hips & knees locked",
    accent: "#ff3b5c",
  },
  curl: {
    code: "04",
    tag: "ARMS · STRICT",
    standard: "Zero hip/torso swing · full supinated lockout",
    accent: "#a78bfa",
  },
};

function RankLadder({
  strip = false,
  onOpenRank,
}: {
  strip?: boolean;
  onOpenRank?: () => void;
}) {
  const items = Object.entries(rankNames).map(([id, name], idx) => {
    const elite = idx >= 6;
    return (
      <Pressable
        key={id}
        disabled={!onOpenRank}
        onPress={onOpenRank}
        style={
          strip
            ? {
                minWidth: 82,
                flexGrow: 1,
                alignItems: "center",
                gap: 5,
                backgroundColor: "#000000",
                paddingVertical: 10,
                paddingHorizontal: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: elite ? "#3b1520" : "#162032",
              }
            : v.rankItem
        }
      >
        <Image source={rankArt[id]} style={{ width: 48, height: 48 }} resizeMode="contain" />
        <Text
          style={{
            fontSize: 9,
            color: elite ? "#ff6b81" : C.cyan,
            fontWeight: "900",
            letterSpacing: 0.8,
          }}
        >
          0{idx + 1}
        </Text>
        <Text style={{ fontSize: 10.5, color: "#e2edf8", fontWeight: "800" }}>
          {name}
        </Text>
      </Pressable>
    );
  });

  return (
    <Card
      style={{
        backgroundColor: "#000000",
        borderColor: "#1d293e",
        padding: 18,
        gap: 14,
      }}
    >
      <View style={[s.row, { flexWrap: "wrap" }]}>
        <View style={{ flex: 1, minWidth: 190, gap: 3 }}>
          <Label>RAN FÒ AK KOURAY · 9-RANK CLIMB SCALE</Label>
          <Text style={v.sectionTitle}>01 Debitan → 09 Lejand Progression</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Badge text="07–09 Video Tier" tone="red" />
          {onOpenRank ? (
            <Pressable accessibilityRole="button" onPress={onOpenRank}>
              <Text style={s.link}>Target Table →</Text>
            </Pressable>
          ) : (
            <Layers3 size={18} color={C.cyan} />
          )}
        </View>
      </View>
      {strip ? (
        <ScrollView
          horizontal
          scrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            gap: 8,
            paddingBottom: 2,
            justifyContent: "space-between",
          }}
        >
          {items}
        </ScrollView>
      ) : (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {items}
        </View>
      )}
    </Card>
  );
}

function Home({ navigation }: any) {
  const a = useApp();
  const { mediaMap } = useMediaVault();
  const [vaultTick, setVaultTick] = useState(0);
  const [fuelStore, setFuelStore] = useState<DailyFuelStore | null>(null);

  useEffect(() => {
    let active = true;
    loadDailyFuel()
      .then((res) => {
        if (active) setFuelStore(res);
      })
      .catch(() => {});
    const unsub = navigation.addListener("focus", () => {
      setVaultTick((t) => t + 1);
      loadDailyFuel()
        .then((res) => {
          if (active) setFuelStore(res);
        })
        .catch(() => {});
    });
    return () => {
      active = false;
      unsub();
    };
  }, [navigation]);

  const vaultSessions = useMemo(() => loadVaultWorkouts(), [vaultTick]);
  const atlasCount = useMemo(
    () =>
      buildUniversalExerciseAtlas(
        a.exerciseCatalog,
        a.trainingCatalog,
        loadCustomExercises(),
      ).length,
    [a.exerciseCatalog, a.trainingCatalog, vaultTick],
  );

  const combinedWorkouts = useMemo(
    () => (a.me && a.workouts.length ? a.workouts : a.localWorkouts),
    [a.me, a.workouts, a.localWorkouts],
  );
  const analytics = useMemo(
    () => analyzeWorkouts(combinedWorkouts, today()),
    [combinedWorkouts],
  );

  const totalSessions = Math.max(vaultSessions.length, combinedWorkouts.length);
  const totalSets = Math.max(
    vaultSessions.reduce((sum, sess) => sum + sess.sets.length, 0),
    analytics.weeklySets,
  );
  const latestVault = vaultSessions[0] || null;
  const mediaTotal = workoutLibrary.records.length + Object.keys(mediaMap).length;

  const fuelSummary = useMemo(
    () => summarizeMeals(fuelStore?.meals || []),
    [fuelStore],
  );

  // Compute highest earned self-reported rank across the 4 disciplines
  const rankRollup = useMemo(() => {
    let bestOrd = 0;
    let bestId: string | null = null;
    let bestName = "Unranked";
    let tested = 0;
    for (const d of disciplines) {
      const cand = bestCandidateForDiscipline(a.selfLifts, d.id);
      if (cand) tested += 1;
      const ord = cand?.evaluation?.candidateOrdinal || 0;
      if (ord > bestOrd && cand?.evaluation?.candidateRankId) {
        bestOrd = ord;
        bestId = cand.evaluation.candidateRankId;
        bestName = cand.evaluation.candidateRankName || "Ranked";
      }
    }
    return { bestOrd, bestId, bestName, tested };
  }, [a.selfLifts]);

  const hasBw = Boolean(a.localProfile.bodyweight && a.localProfile.bodyweight.trim());

  const QUICK_LAUNCH = [
    {
      id: "workout-ai",
      label: "AI Split Builder",
      color: "#ff5c74",
      icon: Sparkles,
      onPress: () => navigation.navigate("Train", { section: "generator" }),
    },
    {
      id: "macro-vision",
      label: "Scan Barcode / Meal",
      color: "#38bdf8",
      icon: Barcode,
      onPress: () => navigation.navigate("Nutrition", { section: "scan" }),
    },
    {
      id: "meal-planner",
      label: "Meal Plan AI",
      color: "#f59e0b",
      icon: ChefHat,
      onPress: () => navigation.navigate("Nutrition", { section: "planner" }),
    },
    {
      id: "anatomy",
      label: "Muscle Map",
      color: "#38bdf8",
      icon: ScanLine,
      onPress: () => navigation.navigate("MuscleMap"),
    },
    {
      id: "history",
      label: `History (${totalSessions})`,
      color: "#94a3b8",
      icon: History,
      onPress: () => navigation.navigate("History"),
    },
    {
      id: "vault",
      label: `${atlasCount}+ Exercises (${mediaTotal} clips)`,
      color: "#10b981",
      icon: Film,
      onPress: () => navigation.navigate("Train", { section: "library" }),
    },
  ];

  return (
    <Screen wide>
      {/* Minimal Top Bar */}
      <View style={[v.topbar, { paddingVertical: 4 }]}>
        <Brand />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI Muscle Definition Camera"
            style={[
              v.iconButton,
              {
                width: "auto",
                height: 36,
                paddingHorizontal: 12,
                borderRadius: 999,
                flexDirection: "row",
                gap: 6,
                backgroundColor: "#071322",
                borderColor: "#1a3b63",
              },
            ]}
            onPress={() => navigation.navigate("GainsCamera")}
          >
            <Camera size={15} color={C.cyan} />
            <Text style={{ color: "#e2edf8", fontSize: 11.5, fontWeight: "800" }}>
              Gains Cam
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account and profile"
            style={[v.iconButton, { width: 36, height: 36, borderRadius: 999 }]}
            onPress={() => navigation.navigate("Account")}
          >
            <UserRound size={16} color={C.cyan} />
          </Pressable>
        </View>
      </View>

      {/* Minimal Obsidian Hero + 3-Metric Telemetry Bar */}
      <Card
        accent="red"
        style={{
          padding: 0,
          backgroundColor: "#000000",
          borderColor: "#1b273b",
          borderRadius: 22,
          overflow: "hidden",
        }}
      >
        <View style={{ justifyContent: "space-between" }}>
          <ImageBackground
            source={disciplineArt.deadlift}
            style={[StyleSheet.absoluteFill, { opacity: 0.68 }]}
            imageStyle={{ resizeMode: "cover" }}
          >
            <CardScrim direction="horizontal" />
          </ImageBackground>

          <View style={{ padding: 20, gap: 12, maxWidth: 560 }}>
            <Text
              style={{
                color: "#ff6b81",
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 1.5,
              }}
            >
              LEVE · KLASE · MONTE WO
            </Text>

            <View style={{ gap: 4 }}>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 30,
                  lineHeight: 34,
                  fontWeight: "900",
                  letterSpacing: -0.8,
                }}
              >
                Forged Under{" "}
                <Text style={{ color: "#4cc2ff" }}>Strict Iron.</Text>
              </Text>
              <Text
                style={{
                  color: "#a8b8ce",
                  fontSize: 13,
                  lineHeight: 19,
                  maxWidth: 420,
                }}
              >
                Bodyweight-calibrated strength ranks from Debitan to Lejand across four strict competition lifts.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
              <Button
                title="+ Start Workout"
                onPress={() => navigation.navigate("Train", { section: "logger" })}
              />
              <Button
                crimson
                title="Test Ranked Lift"
                onPress={() => navigation.navigate("Rank")}
              />
            </View>
          </View>

          {/* Clean 3-Stat Telemetry Bar */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              borderTopWidth: 1,
              borderTopColor: "#141e2e",
              backgroundColor: "rgba(4, 6, 11, 0.92)",
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Rank")}
              style={{
                flex: 1,
                minWidth: 150,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
                borderRightWidth: 1,
                borderRightColor: "#121a28",
              }}
            >
              <Image
                source={rankArt[rankRollup.bestId || "debitan"]}
                style={{
                  width: 30,
                  height: 30,
                  opacity: rankRollup.bestId ? 1 : 0.42,
                }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 9.5, fontWeight: "700", letterSpacing: 0.6 }}>
                  PEAK RANK
                </Text>
                <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800" }}>
                  {rankRollup.bestName}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Train", { section: "logger" })}
              style={{
                flex: 1,
                minWidth: 150,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
                borderRightWidth: 1,
                borderRightColor: "#121a28",
              }}
            >
              <Activity size={16} color={C.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 9.5, fontWeight: "700", letterSpacing: 0.6 }}>
                  WORKOUTS
                </Text>
                <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                  {totalSessions} logged · {totalSets} sets
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Nutrition", { section: "log" })}
              style={{
                flex: 1,
                minWidth: 150,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
              }}
            >
              <Flame size={16} color="#ff6b81" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 9.5, fontWeight: "700", letterSpacing: 0.6 }}>
                  TODAY'S FUEL
                </Text>
                <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                  {Math.round(fuelSummary.calories)} kcal · {Math.round(fuelSummary.proteinG)}g P
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Card>

      {/* 4 Ranked Disciplines — Minimal High-Contrast 2x2 Grid */}
      <View style={{ gap: 10 }}>
        <View style={s.row}>
          <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>
            Ranked Disciplines
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Rank")}
          >
            <Text style={s.link}>All 9 Rungs →</Text>
          </Pressable>
        </View>

        <View style={s.grid}>
          {disciplines.map((d) => {
            const meta = DISCIPLINE_META[d.id] || DISCIPLINE_META.squat;
            const selfBest = bestCandidateForDiscipline(a.selfLifts, d.id);
            const rankId = selfBest?.evaluation?.candidateRankId || null;

            const ladder = hasBw
              ? interpolateDisciplineLadder(climbDataset as any, d.id, {
                  bodyweight: a.localProfile.bodyweight.trim(),
                  unit: a.localProfile.unit,
                  sexCategory: a.localProfile.sexCategory,
                  ageYears: a.localProfile.ageYears || 25,
                })
              : null;

            const currentOrd = selfBest?.evaluation?.candidateOrdinal || 0;
            const nextRung =
              ladder?.ok
                ? ladder.rungs.find((r: any) => r.ordinal === currentOrd + 1) ||
                  ladder.rungs[ladder.rungs.length - 1]
                : null;
            const nextTargetLabel = nextRung
              ? a.localProfile.unit === "lb"
                ? `${nextRung.requiredLb} lb`
                : `${nextRung.requiredKg} kg`
              : null;

            const pctToNext =
              selfBest?.evaluation?.performedKg && nextRung?.requiredKg
                ? Math.min(
                    100,
                    Math.round(
                      (selfBest.evaluation.performedKg / nextRung.requiredKg) * 100,
                    ),
                  )
                : 0;

            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={FULL_DISCIPLINE_NAMES[d.id] + " discipline"}
                onPress={() => navigation.navigate("Rank", { discipline: d.id })}
                style={({ pressed }) => ({
                  width: "47%",
                  flexGrow: 1,
                  minWidth: 230,
                  minHeight: 156,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: rankId ? "#244a85" : "#162032",
                  backgroundColor: "#000000",
                  overflow: "hidden",
                  justifyContent: "space-between",
                  padding: 14,
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <ImageBackground
                  source={disciplineArt[d.id]}
                  style={[StyleSheet.absoluteFill, { opacity: 0.78 }]}
                  imageStyle={{ resizeMode: "cover" }}
                >
                  <CardScrim direction="vertical" />
                </ImageBackground>

                <View style={s.row}>
                  <LiftGlyph id={d.id} size={19} color={meta.accent} />
                  <Image
                    source={rankArt[rankId || "debitan"]}
                    style={{
                      width: 34,
                      height: 34,
                      opacity: rankId ? 1 : 0.38,
                    }}
                    resizeMode="contain"
                  />
                </View>

                <View style={{ gap: 6, marginTop: 22 }}>
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 16.5,
                      fontWeight: "800",
                      letterSpacing: -0.2,
                    }}
                  >
                    {FULL_DISCIPLINE_NAMES[d.id]}
                  </Text>

                  {selfBest ? (
                    <View style={{ gap: 5 }}>
                      <Text
                        style={{
                          color: meta.accent,
                          fontSize: 13,
                          fontWeight: "800",
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {selfBest.evaluation.candidateRankName || "Logged"} ·{" "}
                        {selfBest.load} {selfBest.unit}
                      </Text>
                      {nextRung ? (
                        <ProgressBar percent={pctToNext} color={meta.accent} height={4} />
                      ) : null}
                    </View>
                  ) : (
                    <View style={s.row}>
                      <Text style={{ color: "#9fb2cc", fontSize: 11.5, fontWeight: "600" }}>
                        {nextRung && nextTargetLabel
                          ? `Debitan: ${nextTargetLabel}`
                          : "Unranked · Test 1RM"}
                      </Text>
                      <ArrowUpRight size={14} color={meta.accent} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Clean Horizontal Quick-Launch Strip (Replaces Verbose Multi-Card Walls) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {QUICK_LAUNCH.map((item) => {
          const IconComp = item.icon;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: "#080c14",
                borderWidth: 1,
                borderColor: "#182334",
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <IconComp size={14} color={item.color} />
              <Text style={{ color: "#dce8f6", fontSize: 12, fontWeight: "700" }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tucked-Away Progressive Disclosure: 9-Rank Climb Scale & Studio Overview */}
      <Disclosure
        title="9-Rank Climb Scale & Studio Tools"
        summary={
          latestVault
            ? `01 Debitan → 09 Lejand · Last session: ${latestVault.title}`
            : "01 Debitan → 09 Lejand · Tap to preview all 9 crests & tools"
        }
        badge={`${rankRollup.tested}/4 Tested`}
        badgeTone={rankRollup.tested > 0 ? "blue" : "muted"}
      >
        <RankLadder strip onOpenRank={() => navigation.navigate("Rank")} />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button
            small
            secondary
            title="AI Gains Camera & 9:16 Story"
            onPress={() => navigation.navigate("GainsCamera")}
          />
          <Button
            small
            secondary
            title="Interactive Muscle Map"
            onPress={() => navigation.navigate("MuscleMap")}
          />
          <Button
            small
            secondary
            title="Plate Calculator"
            onPress={() => navigation.navigate("Train", { section: "tools" })}
          />
        </View>
      </Disclosure>
    </Screen>
  );
}

function TrainTabWrapper({ navigation, route }: any) {
  const a = useApp();
  const op = useOperation();
  // An optional external media manifest is browsing-only; saving uses the
  // canonical backend exercise IDs, not unregistered third-party records.
  const catalog = process.env.EXPO_PUBLIC_EXERCISE_CATALOG_URL
    ? (bundledCatalog as ExerciseCatalog)
    : a.trainingCatalog;

  return (
    <WorkoutScreen
      navigation={navigation}
      route={route}
      trainingCatalog={catalog}
      exerciseCatalog={a.exerciseCatalog}
      me={a.me}
      localWorkouts={a.localWorkouts}
      localStatus={a.localStatus}
      localReady={a.localReady}
      saveLocal={a.saveLocal}
      deleteLocal={a.deleteLocal}
      onCopyToAccount={(w) =>
        confirm("Save this workout to your account?", "This uploads a copy to your signed-in account.", () =>
          op.run(async () => {
            const revision = getSessionRevision();
            await saveAccountWorkout(w, a.me, revision);
            await a.refresh();
          }),
        )
      }
    />
  );
}

function RankTabWrapper({ navigation, route }: any) {
  const a = useApp();
  return (
    <RankScreen
      navigation={navigation}
      route={route}
      me={a.me}
      localProfile={a.localProfile}
      onSaveProfile={a.updateLocalProfile}
      selfLifts={a.selfLifts}
      onRecordLift={a.addSelfLift}
      onDeleteLift={a.deleteSelfLift}
    />
  );
}

function NutritionTabWrapper({ route }: any) {
  return <NutritionScreen route={route} />;
}

function GainsCameraScreen() {
  const a = useApp();
  let bestOrd = 0;
  for (const d of disciplines) {
    const cand = bestCandidateForDiscipline(a.selfLifts, d.id);
    if ((cand?.evaluation?.candidateOrdinal || 0) > bestOrd) {
      bestOrd = cand?.evaluation?.candidateOrdinal || 0;
    }
  }
  return (
    <Screen wide>
      <MuscleDefinitionCamera
        earnedRankOrdinal={bestOrd || 7}
        disciplineLabel="4 Ranked Disciplines"
      />
    </Screen>
  );
}

function MuscleMap({ navigation }: any) {
  const a = useApp(),
    [selected, setSelected] = useState<string | null>(null),
    [view, setView] = useState<BodyView>("f");
  const region = premiumMap.regions.find((r) => r.id === selected),
    group = a.exerciseCatalog.groups.find((g) => g.id === selected),
    count = a.exerciseCatalog.exercises.filter(
      (e) => e.group === selected,
    ).length;
  const select = (event: MuscleSelection) => {
    setSelected(event.muscle);
    if (Platform.OS === "web")
      window.dispatchEvent(new CustomEvent("muscleselect", { detail: event }));
  };
  const changeView = (id: string) => {
    setView(id === "back" ? "b" : "f");
    setSelected(null);
  };
  return (
    <Screen wide>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Label>EXPLORE YOUR MOVEMENT</Label>
          <Title>Muscle map</Title>
          <Body>Choose a region. Find your next movement.</Body>
        </View>
        <View style={v.pill}>
          <Text style={v.pillText}>VISUAL PREVIEW</Text>
        </View>
      </View>
      <View style={{ alignItems: "center" }}>
        <Chips
          items={[
            { id: "front", name: "Front view" },
            { id: "back", name: "Back view" },
          ]}
          value={view === "f" ? "front" : "back"}
          onChange={changeView}
        />
      </View>
      <Card style={{ padding: 14, borderRadius: 20, borderColor: "#214a78" }}>
        <PremiumMuscleMap
          view={view}
          selected={region && region.paths[view] ? region.id : null}
          onSelect={select}
        />
      </Card>
      <Card>
        <View style={s.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityLiveRegion="polite" style={v.subheading}>
              {group?.name || "Select a muscle region"}
            </Text>
            <Text style={v.subtle}>
              {selected
                ? count + " exercises in the current catalog"
                : "Tap the avatar or a region card to begin."}
            </Text>
            {region && (
              <Text style={{ fontSize: 11, color: region.color }}>
                Example palette: {rankNames[region.tierId]} · not an earned rank
              </Text>
            )}
          </View>
          <Button
            title="Explore →"
            disabled={!selected}
            onPress={() =>
              navigation.popTo("Main", {
                screen: "Library",
                params: { group: selected, source: "all" },
              })
            }
          />
        </View>
      </Card>
      <Text style={v.sectionTitle}>All exercise groups</Text>
      <Chips
        items={a.exerciseCatalog.groups}
        value={selected || ""}
        onChange={(id) => {
          if (id === "back") setView("b");
          else if (id === "chest") setView("f");
          setSelected(id);
          if (["arms", "legs", "core", "chest", "back"].includes(id)) {
            const nextView = id === "back" ? "b" : id === "chest" ? "f" : view;
            if (Platform.OS === "web")
              window.dispatchEvent(
                new CustomEvent("muscleselect", {
                  detail: selectionFor(id as MuscleRegion, nextView),
                }),
              );
          }
        }}
      />
      <Notice text="Example tiers from the premium design—not your achievements. Muscle regions do not award ranks. Your four Discipline Ranks still require qualifying performances under approved standards." />
      <RankLadder strip />
      <Text style={[v.tagline, { marginBottom: 8 }]}>
        9 RANKS · 5 MUSCLE REGIONS · 4 DISCIPLINES
      </Text>
      <Text style={v.subtle}>
        Imported SVG targets from main · {premiumMap.source.commit.slice(0, 7)}.
        Schematic navigation artwork, not exercise-form instruction.
      </Text>
    </Screen>
  );
}

function Notifications() {
  return (
    <Screen>
      <PageHeader eyebrow="NOTIFICATIONS" title="A quieter kind of focus." />
      <Card>
        <Bell size={32} color={C.cyan} />
        <Text style={v.subheading}>No notification service connected.</Text>
        <Body>
          No invented activity, achievements or social notifications. Your
          actual training record stays in History.
        </Body>
      </Card>
    </Screen>
  );
}

function SignIn({ navigation }: any) {
  const a = useApp(),
    op = useOperation();
  return (
    <Screen>
      <View style={{ alignItems: "center", paddingVertical: 18 }}>
        <Brand large />
      </View>
      <PageHeader
        eyebrow="ONE ACCOUNT. EVERY PLATFORM."
        title="Your next chapter starts here."
        subtitle="Keep your training and performance history together."
      />
      <Card>
        <View style={s.row}>
          <LockKeyhole size={25} color={C.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={v.sectionTitle}>Secure account access</Text>
            <Text style={v.subtle}>
              Your password stays with your identity provider.
            </Text>
          </View>
        </View>
        <Button
          title="Continue to secure sign-in"
          busy={op.busy}
          disabled={!a.available}
          onPress={() =>
            op.run(async () => {
              await signIn();
              await a.refresh();
              navigation.replace("Main");
            })
          }
        />
        <Text style={v.subtle}>
          Opens your system browser. This pilot uses the existing enrolled
          accounts; public Google/Apple signup is not configured.
        </Text>
      </Card>
      <Notice text={a.status} />
      <Button
        title="Check connection again"
        secondary
        busy={a.loading}
        onPress={a.refresh}
      />
      <Button
        title="Website connection status"
        secondary
        onPress={() => legal("/app/#app-connections")}
      />
      <Text style={v.subtle}>
        Shared API: {API_BASE}. Device-only history is not automatically uploaded
        or merged into an account.
      </Text>
      {op.message && <Notice text={op.message} error />}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.replace("Main")}
        style={{ padding: 13, alignItems: "center" }}
      >
        <Text style={s.link}>Explore the app first →</Text>
      </Pressable>
      <View style={v.footer}>
        <Text style={v.subtle}>Need pilot access?</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Linking.openURL(
              "mailto:Montewo@vitaflexbusinessgroup.com?subject=MONTE%20WO%20pilot%20access",
            )
          }
        >
          <Text style={s.link}>Contact VitaFlex Business Group</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Library({ navigation, route }: any) {
  const a = useApp(),
    catalog = a.exerciseCatalog,
    op = useOperation();
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState(route.params?.group || "all"),
    [source, setSource] = useState(route.params?.source || "all"),
    [equipment, setEquipment] = useState("all"),
    [sort, setSort] = useState<LibraryFilters["sort"]>("az"),
    [equipmentOpen, setEquipmentOpen] = useState(false);
  useEffect(() => {
    if (route.params?.group) setGroup(route.params.group);
    setSource(route.params?.source || "all");
  }, [route.params?.group, route.params?.source]);
  const index = useMemo(() => indexLibrary(catalog.exercises), [catalog]);
  const rows = useMemo(
    () => filterLibrary(index, { query, group, source, equipment, sort }),
    [index, query, group, source, equipment, sort],
  );
  const packCount = catalog.exercises.filter((e) => e.pack).length,
    guideCount = catalog.exercises.filter((e) => e.steps.length).length,
    overlapCount = catalog.exercises.filter(
      (e) => e.pack && e.steps.length,
    ).length;
  const reset = () => {
    setQuery("");
    setGroup("all");
    setSource("all");
    setEquipment("all");
    setSort("az");
    setEquipmentOpen(false);
  };
  const filtered =
    !!query ||
    group !== "all" ||
    source !== "all" ||
    equipment !== "all" ||
    sort !== "az";
  return (
    <Screen wide>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label>EXPLORE</Label>
          <Title>Movement Library</Title>
          <Text style={v.subtle}>
            {rows.length} of {catalog.exercises.length} movements · {packCount} animations · {guideCount} guides
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open muscle map"
          style={v.iconButton}
          onPress={() => navigation.navigate("MuscleMap")}
        >
          <ScanLine size={20} color={C.cyan} />
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Field
          label=""
          placeholder="Search exercises or muscles…"
          value={query}
          onChange={setQuery}
        />
        <Chips
          items={[{ id: "all", name: "All" }, ...catalog.groups]}
          value={group}
          onChange={setGroup}
        />
      </View>

      <Disclosure
        title="More Filters & Catalog Info"
        summary={
          filtered
            ? `Active filters · ${source === "all" ? "All sources" : source} · ${equipment === "all" ? "Any equipment" : equipment}`
            : `Filter by source, equipment, sort (${overlapCount} shared) & provenance`
        }
        badge={filtered ? "Filtered" : undefined}
        badgeTone="blue"
      >
        <View style={{ gap: 8 }}>
          <Text style={s.fieldLabel}>Source</Text>
          <Chips
            items={[
              { id: "all", name: "All sources" },
              { id: "pack", name: "Pack animations" },
              { id: "guides", name: "Written guides" },
            ]}
            value={source}
            onChange={setSource}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.fieldLabel}>Equipment</Text>
          <Chips
            items={equipmentGroups}
            value={equipment}
            onChange={setEquipment}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Sort " + (sort === "az" ? "Z to A" : "A to Z")}
            onPress={() => setSort(sort === "az" ? "za" : "az")}
            style={s.chip}
          >
            <Text style={s.chipText}>Sort: {sort === "az" ? "A → Z" : "Z → A"}</Text>
          </Pressable>
          {filtered && (
            <Pressable
              accessibilityRole="button"
              onPress={reset}
              style={[s.chip, { borderColor: "#375d7c" }]}
            >
              <Text style={[s.chipText, { color: C.cyan }]}>Reset filters</Text>
            </Pressable>
          )}
        </View>
        <View
          style={{
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#141d2b",
            gap: 8,
          }}
        >
          <Text style={v.subtle}>
            Pinned GitHub source: {workoutLibrary.source.commit.slice(0, 7)}.{" "}
            {a.catalogStatus}.
          </Text>
          <Button
            small
            title="Refresh shared catalog"
            secondary
            busy={op.busy}
            onPress={() => op.run(a.refreshCatalog)}
          />
        </View>
      </Disclosure>

      <ExerciseGrid
        exercises={rows}
        onOpen={(id) => navigation.navigate("Exercise", { id })}
        apiBase={API_BASE}
      />
      {!rows.length && (
        <Card>
          <Text style={v.sectionTitle}>No matching movements.</Text>
          <Body>
            Try a shorter search or reset the muscle, source and equipment
            filters.
          </Body>
          <Button title="Clear search and filters" secondary onPress={reset} />
        </Card>
      )}
    </Screen>
  );
}

function PublicExerciseVideo({
  uri,
  loop = false,
  large = false,
}: {
  uri: string;
  loop?: boolean;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
  });
  useEffect(() => {
    const subscription = player.addListener("statusChange", (event) => {
      if (event.status === "error") setFailed(true);
    });
    return () => subscription.remove();
  }, [player]);
  return failed ? (
    <Notice text="Video could not load. The source metadata and any available written guide remain below." />
  ) : (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{
        width: "100%",
        height: large ? 360 : 220,
        position: "relative",
        zIndex: 1,
      }}
    />
  );
}

function PackAnimation({ pack }: { pack: PackRecord }) {
  const [kind, setKind] = useState<"poster" | "demo" | "loop">("poster");
  const m = pack.manifest;
  return (
    <Card style={{ padding: 12 }}>
      <View style={s.row}>
        <Label>SOURCE PACK ANIMATION</Label>
        <Text style={v.subtle}>720 × 936 · {m.fps} fps</Text>
      </View>
      {kind === "poster" ? (
        <Image
          source={workoutPosters[m.id]}
          accessibilityLabel={m.name_en + " animation poster"}
          style={{ width: "100%", height: 320, borderRadius: 9 }}
          resizeMode="contain"
        />
      ) : (
        <PublicExerciseVideo
          key={kind}
          uri={packMediaUri(pack, kind, packPreviewOrigin)}
          loop={kind === "loop"}
          large
        />
      )}
      <Chips
        items={[
          { id: "poster", name: "Poster" },
          { id: "demo", name: "Demo · " + m.demo_duration_s + "s" },
          { id: "loop", name: "Loop · " + m.loop_duration_s + "s" },
        ]}
        value={kind}
        onChange={(id) => setKind(id as any)}
      />
      <Text style={v.subtle}>
        Illustrated movement preview—not a form-verified coaching demonstration.
        Source pack: {pack.packages.join(" / ")}.
      </Text>
    </Card>
  );
}

function Exercise({ navigation, route }: any) {
  const a = useApp(),
    { mediaMap } = useMediaVault(),
    [attachOpen, setAttachOpen] = useState(false),
    e = a.exerciseCatalog.exercises.find((e) => e.id === route.params.id);
  const [failed, setFailed] = useState(false);
  if (!e)
    return (
      <Screen>
        <Notice text="Exercise not found." error />
      </Screen>
    );
  const uri = mediaUri(e, API_BASE),
    registered = a.trainingCatalog.exercises.some((x) => x.id === e.id),
    customMedia = mediaMap[e.id] || null;
  return (
    <Screen>
      <PageHeader
        eyebrow={e.equipment.toUpperCase()}
        title={e.name}
        subtitle={e.muscles.join(" · ")}
      />
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Button
          small
          title="+ Log in Active Workout"
          onPress={() =>
            navigation.popTo("Main", {
              screen: "Train",
              params: { section: "logger", exercise: e.id },
            })
          }
        />
        <Button
          small
          secondary
          title={customMedia ? "Edit Attached MP4 / GIF" : "+ Attach MP4 / GIF"}
          onPress={() => setAttachOpen(true)}
        />
      </View>
      {customMedia ? (
        <ExerciseMediaBanner
          exerciseId={e.id}
          exerciseName={e.name}
          customMedia={customMedia}
          height={260}
          onManageMedia={() => setAttachOpen(true)}
        />
      ) : e.pack ? (
        <PackAnimation pack={e.pack} />
      ) : uri && !failed ? (
        <View style={v.mediaFrame}>
          {e.media?.type === "video" ? (
            <PublicExerciseVideo uri={uri} />
          ) : (
            <Image
              source={{ uri }}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
              onError={() => setFailed(true)}
            />
          )}
        </View>
      ) : (
        <Card style={{ alignItems: "center", paddingVertical: 20 }}>
          <LiftGlyph
            id={
              e.group === "chest"
                ? "bench"
                : e.group === "legs"
                  ? "squat"
                  : e.group === "arms"
                    ? "curl"
                    : "deadlift"
            }
            size={74}
          />
          <Text style={v.subtle}>
            {failed
              ? "Demonstration could not load."
              : "Written guide · demonstration not linked"}
          </Text>
          <Text style={v.tiny}>Icon is not a form demonstration.</Text>
        </Card>
      )}
      {e.steps.length > 0 ? (
        <>
          <Card>
            <Label>HOW TO APPROACH IT</Label>
            {e.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    height: 24,
                    width: 24,
                    borderRadius: 7,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0b2b49",
                  }}
                >
                  <Text
                    style={{ color: C.cyan, fontSize: 11, fontWeight: "700" }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Body style={{ flex: 1 }}>{step}</Body>
              </View>
            ))}
          </Card>
          <Card>
            <Label>KEEP IN MIND</Label>
            <Body>{e.cue}</Body>
          </Card>
          <Card>
            <Label>MAKE IT MORE MANAGEABLE</Label>
            <Body>{e.easier}</Body>
          </Card>
          <Notice text={e.safety} />
        </>
      ) : (
        <Notice text="This pack supplies movement metadata and animation, not written technique or safety instructions. Those instructions still need review; none have been fabricated." />
      )}
      {!registered && (
        <Text style={v.subtle}>
          Browse-only exercise on shared cloud sync · full logging & media vault enabled on this device.
        </Text>
      )}
      <AttachMediaModal
        visible={attachOpen}
        exerciseId={e.id}
        exerciseName={e.name}
        existing={customMedia}
        onClose={() => setAttachOpen(false)}
      />
    </Screen>
  );
}

function HistoryScreen({ navigation }: any) {
  const catalog = useApp().exerciseCatalog;
  const a = useApp(),
    op = useOperation(),
    [tab, setTab] = useState("device");
  return (
    <Screen>
      <PageHeader eyebrow="YOUR RECORD" title="History, with context." />
      <Chips
        items={[
          { id: "device", name: "On this device" },
          { id: "workouts", name: "Account workouts" },
          { id: "performances", name: "Performances" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "device" ? (
        <>
          <Notice text={a.localStatus} />
          <Body>
            Device-only history stays separate from signed-in accounts, is not
            encrypted by MONTE WO, and never awards ranks.
          </Body>
          <Button
            title="Refresh device history"
            secondary
            busy={op.busy}
            onPress={() => op.run(a.refreshLocal)}
          />
          {!a.me && (
            <Button
              title="Sign in to copy a workout"
              secondary
              onPress={() => navigation.navigate("SignIn")}
            />
          )}
          {a.localReady && !a.localWorkouts.length && (
            <Notice text="No workouts saved on this device yet. Finish a session in Workout to start your history." />
          )}
          {a.localWorkouts.map((w) => (
            <Card key={w.id}>
              <Label>DEVICE COPY · NO AUTO-SYNC</Label>
              <Text style={s.heading}>{w.title}</Text>
              <Body>
                {w.performedOn} · {workoutSummary(w)}
              </Body>
              <Body>{volumeLabel(w)}</Body>
              {w.exercises.map((e) => (
                <Body key={e.exerciseId}>
                  {catalog.exercises.find((x) => x.id === e.exerciseId)?.name ||
                    e.exerciseId}
                  :{" "}
                  {e.sets
                    .map((set) => `${set.load} ${set.unit} × ${set.reps}`)
                    .join(" · ")}
                </Body>
              ))}
              <Body>Workout ID: {w.id}</Body>
              <Button
                title="Save a copy to account"
                secondary
                busy={op.busy}
                disabled={!a.me || !a.available}
                onPress={() => {
                  const revision = getSessionRevision();
                  confirm("Save this workout to your account?",
                    `Send this one workout to account ${a.me?.actor?.id || "currently signed in"} at ${API_BASE}? The device copy stays here. No other device workouts will be uploaded and no rank will be awarded.`,
                    () =>
                      op.run(async () => {
                        await saveAccountWorkout(w, new Set(a.trainingCatalog.exercises.map((e) => e.id)), revision);
                        await a.refresh();
                        op.setMessage(
                          "Account copy confirmed. The device record was kept. No rank was awarded.",
                        );
                      }),
                  );
                }}
              />
              <Button
                title="Delete device workout"
                danger
                secondary
                busy={op.busy}
                onPress={() =>
                  confirm(
                    "Delete this device workout?",
                    "Removes it from local history and its recovery copy. Cloud account records are not changed.",
                    () =>
                      op.run(async () => {
                        await a.deleteLocal(w.id);
                      }),
                  )
                }
              />
            </Card>
          ))}
        </>
      ) : !a.me ? (
        <SignInCard navigation={navigation} />
      ) : tab === "workouts" ? (
        <>
          <Body>
            Account: {a.me.actor?.id || "Signed in"} · API: {API_BASE}
          </Body>
          <Button
            title="Refresh account workouts"
            secondary
            busy={a.loading || op.busy}
            onPress={() => op.run(a.refresh)}
          />
          {!a.workouts.length && (
            <Notice text="No workouts saved yet. Your next session starts the record." />
          )}
          {a.workouts.map((w) => (
            <Card key={w.id}>
              <View style={s.row}>
                <Text style={s.heading}>{w.title}</Text>
                <Text style={s.small}>{w.performedOn}</Text>
              </View>
              <Body>{workoutSummary(w)}</Body>
              {w.exercises.map((e) => (
                <Body key={e.exerciseId}>
                  {catalog.exercises.find((x) => x.id === e.exerciseId)?.name}:{" "}
                  {e.sets
                    .map((st) => `${st.load} ${st.unit} × ${st.reps}`)
                    .join(" · ")}
                </Body>
              ))}
              <Button
                title="Delete workout"
                danger
                secondary
                onPress={() =>
                  confirm(
                    "Delete this workout?",
                    "This does not erase separately submitted performance or review history.",
                    () =>
                      op.run(async () => {
                        await request("/workouts/" + w.id, {
                          method: "DELETE",
                        });
                        await a.refresh();
                      }),
                  )
                }
              />
            </Card>
          ))}
          {a.next && (
            <Button
              title="Load older workouts"
              secondary
              busy={op.busy}
              onPress={() => op.run(a.loadMore)}
            />
          )}
        </>
      ) : (
        <>
          {!a.me.performances?.length && (
            <Notice text="No performances submitted. Draft standards cannot grant official ranks." />
          )}
          {a.me.performances?.map((p: any) => (
            <Card key={p.id}>
              <Label>
                {disciplines.find((d) => d.id === p.discipline)?.name}
              </Label>
              <Text style={s.heading}>
                {p.data.load} {p.data.unit} × {p.data.reps}
              </Text>
              <Body>
                {p.data.performedOn} ·{" "}
                {p.data.resultType === "tested"
                  ? "Tested single"
                  : "Estimated performance"}
              </Body>
              <Body>
                {a.me.results?.find((r: any) => r.performance_id === p.id)?.data
                  ?.explanation || "Awaiting assessment"}
              </Body>
              <Button
                title="Attach private MP4 evidence"
                secondary
                busy={op.busy}
                onPress={() =>
                  op.run(async () => {
                    const picked = await DocumentPicker.getDocumentAsync({
                      type: "video/mp4",
                      copyToCacheDirectory: true,
                    });
                    if (picked.canceled) return;
                    const asset = picked.assets[0];
                    if ((asset.size || 0) > 20971520)
                      throw Error("Evidence must be no larger than 20 MiB.");
                    let body: any;
                    let local: File | undefined;
                    try {
                      if (Platform.OS === "web") {
                        body = asset.file;
                        if (!body) throw Error("Cannot read selected file.");
                      } else {
                        local = new File(asset.uri);
                        if (local.size > 20971520)
                          throw Error(
                            "Evidence must be no larger than 20 MiB.",
                          );
                        body = await local.bytes();
                      }
                      await request(
                        "/strength/performances/" + p.id + "/evidence",
                        {
                          method: "POST",
                          headers: { "Content-Type": "video/mp4" },
                          body,
                        },
                      );
                      await a.refresh();
                      op.setMessage(
                        "Evidence uploaded privately. This is pending review, not verification.",
                      );
                    } finally {
                      if (local) {
                        try {
                          local.delete();
                        } catch {}
                      }
                    }
                  })
                }
              />
            </Card>
          ))}
        </>
      )}
      {op.message && <Notice text={op.message} error />}
    </Screen>
  );
}

function Performance({ navigation }: any) {
  const a = useApp(),
    op = useOperation(),
    [discipline, setDiscipline] = useState("squat"),
    [load, setLoad] = useState(""),
    [unit, setUnit] = useState("kg"),
    [reps, setReps] = useState("1"),
    [kind, setKind] = useState("tested"),
    [date, setDate] = useState(today()),
    [checks, setChecks] = useState<Record<string, boolean>>({});
  const rule =
    a.me?.disciplines?.find((c: any) => c.discipline === discipline)
      ?.rulebook || ruleFor(discipline);
  return (
    <Screen>
      <PageHeader
        eyebrow="PILOT SERVER SUBMISSION"
        title="Submit enrolled performance."
        subtitle="For device-local Climb Scale tracking without pilot sign-in, use the Rank tab."
      />
      <Notice text="DRAFT — NOT OFFICIAL. Server submissions require an enrolled pilot account. Official ranks remain unavailable until standards are approved." />
      <Button
        title="← Back to Climb Scale (Device Self-Report)"
        secondary
        onPress={() =>
          navigation.navigate("Main", {
            screen: "Rank",
            params: { discipline },
          })
        }
      />
      {!a.me ? (
        <SignInCard navigation={navigation} />
      ) : !a.me.profile ? (
        <Button
          title="Create your profile first"
          onPress={() => navigation.navigate("Profile")}
        />
      ) : (
        <Card>
          <DisciplinePicker
            value={discipline}
            onChange={(id) => {
              setDiscipline(id);
              setChecks({});
            }}
          />
          <Chips
            items={[
              { id: "tested", name: "Tested single" },
              { id: "estimated", name: "Estimated 1RM" },
            ]}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setReps(k === "tested" ? "1" : "");
            }}
          />
          <Field
            label="Load lifted"
            value={load}
            onChange={setLoad}
            keyboardType="decimal-pad"
          />
          <Chips
            items={[
              { id: "kg", name: "kg" },
              { id: "lb", name: "lb" },
            ]}
            value={unit}
            onChange={setUnit}
          />
          <Field
            label="Repetitions · single = 1; estimate = 2–10"
            value={reps}
            onChange={setReps}
            keyboardType="number-pad"
          />
          <Field
            label="Performed on · YYYY-MM-DD"
            value={date}
            onChange={setDate}
          />
          <Label>MONTE STANDARD · {rule.variation}</Label>
          {rule.checks.map((c: any) => (
            <Check
              key={c.id}
              checked={!!checks[c.id]}
              onChange={() => setChecks((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
              text={c.text}
            />
          ))}
          <Button
            title="Submit performance"
            busy={op.busy}
            onPress={() =>
              op.run(async () => {
                const p = a.me.profile.data;
                await post("/strength/performances", {
                  discipline,
                  load,
                  unit,
                  reps: Number(reps),
                  resultType: kind,
                  performedOn: date,
                  bodyweight: p.bodyweight,
                  bodyweightUnit: p.unit,
                  sexCategory: p.sexCategory,
                  ageYears: p.ageYears,
                  variation: rule.variation,
                  equipment: rule.equipment[0],
                  checks: Object.fromEntries(
                    rule.checks.map((c: any) => [c.id, !!checks[c.id]]),
                  ),
                });
                await a.refresh();
                op.setMessage(
                  "Performance recorded. See history for its server assessment.",
                );
                setLoad("");
                setChecks({});
              })
            }
          />
        </Card>
      )}
      {op.message && <Notice text={op.message} />}
    </Screen>
  );
}

function DisciplinePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 7 }}>
      {disciplines.map((d) => (
        <Pressable
          key={d.id}
          accessibilityRole="button"
          accessibilityState={{ selected: value === d.id }}
          accessibilityLabel={d.name}
          onPress={() => onChange(d.id)}
          style={{
            flex: 1,
            paddingVertical: 9,
            alignItems: "center",
            gap: 4,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: value === d.id ? C.cyan : C.border,
            backgroundColor: value === d.id ? "#083b64" : "#06101d",
          }}
        >
          <LiftGlyph
            id={d.id}
            size={30}
            color={value === d.id ? C.cyan : "#aac5dc"}
          />
          <Text style={{ fontSize: 10, color: C.text }}>
            {d.id === "bench" ? "Bench" : d.id === "curl" ? "Curl" : d.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Check({
  checked,
  onChange,
  text,
}: {
  checked: boolean;
  onChange: () => void;
  text: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onChange}
      style={{ flexDirection: "row", gap: 12, paddingVertical: 8 }}
    >
      <View
        style={{
          width: 23,
          height: 23,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: checked ? C.blue : C.muted,
          backgroundColor: checked ? C.blue : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: C.text }}>{checked ? "✓" : ""}</Text>
      </View>
      <Body style={{ flex: 1 }}>{text}</Body>
    </Pressable>
  );
}

function Discipline({ route, navigation }: any) {
  const id = route.params?.id || "squat";
  return (
    <RankTabWrapper
      navigation={navigation}
      route={{ params: { discipline: id } }}
    />
  );
}

function Profile() {
  const a = useApp(),
    op = useOperation(),
    p = a.me?.profile?.data,
    [weight, setWeight] = useState(p?.bodyweight || a.localProfile.bodyweight || ""),
    [age, setAge] = useState(
      p?.ageYears ? String(p.ageYears) : a.localProfile.ageYears || "",
    ),
    [unit, setUnit] = useState<"kg" | "lb">(p?.unit || a.localProfile.unit || "kg"),
    [category, setCategory] = useState<"male" | "female" | "unclassified">(
      p?.sexCategory || a.localProfile.sexCategory || "male",
    );
  return (
    <Screen>
      <PageHeader
        eyebrow="PROFILE SNAPSHOT"
        title="Your reference details."
        subtitle="Used for bodyweight-adjusted Climb Scale targets. Never awards a rank automatically."
      />
      <Card>
        <Field
          label="Bodyweight"
          value={weight}
          onChange={setWeight}
          keyboardType="decimal-pad"
        />
        <Chips
          items={[
            { id: "kg", name: "kg" },
            { id: "lb", name: "lb" },
          ]}
          value={unit}
          onChange={(u) => setUnit(u as "kg" | "lb")}
        />
        <Field
          label="Age · supported range 18–100"
          value={age}
          onChange={setAge}
          keyboardType="number-pad"
        />
        <Label>REFERENCE CATEGORY</Label>
        <Chips
          items={[
            { id: "male", name: "Male reference" },
            { id: "female", name: "Female reference" },
            { id: "unclassified", name: "Open reference" },
          ]}
          value={category}
          onChange={(c) => setCategory(c as any)}
        />
        <Button
          title="Save on this device"
          onPress={() =>
            op.run(async () => {
              await a.updateLocalProfile({
                ...a.localProfile,
                bodyweight: weight.trim(),
                unit,
                sexCategory: category,
                ageYears: age.trim(),
              });
              op.setMessage("Device reference saved. No rank was awarded.");
            })
          }
        />
        <Button
          title="Save pilot account profile revision"
          secondary
          disabled={!a.me}
          busy={op.busy}
          onPress={() =>
            op.run(async () => {
              await post("/strength/profiles", {
                profile: {
                  bodyweight: weight,
                  unit,
                  sexCategory: category,
                  ageYears: Number(age),
                },
                reason: "Athlete updated profile in MONTE WO app.",
              });
              await a.refresh();
              op.setMessage(
                "Profile revision saved. No rank was awarded by this change.",
              );
            })
          }
        />
        {op.message && <Notice text={op.message} />}
      </Card>
    </Screen>
  );
}

function Account({ navigation }: any) {
  const a = useApp(),
    op = useOperation();
  return (
    <Screen>
      <PageHeader eyebrow="YOUR ACCOUNT & PREFERENCES" title="Private by default." />
      <Card accent="blue">
        <Label>ATHLETE DEVICE REFERENCE</Label>
        <Body>
          Bodyweight:{" "}
          {a.localProfile.bodyweight
            ? `${a.localProfile.bodyweight} ${a.localProfile.unit}`
            : "Not set"}{" "}
          · Self-reported Climb checks: {a.selfLifts.length}
        </Body>
        <Button
          title="Edit Athlete Reference"
          onPress={() => navigation.navigate("Profile")}
        />
        <Button
          title="Open Welcome Screen"
          secondary
          onPress={() => navigation.navigate("Welcome")}
        />
      </Card>

      {!a.me ? (
        <SignInCard navigation={navigation} />
      ) : (
        <Card>
          <Label>CONNECTED ACCOUNT</Label>
          <Body>Role: {a.me.actor.role}</Body>
          {["reviewer", "admin"].includes(a.me.actor.role) && (
            <Button
              title="Verification queue"
              secondary
              onPress={() => navigation.navigate("Reviews")}
            />
          )}
          <Button
            title="Refresh private data"
            secondary
            busy={a.loading}
            onPress={a.refresh}
          />
          <Button
            title="Sign out"
            secondary
            busy={op.busy}
            onPress={() => op.run(a.logout)}
          />
        </Card>
      )}
      <Card>
        <Label>ARGON APP DIAGNOSTICS (OPT-IN)</Label>
        <Body>
          {a.localProfile.telemetryConsent
            ? "Enabled: anonymous crash, HTTP error, and interaction latency codes help ARGON protect app reliability. Never sends workouts, identity, or location."
            : "Off by default. Enable only if you want anonymous crash and error codes sent to MONTE WO engineering."}
        </Body>
        <Button
          title={a.localProfile.telemetryConsent ? "Disable anonymous diagnostics" : "Enable anonymous diagnostics"}
          secondary
          onPress={async () => {
            const next = !a.localProfile.telemetryConsent;
            await a.updateLocalProfile({ ...a.localProfile, telemetryConsent: next });
            telemetry.setConsent(next);
            if (next) telemetry.sessionStart();
          }}
        />
      </Card>
      <Card>
        <Label>YOUR DATA, YOUR CHOICE</Label>
        <Body>
          Private training records and evidence are not public leaderboard
          entries. No social publishing is enabled.
        </Body>
        <Button
          title="Privacy policy"
          secondary
          onPress={() => legal("/privacy/")}
        />
        <Button
          title="Terms of use"
          secondary
          onPress={() => legal("/terms/")}
        />
        <Button
          title="Request account deletion"
          danger
          secondary
          disabled={!a.me}
          busy={op.busy}
          onPress={() =>
            confirm(
              "Request account deletion?",
              "This submits a tracked request for operator processing. It does not claim immediate erasure of records or backups.",
              () =>
                op.run(async () => {
                  const r = await post("/account/deletion-request", {
                    confirm: "DELETE MY ACCOUNT",
                  });
                  op.setMessage(r.message + " Reference: " + r.id);
                }),
            )
          }
        />
        {op.message && <Notice text={op.message} />}
      </Card>
    </Screen>
  );
}

function Reviews({ navigation }: any) {
  const a = useApp(),
    op = useOperation(),
    [rows, setRows] = useState<any[]>([]);
  async function load() {
    setRows(await request("/strength/admin/queue"));
  }
  useEffect(() => {
    if (a.me && ["reviewer", "admin"].includes(a.me.actor.role)) op.run(load);
  }, []);
  return (
    <Screen>
      <PageHeader
        eyebrow="AUTHORIZED REVIEWERS ONLY"
        title="Verification queue."
        subtitle="Review evidence against its exact rulebook. No self-approval."
      />
      {!a.me || !["reviewer", "admin"].includes(a.me.actor.role) ? (
        <Notice text="Reviewer authorization is required." error />
      ) : (
        <>
          <Button
            title="Refresh queue"
            secondary
            busy={op.busy}
            onPress={() => op.run(load)}
          />
          {rows.map((r) => (
            <Pressable
              key={r.id}
              style={s.card}
              accessibilityRole="button"
              onPress={() => navigation.navigate("Review", { record: r })}
            >
              <Label>
                {r.state.toUpperCase()} · REVISION {r.revision}
              </Label>
              <Text style={s.heading}>
                {disciplines.find((d) => d.id === r.discipline)?.name}
              </Text>
              <Body>
                {JSON.parse(r.performance).load}{" "}
                {JSON.parse(r.performance).unit} ·{" "}
                {JSON.parse(r.performance).performedOn}
              </Body>
              <Text style={s.link}>Review evidence →</Text>
            </Pressable>
          ))}
          {!rows.length && !op.busy && <Body>No decisions loaded.</Body>}
        </>
      )}
      {op.message && <Notice text={op.message} error />}
    </Screen>
  );
}

function EvidenceVideo({ id }: { id: string }) {
  const player = useVideoPlayer(
    {
      uri: API_BASE + "/api/mobile/strength/evidence/" + encodeURIComponent(id),
      headers: authorization(),
    },
    (p) => {
      p.loop = false;
    },
  );
  return (
    <VideoView
      player={player}
      nativeControls
      style={{ width: "100%", height: 250, borderRadius: 12 }}
    />
  );
}

function Review({ route, navigation }: any) {
  const a = useApp(),
    op = useOperation(),
    r = route.params.record,
    rule = JSON.parse(r.rulebook),
    [checks, setChecks] = useState<Record<string, boolean>>({}),
    [reason, setReason] = useState("");
  const self = a.me?.actor.id === r.athlete_id;
  const items = [
    ...rule.checks,
    ...["identity", "date", "load", "bodyweight", "continuousVideo"].map(
      (id) => ({ id, text: "Confirm " + id }),
    ),
  ];
  return (
    <Screen>
      <PageHeader
        eyebrow="PRIVATE EVIDENCE"
        title="Review, not a shortcut."
        subtitle={r.rulebook_id}
      />
      <EvidenceVideo id={r.evidence_id} />
      {self && <Notice text="You cannot review your own submission." error />}
      <Card>
        {items.map((c: any) => (
          <Check
            key={c.id}
            checked={!!checks[c.id]}
            text={c.text}
            onChange={() => setChecks((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
          />
        ))}
        <Field
          label="Decision reason · required"
          value={reason}
          onChange={setReason}
          multiline
        />
        {["approved", "flagged", "rejected"].map((state) => (
          <Button
            key={state}
            title={
              state === "approved"
                ? "Approve against published standard"
                : state === "flagged"
                  ? "Flag for follow-up"
                  : "Reject evidence"
            }
            secondary={state !== "approved"}
            disabled={
              self ||
              !reason.trim() ||
              (state === "approved" && !items.every((c: any) => checks[c.id]))
            }
            busy={op.busy}
            onPress={() =>
              op.run(async () => {
                await post("/strength/reviews", {
                  performanceId: r.performance_id,
                  evidenceId: r.evidence_id,
                  expectedRevision: r.revision,
                  state,
                  checks: Object.fromEntries(
                    items.map((c: any) => [c.id, !!checks[c.id]]),
                  ),
                  reason,
                });
                await a.refresh();
                navigation.goBack();
              })
            }
          />
        ))}
      </Card>
      {op.message && <Notice text={op.message} error />}
    </Screen>
  );
}

const Tab = createBottomTabNavigator(),
  Stack = createNativeStackNavigator();

function Tabs() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#000000",
            borderTopColor: "#1a2436",
            borderTopWidth: 1,
            height: 68 + insets.bottom,
            paddingBottom: 10 + insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700" },
          tabBarActiveTintColor: route.name === "Rank" ? C.red : C.cyan,
          tabBarInactiveTintColor: C.muted,
          tabBarIcon: ({ color, size }) => {
            const Icon = (
              {
                Home: House,
                Train: Dumbbell,
                Rank: Trophy,
                Nutrition: Utensils,
                Library: BookOpen,
              } as any
            )[route.name] || ShieldCheck;
            return <Icon color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen
          name="Train"
          component={TrainTabWrapper}
          options={{ title: "Workout" }}
        />
        <Tab.Screen
          name="Rank"
          component={RankTabWrapper}
          options={{ title: "Rank" }}
        />
        <Tab.Screen
          name="Nutrition"
          component={NutritionTabWrapper}
          options={{ title: "Nutrition" }}
        />
        <Tab.Screen
          name="Library"
          component={Library}
          options={{ title: "Explore" }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

class Boundary extends React.Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          justifyContent: "center",
          padding: 30,
        }}
      >
        <Title>Something went wrong.</Title>
        <Body>
          No successful save is assumed. Restart the app and check your history
          before retrying.
        </Body>
        <Button
          title="Try again"
          onPress={() => this.setState({ failed: false })}
        />
      </View>
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Boundary>
        <Provider>
          <View
            style={{
              flex: 1,
              backgroundColor: "#000000",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flex: 1,
                width: "100%",
                maxWidth: Platform.OS === "web" ? 900 : 900,
                borderLeftWidth: Platform.OS === "web" ? 1 : 0,
                borderRightWidth: Platform.OS === "web" ? 1 : 0,
                borderColor: "#141d2c",
              }}
            >
              <NavigationContainer
                theme={{
                  ...DarkTheme,
                  colors: {
                    ...DarkTheme.colors,
                    background: C.bg,
                    card: C.bg,
                    text: C.text,
                    border: C.border,
                    primary: C.blue,
                  },
                }}
              >
                <Stack.Navigator
                  initialRouteName="Main"
                  screenOptions={{
                    headerStyle: { backgroundColor: C.bg },
                    headerTintColor: C.text,
                    contentStyle: { backgroundColor: C.bg },
                  }}
                >
                  <Stack.Screen
                    name="Main"
                    component={Tabs}
                    options={{
                      headerShown: false,
                      title: "MONTE WO",
                      headerTitleStyle: { fontWeight: "800" },
                    }}
                  />
                  <Stack.Screen
                    name="Welcome"
                    component={Welcome}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="History"
                    component={HistoryScreen}
                    options={{ title: "Training history" }}
                  />
                  <Stack.Screen
                    name="Account"
                    component={Account}
                    options={{ title: "Account & profile" }}
                  />
                  <Stack.Screen
                    name="MuscleMap"
                    component={MuscleMap}
                    options={{ title: "Muscle map" }}
                  />
                  <Stack.Screen
                    name="GainsCamera"
                    component={GainsCameraScreen}
                    options={{ title: "AI Muscle Definition Camera" }}
                  />
                  <Stack.Screen
                    name="Notifications"
                    component={Notifications}
                    options={{ title: "Notifications" }}
                  />
                  <Stack.Screen
                    name="SignIn"
                    component={SignIn}
                    options={{ title: "Secure sign-in" }}
                  />
                  <Stack.Screen
                    name="Exercise"
                    component={Exercise}
                    options={{ title: "Exercise guide" }}
                  />
                  <Stack.Screen
                    name="Discipline"
                    component={Discipline}
                    options={{ title: "Discipline Rank" }}
                  />
                  <Stack.Screen
                    name="Performance"
                    component={Performance}
                    options={{ title: "Pilot server submission" }}
                  />
                  <Stack.Screen
                    name="Profile"
                    component={Profile}
                    options={{ title: "Athlete profile" }}
                  />
                  <Stack.Screen
                    name="Reviews"
                    component={Reviews}
                    options={{ title: "Verification" }}
                  />
                  <Stack.Screen
                    name="Review"
                    component={Review}
                    options={{ title: "Evidence review" }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </View>
          </View>
        </Provider>
      </Boundary>
    </SafeAreaProvider>
  );
}
