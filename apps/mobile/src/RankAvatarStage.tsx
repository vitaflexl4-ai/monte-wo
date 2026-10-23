import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { Crown, Sparkles, Volume2, VolumeX, Zap } from "lucide-react-native";
import { rankArt } from "./art";
import { Badge, Button, C } from "./ui";
import {
  playHaitianDrumEvolveDrop,
  playRankAscensionFanfare,
  playRankPreviewPulse,
} from "./sound-fx";

export type RankVisualMeta = {
  ordinal: number;
  id: string;
  name: string;
  title: string;
  creoleMotto: string;
  ceremonialProclamation: string;
  primary: string;
  secondary: string;
  coreGlow: string;
  muscleScale: number;
  armorTier: number;
};

export const RANK_VISUAL_LADDER: RankVisualMeta[] = [
  {
    ordinal: 0,
    id: "debitan",
    name: "Unranked",
    title: "KANDIDAT FÈ · STEP TO THE IRON",
    creoleMotto: "Onè Respè Douvan Baa a · Chaje Premye Kilo a",
    ceremonialProclamation:
      "Onè Respè! Pwoche sou platfòm nan — chak Lejand kòmanse ak premye baa li.",
    primary: "#64748b",
    secondary: "#38bdf8",
    coreGlow: "#1e293b",
    muscleScale: 0.9,
    armorTier: 0,
  },
  {
    ordinal: 1,
    id: "debitan",
    name: "Debitan",
    title: "PREMYE SÒLDA FÈ · INITIATE OF IRON",
    creoleMotto: "Premye Pa Nan Fè · San Batay Nan Ven",
    ceremonialProclamation:
      "Premye Pa Nan Fè! Ou antre nan fratènite fòs Ayisyen an.",
    primary: "#cd7f32",
    secondary: "#f59e0b",
    coreGlow: "#7c2d12",
    muscleScale: 0.95,
    armorTier: 1,
  },
  {
    ordinal: 2,
    id: "bati",
    name: "Bati",
    title: "FONDASYON CITADELLE · BUILT IN STONE",
    creoleMotto: "Kò Bati Wòch Sou Wòch · Tankou Citadelle Laferyè",
    ceremonialProclamation:
      "Kò Bati Wòch Sou Wòch — fondasyon fòs ou kanpe tankou Citadelle Laferyè!",
    primary: "#38bdf8",
    secondary: "#0284c7",
    coreGlow: "#0c4a6e",
    muscleScale: 0.99,
    armorTier: 1,
  },
  {
    ordinal: 3,
    id: "solid",
    name: "Solid",
    title: "RAN FÒ AK KOURAY · TEMPERED CITADELLE",
    creoleMotto: "Ran Fò ak Kouray · Solid Tankou Mòn Ayiti",
    ceremonialProclamation:
      "Ran Fò ak Kouray! Nanpwen pwa ki ka fè w fè bak devan baa a.",
    primary: "#3b82f6",
    secondary: "#60a5fa",
    coreGlow: "#1e3a8a",
    muscleScale: 1.04,
    armorTier: 2,
  },
  {
    ordinal: 4,
    id: "fo",
    name: "Fò",
    title: "BRIGAN FÈ AYISYEN · UNBENDING POWER",
    creoleMotto: "Ran Fò ak Kouray · Fòs Ki Pa Pliye",
    ceremonialProclamation:
      "Fòs Ki Pa Pliye! Baa a koube anba men yon vrè pitit Ayiti.",
    primary: "#10b981",
    secondary: "#34d399",
    coreGlow: "#064e3b",
    muscleScale: 1.09,
    armorTier: 2,
  },
  {
    ordinal: 5,
    id: "avanse",
    name: "Avanse",
    title: "ANPERÈ FÒS SOTI NAN LIMONADE · SOVEREIGN",
    creoleMotto: "Madanm ak Mesye, Onè Respè — Anperè Fòs Soti nan Limonade",
    ceremonialProclamation:
      "Madanm ak Mesye, Onè Respè — Anperè Fòs Soti nan Limonade!",
    primary: "#a855f7",
    secondary: "#38bdf8",
    coreGlow: "#4c1d95",
    muscleScale: 1.14,
    armorTier: 3,
  },
  {
    ordinal: 6,
    id: "met",
    name: "Mèt",
    title: "GRAN MÈT FÈ A · COMMANDER OF THE BAR",
    creoleMotto: "Gran Mèt Platfòm Nan · Kòmandan Tout Kilo",
    ceremonialProclamation:
      "Onè Respè pou Gran Mèt Fè a — mèt disiplin, teknik ak fòs pi!",
    primary: "#f59e0b",
    secondary: "#fde047",
    coreGlow: "#78350f",
    muscleScale: 1.19,
    armorTier: 3,
  },
  {
    ordinal: 7,
    id: "chanpyon",
    name: "Chanpyon",
    title: "KOUWÒN CHANPYON AYITI · CROWNED VICTOR",
    creoleMotto: "Chanpyon Lakay · Kouwòn Lò Sou Platfòm Nan",
    ceremonialProclamation:
      "Kouwòn Chanpyon Ayiti! Tanbou frape pou viktwa fòs ou!",
    primary: "#fbbf24",
    secondary: "#ff2442",
    coreGlow: "#92400e",
    muscleScale: 1.24,
    armorTier: 4,
  },
  {
    ordinal: 8,
    id: "titan",
    name: "Titan",
    title: "TITAN KARAYIB · EARTH-SHAKING MIGHT",
    creoleMotto: "Titan Karayib · Tè a Tranble Lè Baa a Monte",
    ceremonialProclamation:
      "Titan Karayib! Tè a tranble chak fwa ou rale baa a soti atè!",
    primary: "#f97316",
    secondary: "#fde047",
    coreGlow: "#7c2d12",
    muscleScale: 1.29,
    armorTier: 4,
  },
  {
    ordinal: 9,
    id: "lejand",
    name: "Lejand",
    title: "ANPERÈ IMÒTÈL FÒS AYISYEN · IMMORTAL LEGEND",
    creoleMotto: "Madanm ak Mesye, Onè Respè — Lejand San Fen Soti nan Limonade",
    ceremonialProclamation:
      "Madanm ak Mesye, Onè Respè — Anperè Imòtèl Fòs Soti nan Limonade · Lejand San Fen!",
    primary: "#ff2442",
    secondary: "#fde047",
    coreGlow: "#881337",
    muscleScale: 1.35,
    armorTier: 5,
  },
];

