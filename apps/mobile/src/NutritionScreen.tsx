import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import {
  Barcode,
  Camera,
  Check,
  ChefHat,
  Droplets,
  ExternalLink,
  Flame,
  Globe,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react-native";
import {
  playCameraShutter,
  playFoodChime,
  playScannerLockBeep,
} from "./sound-fx";
import {
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
  calculateEnergyPlan,
  calculateHydrationReference,
  calculateMacroPlan,
  summarizeMeals,
  type MealItem,
} from "../../../shared/training-tools.js";
import { loadDailyFuel, saveDailyFuel } from "./device-prefs";
import {
  BUILTIN_WORLD_FOODS,
  analyzeFoodImageWithCloudVision,
  generatePreferenceMealPlan,
  loadVisionConfig,
  lookupBarcodeEverywhere,
  macrosForGrams,
  parseNaturalPlateDescription,
  parseNutritionLabelText,
  saveCustomWorldFood,
  saveVisionConfig,
  searchLocalFoods,
  searchWorldFoodsOnline,
  swapSingleMealInPlan,
  type GeneratedMealPlan,
  type MealPlanPreferences,
  type ScannedPlateItem,
  type VisionConfig,
  type WorldFoodItem,
} from "./world-foods";
import { today } from "./model";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Chips,
  Field,
  Label,
  ModalSheet,
  Notice,
  ProgressBar,
  Screen,
  SegmentedTabs,
  Title,
  s,
} from "./ui";

const GOALS_KEY = "montewo.nutrition_targets.v1";

type SavedTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function loadSavedTargets(): SavedTargets {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(GOALS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.calories > 0) return p;
      }
    } catch {
      // ignore
    }
  }
  return { calories: 3000, proteinG: 225, carbsG: 340, fatG: 82 };
}

function persistTargets(t: SavedTargets) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(t));
  }
}

function GlassMacroRing({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = Math.max(0, Math.round((value / Math.max(1, target)) * 100));
  const clamped = Math.min(100, pct);
  const r = 21;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (clamped / 100) * circ;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 132,
        padding: 12,
        borderRadius: 16,
        backgroundColor: "rgba(10, 18, 34, 0.78)",
        borderWidth: 1,
        borderColor: color + "55",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.7,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Text
          style={{
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "900",
            fontVariant: ["tabular-nums"],
          }}
        >
          {Math.round(value * 10) / 10}
          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>
            {" "}
            {unit}
          </Text>
        </Text>
        <Text style={{ color: color, fontSize: 9.5, fontWeight: "800" }}>
          / {target} {unit}
        </Text>
      </View>

      <View
        style={{
          width: 52,
          height: 52,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Svg width={52} height={52} viewBox="0 0 52 52">
          <Circle
            cx="26"
            cy="26"
            r={r}
            stroke="#1e293b"
            strokeWidth={4.5}
            fill="none"
          />
          <Circle
            cx="26"
            cy="26"
            r={r}
            stroke={color}
            strokeWidth={4.5}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
            transform="rotate(-90 26 26)"
          />
        </Svg>
        <Text
          style={{
            position: "absolute",
            color: "#ffffff",
            fontSize: 10.5,
            fontWeight: "900",
            fontVariant: ["tabular-nums"],
          }}
        >
          {pct}%
        </Text>
      </View>
    </View>
  );
}

function PulsingMultimodalReticle() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 40), 65);
    return () => clearInterval(id);
  }, []);
  const glowAlpha = 0.55 + 0.4 * Math.sin((pulse / 40) * Math.PI * 2);
  const scanLinePct = 14 + ((pulse / 40) * 62);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Glowing Pulsing Targeting Reticle */}
      <View
        style={{
          position: "absolute",
          left: "9%",
          right: "9%",
          top: "10%",
          bottom: "24%",
          borderWidth: 2,
          borderColor: `rgba(56, 189, 248, ${glowAlpha.toFixed(2)})`,
          borderRadius: 18,
          justifyContent: "space-between",
          padding: 10,
        }}
      >
        {/* Animated Laser Scan Sweep Line */}
        <View
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            top: `${scanLinePct}%` as any,
            height: 2,
            backgroundColor: "#fde047",
            opacity: 0.9,
          }}
        />
        <View
          style={{
            alignSelf: "center",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: "rgba(3, 10, 24, 0.86)",
            borderWidth: 1,
            borderColor: "#38bdf8",
          }}
        >
          <Text
            style={{
              color: "#fde047",
              fontSize: 9.5,
              fontWeight: "900",
              letterSpacing: 0.8,
              textAlign: "center",
            }}
          >
            MONTE WO GLOBAL MULTIMODAL SCANNER — RECOGNIZING INGREDIENTS...
          </Text>
        </View>
      </View>
    </View>
  );
}

