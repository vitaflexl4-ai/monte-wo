import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import * as Crypto from "expo-crypto";
import climbDataset from "./climb-scale-data.json";
import { interpolateDisciplineLadder } from "../../../shared/proposed-climb-scale.js";
import { ruleFor, today, type Workout } from "./model";
import { rankArt, disciplineArt, CardScrim, LiftGlyph } from "./art";
import {
  bestCandidateForDiscipline,
  type LocalClimbProfile,
  type SelfReportedLift,
  recordSelfReportedLift,
} from "./device-prefs";
import {
  Badge,
  Button,
  C,
  Card,
  Chips,
  Field,
  Label,
  ModalSheet,
  Notice,
  Screen,
  Title,
  s,
} from "./ui";
import {
  RankAscensionCeremonyModal,
  RankHallOfPrideStage,
  getRankVisual,
} from "./RankAvatarStage";
import { MuscleDefinitionCamera } from "./MuscleDefinitionCamera";
import {
  isSoundEnabled,
  playCheckClick,
  playRankPreviewPulse,
  setSoundEnabled,
} from "./sound-fx";

const DISCIPLINES = [
  { id: "squat", short: "Squat", full: "Barbell Squat" },
  { id: "bench", short: "Bench", full: "Barbell Bench Press" },
  { id: "deadlift", short: "Deadlift", full: "Barbell Deadlift" },
  { id: "curl", short: "Strict Curl", full: "Strict Biceps Curl" },
] as const;