export function getRankVisual(ordinal: number): RankVisualMeta {
  const clamped = Math.max(0, Math.min(9, Math.round(ordinal)));
  return RANK_VISUAL_LADDER[clamped] || RANK_VISUAL_LADDER[0];
}

function useAnimationClock(fps = 24): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => (t + 1) % 10000);
    }, Math.round(1000 / fps));
    return () => clearInterval(id);
  }, [fps]);
  return tick;
}

/**
 * Dramatic 2D Canvas Electric-Blue (#38bdf8) & Haitian Gold (#fde047) Lightning Surge Overlay
 * Renders a real HTML5 2D <canvas> lightning storm on Web + crisp SVG lightning arcs on Native.
 */
function EvolveLightningCanvas({ active }: { active: boolean }) {
  const canvasHostRef = useRef<any>(null);

  useEffect(() => {
    if (!active || Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }
    const host = canvasHostRef.current as HTMLElement | null;
    if (!host || typeof host.appendChild !== "function") return;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    host.innerHTML = "";
    host.appendChild(canvas);

    let raf = 0;
    const start = performance.now();

    const drawBolt = (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      glow: string,
      width: number,
      jagged = 26,
    ) => {
      const steps = 11;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const jitterX = (Math.random() - 0.5) * jagged;
        const jitterY = (Math.random() - 0.5) * jagged;
        ctx.lineTo(x1 + (x2 - x1) * t + jitterX, y1 + (y2 - y1) * t + jitterY);
      }
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 22;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const elapsed = now - start;
      const w = Math.max(320, host.clientWidth || 640);
      const h = Math.max(220, host.clientHeight || 300);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);
      const p = Math.min(1, elapsed / 2400);
      const fade = p < 0.8 ? 1 : Math.max(0, (1 - p) / 0.2);

      // Radiant shockwave flash at center & target avatar
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rad = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.55);
      rad.addColorStop(0, `rgba(253, 224, 71, ${0.28 * fade})`);
      rad.addColorStop(0.45, `rgba(56, 189, 248, ${0.2 * fade})`);
      rad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, w, h);

      // Expanding shockwave ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 24 + p * w * 0.48, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 * fade})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Surging Electric-Blue (#38bdf8) & Molten Gold (#fde047) Lightning Bolts
      const leftX = w * 0.22;
      const rightX = w * 0.78;
      drawBolt(
        ctx,
        leftX,
        cy - 24,
        rightX,
        cy - 12,
        `rgba(56, 189, 248, ${0.95 * fade})`,
        "#38bdf8",
        3.4,
        34,
      );
      drawBolt(
        ctx,
        leftX,
        cy + 18,
        rightX,
        cy + 8,
        `rgba(253, 224, 71, ${0.95 * fade})`,
        "#fde047",
        3.0,
        30,
      );
      drawBolt(
        ctx,
        w * 0.1,
        h * 0.16,
        w * 0.9,
        h * 0.82,
        `rgba(125, 211, 252, ${0.8 * fade})`,
        "#0284c7",
        2.1,
        28,
      );
      drawBolt(
        ctx,
        w * 0.25,
        h * 0.86,
        w * 0.82,
        h * 0.18,
        `rgba(250, 204, 21, ${0.85 * fade})`,
        "#f59e0b",
        2.3,
        26,
      );

      // Rising gold & electric-blue sparks
      for (let s = 0; s < 18; s++) {
        const sx = ((s * 97 + elapsed * 0.18) % w);
        const sy = h - ((elapsed * 0.22 + s * 43) % h);
        ctx.fillStyle =
          s % 2 === 0
            ? `rgba(253, 224, 71, ${0.85 * fade})`
            : `rgba(56, 189, 248, ${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s % 3 === 0 ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed < 2450) {
        raf = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    raf = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(raf);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [active]);

  if (!active) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { zIndex: 30, overflow: "hidden" }]}
    >
      {Platform.OS === "web" ? (
        <View ref={canvasHostRef} style={StyleSheet.absoluteFill} />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 400 240">
          <Path
            d="M 40 110 L 105 78 L 145 126 L 215 74 L 265 118 L 355 82"
            stroke="#38bdf8"
            strokeWidth={3.5}
            fill="none"
          />
          <Path
            d="M 55 148 L 125 118 L 178 154 L 248 106 L 305 140 L 368 112"
            stroke="#fde047"
            strokeWidth={3}
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}

/**
 * Custom Sculpted 2D Hyper-Muscular Haitian Athlete Silhouette & Aura Engine
 * Uses organic curved anatomical Bezier muscle groups (traps, capped delts, clavicular/sternal pecs,
 * flaring cobra lats, carved 6-pack abs, peaked biceps/forearms, sweeping quads & diamond calves)
 * — zero stick figures or generic wireframes.
 */
export function AnimatedAthlete2D({
  ordinal,
  sexCategory = "male",
  size = 188,
  tick: externalTick,
  uid = "a",
  evolveSurge = false,
}: {
  ordinal: number;
  sexCategory?: "male" | "female" | "unclassified";
  size?: number;
  tick?: number;
  uid?: string;
  evolveSurge?: boolean;
}) {
  const internalTick = useAnimationClock(externalTick === undefined ? 24 : 2);
  const t = externalTick ?? internalTick;
  const meta = getRankVisual(ordinal);

  const phase = (t % 60) / 60;
  const breath = Math.sin(phase * Math.PI * 2);
  const auraPulse = 1 + 0.07 * Math.sin(phase * Math.PI * 4) + (evolveSurge ? 0.16 : 0);
  const isFemale = sexCategory === "female";

  // Muscular hypertrophy factor scales smoothly across 0..9 + surges during EVOLVE!
  const m = meta.muscleScale * (isFemale ? 0.94 : 1.0) * (evolveSurge ? 1.1 : 1.0);
  const shHalf = 26 * m;
  const latHalf = 22 * m;
  const waistHalf = isFemale ? 12.2 : 14.2 * Math.min(1.06, 0.94 + ordinal * 0.014);
  const deltR = 9.5 * m;
  const armThick = 7.4 * m;
  const thighW = 11.2 * m;
  const breatheY = breath * 1.6;

  const gAura = `aura-${uid}-${ordinal}`;
  const gMuscle = `muscle-${uid}-${ordinal}`;
  const gArmor = `armor-${uid}-${ordinal}`;

  const skinDark = ordinal === 0 ? "#1e293b" : "#3b2316";
  const skinMid = ordinal === 0 ? "#334155" : "#6b3e26";
  const skinHighlight = ordinal >= 6 ? meta.secondary : ordinal === 0 ? "#64748b" : "#a4643e";

  return (
    <Svg
      width={size}
      height={size * 1.12}
      viewBox="0 0 200 224"
      accessibilityLabel={`${meta.name} sculpted muscular Haitian athlete avatar`}
    >
      <Defs>
        <RadialGradient id={gAura} cx="50%" cy="46%" r="50%">
          <Stop
            offset="0%"
            stopColor={evolveSurge ? "#38bdf8" : meta.primary}
            stopOpacity={ordinal === 0 && !evolveSurge ? "0.2" : "0.62"}
          />
          <Stop
            offset="55%"
            stopColor={evolveSurge ? "#fde047" : meta.coreGlow}
            stopOpacity={ordinal === 0 && !evolveSurge ? "0.08" : "0.28"}
          />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={gMuscle} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={skinHighlight} />
          <Stop offset="48%" stopColor={skinMid} />
          <Stop offset="100%" stopColor={skinDark} />
        </LinearGradient>
        <LinearGradient id={gArmor} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={meta.secondary} />
          <Stop offset="100%" stopColor={meta.primary} />
        </LinearGradient>
      </Defs>

      {/* Ground Energy Platform Ring */}
      <Ellipse
        cx="100"
        cy="206"
        rx={54 * auraPulse}
        ry={10.5 * auraPulse}
        fill={evolveSurge ? "#38bdf8" : meta.primary}
        fillOpacity={ordinal === 0 && !evolveSurge ? 0.16 : 0.34}
      />
      <Ellipse
        cx="100"
        cy="206"
        rx={38}
        ry={6}
        fill="none"
        stroke={evolveSurge ? "#fde047" : meta.secondary}
        strokeOpacity={0.75}
        strokeWidth={1.5}
      />

      {/* Hyper-Muscular Sovereign Aura Field */}
      <Circle
        cx="100"
        cy="104"
        r={84 * auraPulse}
        fill={`url(#${gAura})`}
      />

      {/* Sovereign Lightning Arcs for Avanse+ or Active EVOLVE Surge */}
      {(meta.armorTier >= 3 || evolveSurge) && (
        <G
          stroke={evolveSurge ? "#38bdf8" : meta.secondary}
          strokeWidth={evolveSurge ? 2.6 : 1.9}
          fill="none"
          opacity={0.85}
        >
          <Path
            d={`M ${34 - breath * 3} 148 L 48 114 L 38 104 L 56 68 L 46 56 L 64 28`}
          />
          <Path
            d={`M ${166 + breath * 3} 148 L 152 114 L 162 104 L 144 68 L 154 56 L 136 28`}
            stroke={evolveSurge ? "#fde047" : meta.secondary}
          />
        </G>
      )}

      {/* Rising Golden Citadelle Embers */}
      {(ordinal >= 1 || evolveSurge) &&
        [0, 1, 2, 3, 4].map((i) => {
          const py = 194 - (((t * 2.4 + i * 36) % 165));
          const px = 44 + ((i * 29) % 112) + Math.sin(phase * 6.28 + i) * 6;
          return (
            <Circle
              key={i}
              cx={px}
              cy={py}
              r={i % 2 === 0 ? 2.4 : 1.6}
              fill={i % 2 === 0 ? "#fde047" : "#38bdf8"}
              opacity={0.75}
            />
          );
        })}

      {/* SCULPTED ANATOMICAL MUSCULAR SILHOUETTE */}
      <G transform={`translate(0, ${breatheY})`}>
        {/* Trapezius Yoke & Neck */}
        <Path
          d={`M ${100 - shHalf * 0.72} 66 Q 100 ${50 - 3 * m} ${100 + shHalf * 0.72} 66 L ${100 + 8} 72 L ${100 - 8} 72 Z`}
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.1}
        />

        {/* Flaring Cobra Latissimus Dorsi Wings */}
        <Path
          d={`M ${100 - shHalf * 0.92} 72
              C ${100 - latHalf * 1.32} 88, ${100 - latHalf * 1.18} 106, ${100 - waistHalf} 122
              L ${100 + waistHalf} 122
              C ${100 + latHalf * 1.18} 106, ${100 + latHalf * 1.32} 88, ${100 + shHalf * 0.92} 72 Z`}
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.3}
        />

        {/* Sculpted Clavicular & Sternal Pectoral Plates */}
        <Path
          d={`M 99 70
              C ${100 - shHalf * 0.55} 68, ${100 - shHalf * 0.88} 75, ${100 - shHalf * 0.8} 88
              C ${100 - shHalf * 0.62} 95, 100 94, 99 90 Z`}
          fill={skinHighlight}
          fillOpacity={0.55}
          stroke={meta.primary}
          strokeWidth={1.1}
        />
        <Path
          d={`M 101 70
              C ${100 + shHalf * 0.55} 68, ${100 + shHalf * 0.88} 75, ${100 + shHalf * 0.8} 88
              C ${100 + shHalf * 0.62} 95, 100 94, 101 90 Z`}
          fill={skinHighlight}
          fillOpacity={0.55}
          stroke={meta.primary}
          strokeWidth={1.1}
        />

        {/* Carved 6-Pack Rectus Abdominis & Serratus */}
        <G stroke={skinDark} strokeWidth={1.2} fill={skinHighlight} fillOpacity={0.28}>
          <Path d="M 92 94 Q 95 93 99 94 L 99 102 Q 95 103 92 102 Z" />
          <Path d="M 101 94 Q 105 93 108 94 L 108 102 Q 105 103 101 102 Z" />
          <Path d="M 93 104 Q 96 103 99 104 L 99 111 Q 96 112 93 111 Z" />
          <Path d="M 101 104 Q 104 103 107 104 L 107 111 Q 104 112 101 111 Z" />
          <Path d="M 94 113 Q 96 112 99 113 L 99 120 Q 96 121 94 120 Z" />
          <Path d="M 101 113 Q 104 112 106 113 L 106 120 Q 104 121 101 120 Z" />
        </G>

        {/* Capped 3D Lateral & Anterior Deltoids + Peaked Biceps + Forearms (Heroic Flex / Power Stance) */}
        {/* Left Deltoid + Bicep + Forearm */}
        <Path
          d={`M ${100 - shHalf * 0.82} 66
              C ${100 - shHalf - deltR} 66, ${100 - shHalf - deltR * 1.15} 80, ${100 - shHalf - deltR * 0.45} 86
              C ${100 - shHalf - armThick * 1.5} 95, ${100 - shHalf - armThick * 1.7} 107, ${100 - shHalf - armThick * 0.95} 115
              C ${100 - shHalf - armThick * 1.35} 124, ${100 - shHalf - armThick * 1.05} 136, ${100 - shHalf - armThick * 0.55} 142
              L ${100 - shHalf + armThick * 0.15} 139
              C ${100 - shHalf - armThick * 0.15} 127, ${100 - shHalf + armThick * 0.1} 116, ${100 - shHalf - armThick * 0.15} 108
              C ${100 - shHalf + armThick * 0.25} 98, ${100 - shHalf - 2} 86, ${100 - shHalf * 0.75} 78 Z`}
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.25}
        />
        {/* Right Deltoid + Bicep + Forearm */}
        <Path
          d={`M ${100 + shHalf * 0.82} 66
              C ${100 + shHalf + deltR} 66, ${100 + shHalf + deltR * 1.15} 80, ${100 + shHalf + deltR * 0.45} 86
              C ${100 + shHalf + armThick * 1.5} 95, ${100 + shHalf + armThick * 1.7} 107, ${100 + shHalf + armThick * 0.95} 115
              C ${100 + shHalf + armThick * 1.35} 124, ${100 + shHalf + armThick * 1.05} 136, ${100 + shHalf + armThick * 0.55} 142
              L ${100 + shHalf - armThick * 0.15} 139
              C ${100 + shHalf + armThick * 0.15} 127, ${100 + shHalf - armThick * 0.1} 116, ${100 + shHalf + armThick * 0.15} 108
              C ${100 + shHalf - armThick * 0.25} 98, ${100 + shHalf + 2} 86, ${100 + shHalf * 0.75} 78 Z`}
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.25}
        />

        {/* Haitian Bicolore Championship Belt / Sash (#00209f Cobalt & #d21034 Crimson + Gold Buckle) */}
        <Path
          d={`M ${100 - waistHalf - 2} 121 L ${100 + waistHalf + 2} 121 L ${100 + waistHalf + 4} 127 L ${100 - waistHalf - 4} 127 Z`}
          fill="#00209f"
        />
        <Path
          d={`M ${100 - waistHalf - 4} 127 L ${100 + waistHalf + 4} 127 L ${100 + waistHalf + 3} 133 L ${100 - waistHalf - 3} 133 Z`}
          fill="#d21034"
        />
        <Polygon
          points="100,121 106,127 100,133 94,127"
          fill="#fde047"
          stroke="#78350f"
          strokeWidth={0.9}
        />

        {/* Sweeping Outer Quad (Vastus Lateralis) + Teardrop (Vastus Medialis) + Diamond Calves */}
        {/* Left Leg */}
        <Path
          d={`M ${100 - waistHalf - 2} 133
              C ${100 - waistHalf - thighW * 1.15} 146, ${100 - waistHalf - thighW * 1.05} 162, ${100 - 19} 171
              C ${100 - 25} 180, ${100 - 23} 192, ${100 - 19} 201
              L ${100 - 11} 201
              C ${100 - 9} 191, ${100 - 9} 180, ${100 - 11} 171
              C ${100 - 5} 161, ${100 - 4} 148, ${100 - 3} 134 Z`}
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.25}
        />
        {/* Right Leg */}
        <Path
          d={`M ${100 + waistHalf + 2} 133
              C ${100 + waistHalf + thighW * 1.15} 146, ${100 + waistHalf + thighW * 1.05} 162, ${100 + 19} 171
              C ${100 + 25} 180, ${100 + 23} 192, ${100 + 19} 201
              L ${100 + 11} 201
              C ${100 + 9} 191, ${100 + 9} 180, ${100 + 11} 171
              C ${100 + 5} 161, ${100 + 4} 148, ${100 + 3} 134 Z`}
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.25}
        />

        {/* Sculpted Warrior Head + Haitian Headband + Glowing Sovereign Eyes */}
        <Path
          d="M 89 42 C 89 30, 111 30, 111 42 C 111 53, 106 59, 100 60 C 94 59, 89 53, 89 42 Z"
          fill={`url(#${gMuscle})`}
          stroke={meta.primary}
          strokeWidth={1.3}
        />
        {/* Haitian Bicolore Headband */}
        <Path d="M 89 39 Q 100 37 111 39 L 111 42 Q 100 40 89 42 Z" fill="#d21034" />
        {/* Glowing Sovereign Eyes */}
        <Circle
          cx="95.5"
          cy="45"
          r="1.7"
          fill={evolveSurge ? "#38bdf8" : ordinal >= 4 ? "#fde047" : "#e2e8f0"}
        />
        <Circle
          cx="104.5"
          cy="45"
          r="1.7"
          fill={evolveSurge ? "#38bdf8" : ordinal >= 4 ? "#fde047" : "#e2e8f0"}
        />

        {/* Citadelle Sovereign Crown for Chanpyon / Titan / Lejand (or EVOLVE surge) */}
        {(meta.armorTier >= 4 || evolveSurge) && (
          <Polygon
            points="87,34 92,22 97,30 100,19 103,30 108,22 113,34"
            fill={`url(#${gArmor})`}
            stroke="#ffffff"
            strokeWidth={0.9}
          />
        )}
      </G>
    </Svg>
  );
}