export function NutritionScreen({ route }: any) {
  const initialTab = route?.params?.section || "log";
  const [tab, setTab] = useState<"log" | "scan" | "planner" | "calc">(initialTab);

  useEffect(() => {
    if (route?.params?.section) setTab(route.params.section);
  }, [route?.params?.section]);

  // Daily Logged Meals & Targets
  const [targets, setTargets] = useState<SavedTargets>(loadSavedTargets);
  const [meals, setMeals] = useState<(MealItem & { loggedAt?: string })[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadDailyFuel().then((d) => {
      setMeals(d.meals || []);
      if (d.targets?.calories) setTargets(d.targets);
    });
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? "" : cur)), 3200);
  }

  async function logMealItem(input: {
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) {
    const entry: MealItem & { loggedAt?: string } = {
      id: "meal-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      name: input.name,
      calories: Math.max(0, Math.round(input.calories)),
      proteinG: Math.max(0, Math.round(input.proteinG * 10) / 10),
      carbsG: Math.max(0, Math.round(input.carbsG * 10) / 10),
      fatG: Math.max(0, Math.round(input.fatG * 10) / 10),
      loggedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const next = [entry, ...meals];
    setMeals(next);
    await saveDailyFuel({ date: today(), targets, meals: next });
    flash(`Logged ${entry.name} (${entry.calories} kcal)`);
  }

  async function removeMeal(id: string) {
    const next = meals.filter((m) => m.id !== id);
    setMeals(next);
    await saveDailyFuel({ date: today(), targets, meals: next });
  }

  const dailyTotals = useMemo(() => summarizeMeals(meals), [meals]);

  // =========================================================================
  // TAB 1: WORLD FOOD SEARCH & PORTION MODAL
  // =========================================================================
  const [foodQuery, setFoodQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [onlineResults, setOnlineResults] = useState<WorldFoodItem[]>([]);
  const [onlineSearching, setOnlineSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<WorldFoodItem | null>(null);
  const [quickPreviewFood, setQuickPreviewFood] =
    useState<WorldFoodItem | null>(null);
  const [portionGrams, setPortionGrams] = useState("100");
  const [customFoodModal, setCustomFoodModal] = useState(false);
  const [cfName, setCfName] = useState("");
  const [cfBrand, setCfBrand] = useState("");
  const [cfGrams, setCfGrams] = useState("100");
  const [cfKcal, setCfKcal] = useState("");
  const [cfP, setCfP] = useState("");
  const [cfC, setCfC] = useState("");
  const [cfF, setCfF] = useState("");
  const [cfBarcode, setCfBarcode] = useState("");
  const [customRefreshTick, setCustomRefreshTick] = useState(0);

  const localResults = useMemo(
    () => searchLocalFoods(foodQuery, regionFilter),
    [foodQuery, regionFilter, customRefreshTick],
  );

  useEffect(() => {
    const q = foodQuery.trim();
    if (q.length < 2) {
      setOnlineResults([]);
      setOnlineSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setOnlineSearching(true);
    const timer = setTimeout(() => {
      searchWorldFoodsOnline(q, ctrl.signal)
        .then((res) => setOnlineResults(res))
        .catch(() => setOnlineResults([]))
        .finally(() => setOnlineSearching(false));
    }, 280);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [foodQuery]);

  const combinedFoods = useMemo(() => {
    const seen = new Set<string>();
    const merged: WorldFoodItem[] = [];
    const pushUnique = (f: WorldFoodItem) => {
      const k = `${f.name.toLowerCase()}|${(f.brand || "").toLowerCase()}`;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(f);
      }
    };
    for (const f of localResults) pushUnique(f);
    if (regionFilter === "all") {
      for (const r of onlineResults) pushUnique(r);
    }
    return merged.slice(0, 42);
  }, [localResults, onlineResults, regionFilter]);

  function openFoodPortion(item: WorldFoodItem) {
    setSelectedFood(item);
    setPortionGrams(String(item.servingGrams || 100));
  }

  // =========================================================================
  // TAB 2: LIVE CAMERA BARCODE READER + AI MACRO SCANNER
  // =========================================================================
  const [scanMode, setScanMode] = useState<"barcode" | "ai">("barcode");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [scannedBarcodeFood, setScannedBarcodeFood] =
    useState<WorldFoodItem | null>(null);
  const [barcodeSourceLabel, setBarcodeSourceLabel] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [mealCameraActive, setMealCameraActive] = useState(false);
  const [camFacing, setCamFacing] = useState<"environment" | "user">(
    Platform.OS === "web" ? "user" : "environment",
  );
  const [cameraBlockedByIframe, setCameraBlockedByIframe] = useState(false);
  const videoRef = useRef<any>(null);
  const mealVideoRef = useRef<any>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const detectorTimerRef = useRef<any>(null);

  async function stopAllCameras() {
    try {
      if (detectorTimerRef.current) {
        clearInterval(detectorTimerRef.current);
        detectorTimerRef.current = null;
      }
      if (zxingControlsRef.current) {
        zxingControlsRef.current.stop();
        zxingControlsRef.current = null;
      }
      if (activeStreamRef.current) {
        for (const t of activeStreamRef.current.getTracks()) t.stop();
        activeStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (mealVideoRef.current) mealVideoRef.current.srcObject = null;
    } catch {
      // ignore
    }
    setCameraActive(false);
    setMealCameraActive(false);
  }

  async function stopBarcodeCamera() {
    await stopAllCameras();
  }

  useEffect(() => {
    return () => {
      stopAllCameras();
    };
  }, []);

  async function runBarcodeLookup(code: string) {
    const clean = String(code || "").trim();
    if (!clean) return;
    playScannerLockBeep();
    setBarcodeInput(clean);
    setBarcodeBusy(true);
    setBarcodeMessage("");
    const res = await lookupBarcodeEverywhere(clean);
    setBarcodeBusy(false);
    if (res.food) {
      setScannedBarcodeFood(res.food);
      setBarcodeSourceLabel(res.source);
      setPortionGrams(String(res.food.servingGrams || 100));
    } else {
      setScannedBarcodeFood(null);
      setBarcodeMessage(
        `No food matched barcode ${clean} yet. Tap "+ Create Food" to register this barcode.`,
      );
    }
  }

  async function openStreamWithFacing(facing: "environment" | "user"): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      // Fallback to any available webcam/camera without constraints
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }
  }

  async function startLiveBarcodeCamera(overrideFacing?: "environment" | "user") {
    const targetFacing = overrideFacing || camFacing;
    await stopAllCameras();
    setBarcodeMessage("");
    setCameraBlockedByIframe(false);

    if (
      Platform.OS !== "web" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraBlockedByIframe(true);
      setBarcodeMessage(
        "Direct camera API requires HTTPS or opening the preview in its own browser tab—or upload a barcode photo below.",
      );
      return;
    }

    try {
      // Must be called synchronously on user click (preserves Safari user gesture!)
      const stream = await openStreamWithFacing(targetFacing);
      activeStreamRef.current = stream;
      setCameraActive(true);
    } catch (e: any) {
      const msg = String(e?.message || e?.name || "");
      setCameraBlockedByIframe(true);
      setBarcodeMessage(
        msg.toLowerCase().includes("permission") ||
          msg.toLowerCase().includes("notallowed") ||
          msg.toLowerCase().includes("policy")
          ? "Camera access was blocked by browser/iframe permissions. Allow camera in the address bar or click 'Open Fullscreen Camera Tab' below."
          : `Camera unavailable (${msg || "no camera found"}). Upload a barcode photo or type digits below.`,
      );
    }
  }

  // Attach MediaStream + start dual BarcodeDetector + ZXing stream decoding once <video> mounts
  const attachBarcodeVideoEl = (el: any) => {
    videoRef.current = el;
    const stream = activeStreamRef.current;
    if (!el || !stream || el.srcObject === stream) return;
    el.srcObject = stream;
    el.play?.().catch(() => {});

    let locked = false;
    const onDetected = (code: string) => {
      if (locked || !code) return;
      locked = true;
      stopAllCameras();
      runBarcodeLookup(code);
    };

    // 1. Hardware Native BarcodeDetector (Chrome, Edge, Safari 17+)
    const NativeDetector = (window as any).BarcodeDetector;
    if (NativeDetector) {
      try {
        const det = new NativeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        });
        detectorTimerRef.current = setInterval(async () => {
          if (locked || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes?.length && codes[0].rawValue) {
              onDetected(String(codes[0].rawValue));
            }
          } catch {
            // ignore frame
          }
        }, 160);
      } catch {
        // fallback to ZXing below
      }
    }

    // 2. Simultaneous @zxing/browser stream decoder (universal browser support)
    import("@zxing/browser")
      .then(({ BrowserMultiFormatReader }) => {
        if (locked || !videoRef.current || !activeStreamRef.current) return;
        const reader = new BrowserMultiFormatReader();
        reader
          .decodeFromStream(stream, videoRef.current, (result) => {
            if (result) onDetected(result.getText());
          })
          .then((ctrl) => {
            zxingControlsRef.current = ctrl;
          })
          .catch(() => {});
      })
      .catch(() => {});
  };

  async function startLiveMealCamera(overrideFacing?: "environment" | "user") {
    const targetFacing = overrideFacing || camFacing;
    await stopAllCameras();
    setAiStatus("");
    setCameraBlockedByIframe(false);

    if (
      Platform.OS !== "web" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraBlockedByIframe(true);
      setAiStatus(
        "Direct camera stream requires opening in a standalone browser tab—or tap 'Upload Photo' to pick any meal image.",
      );
      return;
    }

    try {
      const stream = await openStreamWithFacing(targetFacing);
      activeStreamRef.current = stream;
      setMealCameraActive(true);
    } catch (e: any) {
      setCameraBlockedByIframe(true);
      setAiStatus(
        "Camera permission blocked inside embedded preview—click 'Open Fullscreen Camera Tab' or upload a meal photo directly.",
      );
    }
  }

  async function initializeFoodCamera(overrideFacing?: "environment" | "user") {
    return startLiveMealCamera(overrideFacing || "user");
  }

  const attachMealVideoEl = (el: any) => {
    mealVideoRef.current = el;
    const stream = activeStreamRef.current;
    if (!el || !stream || el.srcObject === stream) return;
    el.srcObject = stream;
    el.play?.().catch(() => {});
  };

  async function snapLiveMealPhoto() {
    const vid = mealVideoRef.current;
    if (!vid) return;
    playCameraShutter();
    try {
      const canvas = document.createElement("canvas");
      const w = vid.videoWidth || 1280;
      const h = vid.videoHeight || 720;
      const scale = Math.min(1, 1280 / w);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx2d = canvas.getContext("2d");
      if (ctx2d) ctx2d.drawImage(vid, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
      await stopAllCameras();
      setMealPhotoUri(dataUrl);

      // Check if a barcode is in the snapped frame automatically!
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const bc = await reader.decodeFromImageUrl(dataUrl);
        if (bc?.getText()) {
          setScanMode("barcode");
          await runBarcodeLookup(bc.getText());
          return;
        }
      } catch {
        // Not a barcode image; proceed as meal/label photo
      }

      if (visionCfg.apiKey.trim()) {
        await runCloudVision(dataUrl);
      } else {
        setAiStatus(
          "Photo captured! Tap a quick dish match below or type what's on the plate for instant gram-accurate macros (or add a Vision API key for 1-shot pixel recognition).",
        );
      }
    } catch {
      setAiStatus("Could not capture frame—try uploading a photo.");
    }
  }

  function flipActiveCamera(mode: "barcode" | "meal") {
    const next = camFacing === "environment" ? "user" : "environment";
    setCamFacing(next);
    if (mode === "barcode") startLiveBarcodeCamera(next);
    else startLiveMealCamera(next);
  }

  function openStandaloneCameraTab() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
    }
  }

  async function decodeBarcodeFromPickedImage() {
    setBarcodeMessage("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const uri = picked.assets[0].uri;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const decoded = await reader.decodeFromImageUrl(uri);
      await runBarcodeLookup(decoded.getText());
    } catch {
      setBarcodeMessage(
        "Could not detect a clear UPC/EAN barcode in that image. Try closer lighting or type the digits below.",
      );
    }
  }

  // AI MACRO SCANNER STATE
  const [mealPhotoUri, setMealPhotoUri] = useState<string | null>(null);
  const [plateDescription, setPlateDescription] = useState("");
  const [plateItems, setPlateItems] = useState<ScannedPlateItem[]>([]);
  const [labelOcrText, setLabelOcrText] = useState("");
  const [visionCfg, setVisionCfg] = useState<VisionConfig>(loadVisionConfig);
  const [showVisionSettings, setShowVisionSettings] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

  async function pickMealPhoto() {
    setAiStatus("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0] as any;
      if (Platform.OS === "web" && asset.file instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          setMealPhotoUri(dataUrl);
          if (visionCfg.apiKey.trim()) {
            runCloudVision(dataUrl);
          } else {
            setAiStatus(
              "Photo loaded! Describe or tap what's on the plate below for instant gram-level macro breakdown (or connect a Vision key for 1-shot AI).",
            );
          }
        };
        reader.readAsDataURL(asset.file);
      } else {
        setMealPhotoUri(asset.uri);
      }
    } catch {
      setAiStatus("Could not load photo.");
    }
  }

  async function runCloudVision(dataUrl: string) {
    setAiBusy(true);
    setAiStatus("Analyzing meal photo with multimodal Vision AI…");
    try {
      const out = await analyzeFoodImageWithCloudVision(dataUrl, visionCfg);
      if (Array.isArray(out.items) && out.items.length) {
        const mapped: ScannedPlateItem[] = out.items.map((it, idx) => {
          const g = Math.max(10, Number(it.grams) || 100);
          const factor = 100 / g;
          const food: WorldFoodItem = {
            id: `vision-${Date.now()}-${idx}`,
            name: it.name || "Detected Item",
            region: "Custom",
            category: "mixed",
            kcal100: Math.round((Number(it.calories) || 0) * factor * 10) / 10,
            protein100: Math.round((Number(it.proteinG) || 0) * factor * 10) / 10,
            carbs100: Math.round((Number(it.carbsG) || 0) * factor * 10) / 10,
            fat100: Math.round((Number(it.fatG) || 0) * factor * 10) / 10,
            servingLabel: `${g}g`,
            servingGrams: g,
            tags: ["vision"],
          };
          return { food, grams: g };
        });
        setPlateItems(mapped);
        setAiStatus(`Detected ${mapped.length} food items (${out.mealName || "Scanned Plate"}). Adjust portions if needed.`);
      } else {
        setAiStatus("No items returned—describe the plate below to calculate.");
      }
    } catch (e: any) {
      setAiStatus(e?.message || "Vision scan failed.");
    } finally {
      setAiBusy(false);
    }
  }

  function analyzePlateText() {
    const parsed = parseNaturalPlateDescription(plateDescription);
    if (!parsed.length) {
      setAiStatus(
        "Try naming foods on your plate, e.g. '200g chicken breast, 1 cup diri ak pwa, 4 bannann peze, half avocado'.",
      );
      return;
    }
    setPlateItems(parsed);
    setAiStatus(`Matched ${parsed.length} items—fine-tune gram portions below or log straight to Today's Fuel.`);
  }

  const plateTotals = useMemo(() => {
    return plateItems.reduce(
      (acc, item) => {
        const m = macrosForGrams(item.food, item.grams);
        return {
          calories: acc.calories + m.calories,
          proteinG: Math.round((acc.proteinG + m.proteinG) * 10) / 10,
          carbsG: Math.round((acc.carbsG + m.carbsG) * 10) / 10,
          fatG: Math.round((acc.fatG + m.fatG) * 10) / 10,
        };
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
  }, [plateItems]);

  const parsedLabel = useMemo(
    () => parseNutritionLabelText(labelOcrText),
    [labelOcrText],
  );

  // =========================================================================
  // TAB 3: PREFERENCE-BASED MEAL PLAN GENERATOR
  // =========================================================================
  const [mpCalories, setMpCalories] = useState(String(targets.calories));
  const [mpProtein, setMpProtein] = useState(String(targets.proteinG));
  const [mpCarbs, setMpCarbs] = useState(String(targets.carbsG));
  const [mpFat, setMpFat] = useState(String(targets.fatG));
  const [mpMealsCount, setMpMealsCount] = useState<3 | 4 | 5>(4);
  const [mpCuisine, setMpCuisine] =
    useState<MealPlanPreferences["cuisine"]>("all");
  const [mpDiet, setMpDiet] =
    useState<MealPlanPreferences["diet"]>("omnivore");
  const [mpDairyFree, setMpDairyFree] = useState(false);
  const [mpGlutenFree, setMpGlutenFree] = useState(false);
  const [mpExclude, setMpExclude] = useState("");
  const [mpSeed, setMpSeed] = useState(0);
  const [showGrocery, setShowGrocery] = useState(false);

  const [generatedPlan, setGeneratedPlan] = useState<GeneratedMealPlan>(() =>
    generatePreferenceMealPlan({
      calories: targets.calories,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
      mealsPerDay: 4,
      cuisine: "all",
      diet: "omnivore",
      dairyFree: false,
      glutenFree: false,
      excludeText: "",
    }),
  );

  function buildMealPlanNow(nextSeed = mpSeed) {
    const pref: MealPlanPreferences = {
      calories: Math.max(1100, Math.min(7000, Number(mpCalories) || targets.calories)),
      proteinG: Math.max(50, Math.min(450, Number(mpProtein) || targets.proteinG)),
      carbsG: Math.max(20, Math.min(900, Number(mpCarbs) || targets.carbsG)),
      fatG: Math.max(25, Math.min(300, Number(mpFat) || targets.fatG)),
      mealsPerDay: mpMealsCount,
      cuisine: mpCuisine,
      diet: mpDiet,
      dairyFree: mpDairyFree,
      glutenFree: mpGlutenFree,
      excludeText: mpExclude,
    };
    setGeneratedPlan(generatePreferenceMealPlan(pref, nextSeed));
  }

  // =========================================================================
  // TAB 4: BLANK-DEFAULT BMR / TDEE / MACRO & HYDRATION CALCULATOR
  // =========================================================================
  const [sex, setSex] = useState<"male" | "female">("male");
  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">("imperial");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal] = useState("maintain");
  const [macroPreset, setMacroPreset] = useState("balanced_strength");
  const [trainingMin, setTrainingMin] = useState("60");

  const energyResult = useMemo(() => {
    if (!weight.trim() || !age.trim()) return null;
    try {
      const hVal =
        unitSystem === "imperial"
          ? Number(heightFt) * 12 + (Number(heightIn) || 0)
          : Number(heightCm);
      if (!hVal || (unitSystem === "imperial" && !heightFt.trim()) || (unitSystem === "metric" && !heightCm.trim())) {
        return null;
      }
      return calculateEnergyPlan({
        sex,
        age,
        weight,
        unit: unitSystem === "imperial" ? "lb" : "kg",
        height: hVal,
        heightUnit: unitSystem === "imperial" ? "in" : "cm",
        activity: activity as any,
        goal: goal as any,
      });
    } catch {
      return null;
    }
  }, [sex, unitSystem, age, weight, heightCm, heightFt, heightIn, activity, goal]);

  const calcMacros = useMemo(() => {
    if (!energyResult) return null;
    try {
      const pPerKg =
        macroPreset === "high_protein_cut"
          ? 2.2
          : macroPreset === "mass_gain"
            ? 1.8
            : 2.0;
      const fPct = macroPreset === "high_protein_cut" ? 24 : 27;
      return calculateMacroPlan({
        calories: energyResult.targetCalories,
        weight,
        unit: unitSystem === "imperial" ? "lb" : "kg",
        proteinPerKg: pPerKg,
        fatPercent: fPct,
        meals: mpMealsCount,
      });
    } catch {
      return null;
    }
  }, [energyResult, weight, unitSystem, macroPreset, mpMealsCount]);

  const hydrationRef = useMemo(() => {
    if (!weight.trim()) return null;
    try {
      return calculateHydrationReference({
        weight,
        unit: unitSystem === "imperial" ? "lb" : "kg",
        trainingMinutes: trainingMin || 0,
      });
    } catch {
      return null;
    }
  }, [weight, unitSystem, trainingMin]);

  function applyCalculatedTargets() {
    if (!calcMacros || !energyResult) return;
    const next: SavedTargets = {
      calories: energyResult.targetCalories,
      proteinG: calcMacros.proteinG,
      carbsG: calcMacros.carbsG,
      fatG: calcMacros.fatG,
    };
    setTargets(next);
    persistTargets(next);
    saveDailyFuel({ date: today(), targets: next, meals });
    setMpCalories(String(next.calories));
    setMpProtein(String(next.proteinG));
    setMpCarbs(String(next.carbsG));
    setMpFat(String(next.fatG));
    flash("Applied new calorie & macro targets to Tracker & Meal Planner!");
  }

  return (
    <Screen wide>
      {/* Header + Live Macro Summary */}
      <View style={s.row}>
        <View style={{ gap: 2 }}>
          <Label>MONTE WO NUTRITION</Label>
          <Title>Fuel & Macros</Title>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setTab("scan");
              setScanMode("barcode");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "#111827",
              borderWidth: 1,
              borderColor: "#26354d",
            }}
          >
            <Barcode size={15} color={C.cyan} />
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
              Barcode
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setTab("scan");
              setScanMode("ai");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "#240811",
              borderWidth: 1,
              borderColor: "#751b2e",
            }}
          >
            <Camera size={15} color="#ff6b81" />
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
              AI Scan
            </Text>
          </Pressable>
        </View>
      </View>

      {toast ? <Notice text={toast} /> : null}

      {/* Glassmorphic Percentage Macro Tracking Rings (3,000 kcal Performance Baseline) */}
      <Card accent="blue" style={{ padding: 14, gap: 12 }}>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800" }}>
              {quickPreviewFood
                ? `INSTANT DISH PREVIEW · ${quickPreviewFood.name.toUpperCase()} (${quickPreviewFood.servingLabel})`
                : "TODAY'S LOGGED FUEL · GLASSMORPHIC MACRO RINGS"}
            </Text>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 24,
                fontWeight: "900",
                fontVariant: ["tabular-nums"],
              }}
            >
              {quickPreviewFood
                ? macrosForGrams(quickPreviewFood, quickPreviewFood.servingGrams)
                    .calories
                : dailyTotals.calories}{" "}
              <Text style={{ color: C.muted, fontSize: 14, fontWeight: "700" }}>
                / {targets.calories} kcal target
              </Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {quickPreviewFood ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const m = macrosForGrams(
                      quickPreviewFood,
                      quickPreviewFood.servingGrams,
                    );
                    playFoodChime();
                    logMealItem({
                      name: `${quickPreviewFood.name} (${quickPreviewFood.servingLabel})`,
                      calories: m.calories,
                      proteinG: m.proteinG,
                      carbsG: m.carbsG,
                      fatG: m.fatG,
                    });
                    setQuickPreviewFood(null);
                  }}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: "#0e291e",
                    borderWidth: 1,
                    borderColor: "#10b981",
                  }}
                >
                  <Text style={{ color: "#34d399", fontSize: 11, fontWeight: "900" }}>
                    + Log Serving
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setQuickPreviewFood(null)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: "#111827",
                    borderWidth: 1,
                    borderColor: "#334155",
                  }}
                >
                  <Text style={{ color: "#cbd5e1", fontSize: 11, fontWeight: "800" }}>
                    Daily Total
                  </Text>
                </Pressable>
              </>
            ) : (
              <Badge
                text={`${Math.max(0, targets.calories - dailyTotals.calories)} kcal left`}
                tone={dailyTotals.calories <= targets.calories ? "blue" : "amber"}
              />
            )}
          </View>
        </View>

        {(() => {
          const activeMacros = quickPreviewFood
            ? macrosForGrams(quickPreviewFood, quickPreviewFood.servingGrams)
            : {
                calories: dailyTotals.calories,
                proteinG: dailyTotals.proteinG,
                carbsG: dailyTotals.carbsG,
                fatG: dailyTotals.fatG,
              };
          return (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <GlassMacroRing
                label="Calories"
                value={activeMacros.calories}
                target={targets.calories}
                unit="kcal"
                color="#f59e0b"
              />
              <GlassMacroRing
                label="Protein"
                value={activeMacros.proteinG}
                target={targets.proteinG}
                unit="g"
                color="#38bdf8"
              />
              <GlassMacroRing
                label="Carbs"
                value={activeMacros.carbsG}
                target={targets.carbsG}
                unit="g"
                color="#a855f7"
              />
              <GlassMacroRing
                label="Fats"
                value={activeMacros.fatG}
                target={targets.fatG}
                unit="g"
                color="#10b981"
              />
            </View>
          );
        })()}

        {/* Zero-Latency Quick Haitian & Global Food Pills with Click Sound Chime */}
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 0.8,
            }}
          >
            QUICK GLOBAL & HAITIAN DISH PILLS · ZERO-LATENCY RING PREVIEW + CHIME
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {BUILTIN_WORLD_FOODS.slice(0, 10).map((dish) => {
              const selected = quickPreviewFood?.id === dish.id;
              return (
                <Pressable
                  key={"pill-" + dish.id}
                  accessibilityRole="button"
                  onPress={() => {
                    playFoodChime();
                    setQuickPreviewFood(selected ? null : dish);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: selected
                      ? "#172554"
                      : pressed
                        ? "#1e293b"
                        : "#09101d",
                    borderWidth: 1,
                    borderColor: selected ? "#38bdf8" : "#1e2f4a",
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Text
                    style={{
                      color: selected ? "#fde047" : "#e2e8f0",
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {dish.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <SegmentedTabs
        items={[
          { id: "log", name: "World Foods" },
          { id: "scan", name: "Scan & Barcode" },
          { id: "planner", name: "Meal Plan AI" },
          { id: "calc", name: "Macro Calc" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as any)}
      />

      {/* =================================================================== */}
      {/* TAB 1: WORLD FOOD DATABASE + TODAY'S LOGGED MEALS                   */}
      {/* =================================================================== */}
      {tab === "log" ? (
        <>
          <Card>
            <View style={s.row}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Globe size={17} color={C.cyan} />
                <Text style={s.heading}>Search Global & Haitian Foods</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCustomFoodModal(true)}
              >
                <Text style={s.link}>+ Create Food</Text>
              </Pressable>
            </View>

            <Field
              label=""
              value={foodQuery}
              onChangeText={setFoodQuery}
              placeholder="Search ANY food in the world (Griot, Jollof, Ramen, Biryani, Shawarma, Tacos, Brand)…"
            />

            <View style={[s.row, { flexWrap: "wrap" }]}>
              <Chips
                items={[
                  { id: "all", name: "All World + Live 3M+" },
                  { id: "haitian", name: "Haitian & Caribbean" },
                  { id: "african", name: "African" },
                  { id: "asian", name: "Asian" },
                  { id: "indian", name: "Indian" },
                  { id: "latin", name: "Latin" },
                  { id: "mediterranean", name: "Med & Euro" },
                  { id: "gym", name: "High-Protein" },
                ]}
                value={regionFilter}
                onChange={setRegionFilter}
              />
              {onlineSearching ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ActivityIndicator size="small" color={C.cyan} />
                  <Text style={{ color: C.cyan, fontSize: 11, fontWeight: "700" }}>
                    Querying USDA + Open Food Facts 3M+…
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 8 }}>
              {combinedFoods.slice(0, 40).map((food) => {
                const serv = macrosForGrams(food, food.servingGrams);
                const isLiveGlobal =
                  food.region === "OpenFoodFacts" || food.region === "USDA Global";
                return (
                  <Pressable
                    key={food.id}
                    accessibilityRole="button"
                    onPress={() => openFoodPortion(food)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: "#05070c",
                      borderWidth: 1,
                      borderColor: isLiveGlobal ? "#1b365d" : "#192334",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text
                          style={{
                            color: "#ffffff",
                            fontWeight: "800",
                            fontSize: 13.5,
                          }}
                        >
                          {food.name}
                        </Text>
                        {food.brand ? (
                          <Text style={{ color: C.cyan, fontSize: 11, fontWeight: "700" }}>
                            · {food.brand}
                          </Text>
                        ) : null}
                        {isLiveGlobal ? (
                          <Badge
                            text={food.region === "USDA Global" ? "USDA GLOBAL" : "WORLD API"}
                            tone="blue"
                          />
                        ) : food.region === "Haitian & Caribbean" ? (
                          <Badge text="CARIBBEAN" tone="red" />
                        ) : null}
                      </View>
                      <Text style={{ color: C.muted, fontSize: 11.5 }}>
                        {food.servingLabel} ({food.servingGrams}g) ·{" "}
                        <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                          {serv.calories} kcal
                        </Text>{" "}
                        · P {serv.proteinG}g · C {serv.carbsG}g · F {serv.fatG}g
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#0e223d",
                        borderWidth: 1,
                        borderColor: "#2463eb",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={16} color="#ffffff" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Today's Logged Meals */}
          <Card>
            <View style={s.row}>
              <Text style={s.heading}>Today's Logged Meals ({meals.length})</Text>
              <Text style={s.small}>{today()}</Text>
            </View>
            {meals.length === 0 ? (
              <Body style={{ fontSize: 12.5 }}>
                Tap any food above, scan a barcode, snap a meal photo, or log a generated meal plan card.
              </Body>
            ) : (
              <View style={{ gap: 8 }}>
                {meals.map((m) => (
                  <View
                    key={m.id}
                    style={{
                      padding: 11,
                      borderRadius: 12,
                      backgroundColor: "#05070c",
                      borderWidth: 1,
                      borderColor: "#182232",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13.5 }}>
                        {m.name}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 11.5 }}>
                        {m.calories} kcal · P {m.proteinG}g · C {m.carbsG}g · F {m.fatG}g · {m.loggedAt}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => m.id && removeMeal(m.id)}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={15} color="#ff6b81" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 2: BARCODE READER + AI MACRO SCANNER                            */}
      {/* =================================================================== */}
      {tab === "scan" ? (
        <>
          <Chips
            items={[
              { id: "barcode", name: "Barcode Reader (UPC / EAN)" },
              { id: "ai", name: "AI Photo & Plate Macro Scanner" },
            ]}
            value={scanMode}
            onChange={(v) => {
              stopBarcodeCamera();
              setScanMode(v as any);
            }}
          />

          {scanMode === "barcode" ? (
            <Card accent="blue">
              <View style={s.row}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Barcode size={18} color={C.cyan} />
                  <Text style={s.heading}>Global Food Barcode Scanner</Text>
                </View>
                <Badge text="3M+ UPC / EAN" tone="blue" />
              </View>

              {cameraActive && Platform.OS === "web" ? (
                <View
                  style={{
                    height: 270,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: "#000000",
                    borderWidth: 2,
                    borderColor: C.cyan,
                    position: "relative",
                  }}
                >
                  {React.createElement("video", {
                    ref: attachBarcodeVideoEl,
                    autoPlay: true,
                    muted: true,
                    playsInline: true,
                    style: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  })}
                  {/* Laser Reticle HUD */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: "14%",
                      right: "14%",
                      top: "22%",
                      bottom: "24%",
                      borderWidth: 1.5,
                      borderColor: "rgba(56, 189, 248, 0.7)",
                      borderRadius: 14,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: "16%",
                      right: "16%",
                      top: "49%",
                      height: 2.5,
                      backgroundColor: C.red,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      right: 12,
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => flipActiveCamera("barcode")}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: "rgba(9, 15, 26, 0.88)",
                        borderWidth: 1,
                        borderColor: C.cyan,
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
                        Flip Camera
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={stopBarcodeCamera}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: "rgba(0,0,0,0.88)",
                        borderWidth: 1,
                        borderColor: "#475569",
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
                        Close Camera
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Button
                      title="📷 Open Live Camera Scanner"
                      onPress={() => startLiveBarcodeCamera()}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Button
                      title="Upload Barcode Photo"
                      secondary
                      onPress={decodeBarcodeFromPickedImage}
                    />
                  </View>
                </View>
              )}

              {cameraBlockedByIframe && Platform.OS === "web" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={openStandaloneCameraTab}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: "#0d1b30",
                    borderWidth: 1,
                    borderColor: C.cyan,
                  }}
                >
                  <ExternalLink size={15} color={C.cyan} />
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12.5 }}>
                    Open Fullscreen Camera Tab (Unlocks Webcam Outside Preview Frame)
                  </Text>
                </Pressable>
              ) : null}

              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Or Type / Paste Any UPC or EAN Barcode"
                    value={barcodeInput}
                    onChangeText={setBarcodeInput}
                    placeholder="e.g. 3017620422003 or 0748927028652"
                    numeric
                  />
                </View>
                <Button
                  title="Lookup"
                  onPress={() => runBarcodeLookup(barcodeInput)}
                  busy={barcodeBusy}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700" }}>
                  QUICK TEST REAL BARCODES:
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { code: "0748927028652", label: "Whey Isolate" },
                    { code: "3017620422003", label: "Nutella" },
                    { code: "8076809513753", label: "Barilla Pasta" },
                    { code: "0689544080602", label: "0% Greek Yogurt" },
                    { code: "0030000010402", label: "Quaker Oats" },
                  ].map((sample) => (
                    <Pressable
                      key={sample.code}
                      accessibilityRole="button"
                      onPress={() => runBarcodeLookup(sample.code)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: "#0e1522",
                        borderWidth: 1,
                        borderColor: "#24324a",
                      }}
                    >
                      <Text style={{ color: C.cyan, fontSize: 11, fontWeight: "700" }}>
                        {sample.label} · {sample.code.slice(-4)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {barcodeMessage ? <Notice text={barcodeMessage} /> : null}

              {scannedBarcodeFood ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: "#050912",
                    borderWidth: 1,
                    borderColor: "#1d4ed8",
                    gap: 10,
                  }}
                >
                  <View style={s.row}>
                    <Badge text={barcodeSourceLabel || "Matched"} tone="green" />
                    <Text style={s.small}>#{scannedBarcodeFood.barcode}</Text>
                  </View>
                  <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800" }}>
                    {scannedBarcodeFood.name}
                    {scannedBarcodeFood.brand ? ` · ${scannedBarcodeFood.brand}` : ""}
                  </Text>
                  <Field
                    label={`Portion in grams (1 serving = ${scannedBarcodeFood.servingGrams}g / ${scannedBarcodeFood.servingLabel})`}
                    value={portionGrams}
                    onChangeText={setPortionGrams}
                    numeric
                  />
                  {(() => {
                    const m = macrosForGrams(
                      scannedBarcodeFood,
                      Number(portionGrams) || scannedBarcodeFood.servingGrams,
                    );
                    return (
                      <View style={s.row}>
                        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
                          {m.calories} kcal · P {m.proteinG}g · C {m.carbsG}g · F {m.fatG}g
                        </Text>
                        <Button
                          small
                          title="+ Log Food"
                          onPress={() =>
                            logMealItem({
                              name: `${scannedBarcodeFood.name} (${m.grams}g)`,
                              ...m,
                            })
                          }
                        />
                      </View>
                    );
                  })()}
                </View>
              ) : null}
            </Card>
          ) : (
            <Card accent="red">
              <View style={s.row}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} color="#ff6b81" />
                  <Text style={s.heading}>AI Meal & Label Macro Scanner</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowVisionSettings((v) => !v)}
                >
                  <Text style={s.link}>
                    {visionCfg.apiKey ? "Vision AI Active ✓" : "Vision API Key"}
                  </Text>
                </Pressable>
              </View>

              {showVisionSettings ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: "#05070c",
                    borderWidth: 1,
                    borderColor: "#24324a",
                    gap: 10,
                  }}
                >
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    Optional: connect your own Gemini or OpenAI key (stored only on this browser/device) for 1-click raw-pixel photo detection. Without a key, Smart Plate NLP below works free & offline.
                  </Text>
                  <Chips
                    items={[
                      { id: "gemini", name: "Google Gemini 2.5 Flash" },
                      { id: "openai", name: "OpenAI GPT-4o-mini" },
                    ]}
                    value={visionCfg.provider}
                    onChange={(p) => {
                      const next = { ...visionCfg, provider: p as any };
                      setVisionCfg(next);
                      saveVisionConfig(next);
                    }}
                  />
                  <Field
                    label="Private Vision API Key"
                    value={visionCfg.apiKey}
                    onChangeText={(k) => {
                      const next = { ...visionCfg, apiKey: k };
                      setVisionCfg(next);
                      saveVisionConfig(next);
                    }}
                    placeholder="AIza... or sk-..."
                  />
                </View>
              ) : null}

              {mealCameraActive && Platform.OS === "web" ? (
                <View
                  style={{
                    height: 300,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: "#000000",
                    borderWidth: 2,
                    borderColor: "#38bdf8",
                    position: "relative",
                  }}
                >
                  {React.createElement("video", {
                    ref: attachMealVideoEl,
                    autoPlay: true,
                    muted: true,
                    playsInline: true,
                    style: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: camFacing === "user" ? "scaleX(-1)" : "none",
                    },
                  })}
                  <PulsingMultimodalReticle />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      right: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => flipActiveCamera("meal")}
                      style={{
                        paddingHorizontal: 13,
                        paddingVertical: 9,
                        borderRadius: 999,
                        backgroundColor: "rgba(9, 15, 26, 0.9)",
                        borderWidth: 1,
                        borderColor: "#334155",
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
                        Mirror / Flip
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={snapLiveMealPhoto}
                      style={{
                        paddingHorizontal: 22,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: "#ff2442",
                        borderWidth: 2,
                        borderColor: "#ffffff",
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 13 }}>
                        📸 SNAP MEAL / LABEL
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={stopAllCameras}
                      style={{
                        paddingHorizontal: 13,
                        paddingVertical: 9,
                        borderRadius: 999,
                        backgroundColor: "rgba(0, 0, 0, 0.88)",
                        borderWidth: 1,
                        borderColor: "#475569",
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
                        Close
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <View style={{ flex: 1, minWidth: 210 }}>
                    <Button
                      crimson
                      title="Activate Live Capture Engine"
                      onPress={() => initializeFoodCamera()}
                      busy={aiBusy}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 165 }}>
                    <Button
                      title="Upload Meal / Label Photo"
                      secondary
                      onPress={pickMealPhoto}
                      busy={aiBusy}
                    />
                  </View>
                  {mealPhotoUri && visionCfg.apiKey.trim() ? (
                    <Button
                      title="Re-Scan with Vision AI"
                      secondary
                      onPress={() => runCloudVision(mealPhotoUri)}
                      busy={aiBusy}
                    />
                  ) : null}
                </View>
              )}

              {cameraBlockedByIframe && Platform.OS === "web" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={openStandaloneCameraTab}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: "#240a12",
                    borderWidth: 1,
                    borderColor: "#ff2442",
                  }}
                >
                  <ExternalLink size={15} color="#ff6b81" />
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12.5 }}>
                    Open Fullscreen Camera Tab (Unlocks Webcam Outside Preview Frame)
                  </Text>
                </Pressable>
              ) : null}

              {mealPhotoUri ? (
                <View
                  style={{
                    height: 195,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: "#000000",
                    borderWidth: 1,
                    borderColor: "#2b3b55",
                  }}
                >
                  <Image
                    source={{ uri: mealPhotoUri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {aiStatus ? <Notice text={aiStatus} /> : null}

              {/* Instant Natural-Language Plate Breakdown */}
              <View style={{ gap: 8 }}>
                <Field
                  label="Smart Plate Analyzer — Type what's on your plate (any weights, cups, pieces, or dishes)"
                  value={plateDescription}
                  onChangeText={setPlateDescription}
                  placeholder="e.g. 200g griot, 1 cup diri ak pwa, 4 bannann peze, half avocado"
                />
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    small
                    title="Calculate Plate Macros"
                    onPress={analyzePlateText}
                  />
                  {[
                    "200g chicken breast, 1.5 cups jasmine rice, half avocado",
                    "180g griot, 1 cup diri ak pwa, 4 bannann peze",
                    "3 whole eggs, 2 slices sourdough bread, 1 banana",
                  ].map((ex, i) => (
                    <Pressable
                      key={i}
                      accessibilityRole="button"
                      onPress={() => {
                        setPlateDescription(ex);
                        setPlateItems(parseNaturalPlateDescription(ex));
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: "#111723",
                        borderWidth: 1,
                        borderColor: "#243147",
                      }}
                    >
                      <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700" }}>
                        Example {i + 1}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {plateItems.length > 0 ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: "#05070c",
                    borderWidth: 1,
                    borderColor: "#26364f",
                    gap: 10,
                  }}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
                    Detected Plate Breakdown ({plateTotals.calories} kcal)
                  </Text>
                  {plateItems.map((it, idx) => {
                    const m = macrosForGrams(it.food, it.grams);
                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          paddingVertical: 6,
                          borderBottomWidth: 1,
                          borderColor: "#141d2b",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>
                            {it.food.name}
                          </Text>
                          <Text style={{ color: C.muted, fontSize: 11 }}>
                            {it.grams}g · {m.calories} kcal · P {m.proteinG}g · C {m.carbsG}g · F {m.fatG}g
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 5 }}>
                          <Pressable
                            onPress={() =>
                              setPlateItems((prev) =>
                                prev.map((row, rIdx) =>
                                  rIdx === idx
                                    ? { ...row, grams: Math.max(10, row.grams - 25) }
                                    : row,
                                ),
                              )
                            }
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: "#131c2b",
                            }}
                          >
                            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}>
                              -25g
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              setPlateItems((prev) =>
                                prev.map((row, rIdx) =>
                                  rIdx === idx ? { ...row, grams: row.grams + 25 } : row,
                                ),
                              )
                            }
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: "#131c2b",
                            }}
                          >
                            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}>
                              +25g
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                  <View style={s.row}>
                    <Text style={{ color: C.cyan, fontWeight: "800", fontSize: 13 }}>
                      Total: {plateTotals.calories} kcal · P {plateTotals.proteinG}g · C {plateTotals.carbsG}g · F {plateTotals.fatG}g
                    </Text>
                    <Button
                      small
                      title="Log Entire Plate"
                      onPress={() =>
                        logMealItem({
                          name:
                            plateItems.map((p) => p.food.name.split("(")[0].trim()).join(" + ").slice(0, 72) ||
                            "Scanned Meal",
                          ...plateTotals,
                        })
                      }
                    />
                  </View>
                </View>
              ) : null}

              {/* Nutrition Facts Label Text Parser */}
              <View style={{ gap: 8, paddingTop: 6, borderTopWidth: 1, borderColor: "#172030" }}>
                <Field
                  label="Or Paste Nutrition Facts Label Text"
                  value={labelOcrText}
                  onChangeText={setLabelOcrText}
                  placeholder="e.g. Calories 240, Total Fat 7g, Total Carb 21g, Protein 24g"
                />
                {parsedLabel ? (
                  <View style={s.row}>
                    <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>
                      Extracted: {parsedLabel.calories} kcal · P {parsedLabel.proteinG}g · C {parsedLabel.carbsG}g · F {parsedLabel.fatG}g
                    </Text>
                    <Button
                      small
                      title="+ Log Label"
                      onPress={() =>
                        logMealItem({
                          name: "Scanned Nutrition Label",
                          ...parsedLabel,
                        })
                      }
                    />
                  </View>
                ) : null}
              </View>
            </Card>
          )}
        </>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 3: PREFERENCE-BASED CUSTOM MEAL PLAN GENERATOR                  */}
      {/* =================================================================== */}
      {tab === "planner" ? (
        <>
          <Card accent="gold">
            <View style={s.row}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ChefHat size={18} color={C.gold} />
                <Text style={s.heading}>Custom Meal Plan Generator</Text>
              </View>
              <Badge text="GRAM-SCALED" tone="gold" />
            </View>

            <View style={s.grid}>
              <View style={{ width: "22%", flexGrow: 1 }}>
                <Field label="Target kcal" value={mpCalories} onChangeText={setMpCalories} numeric />
              </View>
              <View style={{ width: "22%", flexGrow: 1 }}>
                <Field label="Protein (g)" value={mpProtein} onChangeText={setMpProtein} numeric />
              </View>
              <View style={{ width: "22%", flexGrow: 1 }}>
                <Field label="Carbs (g)" value={mpCarbs} onChangeText={setMpCarbs} numeric />
              </View>
              <View style={{ width: "22%", flexGrow: 1 }}>
                <Field label="Fat (g)" value={mpFat} onChangeText={setMpFat} numeric />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>Cuisine Style</Text>
              <Chips
                items={[
                  { id: "all", name: "Global Mix" },
                  { id: "haitian", name: "Haitian & Caribbean" },
                  { id: "gym", name: "High-Protein Gym" },
                  { id: "mediterranean", name: "Mediterranean" },
                  { id: "latin", name: "Latin" },
                ]}
                value={mpCuisine}
                onChange={(v) => setMpCuisine(v as any)}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>Dietary Preference</Text>
              <Chips
                items={[
                  { id: "omnivore", name: "No Restrictions" },
                  { id: "halal_no_pork", name: "No Pork / Halal" },
                  { id: "pescatarian", name: "Pescatarian" },
                  { id: "vegetarian", name: "Vegetarian" },
                  { id: "vegan", name: "Plant-Based / Vegan" },
                ]}
                value={mpDiet}
                onChange={(v) => setMpDiet(v as any)}
              />
            </View>

            <View style={[s.row, { flexWrap: "wrap" }]}>
              <Chips
                items={[
                  { id: "3", name: "3 Meals / Day" },
                  { id: "4", name: "4 Meals / Day" },
                  { id: "5", name: "5 Meals / Day" },
                ]}
                value={String(mpMealsCount)}
                onChange={(v) => setMpMealsCount(Number(v) as 3 | 4 | 5)}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setMpDairyFree((v) => !v)}
                  style={[s.chip, mpDairyFree && s.chipOn]}
                >
                  <Text style={[s.chipText, mpDairyFree && { color: "#ffffff" }]}>
                    Dairy-Free
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMpGlutenFree((v) => !v)}
                  style={[s.chip, mpGlutenFree && s.chipOn]}
                >
                  <Text style={[s.chipText, mpGlutenFree && { color: "#ffffff" }]}>
                    Gluten-Free
                  </Text>
                </Pressable>
              </View>
            </View>

            <Field
              label="Exclude Any Foods / Allergies (comma-separated)"
              value={mpExclude}
              onChangeText={setMpExclude}
              placeholder="e.g. peanuts, shrimp, mushrooms"
            />

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Button
                  title="Generate Custom Meal Plan"
                  onPress={() => {
                    const nextSeed = mpSeed + 1;
                    setMpSeed(nextSeed);
                    buildMealPlanNow(nextSeed);
                  }}
                />
              </View>
              <Button
                secondary
                title={showGrocery ? "Hide Grocery List" : "Grocery List"}
                onPress={() => setShowGrocery((v) => !v)}
              />
            </View>
          </Card>

          {/* Day Summary */}
          <Card style={{ padding: 14 }}>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
                Plan Total: {generatedPlan.dayTotals.calories} kcal
              </Text>
              <Text style={{ color: C.cyan, fontWeight: "700", fontSize: 12.5 }}>
                P {generatedPlan.dayTotals.proteinG}g · C {generatedPlan.dayTotals.carbsG}g · F {generatedPlan.dayTotals.fatG}g
              </Text>
            </View>
          </Card>

          {showGrocery ? (
            <Card accent="green">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ShoppingBag size={17} color={C.green} />
                <Text style={s.heading}>Daily Prep Grocery List</Text>
              </View>
              <View style={{ gap: 6 }}>
                {generatedPlan.groceryList.map((g, idx) => (
                  <View key={idx} style={s.row}>
                    <Text style={{ color: "#ffffff", fontSize: 13 }}>{g.name}</Text>
                    <Text style={{ color: C.muted, fontWeight: "700", fontSize: 12.5 }}>
                      {g.totalGrams}g ({(g.totalGrams / 28.35).toFixed(1)} oz)
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {generatedPlan.meals.map((meal) => (
            <Card key={meal.slotIndex}>
              <View style={s.row}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Badge text={meal.slotName} tone="blue" />
                  <Badge text={meal.cuisineBadge} tone="muted" />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setGeneratedPlan((cur) =>
                      swapSingleMealInPlan(cur, meal.slotIndex, 1),
                    )
                  }
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <RefreshCw size={13} color={C.cyan} />
                  <Text style={s.link}>Swap</Text>
                </Pressable>
              </View>

              <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800" }}>
                {meal.title}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{meal.prepNote}</Text>

              <View
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: "#05070c",
                  borderWidth: 1,
                  borderColor: "#172133",
                  gap: 6,
                }}
              >
                {meal.ingredients.map((ing, i) => (
                  <View key={i} style={s.row}>
                    <Text style={{ color: "#dce7f7", fontSize: 12.5, flex: 1 }}>
                      • {ing.food.name}
                    </Text>
                    <Text style={{ color: C.cyan, fontWeight: "700", fontSize: 12 }}>
                      {ing.household}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={s.row}>
                <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12.5 }}>
                  {meal.totals.calories} kcal · P {meal.totals.proteinG}g · C {meal.totals.carbsG}g · F {meal.totals.fatG}g
                </Text>
                <Button
                  small
                  title="+ Log Meal"
                  onPress={() =>
                    logMealItem({
                      name: `${meal.slotName}: ${meal.title}`,
                      ...meal.totals,
                    })
                  }
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 4: BMR / TDEE / MACRO & HYDRATION CALCULATOR                    */}
      {/* =================================================================== */}
      {tab === "calc" ? (
        <>
          <Card accent="blue">
            <Text style={s.heading}>TDEE, Macro & Hydration Calculator</Text>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <Chips
                items={[
                  { id: "imperial", name: "Imperial (lb / ft·in)" },
                  { id: "metric", name: "Metric (kg / cm)" },
                ]}
                value={unitSystem}
                onChange={(v) => setUnitSystem(v as any)}
              />
              <Chips
                items={[
                  { id: "male", name: "Male" },
                  { id: "female", name: "Female" },
                ]}
                value={sex}
                onChange={(v) => setSex(v as any)}
              />
            </View>

            <View style={s.grid}>
              <View style={s.half}>
                <Field label="Age (years)" value={age} onChangeText={setAge} placeholder="e.g. 27" numeric />
              </View>
              <View style={s.half}>
                <Field
                  label={unitSystem === "imperial" ? "Bodyweight (lb)" : "Bodyweight (kg)"}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={unitSystem === "imperial" ? "e.g. 180" : "e.g. 82"}
                  numeric
                />
              </View>
            </View>

            {unitSystem === "imperial" ? (
              <View style={s.grid}>
                <View style={s.half}>
                  <Field label="Height (ft)" value={heightFt} onChangeText={setHeightFt} placeholder="5" numeric />
                </View>
                <View style={s.half}>
                  <Field label="Height (in)" value={heightIn} onChangeText={setHeightIn} placeholder="10" numeric />
                </View>
              </View>
            ) : (
              <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} placeholder="178" numeric />
            )}

            <Chips
              items={Object.entries(ACTIVITY_FACTORS).map(([id, a]) => ({
                id,
                name: a.label.split(" (")[0],
              }))}
              value={activity}
              onChange={setActivity}
            />

            <Chips
              items={Object.entries(GOAL_ADJUSTMENTS).map(([id, g]) => ({
                id,
                name: g.label.split(" (")[0],
              }))}
              value={goal}
              onChange={setGoal}
            />

            <Chips
              items={[
                { id: "balanced_strength", name: "Balanced Strength" },
                { id: "high_protein_cut", name: "High-Protein Cut" },
                { id: "mass_gain", name: "Lean Mass Gain" },
              ]}
              value={macroPreset}
              onChange={setMacroPreset}
            />

            {energyResult && calcMacros ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: "#05070c",
                  borderWidth: 1,
                  borderColor: "#1f4782",
                  gap: 10,
                }}
              >
                <View style={s.grid}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.small}>BMR</Text>
                    <Text style={s.value}>{energyResult.bmr}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.small}>Maintenance</Text>
                    <Text style={s.value}>{energyResult.tdee}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.small}>Goal Target</Text>
                    <Text style={[s.value, { color: C.cyan }]}>
                      {energyResult.targetCalories}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
                  Daily Macros: {calcMacros.proteinG}g Protein · {calcMacros.carbsG}g Carbs · {calcMacros.fatG}g Fat
                </Text>
                {hydrationRef ? (
                  <Text style={{ color: C.muted, fontSize: 12.5 }}>
                    Hydration: {hydrationRef.totalLiters} L/day ({hydrationRef.fluidOz} oz) · Creatine Monohydrate: {hydrationRef.creatineGrams}g/day
                  </Text>
                ) : null}
                <Button
                  title="Apply Targets to Tracker & Meal Planner"
                  onPress={applyCalculatedTargets}
                />
              </View>
            ) : (
              <Body style={{ fontSize: 12.5 }}>
                Enter your age, bodyweight, and height above to compute Mifflin-St Jeor TDEE, macros, and daily hydration.
              </Body>
            )}
          </Card>
        </>
      ) : null}

      {/* =================================================================== */}
      {/* MODAL: FOOD PORTION ADJUSTER                                        */}
      {/* =================================================================== */}
      <ModalSheet
        visible={Boolean(selectedFood)}
        title={selectedFood?.name || "Log Food"}
        onClose={() => setSelectedFood(null)}
      >
        {selectedFood ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: C.muted, fontSize: 12.5 }}>
              Default serving: {selectedFood.servingLabel} ({selectedFood.servingGrams}g) · {selectedFood.region}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {[0.5, 1, 1.5, 2].map((mult) => (
                <Pressable
                  key={mult}
                  onPress={() =>
                    setPortionGrams(
                      String(Math.round(selectedFood.servingGrams * mult)),
                    )
                  }
                  style={s.chip}
                >
                  <Text style={s.chipText}>
                    {mult}× ({Math.round(selectedFood.servingGrams * mult)}g)
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setPortionGrams("100")} style={s.chip}>
                <Text style={s.chipText}>100g</Text>
              </Pressable>
            </View>
            <Field
              label="Weight in grams (g)"
              value={portionGrams}
              onChangeText={setPortionGrams}
              numeric
            />
            {(() => {
              const m = macrosForGrams(selectedFood, Number(portionGrams) || 0);
              return (
                <>
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: "#0c1320",
                      borderWidth: 1,
                      borderColor: "#22334d",
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 16 }}>
                      {m.calories} kcal · P {m.proteinG}g · C {m.carbsG}g · F {m.fatG}g
                    </Text>
                  </View>
                  <Button
                    title="Add to Today's Fuel"
                    onPress={() => {
                      logMealItem({
                        name: `${selectedFood.name} (${m.grams}g)`,
                        ...m,
                      });
                      setSelectedFood(null);
                    }}
                  />
                </>
              );
            })()}
          </View>
        ) : null}
      </ModalSheet>

      {/* =================================================================== */}
      {/* MODAL: CREATE CUSTOM FOOD / BARCODE                                 */}
      {/* =================================================================== */}
      <ModalSheet
        visible={customFoodModal}
        title="Add Custom Food to Catalog"
        onClose={() => setCustomFoodModal(false)}
      >
        <Field label="Food Name" value={cfName} onChangeText={setCfName} placeholder="e.g. Homemade Pate Kode" />
        <Field label="Brand / Restaurant (optional)" value={cfBrand} onChangeText={setCfBrand} placeholder="Optional" />
        <View style={s.grid}>
          <View style={s.half}>
            <Field label="Serving Grams (g)" value={cfGrams} onChangeText={setCfGrams} numeric />
          </View>
          <View style={s.half}>
            <Field label="Barcode (optional)" value={cfBarcode} onChangeText={setCfBarcode} numeric />
          </View>
        </View>
        <View style={s.grid}>
          <View style={{ width: "22%", flexGrow: 1 }}>
            <Field label="Calories" value={cfKcal} onChangeText={setCfKcal} numeric />
          </View>
          <View style={{ width: "22%", flexGrow: 1 }}>
            <Field label="Protein (g)" value={cfP} onChangeText={setCfP} numeric />
          </View>
          <View style={{ width: "22%", flexGrow: 1 }}>
            <Field label="Carbs (g)" value={cfC} onChangeText={setCfC} numeric />
          </View>
          <View style={{ width: "22%", flexGrow: 1 }}>
            <Field label="Fat (g)" value={cfF} onChangeText={setCfF} numeric />
          </View>
        </View>
        <Button
          title="Save Food & Open Portion"
          onPress={() => {
            try {
              const saved = saveCustomWorldFood({
                name: cfName,
                brand: cfBrand,
                servingGrams: Number(cfGrams) || 100,
                caloriesPerServing: Number(cfKcal) || 0,
                proteinPerServing: Number(cfP) || 0,
                carbsPerServing: Number(cfC) || 0,
                fatPerServing: Number(cfF) || 0,
                barcode: cfBarcode,
              });
              setCustomRefreshTick((t) => t + 1);
              setCustomFoodModal(false);
              openFoodPortion(saved);
            } catch (e: any) {
              flash(e?.message || "Invalid food details.");
            }
          }}
        />
      </ModalSheet>
    </Screen>
  );
}
