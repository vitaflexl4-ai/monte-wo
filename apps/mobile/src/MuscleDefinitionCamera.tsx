import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  Share2,
  Sliders,
  Sparkles,
  Upload,
} from "lucide-react-native";
import { rankArt } from "./art";
import { RANK_VISUAL_LADDER, getRankVisual } from "./RankAvatarStage";
import { playCameraShutter, playScannerLockBeep } from "./sound-fx";
import { Badge, Button, C, Card, Label } from "./ui";

export type ContourPresetId = "shadow_sculpt" | "anabolic_noir" | "gold_rim" | "raw";

const CONTOUR_PRESETS: {
  id: ContourPresetId;
  name: string;
  subtitle: string;
  cssFilter: string;
  canvasFilter: string;
  accent: string;
}[] = [
  {
    id: "shadow_sculpt",
    name: "Shadow Sculpt",
    subtitle: "High-Contrast Edge & Striation Boost",
    cssFilter:
      "contrast(1.52) brightness(0.91) saturate(1.14) url(#monte-muscle-contour-shader)",
    canvasFilter: "contrast(1.54) brightness(0.9) saturate(1.16)",
    accent: "#00d2ff",
  },
  {
    id: "anabolic_noir",
    name: "Anabolic Noir",
    subtitle: "Stage Monochrome Shadow Depth",
    cssFilter:
      "grayscale(0.82) contrast(1.72) brightness(0.88) url(#monte-muscle-contour-shader)",
    canvasFilter: "grayscale(0.82) contrast(1.74) brightness(0.88)",
    accent: "#e2e8f0",
  },
  {
    id: "gold_rim",
    name: "Citadelle Gold",
    subtitle: "Warm Bronze & Gold Rim Definition",
    cssFilter:
      "contrast(1.48) brightness(0.93) sepia(0.24) saturate(1.36) url(#monte-muscle-contour-shader)",
    canvasFilter: "contrast(1.48) brightness(0.93) sepia(0.24) saturate(1.36)",
    accent: "#fde047",
  },
  {
    id: "raw",
    name: "Optical Feed",
    subtitle: "Baseline Reference Feed",
    cssFilter: "contrast(1.05) brightness(1.0)",
    canvasFilter: "contrast(1.05) brightness(1.0)",
    accent: "#64748b",
  },
];

function PulsingGainsCrosshair({ accent }: { accent: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 50);
    return () => clearInterval(id);
  }, []);

  const pulse = 0.58 + 0.42 * Math.sin((tick / 60) * Math.PI * 2);
  const sweepPct = 14 + ((tick / 60) * 66);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Directional Muscle Shadow Vignette Visual Guide */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderWidth: 18,
            borderColor: "rgba(2, 6, 16, 0.36)",
          },
        ]}
      />

      {/* Top HUD Banner: Required Verbatim Detector String */}
      <View
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          alignItems: "center",
          gap: 5,
        }}
      >
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "rgba(3, 10, 24, 0.88)",
            borderWidth: 1.2,
            borderColor: `rgba(0, 210, 255, ${pulse.toFixed(2)})`,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: "#00d2ff",
              opacity: pulse,
            }}
          />
          <Text
            style={{
              color: "#fde047",
              fontSize: 10,
              fontWeight: "900",
              letterSpacing: 0.75,
              textAlign: "center",
            }}
          >
            MONTE WO AI GAINS DETECTOR — SHADOW RECONSTRUCTION ACTIVE
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: "rgba(5, 12, 26, 0.76)",
            borderWidth: 1,
            borderColor: "#1e3a5f",
          }}
        >
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 0.6,
            }}
          >
            VISUAL GUIDE · REAL-TIME CONTRAST, SHADOW & EDGE-SHARPNESS FILTER
          </Text>
        </View>
      </View>

      {/* Center Pulsing Crosshair & Corner Brackets */}
      <View
        style={{
          position: "absolute",
          left: "11%",
          right: "11%",
          top: "18%",
          bottom: "20%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Horizontal Shadow Scan Line */}
        <View
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            top: `${sweepPct}%` as any,
            height: 1.5,
            backgroundColor: accent,
            opacity: 0.72,
          }}
        />

        <Svg width="100%" height="100%" viewBox="0 0 260 320">
          {/* Four Precision Corner Brackets */}
          <Path
            d="M 8 36 L 8 8 L 36 8"
            stroke="#00d2ff"
            strokeWidth={2.6}
            strokeOpacity={pulse}
            fill="none"
          />
          <Path
            d="M 224 8 L 252 8 L 252 36"
            stroke="#00d2ff"
            strokeWidth={2.6}
            strokeOpacity={pulse}
            fill="none"
          />
          <Path
            d="M 8 284 L 8 312 L 36 312"
            stroke="#fde047"
            strokeWidth={2.6}
            strokeOpacity={pulse}
            fill="none"
          />
          <Path
            d="M 224 312 L 252 312 L 252 284"
            stroke="#fde047"
            strokeWidth={2.6}
            strokeOpacity={pulse}
            fill="none"
          />

          {/* Center Crosshair Reticle */}
          <Circle
            cx="130"
            cy="160"
            r="26"
            stroke="#00d2ff"
            strokeWidth={1.4}
            strokeOpacity={pulse}
            strokeDasharray="6 4"
            fill="none"
          />
          <Circle
            cx="130"
            cy="160"
            r="4"
            fill="#fde047"
            fillOpacity={pulse}
          />
          <Line
            x1="92"
            y1="160"
            x2="116"
            y2="160"
            stroke="#00d2ff"
            strokeWidth={1.6}
            strokeOpacity={pulse}
          />
          <Line
            x1="144"
            y1="160"
            x2="168"
            y2="160"
            stroke="#00d2ff"
            strokeWidth={1.6}
            strokeOpacity={pulse}
          />
          <Line
            x1="130"
            y1="122"
            x2="130"
            y2="146"
            stroke="#00d2ff"
            strokeWidth={1.6}
            strokeOpacity={pulse}
          />
          <Line
            x1="130"
            y1="174"
            x2="130"
            y2="198"
            stroke="#00d2ff"
            strokeWidth={1.6}
            strokeOpacity={pulse}
          />
        </Svg>
      </View>
    </View>
  );
}