/**
 * Full-Screen Prideful Haitian 2D Rank Ascension Ceremony Modal
 */
export function RankAscensionCeremonyModal({
  visible,
  onClose,
  ordinal,
  disciplineName,
  loadLabel,
  bwMultiple,
  sexCategory,
}: {
  visible: boolean;
  onClose: () => void;
  ordinal: number;
  disciplineName: string;
  loadLabel?: string;
  bwMultiple?: number | null;
  sexCategory?: "male" | "female" | "unclassified";
}) {
  const tick = useAnimationClock(30);
  const meta = getRankVisual(ordinal);

  useEffect(() => {
    if (visible) {
      playRankAscensionFanfare(Math.max(1, ordinal));
    }
  }, [visible, ordinal]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.96)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 580,
            borderRadius: 28,
            backgroundColor: "#02050d",
            borderWidth: 2,
            borderColor: meta.primary,
            padding: 24,
            alignItems: "center",
            gap: 14,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <EvolveLightningCanvas active={visible} />

          {/* Haitian Bicolore Honor Ribbon */}
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              height: 5,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <View style={{ flex: 1, backgroundColor: "#00209f" }} />
            <View style={{ flex: 1, backgroundColor: "#d21034" }} />
          </View>

          <Badge
            text={
              ordinal > 0
                ? `⚡ RAN 0${ordinal} · RAN FÒ AK KOURAY · ONÈ RESPÈ ⚡`
                : "⚡ KANDIDAT FÈ · ONÈ RESPÈ DOUVAN BAA A ⚡"
            }
            tone={ordinal >= 6 ? "red" : "gold"}
          />

          <Text
            style={{
              color: "#fde047",
              fontSize: 13.5,
              fontWeight: "900",
              textAlign: "center",
              letterSpacing: 0.4,
            }}
          >
            “Madanm ak Mesye, Onè Respè — Anperè Fòs Soti nan Limonade”
          </Text>

          <Text
            style={{
              color: meta.primary,
              fontSize: 12,
              fontWeight: "900",
              letterSpacing: 2.2,
              textAlign: "center",
            }}
          >
            {disciplineName.toUpperCase()}
          </Text>

          {/* Dual Centerpiece: 2D Animated Evolved Athlete + Official Rank Crest */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <AnimatedAthlete2D
              ordinal={ordinal}
              sexCategory={sexCategory}
              size={195}
              tick={tick}
              uid="ceremony"
              evolveSurge
            />
            <View
              style={{
                alignItems: "center",
                gap: 8,
                padding: 16,
                borderRadius: 24,
                backgroundColor: "#050811",
                borderWidth: 1.5,
                borderColor: meta.primary,
              }}
            >
              <Image
                source={rankArt[meta.id]}
                style={{
                  width: 112,
                  height: 112,
                  opacity: ordinal > 0 ? 1 : 0.55,
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: 0.6,
                }}
              >
                {meta.name}
              </Text>
              <Text
                style={{
                  color: meta.primary,
                  fontSize: 10.5,
                  fontWeight: "900",
                  letterSpacing: 1.1,
                  textAlign: "center",
                }}
              >
                {meta.title}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: "#e2e8f0",
              fontSize: 14,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            {meta.ceremonialProclamation}
          </Text>

          {loadLabel ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 16,
                backgroundColor: "#0b1120",
                borderWidth: 1,
                borderColor: "#1f2e47",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: "900",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {loadLabel}
                {bwMultiple ? ` · ${bwMultiple}× Bodyweight` : ""}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                Proposed Standard v0.1 · Self-Reported Gym Single
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                title="🥁 Replay Tanbou Drop"
                onPress={() => playHaitianDrumEvolveDrop()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button crimson title="Stand Tall · Continue" onPress={onClose} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Main Hall of Pride Dual-State Performance Display inside RankScreen:
 * - Dynamically displays YOU NOW (validated current lifter profile) alongside
 *   an accent-lit POSSIBLE NEXT RANK prediction preview with exact qualification thresholds
 * - Interactive "EVOLVE" button triggers 2D Canvas Electric-Blue & Gold Lightning Surge +
 *   Traditional Haitian Tanbou Drum Roll -> Cinematic Bass Drop while scaling "You Now"
 *   into the hyper-muscular aura of the next tier!
 * - Displays all 9 Rank Tiers & their Full Haitian Title Matrices boldly.
 */
export function RankHallOfPrideStage({
  disciplineFull,
  currentOrdinal,
  bestLoadLabel,
  bwMultiple,
  nextRung,
  unit,
  percentToNext,
  deltaLabel,
  sexCategory,
  soundOn,
  onToggleSound,
  onOpenTestModal,
  onOpenCeremony,
}: {
  disciplineFull: string;
  currentOrdinal: number;
  bestLoadLabel: string | null;
  bwMultiple: number | null;
  nextRung: {
    id: string;
    ordinal: number;
    name: string;
    requiredKg: number | null;
    requiredLb: number | null;
    bwMultiple: number | null;
  } | null;
  unit: "kg" | "lb";
  percentToNext: number;
  deltaLabel: string | null;
  sexCategory: "male" | "female" | "unclassified";
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenTestModal: () => void;
  onOpenCeremony: (previewOrdinal: number) => void;
}) {
  const tick = useAnimationClock(28);
  const defaultTargetOrd =
    nextRung?.ordinal || Math.min(9, currentOrdinal + 1);
  const [inspectOrd, setInspectOrd] = useState<number>(defaultTargetOrd);
  const [evolving, setEvolving] = useState(false);
  const evolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInspectOrd(nextRung?.ordinal || Math.min(9, currentOrdinal + 1));
  }, [currentOrdinal, nextRung?.ordinal]);

  useEffect(() => {
    return () => {
      if (evolveTimerRef.current) clearTimeout(evolveTimerRef.current);
    };
  }, []);

  const triggerEvolveSurge = () => {
    playHaitianDrumEvolveDrop();
    setEvolving(true);
    if (evolveTimerRef.current) clearTimeout(evolveTimerRef.current);
    evolveTimerRef.current = setTimeout(() => {
      setEvolving(false);
    }, 2450);
  };

  const displayedNowOrd = evolving ? inspectOrd : currentOrdinal;
  const nowMeta = getRankVisual(displayedNowOrd);
  const baseNowMeta = getRankVisual(currentOrdinal);
  const nextMeta = getRankVisual(inspectOrd);
  const isInspectingActualNext = inspectOrd === defaultTargetOrd;

  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: "#02050c",
        borderWidth: 1.5,
        borderColor: evolving
          ? "#fde047"
          : currentOrdinal >= 6
            ? baseNowMeta.primary
            : "#233654",
        padding: 18,
        gap: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Haitian Bicolore Sovereign Pride Banner */}
      <View
        style={{
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: "#070f20",
          borderWidth: 1,
          borderColor: "#1e3a8a",
          gap: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Crown size={15} color="#fde047" />
            <Text
              style={{
                color: "#fde047",
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1.1,
              }}
            >
              RAN FÒ AK KOURAY · HAITIAN SOVEREIGN HALL OF STRENGTH
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <View
              style={{
                width: 18,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#00209f",
              }}
            />
            <View
              style={{
                width: 18,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#d21034",
              }}
            />
          </View>
        </View>
        <Text
          style={{
            color: "#f8fafc",
            fontSize: 13.5,
            fontWeight: "900",
            letterSpacing: 0.2,
          }}
        >
          “Madanm ak Mesye, Onè Respè — Anperè Fòs Soti nan Limonade”
        </Text>
      </View>

      {/* Top Pride Header + Sound Toggle + Ceremony Trigger */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Badge
            text={
              currentOrdinal > 0
                ? `EARNED RANK 0${currentOrdinal} · SELF-REPORTED · NOT VERIFIED`
                : "UNRANKED CONTENDER · RAN FÒ AK KOURAY"
            }
            tone={
              currentOrdinal >= 6
                ? "red"
                : currentOrdinal > 0
                  ? "gold"
                  : "blue"
            }
          />
          <Badge text="Proposed Standard v0.1" tone="amber" />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              soundOn ? "Mute rank sound effects" : "Enable rank sound effects"
            }
            onPress={onToggleSound}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: soundOn ? "#0d1b2e" : "#111318",
              borderWidth: 1,
              borderColor: soundOn ? C.cyan : "#27303f",
            }}
          >
            {soundOn ? (
              <Volume2 size={14} color={C.cyan} />
            ) : (
              <VolumeX size={14} color="#64748b" />
            )}
            <Text
              style={{
                color: soundOn ? "#e2edf8" : "#64748b",
                fontSize: 11,
                fontWeight: "800",
              }}
            >
              {soundOn ? "FX ON" : "MUTED"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playHaitianDrumEvolveDrop();
              onOpenCeremony(currentOrdinal > 0 ? currentOrdinal : inspectOrd);
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: pressed ? "#4c0519" : "#290a13",
              borderWidth: 1,
              borderColor: "#ff2442",
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Sparkles size={13} color="#fde047" />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>
              Play Ceremony
            </Text>
          </Pressable>
        </View>
      </View>

      {/* DUAL-STATE PERFORMANCE DISPLAY + 2D LIGHTNING EVOLVE STAGE */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "stretch",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <EvolveLightningCanvas active={evolving} />

        {/* LEFT POD: YOU NOW (VALIDATED CURRENT LIFTER PROFILE) */}
        <View
          style={{
            flex: 1,
            minWidth: 230,
            borderRadius: 20,
            backgroundColor: evolving ? "#081529" : "#04070e",
            borderWidth: evolving ? 2 : 1,
            borderColor: evolving
              ? "#38bdf8"
              : currentOrdinal > 0
                ? baseNowMeta.primary
                : "#1d2a40",
            padding: 14,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            transform: [{ scale: evolving ? 1.03 : 1 }],
          }}
        >
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: evolving ? "#fde047" : "#94a3b8",
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 1.1,
                }}
              >
                {evolving
                  ? "⚡ EVOLVING AURA SURGE ⚡"
                  : "YOU NOW · CURRENT FORM"}
              </Text>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                {nowMeta.name}
              </Text>
            </View>
            <Image
              source={rankArt[nowMeta.id]}
              style={{
                width: 52,
                height: 52,
                opacity: currentOrdinal > 0 || evolving ? 1 : 0.42,
              }}
              resizeMode="contain"
            />
          </View>

          <AnimatedAthlete2D
            ordinal={displayedNowOrd}
            sexCategory={sexCategory}
            size={174}
            tick={tick}
            uid="now"
            evolveSurge={evolving}
          />

          <View style={{ alignItems: "center", gap: 3 }}>
            <Text
              style={{
                color: nowMeta.primary,
                fontSize: 10.5,
                fontWeight: "900",
                letterSpacing: 0.9,
                textAlign: "center",
              }}
            >
              {nowMeta.title}
            </Text>
            <Text
              style={{
                color: "#cbd5e1",
                fontSize: 12.5,
                fontWeight: "800",
                fontVariant: ["tabular-nums"],
                textAlign: "center",
              }}
            >
              {bestLoadLabel
                ? `Validated Best: ${bestLoadLabel}${bwMultiple ? ` (${bwMultiple}× BW)` : ""}`
                : "Validated Profile: Log 1RM to Unlock Tier"}
            </Text>
          </View>
        </View>

        {/* CENTER INTERACTIVE "EVOLVE" LIGHTNING TRIGGER */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
            paddingVertical: 6,
            gap: 6,
            zIndex: 40,
          }}
        >
          <Pressable
            testID="rank-evolve-trigger"
            accessibilityRole="button"
            accessibilityLabel="Trigger EVOLVE lightning surge and Haitian drum roll"
            onPress={triggerEvolveSurge}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: evolving
                ? "#0c2d48"
                : pressed
                  ? "#1e1b4b"
                  : "#140b1f",
              borderWidth: 1.8,
              borderColor: evolving ? "#fde047" : "#38bdf8",
              alignItems: "center",
              gap: 2,
              transform: [{ scale: pressed ? 0.94 : evolving ? 1.08 : 1 }],
            })}
          >
            <Zap size={18} color="#fde047" />
            <Text
              style={{
                color: "#ffffff",
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1.1,
              }}
            >
              EVOLVE
            </Text>
          </Pressable>
          {deltaLabel && isInspectingActualNext ? (
            <Text
              style={{
                color: "#fde047",
                fontSize: 11,
                fontWeight: "900",
                textAlign: "center",
                maxWidth: 88,
              }}
            >
              {deltaLabel}
            </Text>
          ) : null}
        </View>

        {/* RIGHT POD: ACCENT-LIT NEXT RANK QUALIFICATION PREDICTION PREVIEW */}
        <View
          style={{
            flex: 1,
            minWidth: 230,
            borderRadius: 20,
            backgroundColor: "#060b18",
            borderWidth: 1.8,
            borderColor: nextMeta.primary,
            padding: 14,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: nextMeta.primary,
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 1.1,
                }}
              >
                {isInspectingActualNext
                  ? "POSSIBLE NEXT RANK"
                  : `RANK 0${nextMeta.ordinal} PREVIEW`}
              </Text>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                {nextMeta.name}
              </Text>
            </View>
            <Image
              source={rankArt[nextMeta.id]}
              style={{ width: 56, height: 56 }}
              resizeMode="contain"
            />
          </View>

          <AnimatedAthlete2D
            ordinal={nextMeta.ordinal}
            sexCategory={sexCategory}
            size={174}
            tick={tick + 14}
            uid="next"
            evolveSurge={evolving}
          />

          <View style={{ alignItems: "center", gap: 3 }}>
            <Text
              style={{
                color: nextMeta.primary,
                fontSize: 10.5,
                fontWeight: "900",
                letterSpacing: 0.9,
                textAlign: "center",
              }}
            >
              {nextMeta.title}
            </Text>
            <Text
              style={{
                color: "#fde047",
                fontSize: 12.5,
                fontWeight: "900",
                fontVariant: ["tabular-nums"],
                textAlign: "center",
              }}
            >
              {isInspectingActualNext && nextRung?.requiredKg
                ? unit === "lb"
                  ? `Qualification Target: ${nextRung.requiredLb} lb (${nextRung.requiredKg} kg${nextRung.bwMultiple ? ` · ${nextRung.bwMultiple}× BW` : ""})`
                  : `Qualification Target: ${nextRung.requiredKg} kg (${nextRung.requiredLb} lb${nextRung.bwMultiple ? ` · ${nextRung.bwMultiple}× BW` : ""})`
                : nextMeta.creoleMotto}
            </Text>
          </View>
        </View>
      </View>

      {/* POWER ASCENSION PROGRESS BAR */}
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "800" }}>
            {disciplineFull} · Ran Fò ak Kouray Power Meter
          </Text>
          <Text
            style={{
              color: nextMeta.primary,
              fontSize: 12.5,
              fontWeight: "900",
              fontVariant: ["tabular-nums"],
            }}
          >
            {percentToNext}% toward {nextRung?.name || "Debitan"}
          </Text>
        </View>
        <View
          style={{
            height: 11,
            borderRadius: 999,
            backgroundColor: "#0d1424",
            borderWidth: 1,
            borderColor: "#1f2e47",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.max(4, Math.min(100, percentToNext))}%`,
              height: "100%",
              borderRadius: 999,
              backgroundColor: nextMeta.primary,
            }}
          />
        </View>
      </View>

      {/* FLUID MOMENTUM HORIZONTAL 9-RANK STRIP (01 DEBITAN -> 09 LEJAND) */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 10.5,
            fontWeight: "800",
            letterSpacing: 0.9,
          }}
        >
          ALL 9 SOVEREIGN TIERS · SWIPE OR TAP TO INSPECT (01 DEBITAN → 09 LEJAND)
        </Text>

        <ScrollView
          horizontal
          scrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {RANK_VISUAL_LADDER.slice(1).map((rk) => {
            const active = inspectOrd === rk.ordinal;
            const unlocked = currentOrdinal >= rk.ordinal;
            return (
              <Pressable
                key={rk.id}
                accessibilityRole="button"
                onPress={() => {
                  setInspectOrd(rk.ordinal);
                  playRankPreviewPulse(rk.ordinal);
                }}
                style={({ pressed }) => ({
                  minWidth: 88,
                  paddingVertical: 9,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: active
                    ? "#111b2e"
                    : pressed
                      ? "#0d1729"
                      : "#060911",
                  borderWidth: active ? 1.6 : 1,
                  borderColor: active
                    ? rk.primary
                    : unlocked
                      ? "#166534"
                      : "#182235",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Image
                  source={rankArt[rk.id]}
                  style={{
                    width: 40,
                    height: 40,
                    opacity: unlocked || active ? 1 : 0.65,
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    color: rk.primary,
                    fontSize: 9.5,
                    fontWeight: "900",
                  }}
                >
                  RAN 0{rk.ordinal}
                </Text>
                <Text
                  style={{
                    color: active ? "#ffffff" : "#e2e8f0",
                    fontSize: 11,
                    fontWeight: "900",
                  }}
                >
                  {rk.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* BOLD FULL 9-RANK HAITIAN TITLE MATRIX */}
      <View
        style={{
          borderRadius: 16,
          backgroundColor: "#050a14",
          borderWidth: 1,
          borderColor: "#17263c",
          padding: 12,
          gap: 6,
        }}
      >
        <Text
          style={{
            color: "#fde047",
            fontSize: 10.5,
            fontWeight: "900",
            letterSpacing: 1,
          }}
        >
          MATRIS 9 RAN YO · FULL 9-RANK HAITIAN TITLE MATRIX
        </Text>
        <View style={{ gap: 5 }}>
          {RANK_VISUAL_LADDER.slice(1).map((rk) => {
            const isCurrent = currentOrdinal === rk.ordinal;
            const isSelected = inspectOrd === rk.ordinal;
            return (
              <Pressable
                key={"matrix-" + rk.id}
                onPress={() => {
                  setInspectOrd(rk.ordinal);
                  playRankPreviewPulse(rk.ordinal);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: isSelected
                    ? "#0d1b30"
                    : isCurrent
                      ? "#081a14"
                      : "#080f1d",
                  borderWidth: 1,
                  borderColor: isSelected
                    ? rk.primary
                    : isCurrent
                      ? "#10b981"
                      : "#121f33",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color: rk.primary,
                      fontSize: 11,
                      fontWeight: "900",
                      width: 24,
                    }}
                  >
                    0{rk.ordinal}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                    >
                      {rk.name} ·{" "}
                      <Text style={{ color: rk.primary, fontSize: 10.5 }}>
                        {rk.title}
                      </Text>
                    </Text>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 10.5,
                        fontWeight: "600",
                      }}
                    >
                      {rk.creoleMotto}
                    </Text>
                  </View>
                </View>
                {isCurrent ? (
                  <Badge text="YOU NOW" tone="green" />
                ) : isSelected ? (
                  <Badge text="PREVIEW" tone="amber" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Primary Action Row */}
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Button
            crimson
            title={`⚡ Log / Test ${disciplineFull} 1RM`}
            onPress={onOpenTestModal}
          />
        </View>
        <View style={{ minWidth: 195 }}>
          <Button
            secondary
            title={`🥁 EVOLVE → ${nextMeta.name}`}
            onPress={triggerEvolveSurge}
          />
        </View>
      </View>
    </View>
  );
}