export function RankScreen({
  route,
  localProfile,
  onSaveProfile,
  selfLifts,
  onRecordLift,
  onDeleteLift,
}: {
  navigation?: any;
  route?: any;
  me?: any;
  localProfile: LocalClimbProfile;
  onSaveProfile: (next: LocalClimbProfile) => Promise<void>;
  selfLifts: SelfReportedLift[];
  onRecordLift: (
    input: Parameters<typeof recordSelfReportedLift>[0],
  ) => Promise<SelfReportedLift>;
  onDeleteLift: (id: string) => Promise<void>;
  allWorkouts?: Workout[];
}) {
  const [discipline, setDiscipline] = useState<
    "squat" | "bench" | "deadlift" | "curl"
  >((route?.params?.discipline as any) || "squat");

  useEffect(() => {
    if (route?.params?.discipline) setDiscipline(route.params.discipline);
  }, [route?.params?.discipline]);

  const [bwText, setBwText] = useState(localProfile.bodyweight || "");
  const [bwUnit, setBwUnit] = useState<"kg" | "lb">(localProfile.unit || "lb");
  const [sexCat, setSexCat] = useState<"male" | "female" | "unclassified">(
    localProfile.sexCategory || "male",
  );
  const [ageText, setAgeText] = useState(localProfile.ageYears || "25");
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled);

  // Full-Screen Ascension Ceremony Modal
  const [ceremonyOpen, setCeremonyOpen] = useState(false);
  const [ceremonyOrd, setCeremonyOrd] = useState(1);
  const [ceremonyLoad, setCeremonyLoad] = useState<string | undefined>(
    undefined,
  );
  const [ceremonyBwMult, setCeremonyBwMult] = useState<number | null>(null);

  useEffect(() => {
    if (localProfile.bodyweight && !bwText) setBwText(localProfile.bodyweight);
  }, [localProfile.bodyweight]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playRankPreviewPulse(currentOrdinal || 3);
  }

  function syncProfile(
    nextBw = bwText,
    nextUnit = bwUnit,
    nextSex = sexCat,
    nextAge = ageText,
  ) {
    onSaveProfile({
      ...localProfile,
      bodyweight: nextBw,
      unit: nextUnit,
      sexCategory: nextSex,
      ageYears: nextAge,
    });
  }

  const ladder = useMemo(() => {
    if (!bwText.trim()) return null;
    return interpolateDisciplineLadder(climbDataset as any, discipline, {
      bodyweight: bwText,
      unit: bwUnit,
      sexCategory: sexCat,
      ageYears: ageText.trim() ? Number(ageText) : 25,
    });
  }, [discipline, sexCat, bwText, bwUnit, ageText]);

  const disciplineLifts = useMemo(
    () => selfLifts.filter((l) => l.discipline === discipline),
    [selfLifts, discipline],
  );
  const bestCandidate = useMemo(
    () => bestCandidateForDiscipline(selfLifts, discipline),
    [selfLifts, discipline],
  );

  // Overall 4-Discipline Pride Summary
  const overallCrown = useMemo(() => {
    let totalPoints = 0;
    let peakOrd = 0;
    const perLift = DISCIPLINES.map((d) => {
      const c = bestCandidateForDiscipline(selfLifts, d.id);
      const ord = c?.evaluation?.candidateOrdinal || 0;
      totalPoints += ord;
      if (ord > peakOrd) peakOrd = ord;
      return {
        ...d,
        ord,
        rankId: c?.evaluation?.candidateRankId || null,
        rankName: c?.evaluation?.candidateRankName || "Unranked",
        load: c ? `${c.load} ${c.unit}` : null,
      };
    });
    return { totalPoints, maxPoints: 36, peakOrd, perLift };
  }, [selfLifts]);

  // Attempt Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [liftLoad, setLiftLoad] = useState("");
  const [liftReps, setLiftReps] = useState("1");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [liftNote, setLiftNote] = useState("");
  const [attemptFeedback, setAttemptFeedback] = useState("");
  const [showStandardInfo, setShowStandardInfo] = useState(false);

  const rule = useMemo(() => ruleFor(discipline), [discipline]);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const c of rule?.checks || []) initial[c.id] = true;
    setChecks(initial);
  }, [discipline, rule]);

  async function submitLiftAttempt() {
    setAttemptFeedback("");
    if (!bwText.trim()) {
      setAttemptFeedback(
        "Enter your bodyweight first so your target rung can be calculated.",
      );
      return;
    }
    if (!liftLoad.trim() || Number(liftLoad) <= 0) {
      setAttemptFeedback("Enter the lifted weight.");
      return;
    }
    try {
      const repsNum = Math.max(1, Math.round(Number(liftReps) || 1));
      const saved = await onRecordLift({
        id: Crypto.randomUUID(),
        discipline,
        performedOn: today(),
        load: liftLoad.trim(),
        unit: bwUnit,
        bodyweight: bwText.trim(),
        bodyweightUnit: bwUnit,
        sexCategory: sexCat,
        ageYears: Number(ageText) || 25,
        reps: repsNum,
        resultType: repsNum === 1 ? "tested" : "estimated",
        checks,
        notes: liftNote.trim(),
      });
      const achievedOrd = saved.evaluation?.candidateOrdinal || 0;
      const savedLoadStr = `${saved.load} ${saved.unit}`;
      const savedBwMult = saved.evaluation?.bwMultiple ?? null;

      setLiftLoad("");
      setLiftNote("");
      setLogModalOpen(false);

      // Launch Glorious Full-Screen Rank Ascension Ceremony + Fanfare!
      setCeremonyOrd(achievedOrd);
      setCeremonyLoad(savedLoadStr);
      setCeremonyBwMult(savedBwMult);
      setCeremonyOpen(true);
    } catch (e: any) {
      setAttemptFeedback(e?.message || "Invalid lift input.");
    }
  }

  const currentRankId = bestCandidate?.evaluation?.candidateRankId || null;
  const currentOrdinal = bestCandidate?.evaluation?.candidateOrdinal || 0;

  const nextRung = useMemo(() => {
    if (bestCandidate?.evaluation?.nextRung)
      return bestCandidate.evaluation.nextRung;
    if (ladder?.ok && !currentRankId) return ladder.rungs[0];
    return null;
  }, [bestCandidate, ladder, currentRankId]);

  const progressPercent = bestCandidate?.evaluation?.progressPercent ?? 0;

  const deltaLabel = useMemo(() => {
    if (!nextRung?.requiredKg) return null;
    const performedKg = bestCandidate?.evaluation?.performedKg || 0;
    const diffKg = Math.max(0, nextRung.requiredKg - performedKg);
    if (diffKg <= 0) return "UNLOCKED";
    if (bwUnit === "lb") {
      return `+${Math.max(1, Math.round(diffKg * 2.20462))} lb`;
    }
    return `+${Math.round(diffKg * 10) / 10} kg`;
  }, [bestCandidate, nextRung, bwUnit]);

  const activeDisciplineMeta =
    DISCIPLINES.find((d) => d.id === discipline) || DISCIPLINES[0];

  const peakVisual = getRankVisual(overallCrown.peakOrd);

  return (
    <Screen wide>
      {/* Hall of Pride Top Header */}
      <View style={[s.row, { flexWrap: "wrap" }]}>
        <View style={{ gap: 2, flex: 1 }}>
          <Label>RAN FÒ AK KOURAY · GLWA NAN FÈ AYISYEN</Label>
          <Title>Ran Fò ak Kouray · Athlete Evolution</Title>
          <Text style={{ color: "#fde047", fontSize: 12, fontWeight: "800" }}>
            Madanm ak Mesye, Onè Respè — Anperè Fòs Soti nan Limonade
          </Text>
        </View>
        <Button
          small
          crimson
          title="⚡ Test 1RM Lift"
          onPress={() => setLogModalOpen(true)}
        />
      </View>

      {/* Overall 4-Discipline Championship Crown Banner */}
      <Card
        style={{
          backgroundColor: "#04070f",
          borderColor: overallCrown.peakOrd >= 5 ? peakVisual.primary : "#1e2e48",
          padding: 15,
          gap: 12,
        }}
      >
        <ImageBackground
          source={disciplineArt[discipline]}
          style={[StyleSheet.absoluteFill, { opacity: 0.25 }]}
          resizeMode="cover"
        >
          <CardScrim direction="horizontal" />
        </ImageBackground>

        <View style={[s.row, { flexWrap: "wrap" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#140c1c",
                borderWidth: 1,
                borderColor: peakVisual.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Crown size={20} color={peakVisual.primary} />
            </View>
            <View>
              <Text
                style={{
                  color: peakVisual.primary,
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 1.2,
                }}
              >
                OVERALL ATHLETE STANDING
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>
                {overallCrown.peakOrd > 0
                  ? `${peakVisual.name} Sovereign · ${peakVisual.title}`
                  : "Unranked Contender · Claim Your First Crest"}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: "#09101d",
              borderWidth: 1,
              borderColor: "#223452",
            }}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 13,
                fontWeight: "900",
                fontVariant: ["tabular-nums"],
              }}
            >
              CLIMB SCORE: {overallCrown.totalPoints} / {overallCrown.maxPoints}
            </Text>
          </View>
        </View>

        {/* 4 Independent Discipline Selector Cards with Live Crests */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {overallCrown.perLift.map((d) => {
            const active = d.id === discipline;
            const dVis = getRankVisual(d.ord);
            return (
              <Pressable
                key={d.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setDiscipline(d.id);
                  playRankPreviewPulse(d.ord || 2);
                }}
                style={{
                  flex: 1,
                  minWidth: 130,
                  paddingVertical: 10,
                  paddingHorizontal: 11,
                  borderRadius: 15,
                  backgroundColor: active ? "#0e192d" : "#060911",
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active
                    ? d.ord > 0
                      ? dVis.primary
                      : C.cyan
                    : "#192438",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <LiftGlyph
                    id={d.id}
                    size={24}
                    color={active ? C.cyan : "#64748b"}
                  />
                  <View>
                    <Text
                      style={{
                        color: active ? "#ffffff" : "#cbd5e1",
                        fontWeight: "900",
                        fontSize: 13,
                      }}
                    >
                      {d.short}
                    </Text>
                    <Text
                      style={{
                        color: d.ord > 0 ? dVis.primary : "#64748b",
                        fontSize: 10.5,
                        fontWeight: "800",
                      }}
                    >
                      {d.rankName}
                    </Text>
                  </View>
                </View>

                <Image
                  source={rankArt[d.rankId || "debitan"]}
                  style={{
                    width: 30,
                    height: 30,
                    opacity: d.rankId ? 1 : 0.32,
                  }}
                  resizeMode="contain"
                />
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* GLORIOUS 2D ANIMATED "YOU NOW" vs "POSSIBLE NEXT RANK" STAGE */}
      <RankHallOfPrideStage
        disciplineFull={activeDisciplineMeta.full}
        currentOrdinal={currentOrdinal}
        bestLoadLabel={
          bestCandidate ? `${bestCandidate.load} ${bestCandidate.unit}` : null
        }
        bwMultiple={bestCandidate?.evaluation?.bwMultiple ?? null}
        nextRung={nextRung}
        unit={bwUnit}
        percentToNext={progressPercent}
        deltaLabel={deltaLabel}
        sexCategory={sexCat}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onOpenTestModal={() => setLogModalOpen(true)}
        onOpenCeremony={(previewOrd) => {
          setCeremonyOrd(previewOrd);
          setCeremonyLoad(
            previewOrd === currentOrdinal && bestCandidate
              ? `${bestCandidate.load} ${bestCandidate.unit}`
              : undefined,
          );
          setCeremonyBwMult(
            previewOrd === currentOrdinal
              ? (bestCandidate?.evaluation?.bwMultiple ?? null)
              : null,
          );
          setCeremonyOpen(true);
        }}
      />

      {/* AI MUSCLE DEFINITION CAMERA & 9:16 SOCIAL STORY EXPORTER */}
      <MuscleDefinitionCamera
        earnedRankOrdinal={currentOrdinal || overallCrown.peakOrd || 7}
        disciplineLabel={activeDisciplineMeta.full}
      />

      {/* Inline Bodyweight & Division Calibration */}
      <Card>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          <View style={{ gap: 2 }}>
            <Text style={s.heading}>Your Bodyweight Class & Silhouette</Text>
            <Text style={{ color: C.muted, fontSize: 11.5 }}>
              Calibrates exact Debitan → Lejand target weights and your 2D athlete frame.
            </Text>
          </View>
          <Chips
            items={[
              { id: "lb", name: "LB" },
              { id: "kg", name: "KG" },
            ]}
            value={bwUnit}
            onChange={(u) => {
              const nextU = u as "kg" | "lb";
              setBwUnit(nextU);
              syncProfile(bwText, nextU, sexCat, ageText);
            }}
          />
        </View>

        <View style={s.grid}>
          <View style={s.half}>
            <Field
              label={`Bodyweight (${bwUnit})`}
              value={bwText}
              onChangeText={(t) => {
                setBwText(t);
                syncProfile(t, bwUnit, sexCat, ageText);
              }}
              placeholder={bwUnit === "lb" ? "e.g. 180" : "e.g. 82"}
              numeric
            />
          </View>
          <View style={s.half}>
            <Field
              label="Age (18+)"
              value={ageText}
              onChangeText={(t) => {
                setAgeText(t);
                syncProfile(bwText, bwUnit, sexCat, t);
              }}
              placeholder="25"
              numeric
            />
          </View>
        </View>

        <Chips
          items={[
            { id: "male", name: "Male Division" },
            { id: "female", name: "Female Division" },
            { id: "unclassified", name: "Open Division" },
          ]}
          value={sexCat}
          onChange={(c) => {
            const nextC = c as any;
            setSexCat(nextC);
            syncProfile(bwText, bwUnit, nextC, ageText);
          }}
        />
      </Card>

      {/* 9-Rank Climb Scale Ladder (Interactive: Tap Any Rung for Ceremony & Sound!) */}
      <Card>
        <View style={s.row}>
          <View style={{ gap: 2 }}>
            <Text style={s.heading}>
              {activeDisciplineMeta.full} · All 9 Rungs
            </Text>
            <Text style={{ color: C.muted, fontSize: 11.5 }}>
              Tap any rung to launch its 2D rank ceremony & brass fanfare
            </Text>
          </View>
          <Text style={s.small}>
            {ladder?.ok ? `@ ${bwText} ${bwUnit}` : "Enter BW above"}
          </Text>
        </View>

        {ladder && !ladder.ok ? <Notice text={ladder.message} /> : null}

        <View style={{ gap: 8 }}>
          {(
            (ladder?.ok ? ladder.rungs : null) ||
            (climbDataset as any).ranks.map((r: any, idx: number) => ({
              id: r.id,
              ordinal: idx + 1,
              name: r.name,
              requiredKg: null,
              requiredLb: null,
              bwMultiple: null,
              requiresVideoForTier: idx >= 6,
            }))
          ).map((r: any) => {
            const achieved =
              Boolean(bestCandidate?.evaluation?.candidateOrdinal) &&
              (bestCandidate?.evaluation?.candidateOrdinal || 0) >= r.ordinal;
            const isNext = nextRung?.ordinal === r.ordinal;
            const vis = getRankVisual(r.ordinal);
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => {
                  setCeremonyOrd(r.ordinal);
                  setCeremonyLoad(
                    r.requiredKg
                      ? bwUnit === "lb"
                        ? `Target: ${r.requiredLb} lb (${r.requiredKg} kg)`
                        : `Target: ${r.requiredKg} kg (${r.requiredLb} lb)`
                      : undefined,
                  );
                  setCeremonyBwMult(r.bwMultiple || null);
                  setCeremonyOpen(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 15,
                  backgroundColor: achieved
                    ? "#061b14"
                    : isNext
                      ? "#0b1324"
                      : "#000000",
                  borderWidth: isNext || achieved ? 1.5 : 1,
                  borderColor: achieved
                    ? "#10b981"
                    : isNext
                      ? vis.primary
                      : "#182234",
                }}
              >
                <Image
                  source={rankArt[r.id]}
                  style={{ width: 50, height: 50 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={{ color: vis.primary, fontSize: 11.5, fontWeight: "900" }}>
                      0{r.ordinal}
                    </Text>
                    <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
                      {r.name}
                    </Text>
                    {achieved ? <Badge text="EARNED" tone="green" /> : null}
                    {isNext && !achieved ? (
                      <Badge text="NEXT TARGET" tone="gold" />
                    ) : null}
                    {r.requiresVideoForTier ? (
                      <Badge text="VIDEO" tone="red" />
                    ) : null}
                  </View>
                  <Text style={{ color: C.muted, fontSize: 11.5 }}>
                    {vis.title} ·{" "}
                    {r.bwMultiple ? `${r.bwMultiple}× bodyweight` : "Strict 1-rep standard"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  {r.requiredKg ? (
                    <>
                      <Text
                        style={{
                          color: achieved ? C.green : "#ffffff",
                          fontSize: 16,
                          fontWeight: "900",
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {bwUnit === "lb" ? `${r.requiredLb} lb` : `${r.requiredKg} kg`}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>
                        {bwUnit === "lb" ? `${r.requiredKg} kg` : `${r.requiredLb} lb`}
                      </Text>
                    </>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Sparkles size={12} color={vis.primary} />
                      <Text style={{ color: vis.primary, fontSize: 11.5, fontWeight: "800" }}>
                        Preview
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Logged Self-Reported Lifts */}
      {disciplineLifts.length > 0 ? (
        <Card>
          <Text style={s.heading}>Your Logged {activeDisciplineMeta.short} Attempts</Text>
          <View style={{ gap: 8 }}>
            {disciplineLifts.map((l) => (
              <View
                key={l.id}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: "#05070c",
                  borderWidth: 1,
                  borderColor: "#1a2538",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
                    {l.load} {l.unit} × {l.reps} rep ·{" "}
                    {l.evaluation?.candidateRankName ||
                      (l.evaluation?.status === "training-estimate-only"
                        ? `Est. 1RM ${l.evaluation.estimatedKg} kg`
                        : "Below Debitan / Disqualified")}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11.5 }}>
                    {l.performedOn} · SELF-REPORTED · NOT VERIFIED
                  </Text>
                </View>
                <Pressable onPress={() => onDeleteLift(l.id)} style={{ padding: 6 }}>
                  <Trash2 size={15} color="#ff6b81" />
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Compact Collapsible Standard & Verification Details */}
      <Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowStandardInfo((v) => !v)}
          style={s.row}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={16} color={C.cyan} />
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13.5 }}>
              Judging Rules & MONTE Verified Status
            </Text>
          </View>
          {showStandardInfo ? (
            <ChevronUp size={16} color={C.muted} />
          ) : (
            <ChevronDown size={16} color={C.muted} />
          )}
        </Pressable>
        {showStandardInfo ? (
          <View style={{ gap: 8, paddingTop: 6 }}>
            <Text style={{ color: C.cyan, fontSize: 11, fontWeight: "800" }}>
              STRICT MOVEMENT STANDARD · {rule?.variation}
            </Text>
            {(rule?.checks || []).map((c: any) => (
              <Text key={c.id} style={{ color: C.muted, fontSize: 12.5 }}>
                • {c.label}
              </Text>
            ))}
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              MONTE Verified official awards remain locked pending final v0.1 calibration sign-off and video review activation. Device attempts are badged SELF-REPORTED · NOT VERIFIED under Proposed Standard v0.1.
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Modal: Record Strict Attempt */}
      <ModalSheet
        visible={logModalOpen}
        title={`Test ${activeDisciplineMeta.full}`}
        onClose={() => setLogModalOpen(false)}
      >
        <View style={s.grid}>
          <View style={s.half}>
            <Field
              label={`Lifted Weight (${bwUnit})`}
              value={liftLoad}
              onChangeText={setLiftLoad}
              placeholder={bwUnit === "lb" ? "e.g. 315" : "e.g. 142.5"}
              numeric
            />
          </View>
          <View style={s.half}>
            <Field
              label="Reps (1 = Ranked Single)"
              value={liftReps}
              onChangeText={setLiftReps}
              placeholder="1"
              numeric
            />
          </View>
        </View>

        <Text style={s.fieldLabel}>STRICT MOVEMENT STANDARD CHECKLIST</Text>
        <View style={{ gap: 8 }}>
          {(rule?.checks || []).map((chk: any) => {
            const on = checks[chk.id] !== false;
            return (
              <Pressable
                key={chk.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  const nextVal = !on;
                  playCheckClick(nextVal);
                  setChecks((prev) => ({ ...prev, [chk.id]: nextVal }));
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: on ? "#071f17" : "#1a0a0e",
                  borderWidth: 1,
                  borderColor: on ? "#166534" : C.redBorder,
                }}
              >
                <CheckCircle2 size={17} color={on ? C.green : "#ff6b81"} />
                <Text style={{ color: "#ffffff", fontSize: 12.5, flex: 1 }}>
                  {chk.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="Notes (optional)"
          value={liftNote}
          onChangeText={setLiftNote}
          placeholder="Pause quality, gym/bar note…"
        />

        {attemptFeedback ? <Notice text={attemptFeedback} error /> : null}

        <Button
          crimson
          title="⚡ Evaluate & Unleash Rank Ceremony"
          onPress={submitLiftAttempt}
        />
      </ModalSheet>

      {/* Glorious Full-Screen 2D Rank Ascension Ceremony + Brass Fanfare */}
      <RankAscensionCeremonyModal
        visible={ceremonyOpen}
        onClose={() => setCeremonyOpen(false)}
        ordinal={ceremonyOrd}
        disciplineName={activeDisciplineMeta.full}
        loadLabel={ceremonyLoad}
        bwMultiple={ceremonyBwMult}
        sexCategory={sexCat}
      />
    </Screen>
  );
}