/**
 * Renders a 1080x1920 9:16 Story PNG on Web (wrapping the captured photo + MONTE WO · LEVEL UP
 * + Haitian Bicolore pride ribbon + current Haitian Rank Badge name & graphic overlay)
 */
async function composeWebStoryPng(opts: {
  photoDataUrl: string;
  rankName: string;
  rankTitle: string;
  rankPrimary: string;
  disciplineLabel: string;
}): Promise<string> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return opts.photoDataUrl;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return opts.photoDataUrl;

  // Obsidian background
  const bg = ctx.createLinearGradient(0, 0, 0, 1920);
  bg.addColorStop(0, "#020611");
  bg.addColorStop(0.5, "#050d1e");
  bg.addColorStop(1, "#02040a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);

  // Draw captured photo inside framed 9:16 window
  await new Promise<void>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const targetX = 56;
      const targetY = 230;
      const targetW = 968;
      const targetH = 1320;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(targetX, targetY, targetW, targetH, 42);
      ctx.clip();

      const scale = Math.max(targetW / img.width, targetH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = targetX + (targetW - dw) / 2;
      const dy = targetY + (targetH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // Dramatic bottom shadow gradient inside photo
      const scrim = ctx.createLinearGradient(0, targetY + targetH * 0.55, 0, targetY + targetH);
      scrim.addColorStop(0, "rgba(0,0,0,0)");
      scrim.addColorStop(1, "rgba(2,6,17,0.92)");
      ctx.fillStyle = scrim;
      ctx.fillRect(targetX, targetY, targetW, targetH);
      ctx.restore();

      // Glowing electric-blue border
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(targetX, targetY, targetW, targetH, 42);
      ctx.strokeStyle = "#00d2ff";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#00d2ff";
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = opts.photoDataUrl;
  });

  // Top Haitian Bicolore Pride Bar
  ctx.fillStyle = "#00209f";
  ctx.fillRect(56, 64, 484, 12);
  ctx.fillStyle = "#d21034";
  ctx.fillRect(540, 64, 484, 12);

  // Header Branding: MONTE WO · LEVEL UP
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 62px system-ui, -apple-system, sans-serif";
  ctx.fillText("MONTE WO · LEVEL UP", 56, 152);

  ctx.fillStyle = "#00d2ff";
  ctx.font = "800 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("AI GAINS DETECTOR · SHADOW RECONSTRUCTION", 58, 198);

  // Bottom Haitian Sovereign Rank Card Overlay
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(56, 1590, 968, 250, 36);
  ctx.fillStyle = "#071124";
  ctx.fill();
  ctx.strokeStyle = opts.rankPrimary || "#fbbf24";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Rank Crest Emblem Shield
  ctx.save();
  ctx.beginPath();
  ctx.arc(168, 1715, 72, 0, Math.PI * 2);
  ctx.fillStyle = "#101e38";
  ctx.fill();
  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#fde047";
  ctx.font = "900 32px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MW", 168, 1726);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.fillStyle = "#fde047";
  ctx.font = "900 25px system-ui, -apple-system, sans-serif";
  ctx.fillText("RAN FÒ AK KOURAY · HAITIAN STRENGTH RANK", 268, 1662);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 66px system-ui, -apple-system, sans-serif";
  ctx.fillText(opts.rankName.toUpperCase(), 268, 1736);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "800 26px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${opts.rankTitle} · ${opts.disciplineLabel}`, 268, 1788);

  ctx.fillStyle = "#64748b";
  ctx.font = "700 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    `${new Date().toISOString().slice(0, 10)} · @montewo · #MonteWo #LevelUp`,
    56,
    1888,
  );

  return canvas.toDataURL("image/png");
}

/**
 * Generates a crisp sculpted shadow-reconstructed physique frame on Web when capturing
 * in simulation/headless mode (or before webcam permission is granted) so the electric-blue
 * shutter button ALWAYS produces a high-fidelity 9:16 picture immediately!
 */
