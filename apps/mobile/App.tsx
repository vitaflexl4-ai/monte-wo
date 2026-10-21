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
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  ScrollView,
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAudioPlayer } from "expo-audio";
import * as SecureStore from "expo-secure-store";
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
  Flame,
  Heart,
  Timer,
  Plus,
  LockKeyhole,
  Bell,
  ScanLine,
  Utensils,
  ArrowRight,
  Layers3,
} from "lucide-react-native";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { VideoView, useVideoPlayer } from "expo-video";
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
  Label,
  Body,
  Title,
  Button,
  Field,
  Chips,
  Screen,
  Notice,
} from "./src/ui";

import { Brand, Glow, LiftGlyph, rankArt, WelcomeShade } from "./src/art";
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
const packPreviewOrigin =
  Platform.OS === "web" &&
  process.env.EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA === "true"
    ? API_BASE
    : undefined;

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

import {deviceWorkouts} from "./src/workout-storage";
import {validateSet, validateWorkout, workoutVolume} from "../../shared/workouts.js";

const volumeLabel = (workout: Workout) => {
  const v = workoutVolume(workout);
  return `${v.kg} kg·reps / ${v.lb} lb·reps`;
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
  async function refreshLocal() {
    try {
      const result = await deviceWorkouts.list();
      setLocalWorkouts(result.workouts);
      setLocalReady(true);
      setLocalStatus(result.warning || "Saved on this device · not synced to an account");
    } catch (error) {
      setLocalReady(false);
      setLocalStatus(errorMessage(error));
    }
  }
  async function saveLocal(workout: Workout) {
    const result = await deviceWorkouts.save(workout);
    setLocalWorkouts(result.workouts);
    setLocalReady(true);
    setLocalStatus(result.warning || "Saved on this device · not synced to an account");
  }
  async function deleteLocal(id: string) {
    const result = await deviceWorkouts.remove(id);
    setLocalWorkouts(result.workouts);
    setLocalStatus(result.warning || "Deleted from device history and its recovery copy.");
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
          "Account services are not configured. The exercise library is available offline.",
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
        localWorkouts, localStatus, localReady, refreshLocal, saveLocal, deleteLocal,
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
    <View style={{ gap: 9 }}>
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
  welcomeCopy: { gap: 14, marginTop: 270 },
  welcomeTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: -0.9,
    color: C.text,
  },
  tagline: {
    fontSize: 10,
    color: "#91b2cc",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#061321",
  },
  greeting: { fontSize: 12, color: C.muted },
  welcomeName: {
    color: C.text,
    fontWeight: "800",
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  subtle: { fontSize: 10, color: C.muted, lineHeight: 16 },
  pill: {
    borderWidth: 1,
    borderColor: "#284866",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignSelf: "flex-start",
    backgroundColor: "#0b2137",
  },
  pillText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#b2cee6",
    letterSpacing: 0.5,
  },
  discipline: {
    width: "47%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#1e4d78",
    backgroundColor: "#04101d",
    overflow: "hidden",
    gap: 10,
    minHeight: 172,
  },
  stat: { color: C.text, fontSize: 24, fontWeight: "700" },
  quick: {
    flex: 1,
    minHeight: 105,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#051322",
    gap: 8,
  },
  tiny: { fontSize: 9, color: C.muted },
  rankItem: { width: "18%", alignItems: "center", gap: 3 },
  rankName: { fontSize: 9, color: "#a4b7ca" },
  rankImage: { width: 44, height: 44 },
  atlasButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: C.border,
    backgroundColor: "#08172a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseThumb: {
    width: 58,
    height: 64,
    borderRadius: 9,
    backgroundColor: "#0a2037",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1b3d60",
  },
  mediaFrame: {
    height: 210,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#020911",
  },
  subheading: { color: C.text, fontSize: 21, fontWeight: "700" },
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
  const player = useAudioPlayer(require("./assets/onboarding-sting.wav"));
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  async function readPreference(key: string) {
    if (Platform.OS === "web") return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  }
  async function writePreference(key: string, value: string) {
    if (Platform.OS === "web") {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      readPreference("montewo.onboarding.completed.v1"),
      readPreference("montewo.onboarding.sound.v1"),
      readPreference("montewo.onboarding.haptics.v1"),
    ]).then(([completed, sound, haptics]) => {
      if (!active) return;
      if (sound !== null) setSoundEnabled(sound !== "0");
      if (haptics !== null) setHapticsEnabled(haptics !== "0");
      if (completed === "1") navigation.replace("Main");
      else setChecking(false);
    }).catch(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [navigation]);

  function transitionCue() {
    if (hapticsEnabled) {
      try { Vibration.vibrate([0, 28, 18, 48]); } catch {}
    }
    if (soundEnabled) {
      try {
        void player.seekTo(0).then(() => player.play()).catch(() => {});
      } catch {}
    }
  }

  async function finish() {
    if (hapticsEnabled) {
      try { Vibration.vibrate(45); } catch {}
    }
    try {
      await Promise.all([
        writePreference("montewo.onboarding.completed.v1", "1"),
        writePreference("montewo.onboarding.sound.v1", soundEnabled ? "1" : "0"),
        writePreference("montewo.onboarding.haptics.v1", hapticsEnabled ? "1" : "0"),
      ]);
    } catch {
      // A storage failure must not prevent a guest from using the app.
    }
    navigation.replace("Main");
  }

  if (checking) {
    return (
      <SafeAreaView style={[v.welcome, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={C.cyan} size="large" />
      </SafeAreaView>
    );
  }

  const pages = [
    {
      eyebrow: "WELCOME TO THE CLIMB",
      title: "Your strength.\nYour next level.",
      body: "MONTE WO is your training record: every session, every lift, every step you can prove.",
    },
    {
      eyebrow: "TRAIN WITH INTENTION",
      title: "Record the work.\nKeep the proof.",
      body: "Log sets, load and repetitions. Your workout history is separate from performance assessments. Account sync works only when you sign in and the secure shared service is enabled.",
    },
    {
      eyebrow: "RANKS ARE EARNED",
      title: "Measure. Prove.\nClimb higher.",
      body: "Squat, Bench Press, Deadlift and Biceps Curl have independent ranks. Training volume alone never awards a rank; qualifying performances are assessed against approved standards, and verification is separate. Current standards remain draft until formally approved.",
    },
  ];
  const page = pages[step];

  return (
    <SafeAreaView
      style={[v.welcome, { width: "100%", maxWidth: 500, alignSelf: "center" }]}
    >
      <ImageBackground
        source={require("./assets/training-hero.jpg")}
        style={v.welcomeArt}
        imageStyle={{ opacity: 0.8, width: "100%", height: "100%" }}
      >
        <WelcomeShade />
      </ImageBackground>
      <Screen transparent>
        <View style={v.welcomeInner}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Brand large />
            <View style={{ gap: 7, alignItems: "flex-end" }}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: soundEnabled }}
                accessibilityLabel="Onboarding sound"
                onPress={() => setSoundEnabled((value) => !value)}
                style={[v.iconButton, { width: 106, borderRadius: 9, flexDirection: "row", gap: 6 }]}
              >
                <Text style={{ color: C.text, fontSize: 10, fontWeight: "700" }}>
                  SOUND {soundEnabled ? "ON" : "OFF"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: hapticsEnabled }}
                accessibilityLabel="Onboarding vibration"
                onPress={() => setHapticsEnabled((value) => !value)}
                style={[v.iconButton, { width: 106, borderRadius: 9, flexDirection: "row", gap: 6 }]}
              >
                <Text style={{ color: C.text, fontSize: 10, fontWeight: "700" }}>
                  HAPTICS {hapticsEnabled ? "ON" : "OFF"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={v.welcomeCopy}>
            <Label>{page.eyebrow} · {step + 1} / {pages.length}</Label>
            <Text style={v.welcomeTitle}>{page.title}</Text>
            <Body style={{ fontSize: 14, color: "#b9cde1", maxWidth: 320 }}>
              {page.body}
            </Body>
            {step === 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {["TRAIN", "RECORD", "PROVE", "CLIMB"].map((label) => (
                  <View key={label} style={[v.pill, { borderColor: "#2468a0", backgroundColor: "#06182b" }]}>
                    <Text style={[v.pillText, { color: "#d4eaff" }]}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : step === 1 ? (
              <Card style={{ gap: 11 }}>
                {[
                  ["01", "Log every set", "Keep the load, reps and session date."],
                  ["02", "Own your history", "Device records stay local until you choose an account transfer."],
                  ["03", "Sync when connected", "New workouts sync automatically after sign-in when the secure account service is enabled."],
                ].map(([number, title, detail]) => (
                  <View key={number} style={{ flexDirection: "row", gap: 11, alignItems: "flex-start" }}>
                    <Text style={{ color: C.cyan, fontSize: 12, fontWeight: "800" }}>{number}</Text>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ color: C.text, fontWeight: "700" }}>{title}</Text>
                      <Text style={v.subtle}>{detail}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <Card style={{ borderColor: "#2468a0", gap: 10 }}>
                <Text style={{ color: C.cyan, fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>
                  NINE RANKS · FOUR DISCIPLINES
                </Text>
                <RankLadder strip />
                <Text style={v.subtle}>
                  No fabricated rank, no combined score, and no automatic award for workout volume.
                </Text>
              </Card>
            )}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 4 }}>
              {pages.map((_, index) => (
                <View key={index} style={{ height: 4, width: index === step ? 28 : 8, borderRadius: 4, backgroundColor: index === step ? C.cyan : "#36506a" }} />
              ))}
            </View>
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button
                title={step === 2 ? "Enter MONTE WO" : step === 0 ? "Begin your climb" : "Continue"}
                onPress={() => {
                  if (step < 2) {
                    transitionCue();
                    setStep((value) => value + 1);
                  } else {
                    void finish();
                  }
                }}
              />
              {step === 0 ? (
                <Button title="Explore without setup" secondary onPress={() => void finish()} />
              ) : (
                <Button title="Back" secondary onPress={() => setStep((value) => Math.max(0, value - 1))} />
              )}
            </View>
            <Text style={[v.tagline, { marginTop: 8 }]}>Leve. Klase. Monte Wo.</Text>
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}
function RankLadder({ strip = false }: { strip?: boolean }) {
  const items = Object.entries(rankNames).map(([id, name]) => (
    <View
      key={id}
      style={
        strip
          ? { minWidth: 64, flexGrow: 1, alignItems: "center", gap: 3 }
          : v.rankItem
      }
    >
      <Image source={rankArt[id]} style={v.rankImage} resizeMode="contain" />
      <Text style={v.rankName}>{name}</Text>
    </View>
  ));
  return (
    <Card>
      <View style={s.row}>
        <Text style={v.sectionTitle}>The climb has nine names.</Text>
        <Layers3 size={16} color={C.cyan} />
      </View>
      {strip ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{
            flexGrow: 1,
            gap: 8,
            paddingBottom: 8,
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
            gap: 7,
            justifyContent: "center",
          }}
        >
          {items}
        </View>
      )}
      <Text style={v.subtle}>
        Rank ladder only—not your achievements. Each discipline is independent.
      </Text>
    </Card>
  );
}
function Home({ navigation }: any) {
  const a = useApp();
  return (
    <Screen>
      <View style={v.topbar}>
        <Brand />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification status"
            style={v.iconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Bell size={18} color="#a2c8e9" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account"
            style={v.iconButton}
            onPress={() => navigation.navigate("Account")}
          >
            <UserRound size={18} color={C.cyan} />
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 5 }}>
        <Text style={v.greeting}>
          {a.me ? "Welcome back." : "Welcome to the climb."}
        </Text>
        <Text style={v.welcomeName}>Your strength. Your story.</Text>
        <Text style={{ fontSize: 12, color: "#8cc7ec" }}>
          Make the work count. One discipline at a time.
        </Text>
      </View>
      <Card style={{ padding: 0, borderColor: "#17558a", minHeight: 142 }}>
        <ImageBackground
          source={require("./assets/training-hero.jpg")}
          style={{
            position: "absolute",
            right: -5,
            top: -35,
            width: 180,
            height: 230,
          }}
          imageStyle={{ opacity: 0.46 }}
        />
        <View style={{ padding: 16, gap: 9, maxWidth: "72%" }}>
          <Label>YOUR NEXT CHAPTER</Label>
          <Text
            style={{
              color: C.text,
              fontSize: 21,
              lineHeight: 26,
              fontWeight: "800",
            }}
          >
            Show up. Lift.{"\n"}Leave a record.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Train")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 5,
            }}
          >
            <View
              style={{
                width: 27,
                height: 27,
                borderRadius: 8,
                backgroundColor: "#087fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} color="white" />
            </View>
            <Text style={{ color: "#d3e9ff", fontWeight: "700", fontSize: 12 }}>
              Start a workout
            </Text>
            <ArrowRight size={15} color={C.cyan} />
          </Pressable>
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open workout pack library"
        onPress={() =>
          navigation.navigate("Library", { source: "pack", group: "all" })
        }
        style={[s.card, s.row, { padding: 13 }]}
      >
        <Image
          source={workoutPosters["back-squat"]}
          style={{ width: 47, height: 61, borderRadius: 8 }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Label>YOUR WORKOUT LIBRARY</Label>
          <Text style={v.sectionTitle}>
            {workoutLibrary.records.length} exercise animations
          </Text>
          <Text style={v.subtle}>
            8 categories · demo + loop · source packs
          </Text>
        </View>
        <ChevronRight size={20} color={C.cyan} />
      </Pressable>
      <View style={s.row}>
        <Text style={v.sectionTitle}>Your Discipline Ranks</Text>
        <View style={v.pill}>
          <Text style={v.pillText}>DRAFT STANDARDS</Text>
        </View>
      </View>
      <View style={s.grid}>
        {disciplines.map((d) => {
          const card = a.me?.disciplines?.find(
            (c: any) => c.discipline === d.id,
          );
          const approved = card?.modelApproved && card?.ruleApproved;
          const rank = approved ? card.verified || card.provisional : null;
          const perf =
            rank &&
            a.me.performances?.find((p: any) => p.id === rank.performanceId);
          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={d.name + " discipline"}
              style={v.discipline}
              onPress={() => navigation.navigate("Discipline", { id: d.id })}
            >
              <Glow />
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <LiftGlyph id={d.id} size={35} />
                <Text
                  style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  {d.name}
                </Text>
              </View>
              <View style={v.pill}>
                <Text style={v.pillText}>
                  {rank ? rankNames[rank.rankId] : "NOT RANKED"}
                </Text>
              </View>
              <Text style={{ fontSize: 21, fontWeight: "700", color: C.text }}>
                {perf ? perf.data.load + " " + perf.data.unit : "—"}
              </Text>
              <Text style={v.subtle}>
                {rank?.status === "verified"
                  ? "MONTE Verified"
                  : rank
                    ? "Provisional · self-reported"
                    : "No verified performance"}
              </Text>
              {rank && rank.next?.rankId && typeof rank.progress === "number" && (
                <View style={{ gap: 4, width: "100%" }}>
                  <Text style={v.tiny}>
                    {Math.floor(rank.progress)}% to {rankNames[rank.next.rankId]}
                  </Text>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityLabel={"Progress toward " + rankNames[rank.next.rankId]}
                    accessibilityValue={{ min: 0, max: 100, now: Math.floor(rank.progress) }}
                    style={{ height: 5, borderRadius: 5, backgroundColor: "#142b40", overflow: "hidden" }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.max(0, Math.min(99, Math.floor(rank.progress)))}%` as `${number}%`,
                        borderRadius: 5,
                        backgroundColor: C.cyan,
                      }}
                    />
                  </View>
                </View>
              )}
              {rank?.rankId === "lejand" && (
                <Text style={v.tiny}>Highest discipline rank</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={v.subtle}>
        MONTE WO Strength Index™ · DRAFT — NOT OFFICIAL. No combined score or
        overall rank.
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          style={v.quick}
          accessibilityRole="button"
          onPress={() => navigation.navigate("MuscleMap")}
        >
          <ScanLine color={C.cyan} size={23} />
          <Text style={v.sectionTitle}>Muscle map</Text>
          <Text style={v.subtle}>Find your next movement ↗</Text>
        </Pressable>
        <Pressable
          style={v.quick}
          accessibilityRole="button"
          onPress={() => navigation.navigate("Performance")}
        >
          <ShieldCheck color={C.cyan} size={23} />
          <Text style={v.sectionTitle}>Log a performance</Text>
          <Text style={v.subtle}>Measure it. Keep the proof ↗</Text>
        </Pressable>
      </View>
      <Card>
        <View style={s.row}>
          <Text style={v.sectionTitle}>Your training, at a glance</Text>
          <History size={17} color={C.cyan} />
        </View>
        <View style={{ flexDirection: "row", gap: 15 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={v.stat}>{a.localReady ? a.localWorkouts.length : "—"}</Text>
            <Text style={v.subtle}>Sessions saved on this device</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={v.stat}>4</Text>
            <Text style={v.subtle}>Independent disciplines</Text>
          </View>
        </View>
      </Card>
      <RankLadder />
      <View style={s.row}>
        <Text style={v.sectionTitle}>Health connections</Text>
        <Text style={v.subtle}>NOT CONNECTED</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          [Flame, "Calories"],
          [Timer, "Active minutes"],
          [Heart, "Heart rate"],
        ].map(([Icon, label]: any) => (
          <Card key={label} style={{ flex: 1, padding: 11, gap: 8 }}>
            <Icon size={18} color={C.muted} />
            <Text style={{ color: C.text, fontSize: 23 }}>—</Text>
            <Text style={v.tiny}>{label}</Text>
          </Card>
        ))}
      </View>
      <Pressable
        style={[s.card, s.row]}
        accessibilityRole="button"
        onPress={() => navigation.navigate("Nutrition")}
      >
        <Utensils size={24} color={C.cyan} />
        <View style={{ flex: 1 }}>
          <Text style={v.sectionTitle}>Fuel your training</Text>
          <Body>Explore the existing nutrition tools.</Body>
        </View>
        <ChevronRight size={18} color={C.cyan} />
      </Pressable>
      {!a.me && (
        <View style={{ gap: 10 }}>
          <Button
            title="Sign in to sync your training"
            onPress={() => navigation.navigate("SignIn")}
          />
          <Text style={[v.subtle, { textAlign: "center" }]}>
            Device training available · account sync requires pilot enrollment.
          </Text>
        </View>
      )}
      <View style={v.footer}>
        <Brand />
        <Text style={v.tagline}>MEASURE. PROVE. RANK. CLIMB.</Text>
      </View>
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
function Nutrition() {
  return (
    <Screen>
      <PageHeader
        eyebrow="FUEL YOUR TRAINING"
        title="Make room for recovery."
        subtitle="Existing educational tools. No invented daily totals."
      />
      {[
        ["protein", "Protein target"],
        ["tdee", "Daily energy estimate"],
        ["macros", "Macro planning"],
      ].map(([id, name]) => (
        <Card key={id} style={[s.row, { alignItems: "center" }]}>
          <Utensils size={23} color={C.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={v.sectionTitle}>{name}</Text>
            <Body>Native calculator planned. This screen does not open a website.</Body>
          </View>
        </Card>
      ))}
      <Card>
        <ScanLine size={30} color={C.muted} />
        <Text style={v.subheading}>Food scan</Text>
        <Body>
          Not connected. Camera-based food recognition and a synced food diary
          are not available in this build. No macros are guessed from a photo.
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
      <View style={{ alignItems: "center", paddingVertical: 22 }}>
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
      <Text style={v.subtle}>Shared account service: {a.available ? "enabled" : "not enabled"}. Device-only history is not automatically uploaded or merged into an account.</Text>
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
function Train({ navigation }: any) {
  const a = useApp(),
    op = useOperation();
  // An optional external media manifest is browsing-only; saving uses the
  // canonical backend exercise IDs, not unregistered third-party records.
  const catalog = process.env.EXPO_PUBLIC_EXERCISE_CATALOG_URL
    ? bundledCatalog
    : a.trainingCatalog;
  const [id, setId] = useState(() => Crypto.randomUUID()),
    [title, setTitle] = useState("Training session"),
    [date, setDate] = useState(today()),
    [selected, setSelected] = useState("bench-press"),
    [load, setLoad] = useState(""),
    [reps, setReps] = useState(""),
    [unit, setUnit] = useState<"kg" | "lb">("kg"),
    [entries, setEntries] = useState<Workout["exercises"]>([]),
    [search, setSearch] = useState("");
  function payload(): Workout {
    return validateWorkout({id, title, performedOn: date, exercises: entries},
      new Set(catalog.exercises.map(e => e.id)), today());
  }
  function resetSession() {
    setEntries([]);
    setId(Crypto.randomUUID());
    setLoad(""); setReps(""); setDate(today());
  }
  function add() {
    if (op.busy) return;
    try {
      if (!/^\d+$/.test(reps)) throw Error("Enter 1–1000 whole repetitions.");
      const set = validateSet({load, reps: Number(reps), unit});
      const found = entries.find(e => e.exerciseId === selected);
      if (found && found.sets.length >= 20) throw Error("Maximum 20 sets per exercise. Finish this workout before adding more.");
      if (!found && entries.length >= 30) throw Error("Maximum 30 exercises per workout.");
      setEntries(previous => {
        const next = previous.map(e => ({...e, sets: [...e.sets]}));
        const existing = next.find(e => e.exerciseId === selected);
        if (existing) existing.sets.push(set);
        else next.push({exerciseId: selected, sets: [set]});
        return next;
      });
      op.setMessage("Set added. Finish and save to keep it after closing the app.");
    } catch (error) { op.setMessage(errorMessage(error)); }
  }
  return (
    <Screen>
      <PageHeader
        eyebrow="TRAINING LOG"
        title="Every set counts."
        subtitle="Workout volume is a training record—not a rank qualification."
      />
      <Notice text="Finish and save to keep this workout on this device. Unfinished sets are not persisted. Device history is not account-synced or encrypted by MONTE WO; anyone using this device can view it. Uninstalling the app or clearing browser storage can erase it." />
      <Notice text={a.localStatus} />
<View style={{gap: 14}} pointerEvents={op.busy ? "none" : "auto"} accessibilityElementsHidden={op.busy} importantForAccessibility={op.busy ? "no-hide-descendants" : "auto"}>
      <Card>
        <Field editable={!op.busy} label="Session name" value={title} onChange={setTitle} />
        <Field editable={!op.busy} label="Date · YYYY-MM-DD" value={date} onChange={setDate} />
        <Field editable={!op.busy} label="Find an exercise" value={search} onChange={setSearch} />
        <Chips
          items={catalog.exercises
            .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
            .map((e) => ({ id: e.id, name: e.name }))}
          value={selected}
          onChange={setSelected}
        />
        <Chips
          items={[
            { id: "kg", name: "kg" },
            { id: "lb", name: "lb" },
          ]}
          value={unit}
          onChange={(v) => setUnit(v as "kg" | "lb")}
        />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field editable={!op.busy}
              label={"Load · " + unit}
              value={load}
              onChange={setLoad}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field editable={!op.busy}
              label="Repetitions"
              value={reps}
              onChange={setReps}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Button title="Add set" secondary onPress={add} />
      </Card>
      {entries.map((e) => (
        <Card key={e.exerciseId}>
          <Text style={s.heading}>
            {catalog.exercises.find((x) => x.id === e.exerciseId)?.name}
          </Text>
          {e.sets.map((set, i) => (
            <View key={i} style={s.row}>
              <Body>
                Set {i + 1}: {set.load} {set.unit} × {set.reps}
              </Body>
              <Pressable
                disabled={op.busy}
                accessibilityRole="button"
                accessibilityLabel={"Remove set " + (i + 1)}
                onPress={() =>
                  setEntries((prev) =>
                    prev
                      .map((x) =>
                        x.exerciseId === e.exerciseId
                          ? { ...x, sets: x.sets.filter((_, n) => n !== i) }
                          : x,
                      )
                      .filter((x) => x.sets.length),
                  )
                }
              >
                <Text style={{ color: C.red }}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ))}

</View>
      <Body>Session volume: {volumeLabel({id, title, performedOn: date, exercises: entries})}</Body>
      {op.message && <Notice text={op.message} />}
      <Button
        title={a.me && a.available ? "Finish & sync workout" : "Finish & save workout"}
        busy={op.busy}
        disabled={!a.localReady || !entries.length}
        onPress={() => op.run(async () => {
          const workout = payload();
          await a.saveLocal(workout);
          let synced = false;
          let syncFailure = "";
          if (a.me && a.available) {
            try {
              await saveAccountWorkout(workout, new Set(catalog.exercises.map(e => e.id)), getSessionRevision());
              await a.refresh();
              synced = true;
            } catch (error) {
              syncFailure = errorMessage(error);
            }
          }
          resetSession();
          if (synced) {
            op.setMessage("Workout saved on this device and synced to your MONTE WO account. Qualifying performance assessment is separate; workout volume alone never awards a rank.");
          } else if (syncFailure) {
            op.setMessage("Workout saved on this device, but account sync failed: " + syncFailure + " Your local copy is preserved; open History to retry an explicit account copy.");
          } else {
            op.setMessage("Workout saved on this device. Account sync requires sign-in and an enabled secure service. Existing device-only records are never uploaded automatically. No rank was awarded.");
          }
        })}
      />
      {!a.localReady && <Button title="Retry device storage" secondary onPress={() => op.run(a.refreshLocal)} />}
      <Button title="View saved workouts" secondary onPress={() => navigation.navigate("History")} />
      {!a.me && <Button title="Sign in for account sync" secondary onPress={() => navigation.navigate("SignIn")} />}
      <Button
        title="Submit a discipline performance"
        secondary
        onPress={() => navigation.navigate("Performance")}
      />
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
        <View style={{ flex: 1, gap: 4 }}>
          <Label>MOVEMENT LIBRARY / MAIN</Label>
          <Title>Find your next lift.</Title>
          <Text style={v.subtle}>
            Explore the movement. Choose your next session.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open muscle map"
          style={v.iconButton}
          onPress={() => navigation.navigate("MuscleMap")}
        >
          <ScanLine size={21} color={C.cyan} />
        </Pressable>
      </View>
      <Card style={{ padding: 14 }}>
        <View style={s.row}>
          <View>
            <Text style={v.sectionTitle}>
              {catalog.exercises.length} exercises · {catalog.groups.length}{" "}
              groups
            </Text>
            <Text style={v.subtle}>
              {packCount} pack animations · {guideCount} written guides
            </Text>
          </View>
          <BookOpen color={C.cyan} size={24} />
        </View>
        <Text style={v.subtle}>
          {overlapCount} guides share a pack exercise. Duplicates are counted
          once.
        </Text>
      </Card>
      <View style={{ gap: 8 }}>
        <Field
          label="Search exercises or muscles"
          value={query}
          onChange={setQuery}
        />
        <Chips
          items={[
            { id: "all", name: "All sources" },
            { id: "pack", name: "Pack animations" },
            { id: "guides", name: "Written guides" },
          ]}
          value={source}
          onChange={setSource}
        />
        <Chips
          items={[{ id: "all", name: "All" }, ...catalog.groups]}
          value={group}
          onChange={setGroup}
        />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: equipmentOpen }}
            onPress={() => setEquipmentOpen(!equipmentOpen)}
            style={s.chip}
          >
            <Text style={s.chipText}>
              Equipment ·{" "}
              {equipment === "all"
                ? "Any"
                : equipmentGroups.find((e) => e.id === equipment)?.name}{" "}
              {equipmentOpen ? "−" : "+"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Sort " + (sort === "az" ? "Z to A" : "A to Z")}
            onPress={() => setSort(sort === "az" ? "za" : "az")}
            style={s.chip}
          >
            <Text style={s.chipText}>{sort === "az" ? "A → Z" : "Z → A"}</Text>
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
        {equipmentOpen && (
          <Chips
            items={equipmentGroups}
            value={equipment}
            onChange={setEquipment}
          />
        )}
      </View>
      <View style={s.row}>
        <Text accessibilityLiveRegion="polite" style={v.subtle}>
          {rows.length} matching exercises
        </Text>
        <Text style={v.subtle}>TAP A CARD TO EXPLORE</Text>
      </View>
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
      <Card>
        <Text style={v.sectionTitle}>Source pack inventory</Text>
        <Body>
          67 manifest rows → 57 unique exercises. The 10 repeated entries have
          identical metadata and media. Animations are source-pack previews;
          exercise-form and usage-rights review is not implied.
        </Body>
        <Text style={v.subtle}>
          Pinned GitHub source: {workoutLibrary.source.commit.slice(0, 7)}.{" "}
          {packPreviewOrigin
            ? "Media served by this local preview."
            : "Media streams from the pinned public GitHub files."}{" "}
          R2 has not been populated.
        </Text>
        <Button
          title="Refresh shared catalog"
          secondary
          busy={op.busy}
          onPress={() => op.run(a.refreshCatalog)}
        />
        <Text style={v.subtle}>
          {a.catalogStatus}. New pack-only IDs remain browsing-only until
          registered with the shared workout backend.
        </Text>
      </Card>
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
function Exercise({ route }: any) {
  const a = useApp(),
    e = a.exerciseCatalog.exercises.find((e) => e.id === route.params.id);
  const [failed, setFailed] = useState(false);
  if (!e)
    return (
      <Screen>
        <Notice text="Exercise not found." error />
      </Screen>
    );
  const uri = mediaUri(e, API_BASE),
    registered = a.trainingCatalog.exercises.some((x) => x.id === e.id);
  return (
    <Screen>
      <PageHeader
        eyebrow={e.equipment.toUpperCase()}
        title={e.name}
        subtitle={e.muscles.join(" · ")}
      />
      {e.pack ? (
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
      {e.pack && (
        <Card>
          <Label>EXERCISE METADATA</Label>
          <Body>
            Category: {e.pack.manifest.category} · Equipment:{" "}
            {e.pack.manifest.equipment}
          </Body>
          <Body>
            Primary muscles: {e.pack.manifest.primary_muscles.join(", ")}
          </Body>
          {e.pack.manifest.secondary_muscles.length > 0 && (
            <Body>
              Secondary muscles: {e.pack.manifest.secondary_muscles.join(", ")}
            </Body>
          )}
          <Text style={v.subtle}>
            Haitian Creole exercise name: awaiting native-speaker review. This
            library entry never awards a Discipline Rank.
          </Text>
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
        <Notice text="Browse-only exercise: its ID is not registered in the current shared workout backend. Saving it to a workout is not enabled. No database import has been run." />
      )}
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
          <Body>Device-only history is shared by people using this installation. It stays separate from signed-in accounts, is not encrypted by MONTE WO, and never awards ranks. Deleting here does not delete account workouts.</Body>
          <Button title="Refresh device history" secondary busy={op.busy} onPress={() => op.run(a.refreshLocal)} />
          {!a.me && <Button title="Sign in to copy a workout" secondary onPress={() => navigation.navigate("SignIn")} />}
          {a.localReady && !a.localWorkouts.length && <Notice text="No workouts saved on this device yet. Finish a session in Train to start your history." />}
          {a.localWorkouts.map(w => (
            <Card key={w.id}>
              <Label>DEVICE COPY · NO AUTO-SYNC</Label>
              <Text style={s.heading}>{w.title}</Text>
              <Body>{w.performedOn} · {workoutSummary(w)}</Body>
              <Body>{volumeLabel(w)}</Body>
              {w.exercises.map(e => <Body key={e.exerciseId}>
                {catalog.exercises.find(x => x.id === e.exerciseId)?.name || e.exerciseId}: {e.sets.map(set => `${set.load} ${set.unit} × ${set.reps}`).join(" · ")}
              </Body>)}
              <Body>Workout ID: {w.id}</Body>
              <Button title="Save a copy to account" secondary busy={op.busy} disabled={!a.me || !a.available}
                onPress={() => {
                  const revision = getSessionRevision();
                  confirm("Save this workout to your account?",
                    `Send this one workout to account ${a.me?.actor?.id || "currently signed in"} at ${API_BASE}? The device copy stays here. No other device workouts will be uploaded and no rank will be awarded.`,
                    () => op.run(async () => {
                      await saveAccountWorkout(w, new Set(a.trainingCatalog.exercises.map(e => e.id)), revision);
                      await a.refresh();
                      op.setMessage("Account copy confirmed. The device record was kept. Refresh account history on your other connected MONTE WO client to compare. No rank was awarded.");
                    }));
                }} />
              <Button title="Delete device workout" danger secondary busy={op.busy}
                onPress={() => confirm("Delete this device workout?", "Removes it from local history and its recovery copy. Cloud account records are not changed.",
                  () => op.run(async () => { await a.deleteLocal(w.id); }))} />
            </Card>
          ))}
        </>
      ) : !a.me ? (
        <SignInCard navigation={navigation} />
      ) : tab === "workouts" ? (
        <>
          <Body>Account: {a.me.actor?.id || "Signed in"} · API: {API_BASE}</Body>
          <Body>These are account records, separate from device history. Use the same identity and API origin on the website. No automatic upload is performed.</Body>
          <Button title="Refresh account workouts" secondary busy={a.loading || op.busy} onPress={() => op.run(a.refresh)} />
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
              <Body>Workout ID: {w.id}</Body>
              {w.exercises.map((e) => (
                <Body key={e.exerciseId}>
                  {catalog.exercises.find((x) => x.id === e.exerciseId)?.name}:{" "}
                  {e.sets
                    .map((s) => `${s.load} ${s.unit} × ${s.reps}`)
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
          {a.me.reviews?.map((r: any) => (
            <Card key={r.id}>
              <Label>
                {r.state.toUpperCase()} · REVIEW {r.revision}
              </Label>
              <Body>{r.reason}</Body>
              <Text style={s.small}>{r.createdAt}</Text>
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
        eyebrow="MONTE WO STRENGTH INDEX™"
        title="Log a performance."
        subtitle="A training set is not automatically a qualifying performance."
      />
      <Notice text="DRAFT — NOT OFFICIAL. Unapproved standards cannot award official ranks. A tested single means one actual repetition, not a multi-rep estimate." />
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
              onChange={() => setChecks((v) => ({ ...v, [c.id]: !v[c.id] }))}
              text={c.text}
            />
          ))}
          <Body>
            Uses your saved profile snapshot: {a.me.profile.data.bodyweight}{" "}
            {a.me.profile.data.unit}. Updating your profile cannot fabricate a
            new achievement.
          </Body>
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
      style={{ flexDirection: "row", gap: 12, paddingVertical: 9 }}
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
  const a = useApp(),
    id = route.params.id,
    d = disciplines.find((x) => x.id === id)!,
    card = a.me?.disciplines?.find((x: any) => x.discipline === id),
    rule = card?.rulebook || ruleFor(id);
  return (
    <Screen>
      <PageHeader
        eyebrow="DISCIPLINE RANK"
        title={d.name}
        subtitle="Independent performance. Versioned standards."
      />
      {!card?.modelApproved || !card?.ruleApproved ? (
        <Notice text="DRAFT — NOT OFFICIAL. No approved thresholds are available for this discipline. No official MONTE Climb Scale percentage is shown." />
      ) : null}
      <Card>
        <Label>RELATED TRAINING ANIMATION</Label>
        <Button
          title="Open related exercise"
          secondary
          onPress={() =>
            navigation.navigate("Exercise", {
              id: (
                {
                  squat: "back-squat",
                  bench: "bench-press",
                  deadlift: "deadlift",
                  curl: "barbell-curl",
                } as Record<string, string>
              )[id],
            })
          }
        />
        <Text style={v.subtle}>
          {id === "curl"
            ? "A standard barbell curl animation does not demonstrate or satisfy the Strict Biceps Curl standard."
            : "A training animation is not evidence of a qualifying performance."}
        </Text>
      </Card>
      {["verified", "provisional"].map((kind) => (
        <Card key={kind}>
          <Label>
            {kind === "verified"
              ? "MONTE VERIFIED"
              : "PROVISIONAL · SELF-REPORTED"}
          </Label>
          <Text style={s.title}>
            {card?.[kind]?.rankId
              ? rankNames[card[kind].rankId]
              : "No rank earned"}
          </Text>
          <Body>
            {card?.[kind]?.explanation ||
              "Qualifying performance and the required approvals are necessary."}
          </Body>
          {card?.modelApproved &&
            card?.ruleApproved &&
            Number.isFinite(card?.[kind]?.progress) && (
              <Body>
                MONTE Climb Scale: {card[kind].progress}% · server-calculated
              </Body>
            )}
        </Card>
      ))}
      <Card>
        <Label>MONTE STANDARD</Label>
        <Body>
          Rank order: Debitan · Bati · Solid · Fò · Avanse · Mèt · Chanpyon ·
          Titan · Lejand. Each discipline is independent.
        </Body>
        <Text style={s.heading}>{rule.variation}</Text>
        <Text style={s.small}>{rule.id}</Text>
        {rule.checks.map((c: any) => (
          <Body key={c.id}>• {c.text}</Body>
        ))}
      </Card>
      <Notice text={rule.safety} />
      <Button
        title="Log a performance"
        onPress={() => navigation.navigate("Performance")}
      />
    </Screen>
  );
}
function Profile() {
  const a = useApp(),
    op = useOperation(),
    p = a.me?.profile?.data,
    [weight, setWeight] = useState(p?.bodyweight || ""),
    [age, setAge] = useState(p?.ageYears ? String(p.ageYears) : ""),
    [unit, setUnit] = useState(p?.unit || "kg"),
    [category, setCategory] = useState(p?.sexCategory || "unclassified");
  return (
    <Screen>
      <PageHeader
        eyebrow="PROFILE SNAPSHOT"
        title="Your reference details."
        subtitle="Only collect what a discipline methodology needs. Existing records retain their original snapshot."
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
          onChange={setUnit}
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
            { id: "unclassified", name: "Unclassified" },
            { id: "female", name: "Female reference" },
            { id: "male", name: "Male reference" },
          ]}
          value={category}
          onChange={setCategory}
        />
        <Body>
          Software limits are not proof that a standard has been validated for
          your category.
        </Body>
        <Button
          title="Save profile revision"
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
      <PageHeader eyebrow="YOUR ACCOUNT" title="Private by default." />
      {!a.me ? (
        <SignInCard navigation={navigation} />
      ) : (
        <Card>
          <Label>CONNECTED ACCOUNT</Label>
          <Body>Role: {a.me.actor.role}</Body>
          <Button
            title="Edit profile"
            onPress={() => navigation.navigate("Profile")}
          />
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
        <Label>YOUR DATA, YOUR CHOICE</Label>
        <Body>
          Private training records and evidence are not public leaderboard
          entries. No social publishing is enabled.
        </Body>
        <Body>
          Privacy policy and terms must be available as full in-app documents before public account enrollment. This screen does not redirect to the website.
        </Body>
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
      <Card>
        <Label>VITAFLEX BUSINESS GROUP</Label>
        <Body>MONTE WO 0.1.0 · pre-release</Body>
        <Body>{a.status}</Body>
        <Button
          title="Contact support"
          secondary
          onPress={() =>
            Linking.openURL("mailto:Montewo@vitaflexbusinessgroup.com")
          }
        />
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
            onChange={() => setChecks((v) => ({ ...v, [c.id]: !v[c.id] }))}
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
      <Body>
        The server checks authorization, self-approval, published standards and
        stale revisions before accepting a decision.
      </Body>
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
            backgroundColor: "#030b15",
            borderTopColor: "#194d7b",
            borderTopWidth: 1,
            height: 70 + insets.bottom,
            paddingBottom: 12 + insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
          tabBarActiveTintColor: C.cyan,
          tabBarInactiveTintColor: C.muted,
          tabBarIcon: ({ color, size }) => {
            const Icon = (
              {
                Home: House,
                Train: Dumbbell,
                Library: BookOpen,
                History: History,
                Account: UserRound,
              } as any
            )[route.name];
            return <Icon color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Train" component={Train} />
        <Tab.Screen
          name="Library"
          component={Library}
          options={{ title: "Explore" }}
        />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen
          name="Account"
          component={Account}
          options={{ title: "Profile" }}
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
              backgroundColor: "#00040a",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flex: 1,
                width: "100%",
                // Stable navigator width prevents WebKit observer loops on map/gallery pops.
                // Each Screen chooses compact (500) or wide (1100) content independently.
                maxWidth: Platform.OS === "web" ? 1120 : 1100,
                borderLeftWidth: Platform.OS === "web" ? 1 : 0,
                borderRightWidth: Platform.OS === "web" ? 1 : 0,
                borderColor: "#123554",
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
                  initialRouteName="Welcome"
                  screenOptions={{
                    headerStyle: { backgroundColor: C.bg },
                    headerTintColor: C.text,
                    contentStyle: { backgroundColor: C.bg },
                  }}
                >
                  <Stack.Screen
                    name="Welcome"
                    component={Welcome}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="MuscleMap"
                    component={MuscleMap}
                    options={{ title: "Muscle map" }}
                  />
                  <Stack.Screen
                    name="Notifications"
                    component={Notifications}
                    options={{ title: "Notifications" }}
                  />
                  <Stack.Screen
                    name="Nutrition"
                    component={Nutrition}
                    options={{ title: "Nutrition" }}
                  />
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
                    options={{ title: "Log performance" }}
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