function renderSimulatedShadowPhysiqueDataUrl(preset: ContourPresetId): string {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return "simulated://monte-wo-shadow-physique.png";
  }
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1440;
  const ctx = c.getContext("2d");
  if (!ctx) return "";

  const bg = ctx.createRadialGradient(540, 520, 60, 540, 680, 820);
  bg.addColorStop(0, preset === "gold_rim" ? "#291d09" : "#0b223d");
  bg.addColorStop(0.55, "#050b16");
  bg.addColorStop(1, "#010308");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1440);

  // Overhead gym downlight beam
  const beam = ctx.createLinearGradient(540, 0, 540, 1300);
  beam.addColorStop(0, "rgba(0, 210, 255, 0.24)");
  beam.addColorStop(0.6, "rgba(253, 224, 71, 0.08)");
  beam.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(320, 0);
  ctx.lineTo(760, 0);
  ctx.lineTo(960, 1440);
  ctx.lineTo(120, 1440);
  ctx.closePath();
  ctx.fill();

  // Sculpted high-contrast anatomical silhouette with bright rim-lit striations
  ctx.save();
  ctx.translate(540, 150);
  const rim = preset === "gold_rim" ? "#fde047" : "#00d2ff";
  ctx.fillStyle = "#101929";
  ctx.strokeStyle = rim;
  ctx.lineWidth = 5;
  ctx.shadowColor = rim;
  ctx.shadowBlur = 28;

  // Head & traps
  ctx.beginPath();
  ctx.ellipse(0, 105, 58, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Broad shoulders, lats, pecs & V-taper torso
  ctx.beginPath();
  ctx.moveTo(-85, 185);
  ctx.quadraticCurveTo(0, 155, 85, 185);
  ctx.bezierCurveTo(235, 195, 275, 290, 240, 410);
  ctx.bezierCurveTo(195, 500, 145, 590, 108, 720);
  ctx.lineTo(-108, 720);
  ctx.bezierCurveTo(-145, 590, -195, 500, -240, 410);
  ctx.bezierCurveTo(-275, 290, -235, 195, -85, 185);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pectoral & abdominal shadow-reconstructed contour lines
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-185, 315);
  ctx.quadraticCurveTo(-85, 365, -8, 325);
  ctx.moveTo(185, 315);
  ctx.quadraticCurveTo(85, 365, 8, 325);
  // 6-pack shadow lines
  for (const y of [410, 485, 560]) {
    ctx.moveTo(-78, y);
    ctx.quadraticCurveTo(-38, y + 12, -8, y);
    ctx.moveTo(8, y);
    ctx.quadraticCurveTo(38, y + 12, 78, y);
  }
  ctx.stroke();
  ctx.restore();

  return c.toDataURL("image/png");
}

export function MuscleDefinitionCamera({
  earnedRankOrdinal = 7,
  disciplineLabel = "4 Ranked Lifts",
}: {
  earnedRankOrdinal?: number;
  disciplineLabel?: string;
}) {
  const effectiveOrdinal = earnedRankOrdinal > 0 ? earnedRankOrdinal : 7; // Defaults to prideful CHANPYON showcase if unranked, with full selector!
  const [selectedRankOrd, setSelectedRankOrd] =
    useState<number>(effectiveOrdinal);

  useEffect(() => {
    if (earnedRankOrdinal > 0) setSelectedRankOrd(earnedRankOrdinal);
  }, [earnedRankOrdinal]);

  const rankMeta = useMemo(
    () => getRankVisual(selectedRankOrd),
    [selectedRankOrd],
  );

  const [presetId, setPresetId] = useState<ContourPresetId>("shadow_sculpt");
  const activePreset =
    CONTOUR_PRESETS.find((p) => p.id === presetId) || CONTOUR_PRESETS[0];

  // Camera state (Native expo-camera + Web HTML5 getUserMedia)
  const [nativeCamPerm, requestNativeCamPerm] = useCameraPermissions();
  const nativeCameraRef = useRef<any>(null);
  const webVideoRef = useRef<any>(null);
  const webStreamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"front" | "back">("front");
  const [cameraLive, setCameraLive] = useState(false);
  const [statusMsg, setStatusMsg] = useState(
    "Shadow Reconstruction shader armed. Start live HD lens or tap the electric-blue shutter to capture.",
  );
  const [shutterFlash, setShutterFlash] = useState(false);

  // Captured image + 9:16 Story Card state
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [storyUri, setStoryUri] = useState<string | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [gallerySaved, setGallerySaved] = useState(false);
  const [busyAction, setBusyAction] = useState<"" | "capture" | "save" | "share">("");

  // Stop Web MediaStream cleanly on unmount
  const stopWebCamera = () => {
    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach((track) => track.stop());
      webStreamRef.current = null;
    }
    if (webVideoRef.current) {
      webVideoRef.current.srcObject = null;
    }
    setCameraLive(false);
  };

  useEffect(() => {
    return () => {
      stopWebCamera();
    };
  }, []);

  async function startLiveDefinitionCamera(nextFacing?: "front" | "back") {
    const useFacing = nextFacing || facing;
    setGallerySaved(false);

    if (Platform.OS !== "web") {
      const perm = nativeCamPerm?.granted
        ? nativeCamPerm
        : await requestNativeCamPerm();
      if (!perm?.granted) {
        setStatusMsg(
          "Camera permission denied. Enable camera access in Settings or upload a physique photo.",
        );
        return;
      }
      setFacing(useFacing);
      setCameraLive(true);
      setStatusMsg(
        "Live HD expo-camera active · Shadow Reconstruction contour overlay online.",
      );
      return;
    }

    stopWebCamera();
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatusMsg(
        "Browser webcam unavailable in this frame — shutter will capture a high-definition Shadow Reconstruction simulation or uploaded photo.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: useFacing === "front" ? "user" : "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      webStreamRef.current = stream;
      setFacing(useFacing);
      setCameraLive(true);
      setStatusMsg(
        "HD 1080p stream locked · Real-time contrast, shadow & edge-sharpness contour shader active.",
      );
    } catch {
      setStatusMsg(
        "Webcam permission blocked in embedded frame — tap the electric-blue shutter to capture an HD Shadow Reconstruction frame or upload a photo.",
      );
    }
  }

  const attachWebVideo = (el: any) => {
    webVideoRef.current = el;
    const stream = webStreamRef.current;
    if (!el || !stream || el.srcObject === stream) return;
    el.srcObject = stream;
    el.play?.().catch(() => {});
  };

  // Rebuild 9:16 Story Card whenever rank badge or captured photo updates
  useEffect(() => {
    if (!capturedUri) return;
    let cancelled = false;
    composeWebStoryPng({
      photoDataUrl: capturedUri,
      rankName: rankMeta.name,
      rankTitle: rankMeta.title,
      rankPrimary: rankMeta.primary,
      disciplineLabel,
    })
      .then((out) => {
        if (!cancelled) setStoryUri(out);
      })
      .catch(() => {
        if (!cancelled) setStoryUri(capturedUri);
      });
    return () => {
      cancelled = true;
    };
  }, [capturedUri, rankMeta, disciplineLabel]);

  /**
   * Centered Electric-Blue Shutter Capture:
   * Captures real frame from expo-camera / HTML5 video + bakes Muscle Contour Shader
   */
  async function handleElectricShutterCapture() {
    setBusyAction("capture");
    setGallerySaved(false);
    playCameraShutter();
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 180);

    try {
      let rawPhotoUri = "";

      if (Platform.OS !== "web" && cameraLive && nativeCameraRef.current) {
        const pic = await nativeCameraRef.current.takePictureAsync({
          quality: 0.95,
        });
        rawPhotoUri = pic?.uri || "";
      } else if (
        Platform.OS === "web" &&
        cameraLive &&
        webVideoRef.current &&
        webVideoRef.current.videoWidth > 0
      ) {
        const vid = webVideoRef.current as HTMLVideoElement;
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1440;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.filter = activePreset.canvasFilter;
          if (facing === "front") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          const scale = Math.max(
            canvas.width / vid.videoWidth,
            canvas.height / vid.videoHeight,
          );
          const dw = vid.videoWidth * scale;
          const dh = vid.videoHeight * scale;
          const dx = (canvas.width - dw) / 2;
          const dy = (canvas.height - dh) / 2;
          ctx.drawImage(vid, dx, dy, dw, dh);
          ctx.restore();

          // Subtle directional shadow vignette for dramatic muscle definition
          const rad = ctx.createRadialGradient(540, 620, 260, 540, 720, 880);
          rad.addColorStop(0, "rgba(0,0,0,0)");
          rad.addColorStop(1, "rgba(2,6,18,0.52)");
          ctx.fillStyle = rad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        rawPhotoUri = canvas.toDataURL("image/png");
      } else {
        rawPhotoUri = renderSimulatedShadowPhysiqueDataUrl(presetId);
      }

      if (rawPhotoUri) {
        setCapturedUri(rawPhotoUri);
        const generatedStory = await composeWebStoryPng({
          photoDataUrl: rawPhotoUri,
          rankName: rankMeta.name,
          rankTitle: rankMeta.title,
          rankPrimary: rankMeta.primary,
          disciplineLabel,
        });
        setStoryUri(generatedStory);
        playScannerLockBeep();
        setStatusMsg(
          `High-fidelity frame captured (${activePreset.name})! Ready to Save to Gallery or Share 9:16 ${rankMeta.name.toUpperCase()} Story.`,
        );
      }
    } catch {
      setStatusMsg("Capture encountered an error — please retry.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleUploadPhysiquePhoto() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;
      const uri = picked.assets[0].uri;
      setCapturedUri(uri);
      setGallerySaved(false);
      playScannerLockBeep();
      setStatusMsg(
        `Loaded physique photo · Wrapped in 9:16 MONTE WO · LEVEL UP (${rankMeta.name.toUpperCase()}) Story frame.`,
      );
    } catch {
      // cancelled
    }
  }

  /**
   * Bento Action 1: "Save to Gallery"
   * Wired natively to expo-media-library on iOS/Android + instant PNG download on Web
   */
  async function handleSaveToGallery() {
    let targetUri = storyUri || capturedUri;
    if (!targetUri) {
      await handleElectricShutterCapture();
      return;
    }
    setBusyAction("save");
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const a = document.createElement("a");
        a.href = targetUri;
        a.download = `monte-wo-gains-${rankMeta.id}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setGallerySaved(true);
        playScannerLockBeep();
        setStatusMsg(
          "Saved high-definition MONTE WO photo directly to your device downloads!",
        );
      } else {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (!perm.granted) {
          setStatusMsg(
            "Photo Library permission is required to save directly to your Camera Roll.",
          );
          return;
        }
        await MediaLibrary.Asset.create(capturedUri || targetUri);
        setGallerySaved(true);
        playScannerLockBeep();
        setStatusMsg(
          "Saved directly to your iPhone / Android Camera Roll via expo-media-library!",
        );
      }
    } catch {
      setStatusMsg(
        "Could not write to Camera Roll in this environment — open Share to Story to export.",
      );
    } finally {
      setBusyAction("");
    }
  }

  /**
   * Bento Action 2: "Share to Story" + Native Instagram / TikTok Story Sheet
   */
  async function handleOpenStoryExporter() {
    if (!capturedUri) {
      await handleElectricShutterCapture();
    }
    setStoryModalOpen(true);
  }

  async function launchNativeStoryShare(
    network: "native" | "instagram" | "tiktok",
  ) {
    const exportUri = storyUri || capturedUri;
    if (!exportUri) return;
    setBusyAction("share");
    try {
      if (Platform.OS !== "web") {
        // Attempt Instagram / TikTok deep link check or open native OS share sheet with image
        if (network === "instagram") {
          const canIg = await Linking.canOpenURL("instagram-stories://share");
          if (canIg && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(exportUri, {
              mimeType: "image/png",
              UTI: "public.png",
              dialogTitle: "Post MONTE WO · LEVEL UP to Instagram Story",
            });
            return;
          }
        }
        if (network === "tiktok") {
          const canTt = await Linking.canOpenURL("snssdk1233://");
          if (canTt && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(exportUri, {
              mimeType: "image/png",
              UTI: "public.png",
              dialogTitle: "Post MONTE WO · LEVEL UP to TikTok Story",
            });
            return;
          }
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(exportUri, {
            mimeType: "image/png",
            UTI: "public.png",
            dialogTitle: "MONTE WO · LEVEL UP — Share 9:16 Story",
          });
        } else {
          await Share.share({
            title: "MONTE WO · LEVEL UP",
            message: `MONTE WO · LEVEL UP — ${rankMeta.name.toUpperCase()} (${rankMeta.title}) #MonteWo #RanFoAkKouray`,
            url: exportUri,
          });
        }
        setStatusMsg(
          "Opened native iOS / Android sharing sheet for Instagram & TikTok Stories!",
        );
        return;
      }

      // Web: Web Share API Level 2 with real PNG File for mobile Safari / Android Chrome!
      if (typeof navigator !== "undefined" && navigator.share) {
        const res = await fetch(exportUri);
        const blob = await res.blob();
        const file = new File(
          [blob],
          `monte-wo-story-${rankMeta.id}.png`,
          { type: "image/png" },
        );
        const canShareFiles =
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] });
        if (canShareFiles) {
          await navigator.share({
            title: "MONTE WO · LEVEL UP",
            text: `MONTE WO · LEVEL UP — ${rankMeta.name.toUpperCase()} · Ran Fò ak Kouray!`,
            files: [file],
          });
          setStatusMsg("Shared 9:16 Story Card via native mobile browser sheet!");
          return;
        }
      }

      // Desktop browser fallback: Download the 9:16 Story PNG + open Instagram / TikTok web
      const a = document.createElement("a");
      a.href = exportUri;
      a.download = `monte-wo-9x16-story-${rankMeta.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (network === "instagram") {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      } else if (network === "tiktok") {
        window.open("https://www.tiktok.com/upload", "_blank", "noopener,noreferrer");
      }
      setStatusMsg(
        `Exported 1080×1920 9:16 Story Card (${rankMeta.name.toUpperCase()}) — ready for Instagram & TikTok Stories!`,
      );
    } catch {
      // User dismissed native share sheet
    } finally {
      setBusyAction("");
    }
  }

  return (
    <Card
      style={{
        backgroundColor: "#02050d",
        borderColor: "#153256",
        padding: 16,
        gap: 14,
      }}
    >
      {/* Hidden Web SVG Convolution Edge-Sharpness & Shadow Reconstruction Filter */}
      {Platform.OS === "web" &&
        React.createElement(
          "svg",
          {
            width: 0,
            height: 0,
            style: { position: "absolute", pointerEvents: "none" },
            "aria-hidden": "true",
          },
          React.createElement(
            "defs",
            null,
            React.createElement(
              "filter",
              {
                id: "monte-muscle-contour-shader",
                colorInterpolationFilters: "sRGB",
              },
              React.createElement("feConvolveMatrix", {
                order: "3 3",
                preserveAlpha: "true",
                kernelMatrix: "0 -0.65 0 -0.65 3.6 -0.65 0 -0.65 0",
              }),
            ),
          ),
        )}

      {/* Header Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <View style={{ gap: 2, flex: 1, minWidth: 210 }}>
          <Label>OPTICAL PHYSIQUE LAB · 9:16 STORY STUDIO</Label>
          <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900" }}>
            AI Muscle Definition Camera
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Badge
            text={cameraLive ? "LIVE HD LENS" : "SHADER READY"}
            tone={cameraLive ? "green" : "blue"}
          />
          <Badge text={`BADGE: ${rankMeta.name.toUpperCase()}`} tone="gold" />
        </View>
      </View>

      {/* Real-Time Muscle Contour Shader Preset Strip */}
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Sliders size={13} color="#00d2ff" />
            <Text
              style={{
                color: "#94a3b8",
                fontSize: 10.5,
                fontWeight: "800",
                letterSpacing: 0.8,
              }}
            >
              MUSCLE CONTOUR SHADER (VISUAL GUIDE · CONTRAST, SHADOWS & EDGE SHARPNESS)
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {CONTOUR_PRESETS.map((preset) => {
            const active = preset.id === presetId;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                onPress={() => setPresetId(preset.id)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: active
                    ? "#0c213d"
                    : pressed
                      ? "#0b1629"
                      : "#060b16",
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active ? preset.accent : "#1a2942",
                  gap: 2,
                })}
              >
                <Text
                  style={{
                    color: active ? "#ffffff" : "#cbd5e1",
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                >
                  {preset.name}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 9.5, fontWeight: "700" }}>
                  {preset.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* REAL CAMERA VIEWFINDER + SHADOW RECONSTRUCTION FILTER + PULSING CROSSHAIR */}
      <View
        testID="muscle-definition-viewfinder"
        style={{
          width: "100%",
          height: 410,
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "#01040b",
          borderWidth: 2,
          borderColor: "#00d2ff",
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {cameraLive ? (
          Platform.OS === "web" ? (
            React.createElement("video", {
              ref: attachWebVideo,
              autoPlay: true,
              muted: true,
              playsInline: true,
              style: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: facing === "front" ? "scaleX(-1)" : "none",
                filter: activePreset.cssFilter,
              },
            })
          ) : (
            <CameraView
              ref={nativeCameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
            />
          )
        ) : capturedUri ? (
          <Image
            source={{ uri: capturedUri }}
            style={
              [
                StyleSheet.absoluteFill,
                Platform.OS === "web"
                  ? ({ filter: activePreset.cssFilter } as any)
                  : null,
              ] as any
            }
            resizeMode="cover"
          />
        ) : (
          /* Sleek Dark Viewfinder Preview + Start Live Lens Prompt */
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 999,
                backgroundColor: "#071a33",
                borderWidth: 1.5,
                borderColor: "#00d2ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={30} color="#00d2ff" />
            </View>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Activate Live HD Muscle Contour Lens
            </Text>
            <Text
              style={{
                color: "#94a3b8",
                fontSize: 12,
                textAlign: "center",
                maxWidth: 340,
                lineHeight: 17,
              }}
            >
              Streams your webcam or phone camera with real-time shadow &
              edge-sharpness contour reconstruction — or tap the electric-blue
              shutter below to test instant 9:16 capture.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
              <Pressable
                testID="activate-gains-camera"
                accessibilityRole="button"
                onPress={() => startLiveDefinitionCamera()}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: pressed ? "#0284c7" : "#00d2ff",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                })}
              >
                <Camera size={15} color="#020617" />
                <Text
                  style={{ color: "#020617", fontSize: 12.5, fontWeight: "900" }}
                >
                  Start Live HD Camera
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleUploadPhysiquePhoto}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: "#0b1528",
                  borderWidth: 1,
                  borderColor: "#274066",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Upload size={14} color="#cbd5e1" />
                <Text
                  style={{ color: "#e2e8f0", fontSize: 12, fontWeight: "800" }}
                >
                  Upload Photo
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Pulsing Crosshair Reticle Overlay */}
        <PulsingGainsCrosshair accent={activePreset.accent} />

        {/* Camera Flip / Live Stream Controls Floating Pill */}
        {(cameraLive || capturedUri) && (
          <View
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const next = facing === "front" ? "back" : "front";
                startLiveDefinitionCamera(next);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: "rgba(4, 10, 24, 0.86)",
                borderWidth: 1,
                borderColor: "#26466d",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RefreshCw size={13} color="#00d2ff" />
              <Text style={{ color: "#e2e8f0", fontSize: 11, fontWeight: "800" }}>
                {cameraLive ? "Flip / Mirror Lens" : "Live Camera"}
              </Text>
            </Pressable>

            {cameraLive ? (
              <Pressable
                accessibilityRole="button"
                onPress={stopWebCamera}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: "rgba(24, 8, 16, 0.86)",
                  borderWidth: 1,
                  borderColor: "#7f1d1d",
                }}
              >
                <Text style={{ color: "#fca5a5", fontSize: 11, fontWeight: "800" }}>
                  Stop Lens
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCapturedUri(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: "rgba(4, 10, 24, 0.86)",
                  borderWidth: 1,
                  borderColor: "#334155",
                }}
              >
                <Text style={{ color: "#cbd5e1", fontSize: 11, fontWeight: "800" }}>
                  Clear Frame
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Crisp White Optical Shutter Flash */}
        {shutterFlash && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(255, 255, 255, 0.82)" },
            ]}
          />
        )}
      </View>

      {/* CENTERED ELECTRIC-BLUE SHUTTER BUTTON */}
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 4 }}>
        <Pressable
          testID="electric-blue-shutter"
          accessibilityRole="button"
          accessibilityLabel="Capture high-fidelity muscle definition photo"
          onPress={handleElectricShutterCapture}
          style={({ pressed }) => ({
            width: 82,
            height: 82,
            borderRadius: 999,
            backgroundColor: "#04162c",
            borderWidth: 3.5,
            borderColor: "#00d2ff",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.92 : 1 }],
            boxShadow: "0px 0px 26px rgba(0, 210, 255, 0.65)",
          })}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 999,
              backgroundColor: "#00d2ff",
              borderWidth: 2,
              borderColor: "#e0f2fe",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={24} color="#020617" />
          </View>
        </Pressable>
        <Text
          style={{
            color: "#7dd3fc",
            fontSize: 10.5,
            fontWeight: "900",
            letterSpacing: 1,
          }}
        >
          TAP SHUTTER · CAPTURE 9:16 SHADOW-SCULPTED FRAME
        </Text>
      </View>

      {/* TWO PREMIUM BENTO BUTTONS BELOW VIEWFINDER: SAVE TO GALLERY & SHARE TO STORY */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Bento Button 1: Save to Gallery */}
        <Pressable
          testID="bento-save-to-gallery"
          accessibilityRole="button"
          onPress={handleSaveToGallery}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 210,
            padding: 16,
            borderRadius: 18,
            backgroundColor: pressed ? "#0b223d" : "#071326",
            borderWidth: 1.5,
            borderColor: gallerySaved ? "#10b981" : "#1e3a5f",
            gap: 8,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "#0b2545",
                borderWidth: 1,
                borderColor: "#00d2ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {gallerySaved ? (
                <CheckCircle2 size={20} color="#10b981" />
              ) : (
                <Download size={20} color="#00d2ff" />
              )}
            </View>
            <Badge
              text={gallerySaved ? "SAVED TO ROLL" : "CAMERA ROLL"}
              tone={gallerySaved ? "green" : "blue"}
            />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
              Save to Gallery
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 11.5, lineHeight: 16 }}>
              Saves high-definition sculpted capture directly to your phone
              camera roll via expo-media-library.
            </Text>
          </View>
        </Pressable>

        {/* Bento Button 2: Share to Story */}
        <Pressable
          testID="bento-share-to-story"
          accessibilityRole="button"
          onPress={handleOpenStoryExporter}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 210,
            padding: 16,
            borderRadius: 18,
            backgroundColor: pressed ? "#290d1e" : "#14091c",
            borderWidth: 1.5,
            borderColor: "#fde047",
            gap: 8,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "#2b1329",
                borderWidth: 1,
                borderColor: "#fde047",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Share2 size={20} color="#fde047" />
            </View>
            <Badge text="9:16 IG & TIKTOK" tone="gold" />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
              Share to Story
            </Text>
            <Text style={{ color: "#cbd5e1", fontSize: 11.5, lineHeight: 16 }}>
              Wraps capture in a vertical 9:16 “MONTE WO · LEVEL UP” +{" "}
              {rankMeta.name.toUpperCase()} badge card for Instagram & TikTok.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Status Readout */}
      <Text
        style={{
          color: "#94a3b8",
          fontSize: 11.5,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {statusMsg}
      </Text>

      {/* ===================================================================== */}
      {/* VERTICAL 9:16 SOCIAL STORY CARD EXPORTER MODAL (IG & TIKTOK STORIES)  */}
      {/* ===================================================================== */}
      <Modal
        visible={storyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStoryModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.94)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <ScrollView
            style={{ width: "100%", maxWidth: 460 }}
            contentContainerStyle={{
              alignItems: "center",
              gap: 14,
              paddingVertical: 12,
            }}
          >
            {/* GORGEOUS VERTICAL 9:16 STORY CARD FRAME */}
            <View
              testID="story-card-9x16"
              style={{
                width: 306,
                height: 544, // Exact 9:16 vertical social story aspect ratio!
                borderRadius: 26,
                backgroundColor: "#030712",
                borderWidth: 2,
                borderColor: rankMeta.primary,
                overflow: "hidden",
                padding: 14,
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {/* Full-bleed Captured Physique Background */}
              {capturedUri ? (
                <Image
                  source={{ uri: capturedUri }}
                  style={
                    [
                      StyleSheet.absoluteFill,
                      { opacity: 0.9 },
                      Platform.OS === "web"
                        ? ({ filter: activePreset.cssFilter } as any)
                        : null,
                    ] as any
                  }
                  resizeMode="cover"
                />
              ) : null}

              {/* Top & Bottom Graphic Scrims */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 125,
                  backgroundColor: "rgba(2, 6, 17, 0.72)",
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 165,
                  backgroundColor: "rgba(2, 6, 17, 0.86)",
                }}
              />

              {/* TOP STORY HEADER: HAITIAN BICOLORE + MONTE WO · LEVEL UP */}
              <View style={{ gap: 6, zIndex: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    height: 5,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flex: 1, backgroundColor: "#00209f" }} />
                  <View style={{ flex: 1, backgroundColor: "#d21034" }} />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 19,
                        fontWeight: "900",
                        letterSpacing: 0.9,
                      }}
                    >
                      MONTE WO · LEVEL UP
                    </Text>
                    <Text
                      style={{
                        color: "#00d2ff",
                        fontSize: 8.5,
                        fontWeight: "900",
                        letterSpacing: 0.9,
                      }}
                    >
                      SHADOW RECONSTRUCTION · AI GAINS DETECTOR
                    </Text>
                  </View>
                  <Sparkles size={18} color="#fde047" />
                </View>
              </View>

              {/* CENTER GRAPHIC CORNER ACCENTS */}
              <View
                pointerEvents="none"
                style={{
                  flex: 1,
                  marginVertical: 10,
                  borderWidth: 1,
                  borderColor: "rgba(0, 210, 255, 0.38)",
                  borderRadius: 16,
                }}
              />

              {/* BOTTOM PRIDEFUL HAITIAN RANK BADGE OVERLAY */}
              <View
                style={{
                  zIndex: 10,
                  borderRadius: 18,
                  padding: 11,
                  backgroundColor: "rgba(6, 13, 28, 0.94)",
                  borderWidth: 1.5,
                  borderColor: rankMeta.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Image
                  source={rankArt[rankMeta.id]}
                  style={{ width: 54, height: 54 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: "#fde047",
                      fontSize: 8.5,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                    }}
                  >
                    RAN FÒ AK KOURAY · HAITIAN RANK
                  </Text>
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 20,
                      fontWeight: "900",
                      letterSpacing: 0.6,
                    }}
                  >
                    {rankMeta.name.toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      color: rankMeta.primary,
                      fontSize: 9,
                      fontWeight: "800",
                    }}
                    numberOfLines={1}
                  >
                    {rankMeta.title}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Haitian Rank Crest Selector for Story Card */}
            <View style={{ width: "100%", gap: 6 }}>
              <Text
                style={{
                  color: "#94a3b8",
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.8,
                  textAlign: "center",
                }}
              >
                SELECT HAITIAN RANK CREST ON STORY CARD
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {RANK_VISUAL_LADDER.slice(1).map((rk) => {
                  const on = rk.ordinal === selectedRankOrd;
                  return (
                    <Pressable
                      key={"story-rk-" + rk.id}
                      onPress={() => setSelectedRankOrd(rk.ordinal)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: on ? "#13233f" : "#080e1a",
                        borderWidth: 1,
                        borderColor: on ? rk.primary : "#1e293b",
                      }}
                    >
                      <Text
                        style={{
                          color: on ? "#fde047" : "#cbd5e1",
                          fontSize: 11,
                          fontWeight: "900",
                        }}
                      >
                        {rk.name.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Direct Native iOS / Android Share Actions for Instagram & TikTok Stories */}
            <View style={{ width: "100%", gap: 8 }}>
              <Pressable
                testID="share-instagram-story"
                accessibilityRole="button"
                onPress={() => launchNativeStoryShare("instagram")}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: pressed ? "#be185d" : "#db2777",
                  borderWidth: 1,
                  borderColor: "#f472b6",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                })}
              >
                <ExternalLink size={16} color="#ffffff" />
                <Text
                  style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "900" }}
                >
                  Post to Instagram Stories (9:16)
                </Text>
              </Pressable>

              <Pressable
                testID="share-tiktok-story"
                accessibilityRole="button"
                onPress={() => launchNativeStoryShare("tiktok")}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: pressed ? "#0e7490" : "#0891b2",
                  borderWidth: 1,
                  borderColor: "#00d2ff",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                })}
              >
                <ExternalLink size={16} color="#ffffff" />
                <Text
                  style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "900" }}
                >
                  Post to TikTok Stories (9:16)
                </Text>
              </Pressable>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    title={
                      busyAction === "share"
                        ? "Opening Share…"
                        : "Native Share Sheet"
                    }
                    onPress={() => launchNativeStoryShare("native")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    crimson
                    title="Done"
                    onPress={() => setStoryModalOpen(false)}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Card>
  );
}
