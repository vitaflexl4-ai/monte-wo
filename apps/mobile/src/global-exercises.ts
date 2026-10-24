import { Platform } from "react-native";
import type { ExerciseCatalog } from "./catalog";
import { packMediaUri, type PackRecord } from "./workout-library";

export type UniversalExercise = {
  id: string;
  name: string;
  group: string;
  equipment: string;
  muscles: string[];
  aliases: string[];
  cues: string[];
  climbDiscipline?: "squat" | "bench" | "deadlift" | "curl" | null;
  isCanonicalBackend?: boolean;
  isCustom?: boolean;
  pack?: PackRecord | null;
};

export type LoggedWorkoutSet = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  group: string;
  reps: number;
  weight: number;
  unit: "kg" | "lb";
  rpe?: number | null;
  completed: boolean;
};

export type VaultWorkoutSession = {
  id: string;
  title: string;
  performedOn: string;
  durationMin?: number;
  notes?: string;
  source?: "manual" | "generated";
  sets: LoggedWorkoutSet[];
  createdAt: string;
};

export type WorkoutGenPreferences = {
  split:
    | "climb_power"
    | "push"
    | "pull"
    | "legs"
    | "upper"
    | "lower"
    | "full_body"
    | "arms_curl";
  equipment: "full_gym" | "barbell" | "dumbbell" | "cables_machines" | "bodyweight";
  durationMin: 30 | 45 | 60 | 75;
  level: "foundation" | "intermediate" | "advanced";
  focusLift: "squat" | "bench" | "deadlift" | "curl" | "balanced";
};

export type GeneratedExerciseSlot = {
  slotId: string;
  role: string;
  exercise: UniversalExercise;
  alternatives: UniversalExercise[];
  sets: number;
  repRange: string;
  targetReps: number;
  rpe: string;
  restSec: number;
};

export type GeneratedWorkoutPlan = {
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  warmupNote: string;
  slots: GeneratedExerciseSlot[];
};

const CUSTOM_EX_KEY = "montewo.custom_exercises.v1";
const VAULT_WORKOUTS_KEY = "montewo.vault_workouts.v1";

function slugify(input: string): string {
  return (
    String(input || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "custom-exercise"
  );
}

// Compact tuple format: [name, group, equipment, primaryMusclesCsv, aliasesCsv, cue, climbDiscipline?]
const ENCYCLOPEDIA_SEED: [
  string,
  string,
  string,
  string,
  string,
  string,
  ("squat" | "bench" | "deadlift" | "curl")?,
][] = [
  // SQUAT & LEGS
  ["Barbell Back Squat", "legs", "Barbell", "Quadriceps,Glutes,Adductors", "high bar squat,low bar squat,back squat", "Brace 360°, descend until hip crease passes below top of knee, drive up.", "squat"],
  ["Low-Bar Competition Squat", "legs", "Barbell", "Glutes,Quadriceps,Posterior Chain", "powerlifting squat,comp squat", "Set bar on rear delts, sit hips back and down below parallel.", "squat"],
  ["Pause Barbell Squat", "legs", "Barbell", "Quadriceps,Glutes,Core", "paused squat,hole squat", "Hold motionless 2 full seconds in the bottom without sinking.", "squat"],
  ["Barbell Front Squat", "legs", "Barbell", "Quadriceps,Upper Back,Core", "front rack squat,olympic squat", "Keep elbows high and torso upright throughout the ascent."],
  ["Safety Bar Squat (SSB)", "legs", "Barbell", "Quadriceps,Upper Back,Glutes", "ssb squat,yoke bar squat", "Push upper back into the pad and resist forward fold."],
  ["Zercher Squat", "legs", "Barbell", "Quadriceps,Core,Upper Back", "crook of elbow squat", "Scoop bar tight to torso and maintain rigid trunk."],
  ["Barbell Box Squat", "legs", "Barbell", "Glutes,Hamstrings,Quadriceps", "wide stance box squat", "Control descent onto box without rocking; explode up."],
  ["Pin Squat / Anderson Squat", "legs", "Barbell", "Quadriceps,Glutes", "bottom up squat", "Start from dead stop on safety pins; drive concentrically."],
  ["Hack Squat Machine", "legs", "Machine", "Quadriceps,Glutes", "sled hack squat", "Keep lower back glued to pad and descend to full knee flexion."],
  ["Pendulum Squat", "legs", "Machine", "Quadriceps,Glutes", "arc squat", "Control deep knee flexion and drive smoothly out of the hole."],
  ["Belt Squat", "legs", "Machine", "Quadriceps,Glutes,Adductors", "hip belt squat", "Spine-unloaded quad and glute overload with full depth."],
  ["45° Leg Press", "legs", "Machine", "Quadriceps,Glutes", "sled leg press,machine leg press", "Lower sled as deep as hips allow without lumbar rounding."],
  ["Single-Leg Press", "legs", "Machine", "Quadriceps,Glutes", "unilateral leg press", "Track knee directly over second toe with controlled eccentric."],
  ["Smith Machine Squat", "legs", "Machine", "Quadriceps,Glutes", "smith squat", "Set feet slightly forward for quad bias and controlled tempo."],
  ["Goblet Squat", "legs", "Dumbbell", "Quadriceps,Core,Glutes", "kettlebell goblet squat,db goblet squat", "Hold weight close to sternum and sink elbows inside knees."],
  ["Bulgarian Split Squat", "legs", "Dumbbell", "Quadriceps,Glutes", "rear foot elevated split squat,rfess", "Descend straight down with slight torso lean for glute/quad drive."],
  ["Dumbbell Walking Lunge", "legs", "Dumbbell", "Quadriceps,Glutes,Hamstrings", "walking lunges,barbell lunge", "Take controlled strides and push through full front foot."],
  ["Reverse Lunge", "legs", "Dumbbell", "Glutes,Quadriceps", "step back lunge,barbell reverse lunge", "Step back softly and drive front hip to full extension."],
  ["Step-Up", "legs", "Dumbbell", "Glutes,Quadriceps", "box step up,high step up", "Avoid pushing off back foot; pull up exclusively with lead leg."],
  ["Sissy Squat", "legs", "Bodyweight", "Quadriceps", "bodyweight quad extension", "Keep hips extended from knees to shoulders as knees travel forward."],
  ["Spanish Squat", "legs", "Bands", "Quadriceps,Patellar Tendon", "banded squat", "Push shins back against heavy band while sitting upright."],
  ["Leg Extension", "legs", "Machine", "Quadriceps", "seated leg extension,single leg extension", "Pause 1 second at full lockout and lower over 2-3 seconds."],
  ["Seated Leg Curl", "legs", "Machine", "Hamstrings", "seated hamstring curl", "Lock thigh pad snug and curl heels all the way under seat."],
  ["Lying Leg Curl", "legs", "Machine", "Hamstrings", "prone leg curl,hamstring curl", "Keep hips pressed firmly into bench pad; avoid lumbar arch."],
  ["Nordic Hamstring Curl", "legs", "Bodyweight", "Hamstrings", "nordic curl,natural glute ham raise", "Resist eccentric fall as slowly as possible with straight hips."],
  ["Glute-Ham Raise (GHR)", "legs", "Machine", "Hamstrings,Glutes,Erectors", "ghd raise", "Extend at knee and hip smoothly with neutral spine."],
  ["Barbell Hip Thrust", "legs", "Barbell", "Glutes,Hamstrings", "hip thrust,glute bridge barbell", "Tuck chin, posteriorly tilt pelvis at top, pause 1 second."],
  ["Machine Hip Thrust", "legs", "Machine", "Glutes", "glute drive machine,nautilus glute drive", "Drive through heels to full lockout without hyperextending low back."],
  ["Cable Pull-Through", "legs", "Cable", "Glutes,Hamstrings", "rope pull through", "Hinge hips back toward cable stack and snap glutes to lockout."],
  ["Hip Abduction Machine", "legs", "Machine", "Glute Medius,Outer Hip", "seated abductor", "Control outward press and pause before smooth return."],
  ["Hip Adduction Machine", "legs", "Machine", "Adductors,Inner Thigh", "seated adductor", "Use controlled stretch and squeeze knees smoothly together."],
  ["Standing Calf Raise", "legs", "Machine", "Gastrocnemius,Calves", "smith calf raise,barbell calf raise", "Full 2-second stretch at bottom, full tiptoe peak contraction."],
  ["Seated Calf Raise", "legs", "Machine", "Soleus,Calves", "bent knee calf raise", "Eliminate bounce at the bottom; drive high onto big toe."],
  ["Tibialis Raise", "legs", "Bodyweight", "Tibialis Anterior,Shins", "tib bar raise,wall tib raise", "Pull toes sharply toward shins and pause at top."],

  // BENCH & CHEST
  ["Barbell Bench Press (Paused)", "chest", "Barbell", "Pectorals,Triceps,Front Delts", "flat bench press,competition bench", "Retract scapula, pause bar motionless on chest, press to lockout.", "bench"],
  ["Touch-and-Go Barbell Bench Press", "chest", "Barbell", "Pectorals,Triceps,Front Delts", "tng bench press", "Light controlled touch on sternum without sinking or bouncing."],
  ["Larsen Press", "chest", "Barbell", "Pectorals,Triceps", "feet up bench press,legless bench", "Extend legs straight in air to eliminate leg drive and isolate upper body."],
  ["Spoto Press", "chest", "Barbell", "Pectorals,Triceps", "hover bench press", "Pause bar 2 cm above chest for 1-2 seconds before pressing."],
  ["Incline Barbell Bench Press", "chest", "Barbell", "Upper Chest,Front Delts,Triceps", "incline bench", "30-45° bench angle; lower bar to upper sternum/clavicle."],
  ["Decline Barbell Bench Press", "chest", "Barbell", "Lower Chest,Triceps", "decline bench", "Control bar path to lower sternum with tucked elbows."],
  ["Barbell Floor Press", "chest", "Barbell", "Triceps,Pectorals", "dumbbell floor press", "Pause triceps gently on floor without losing upper-back tightness."],
  ["Flat Dumbbell Bench Press", "chest", "Dumbbell", "Pectorals,Triceps,Front Delts", "dumbbell bench press,db flat press", "Lower bells deep beside chest at ~45° arm path; press smoothly."],
  ["Incline Dumbbell Press", "chest", "Dumbbell", "Upper Chest,Front Delts,Triceps", "incline db press,30 degree db press", "Set bench 30°; get deep pec stretch and press slightly inward."],
  ["Machine Chest Press", "chest", "Machine", "Pectorals,Triceps", "converging chest press,plate loaded chest press,hammer strength press", "Keep shoulder blades pinned to pad as handles converge."],
  ["Incline Machine Press", "chest", "Machine", "Upper Chest,Triceps", "hammer strength incline press", "Drive elbows smoothly without shrugging shoulders."],
  ["Weighted Chest Dip", "chest", "Bodyweight", "Lower Chest,Triceps,Front Delts", "parallel bar dips,dips", "Lean torso forward ~25° and descend until shoulders pass below elbows."],
  ["Pec Deck / Machine Fly", "chest", "Machine", "Pectorals", "butterfly machine,pec fly machine", "Keep soft elbow bend and bring upper arms—not just hands—together."],
  ["Cable Crossover (High-to-Low)", "chest", "Cable", "Lower Chest,Pectorals", "high cable fly,standing cable fly", "Step forward for stability and sweep arcs down and across midline."],
  ["Low-to-High Cable Fly", "chest", "Cable", "Upper Chest", "incline cable fly", "Scoop cables upward from hip height to clavicular pec convergence."],
  ["Flat Dumbbell Fly", "chest", "Dumbbell", "Pectorals", "incline dumbbell fly", "Controlled stretch in bottom third without overloading shoulder capsule."],
  ["Push-Up", "chest", "Bodyweight", "Pectorals,Triceps,Core", "weighted push up,deficit push up,diamond push up", "Rigid plank from head to heel; touch chest cleanly to floor."],

  // DEADLIFT & BACK
  ["Conventional Barbell Deadlift", "back", "Barbell", "Posterior Chain,Glutes,Hamstrings,Back", "deadlift,comp deadlift", "Bar over mid-foot, pull slack out, push floor away with zero hitching.", "deadlift"],
  ["Sumo Barbell Deadlift", "back", "Barbell", "Glutes,Adductors,Quadriceps,Back", "wide stance deadlift", "Open hips externally, wedge torso vertical close to bar, lock knees & hips."],
  ["Deficit Barbell Deadlift", "back", "Barbell", "Hamstrings,Glutes,Lower Back", "elevated stance deadlift", "Stand on 2-5 cm platform to build off-the-floor speed and leg drive."],
  ["Pause Barbell Deadlift", "back", "Barbell", "Posterior Chain,Lats,Erectors", "paused deadlift", "Pause bar 2 seconds right below the knee while keeping lats locked."],
  ["Rack Pull / Block Pull", "back", "Barbell", "Upper Back,Erectors,Glutes", "elevated deadlift", "Pull from mid-shin or knee height to overload lockout."],
  ["Trap-Bar / Hex-Bar Deadlift", "back", "Barbell", "Quadriceps,Glutes,Traps,Back", "hex bar deadlift", "Stand centered inside frame, brace hard, drive vertically."],
  ["Romanian Deadlift (RDL)", "back", "Barbell", "Hamstrings,Glutes,Erectors", "dumbbell rdl,barbell rdl", "Push hips straight back with soft knees while shaving bar down thighs."],
  ["Stiff-Leg Deadlift (SLDL)", "back", "Barbell", "Hamstrings,Erectors,Glutes", "straight leg deadlift", "Start from floor each rep with high hips and deep hamstring stretch."],
  ["Barbell Good Morning", "back", "Barbell", "Hamstrings,Erectors,Glutes", "ssb good morning,seated good morning", "Hinge hips backward with braced spine until torso nears parallel."],
  ["45° Back Extension / Hyperextension", "back", "Bodyweight", "Erectors,Glutes,Hamstrings", "weighted back extension,roman chair", "Hinge cleanly around hip pad; squeeze glutes to neutral spine."],
  ["Pull-Up (Pronated)", "back", "Bodyweight", "Lats,Upper Back,Biceps", "weighted pull up,wide grip pull up", "Start from dead hang, depress scapula, pull chest to bar."],
  ["Chin-Up (Supinated)", "back", "Bodyweight", "Lats,Biceps,Upper Back", "weighted chin up,underhand pull up", "Full elbow extension at bottom; clear chin cleanly above bar."],
  ["Neutral-Grip Pull-Up", "back", "Bodyweight", "Lats,Brachialis,Mid Back", "parallel grip pull up", "Drive elbows down toward hips while keeping ribcage stacked."],
  ["Lat Pulldown", "back", "Cable", "Lats,Teres Major,Biceps", "wide lat pulldown,mag grip pulldown,close grip pulldown", "Lean back ~15°, pull bar to upper chest without swinging torso."],
  ["Single-Arm Cable Pulldown", "back", "Cable", "Lats", "unilateral kneeling pulldown,iliac lat pulldown", "Drive elbow straight into hip pocket along natural rib path."],
  ["Straight-Arm Cable Pulldown", "back", "Cable", "Lats,Teres Major", "rope pullover,lat prayer", "Keep elbows softly locked and sweep bar/rope in an arc to thighs."],
  ["Bent-Over Barbell Row", "back", "Barbell", "Upper Back,Lats,Erectors", "barbell row,overhand row,yates row", "Hinge ~45°, row bar to lower ribs/navel without torso heave."],
  ["Pendlay Row", "back", "Barbell", "Upper Back,Lats", "dead stop barbell row", "Torso parallel to floor; row explosively from dead stop each rep."],
  ["One-Arm Dumbbell Row", "back", "Dumbbell", "Lats,Mid Back,Rear Delts", "kroc row,single arm db row", "Sweep dumbbell back toward hip rather than shrugging straight up."],
  ["Chest-Supported Row", "back", "Machine", "Upper Back,Rhomboids,Lats", "incline db row,t-bar chest supported row,seal row", "Eliminate momentum by keeping sternum glued to pad."],
  ["T-Bar Row", "back", "Barbell", "Mid Back,Lats,Traps", "landmine row,meadows row", "Brace hips and pull plates deep into torso with full scapular retraction."],
  ["Seated Cable Row", "back", "Cable", "Mid Back,Lats,Rhomboids", "v bar row,wide cable row", "Sit tall, let shoulder blades protract slightly on stretch, squeeze back."],
  ["Dumbbell Pullover", "back", "Dumbbell", "Lats,Serratus,Chest", "machine pullover", "Arc weight behind head with braced ribs and pull back with lats."],
  ["Inverted Row / Australian Pull-Up", "back", "Bodyweight", "Mid Back,Rear Delts,Biceps", "ring row,smith machine row", "Keep body rigid like a reverse plank and touch chest to bar/rings."],

  // STRICT CURL & ARMS
  ["Wall-Strict Barbell Curl", "arms", "Barbell", "Biceps Brachii,Forearms", "strict biceps curl,competition strict curl,ez strict curl", "Head, upper back, and glutes stay continuously against the wall to lockout.", "curl"],
  ["Standing Barbell Curl", "arms", "Barbell", "Biceps Brachii", "straight bar curl,olympic bar curl", "Pin elbows beside ribs; curl without swinging hips."],
  ["EZ-Bar Curl", "arms", "Barbell", "Biceps,Brachialis", "cambered bar curl,close grip ez curl", "Wrist-friendly semi-supinated curl with 2-second eccentric."],
  ["Preacher Curl (EZ-Bar / Machine)", "arms", "Barbell", "Short Head Biceps,Brachialis", "scott curl,dumbbell preacher curl,machine preacher curl", "Keep triceps flat on pad and control bottom stretch carefully."],
  ["Incline Dumbbell Curl", "arms", "Dumbbell", "Long Head Biceps", "45 degree db curl", "Let arms hang behind torso on 45-60° bench for peak long-head stretch."],
  ["Standing Dumbbell Curl", "arms", "Dumbbell", "Biceps Brachii", "alternating dumbbell curl,supinating curl", "Supinate pinky upward as you curl and lower under control."],
  ["Dumbbell Hammer Curl", "arms", "Dumbbell", "Brachialis,Brachioradialis,Biceps", "cross body hammer curl,pinwheel curl", "Neutral thumbs-up grip throughout to thicken upper arm & forearm."],
  ["Rope Cable Hammer Curl", "arms", "Cable", "Brachialis,Forearms,Biceps", "cable curl,straight bar cable curl", "Constant cable tension from bottom stretch to full contraction."],
  ["Bayesian Cable Curl", "arms", "Cable", "Long Head Biceps", "behind the back cable curl", "Step forward so cable pulls arm slightly behind torso in stretched position."],
  ["Spider Curl", "arms", "Dumbbell", "Short Head Biceps", "chest supported incline curl", "Lie chest-down on incline bench and curl cleanly with zero swing."],
  ["Concentration Curl", "arms", "Dumbbell", "Biceps Peak", "seated concentration curl", "Brace back of upper arm against inner thigh and squeeze top."],
  ["Reverse Barbell / EZ Curl", "arms", "Barbell", "Brachioradialis,Extensors", "pronated curl,zottman curl", "Overhand grip builds forearm thickness and elbow stability."],
  ["Close-Grip Barbell Bench Press", "arms", "Barbell", "Triceps,Pectorals,Front Delts", "cg bench,jm press", "Shoulder-width grip, keep elbows tucked ~30° and lock triceps hard."],
  ["EZ-Bar Skull Crusher", "arms", "Barbell", "Triceps Long & Medial Head", "lying triceps extension,dumbbell skull crusher", "Lower bar behind forehead so long head stays stretched, extend to top."],
  ["Cable Triceps Pushdown", "arms", "Cable", "Lateral & Medial Triceps", "rope pushdown,v-bar pushdown,single arm pushdown", "Lock upper arms vertical at sides; flare rope slightly at lockout."],
  ["Overhead Cable Triceps Extension", "arms", "Cable", "Long Head Triceps", "katana extension,overhead rope extension", "Stretch elbows fully overhead and extend smoothly without flaring."],
  ["Seated Overhead Dumbbell Extension", "arms", "Dumbbell", "Long Head Triceps", "french press", "Keep ribs down while lowering bell deep behind neck."],
  ["Triceps Dip Machine / Bench Dip", "arms", "Machine", "Triceps,Lower Chest", "assisted dip,seated dip press", "Press handles straight down to full elbow extension."],
  ["Wrist Curl & Reverse Wrist Curl", "arms", "Dumbbell", "Forearm Flexors & Extensors", "barbell wrist curl,behind back wrist curl", "Full range through fingers and wrist for grip and curl strength."],

  // SHOULDERS
  ["Standing Barbell Overhead Press (OHP)", "shoulders", "Barbell", "Front Delts,Triceps,Upper Chest", "military press,strict press", "Squeeze glutes & quads, press bar close past chin, lock overhead."],
  ["Push Press", "shoulders", "Barbell", "Shoulders,Triceps,Leg Drive", "barbell push press", "Short crisp knee dip-and-drive into explosive overhead lockout."],
  ["Seated Dumbbell Shoulder Press", "shoulders", "Dumbbell", "Front & Side Delts,Triceps", "db shoulder press,seated press", "Press in slight scapular-plane arc (~30° forward of torso)."],
  ["Arnold Press", "shoulders", "Dumbbell", "Front & Lateral Delts", "rotational db press", "Start palms facing you at chin, rotate smoothly as you press."],
  ["Machine Shoulder Press", "shoulders", "Machine", "Deltoids,Triceps", "plate loaded overhead press,smith shoulder press", "Controlled eccentric to ear/chin level with back supported."],
  ["Z-Press (Seated Floor Press)", "shoulders", "Barbell", "Deltoids,Core,Upper Back", "dumbbell z press", "Sit tall on floor with legs extended; zero back-pad lean allowed."],
  ["Landmine Single-Arm Press", "shoulders", "Barbell", "Front Delts,Serratus,Upper Chest", "half kneeling landmine press", "Shoulder-friendly upward arc with healthy scapular upward rotation."],
  ["Dumbbell Lateral Raise", "shoulders", "Dumbbell", "Lateral Delts", "side lateral raise,seated lateral raise", "Lead with elbows slightly forward in scapular plane to shoulder height."],
  ["Cable Lateral Raise", "shoulders", "Cable", "Lateral Delts", "behind back cable lateral,cuff lateral raise", "Set pulley at wrist height for maximum bottom-range tension."],
  ["Machine Lateral Raise", "shoulders", "Machine", "Lateral Delts", "standing machine lateral", "Drive pads outward with elbows without shrugging upper traps."],
  ["Cable Face Pull", "shoulders", "Cable", "Rear Delts,External Rotators,Mid Traps", "rope face pull", "Pull rope toward forehead while externally rotating thumbs backward."],
  ["Rear Delt Fly (Dumbbell / Pec Deck)", "shoulders", "Machine", "Rear Delts,Upper Back", "reverse pec deck,chest supported rear delt raise,cable rear delt fly", "Sweep arms wide in horizontal abduction without pinching low traps."],
  ["Upright Row (Wide / Rope)", "shoulders", "Barbell", "Lateral Delts,Upper Traps", "ez upright row,cable upright row", "Use comfortable wide grip pulling elbows to chest/shoulder height."],
  ["Barbell / Dumbbell Shrug", "shoulders", "Dumbbell", "Upper Traps", "trap bar shrug,kelso shrug", "Elevate shoulders slightly up and back; pause 2 seconds at top."],

  // CORE, CONDITIONING & ATHLETIC
  ["Hanging Leg Raise", "core", "Bodyweight", "Lower Abs,Hip Flexors,Grip", "toes to bar,hanging knee raise,captain chair leg raise", "Curl pelvis upward rather than swinging legs with momentum."],
  ["Ab Wheel Rollout", "core", "Bodyweight", "Rectus Abdominis,Lats,Core", "barbell rollout", "Keep ribs tucked and glutes squeezed; only roll as far as lumbar stays neutral."],
  ["Kneeling Cable Crunch", "core", "Cable", "Rectus Abdominis", "rope crunch", "Flex thoracic/lumbar spine downward like curling ribs toward pelvis."],
  ["Weighted Decline Sit-Up", "core", "Bodyweight", "Abs,Hip Flexors", "ghd sit up,crunch", "Control eccentric descent vertebra by vertebra."],
  ["Forearm Plank / RKC Plank", "core", "Bodyweight", "Deep Core,Transverse Abdominis", "weighted plank,side plank,copenhagen plank", "Pull elbows isometrically toward toes while squeezing glutes maximally."],
  ["Dead Bug", "core", "Bodyweight", "Deep Core,Anti-Extension", "weighted dead bug,bird dog", "Keep lower back pressed flat into floor as opposite limbs extend."],
  ["Pallof Press", "core", "Cable", "Obliques,Anti-Rotation Core", "band pallof press,cable woodchopper", "Press handle straight out from sternum and resist cable rotation."],
  ["Farmer's Carry", "cardio", "Dumbbell", "Grip,Traps,Core,Conditioning", "trap bar carry,suitcase carry", "Stand tall, pack shoulders, walk crisp fast steps under heavy load."],
  ["Kettlebell Swing", "cardio", "Dumbbell", "Glutes,Hamstrings,Work Capacity", "russian kb swing,american swing", "Crisp hip hinge snap—arms act only as hooks, never a front raise."],
  ["Sled Push / Prowler", "cardio", "Machine", "Quadriceps,Glutes,Conditioning", "backward sled drag", "Drive powerfully through balls of feet with flat braced torso."],
  ["Rowing Ergometer (Concept2)", "cardio", "Machine", "Full Body Conditioning,Back,Legs", "indoor rower,2k row", "Sequence: legs push, hips swing, arms finish—then reverse cleanly."],
  ["Assault AirBike / Stationary Bike", "cardio", "Machine", "Aerobic & Anaerobic Conditioning", "echo bike,spin bike,airdyne", "Smooth circular pedal stroke for recovery rides or Tabata intervals."],
  ["Incline Treadmill Walk / Sprint", "cardio", "Machine", "Cardio,Calves,Glutes", "brisk walk,stairmaster,sled walk", "Avoid holding console rails so incline grade actually trains legs and heart."],
  ["Barbell Power Clean", "legs", "Barbell", "Explosive Posterior Chain,Traps", "hang clean,clean and press,high pull", "Triple-extend ankles, knees, and hips explosively before fast elbow turnover."],
];

export function loadCustomExercises(): UniversalExercise[] {
  if (Platform.OS !== "web" || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_EX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomExercise(input: {
  name: string;
  group: string;
  equipment: string;
  muscles?: string[];
  cues?: string[];
}): UniversalExercise {
  const cleanName = String(input.name || "").trim();
  if (cleanName.length < 2) {
    throw new Error("Enter an exercise name (at least 2 characters).");
  }
  const existing = loadCustomExercises();
  const baseId = "custom-" + slugify(cleanName);
  const id = existing.some((e) => e.id === baseId)
    ? `${baseId}-${Date.now().toString(36).slice(-4)}`
    : baseId;
  const created: UniversalExercise = {
    id,
    name: cleanName,
    group: input.group || "chest",
    equipment: input.equipment || "Barbell",
    muscles: input.muscles?.length ? input.muscles : [input.group || "Full Body"],
    aliases: [cleanName.toLowerCase()],
    cues: input.cues?.length
      ? input.cues
      : ["Control the eccentric, use full range of motion, and log consistent reps."],
    isCustom: true,
    isCanonicalBackend: false,
  };
  const next = [created, ...existing];
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(CUSTOM_EX_KEY, JSON.stringify(next));
  }
  return created;
}

export function buildUniversalExerciseAtlas(
  repoCatalog: ExerciseCatalog,
  canonicalCatalog: ExerciseCatalog,
  customExercises: UniversalExercise[] = [],
): UniversalExercise[] {
  const canonicalIds = new Set(canonicalCatalog.exercises.map((e) => e.id));
  const map = new Map<string, UniversalExercise>();
  const nameToId = new Map<string, string>();

  // 1. Official repo 62 exercises first (retaining exact IDs, steps, and 57 MP4 packs!)
  for (const ex of repoCatalog.exercises as any[]) {
    const climbDiscipline =
      ex.id === "back-squat"
        ? "squat"
        : ex.id === "bench-press"
          ? "bench"
          : ex.id === "deadlift"
            ? "deadlift"
            : ex.id === "barbell-curl"
              ? "curl"
              : null;
    const item: UniversalExercise = {
      id: ex.id,
      name: ex.name,
      group: ex.group || "chest",
      equipment: ex.equipment || "Bodyweight",
      muscles: ex.muscles?.length ? ex.muscles : [ex.group || "Strength"],
      aliases: [ex.name.toLowerCase(), ex.id.replace(/-/g, " ")],
      cues: ex.steps?.length
        ? ex.steps
        : ["Maintain strict control, full range of motion, and braced posture."],
      climbDiscipline,
      isCanonicalBackend: canonicalIds.has(ex.id),
      pack: ex.pack || null,
    };
    map.set(item.id, item);
    nameToId.set(item.name.toLowerCase(), item.id);
  }

  // 2. Merge our Encyclopedia Seed (linking aliases if an exercise already exists in repoCatalog, otherwise adding it!)
  for (const [name, group, equipment, musclesCsv, aliasesCsv, cue, climb] of ENCYCLOPEDIA_SEED) {
    const id = slugify(name);
    const aliasList = aliasesCsv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const matchExistingId =
      (map.has(id) ? id : null) ||
      nameToId.get(name.toLowerCase()) ||
      aliasList.map((a) => nameToId.get(a)).find(Boolean) ||
      null;

    if (matchExistingId) {
      const prev = map.get(matchExistingId)!;
      prev.aliases = Array.from(new Set([...prev.aliases, ...aliasList, name.toLowerCase()]));
      if (!prev.climbDiscipline && climb) prev.climbDiscipline = climb;
      if ((!prev.cues || prev.cues.length <= 1) && cue) prev.cues = [cue];
    } else {
      const item: UniversalExercise = {
        id,
        name,
        group,
        equipment,
        muscles: musclesCsv.split(",").map((s) => s.trim()),
        aliases: [name.toLowerCase(), ...aliasList],
        cues: [cue],
        climbDiscipline: climb || null,
        isCanonicalBackend: canonicalIds.has(id),
        pack: null,
      };
      map.set(id, item);
      nameToId.set(name.toLowerCase(), id);
    }
  }

  // 3. Prepend user-created custom exercises
  const out = [...customExercises];
  for (const item of map.values()) {
    if (!out.some((c) => c.id === item.id)) out.push(item);
  }
  return out;
}

export function searchUniversalExercises(
  atlas: UniversalExercise[],
  query: string,
  groupFilter: string = "all",
  equipmentFilter: string = "all",
): UniversalExercise[] {
  const q = String(query || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const tokens = q ? q.split(/\s+/) : [];

  return atlas.filter((ex) => {
    if (groupFilter !== "all" && ex.group !== groupFilter) return false;
    if (
      equipmentFilter !== "all" &&
      ex.equipment.toLowerCase() !== equipmentFilter.toLowerCase()
    ) {
      return false;
    }
    if (!tokens.length) return true;
    const haystack = [
      ex.name,
      ex.group,
      ex.equipment,
      ...ex.muscles,
      ...ex.aliases,
    ]
      .join(" ")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    return tokens.every((t) => haystack.includes(t));
  });
}

export function builtInExerciseVideoUri(
  ex: UniversalExercise | undefined | null,
  previewOrigin?: string,
): string | null {
  if (!ex?.pack) return null;
  try {
    return packMediaUri(ex.pack, "loop", previewOrigin);
  } catch {
    return null;
  }
}

// ============================================================================
// EXTENDED WORKOUT VAULT (Supports ALL 300+ & Custom Exercises)
// ============================================================================
export function loadVaultWorkouts(): VaultWorkoutSession[] {
  if (Platform.OS !== "web" || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VAULT_WORKOUTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVaultWorkout(session: VaultWorkoutSession): VaultWorkoutSession[] {
  const existing = loadVaultWorkouts().filter((w) => w.id !== session.id);
  const next = [session, ...existing].sort((a, b) =>
    b.performedOn.localeCompare(a.performedOn),
  );
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(VAULT_WORKOUTS_KEY, JSON.stringify(next));
  }
  return next;
}

export function removeVaultWorkout(id: string): VaultWorkoutSession[] {
  const next = loadVaultWorkouts().filter((w) => w.id !== id);
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(VAULT_WORKOUTS_KEY, JSON.stringify(next));
  }
  return next;
}

// ============================================================================
// INTELLIGENT WORKOUT GENERATOR
// ============================================================================
function matchesEquipment(
  ex: UniversalExercise,
  pref: WorkoutGenPreferences["equipment"],
): boolean {
  const eq = ex.equipment.toLowerCase();
  if (pref === "full_gym") return true;
  if (pref === "barbell") return eq.includes("barbell") || eq.includes("bodyweight");
  if (pref === "dumbbell") return eq.includes("dumbbell") || eq.includes("bodyweight");
  if (pref === "cables_machines")
    return eq.includes("cable") || eq.includes("machine") || eq.includes("bodyweight");
  if (pref === "bodyweight") return eq.includes("bodyweight") || eq.includes("band");
  return true;
}

function pickSlot(
  atlas: UniversalExercise[],
  slotId: string,
  role: string,
  groups: string[],
  keywords: string[],
  pref: WorkoutGenPreferences,
  usedIds: Set<string>,
  sets: number,
  repRange: string,
  targetReps: number,
  rpe: string,
  restSec: number,
): GeneratedExerciseSlot | null {
  const candidates = atlas.filter(
    (ex) =>
      groups.includes(ex.group) &&
      matchesEquipment(ex, pref.equipment) &&
      !usedIds.has(ex.id),
  );
  if (!candidates.length) return null;

  const scored = candidates
    .map((ex) => {
      const hay = (ex.name + " " + ex.aliases.join(" ")).toLowerCase();
      let score = 0;
      for (let i = 0; i < keywords.length; i++) {
        if (hay.includes(keywords[i])) score += 30 - i * 3;
      }
      if (ex.pack) score += 4; // subtle bonus for exercises that already have video ready
      return { ex, score };
    })
    .sort((a, b) => b.score - a.score);

  const primary = scored[0].ex;
  usedIds.add(primary.id);
  const alternatives = scored.slice(1, 6).map((s) => s.ex);

  return {
    slotId,
    role,
    exercise: primary,
    alternatives,
    sets,
    repRange,
    targetReps,
    rpe,
    restSec,
  };
}

export function generateSmartWorkout(
  atlas: UniversalExercise[],
  pref: WorkoutGenPreferences,
): GeneratedWorkoutPlan {
  const used = new Set<string>();
  const slotCount =
    pref.durationMin <= 30 ? 3 : pref.durationMin <= 45 ? 4 : pref.durationMin <= 60 ? 5 : 6;
  const volMult = pref.level === "foundation" ? -1 : pref.level === "advanced" ? 1 : 0;
  const clampSets = (base: number) => Math.max(2, Math.min(6, base + volMult));

  type Blueprint = {
    title: string;
    subtitle: string;
    warmup: string;
    blocks: [string, string[], string[], number, string, number, string, number][];
  };

  const blueprints: Record<WorkoutGenPreferences["split"], Blueprint> = {
    climb_power: {
      title:
        pref.focusLift === "bench"
          ? "Climb Scale · Bench Press Specialization"
          : pref.focusLift === "deadlift"
            ? "Climb Scale · Deadlift Power Session"
            : pref.focusLift === "curl"
              ? "Climb Scale · Strict Curl & Upper Pull"
              : "Climb Scale · Squat & Strength Peak",
      subtitle: "Built around strict MONTE WO movement standards + high-transfer accessories",
      warmup: "5 min dynamic joint prep + 4 progressive barbell warm-up sets (40% → 60% → 75% → 85%).",
      blocks:
        pref.focusLift === "bench"
          ? [
              ["Primary Ranked Lift", ["chest"], ["paused", "bench press", "dumbbell bench"], clampSets(4), "3–5", 4, "RPE 8", 180],
              ["Close-Range Lockout", ["arms", "chest"], ["close-grip", "incline", "larsen", "dip"], clampSets(3), "6–8", 6, "RPE 8", 120],
              ["Upper-Back Shelf", ["back"], ["chest-supported", "barbell row", "seated cable row", "pull-up"], clampSets(3), "8–10", 8, "RPE 8", 90],
              ["Shoulder Stability", ["shoulders"], ["lateral raise", "face pull", "shoulder press"], 3, "12–15", 12, "RPE 8.5", 75],
              ["Triceps Overload", ["arms"], ["skull crusher", "pushdown", "overhead"], 3, "10–12", 10, "RPE 9", 75],
              ["Rigid Core Brace", ["core"], ["ab wheel", "plank", "pallof"], 3, "10–15", 12, "RPE 8", 60],
            ]
          : pref.focusLift === "deadlift"
            ? [
                ["Primary Ranked Lift", ["back", "legs"], ["conventional", "deadlift", "trap-bar", "romanian"], clampSets(4), "2–4", 3, "RPE 8", 180],
                ["Quad Off-The-Floor Drive", ["legs"], ["front squat", "pause", "leg press", "hack squat", "split squat"], clampSets(3), "5–8", 6, "RPE 8", 120],
                ["Posterior Hinge", ["back", "legs"], ["romanian", "stiff-leg", "good morning", "leg curl"], clampSets(3), "8–10", 8, "RPE 8", 105],
                ["Heavy Lat Lock", ["back"], ["pull-up", "pendlay", "one-arm dumbbell row", "lat pulldown"], 3, "8–10", 8, "RPE 8.5", 90],
                ["Strict Biceps Builder", ["arms"], ["wall-strict", "barbell curl", "hammer curl"], 3, "8–10", 8, "RPE 8.5", 75],
                ["Anti-Flexion Core", ["core", "cardio"], ["hanging leg", "farmer", "plank"], 3, "10–12", 10, "RPE 8", 60],
              ]
            : pref.focusLift === "curl"
              ? [
                  ["Primary Ranked Lift", ["arms"], ["wall-strict", "barbell curl", "ez-bar curl", "dumbbell curl"], clampSets(4), "3–6", 5, "RPE 8.5", 150],
                  ["Vertical Pull Strength", ["back"], ["chin-up", "pull-up", "lat pulldown"], clampSets(3), "6–8", 6, "RPE 8", 120],
                  ["Brachialis & Forearm Power", ["arms"], ["hammer curl", "preacher", "reverse"], clampSets(3), "8–10", 8, "RPE 8.5", 90],
                  ["Long-Head Stretch", ["arms"], ["incline dumbbell curl", "bayesian", "spider"], 3, "10–12", 10, "RPE 9", 75],
                  ["Antagonist Triceps Balance", ["arms"], ["close-grip", "pushdown", "skull crusher"], 3, "10–12", 10, "RPE 8.5", 75],
                  ["Rear Delt & Posture", ["shoulders"], ["face pull", "rear delt"], 3, "12–15", 15, "RPE 8", 60],
                ]
              : [
                  ["Primary Ranked Lift", ["legs"], ["back squat", "competition squat", "goblet", "leg press"], clampSets(4), "3–5", 4, "RPE 8", 180],
                  ["Ranked Upper Compound", ["chest"], ["bench press", "incline", "push-up"], clampSets(4), "4–6", 5, "RPE 8", 150],
                  ["Posterior Hinge", ["back", "legs"], ["romanian", "deadlift", "hip thrust", "leg curl"], clampSets(3), "6–8", 8, "RPE 8", 120],
                  ["Upper-Back Density", ["back"], ["pull-up", "lat pulldown", "barbell row", "dumbbell row"], 3, "8–10", 8, "RPE 8.5", 90],
                  ["Ranked Arm Builder", ["arms"], ["wall-strict", "barbell curl", "dumbbell curl"], 3, "8–10", 8, "RPE 8.5", 75],
                  ["Trunk Bracing", ["core"], ["hanging leg", "ab wheel", "dead bug", "plank"], 3, "10–12", 10, "RPE 8", 60],
                ],
    },
    push: {
      title: "Push Hypertrophy & Pressing Power",
      subtitle: "Chest, Front/Side Deltoids, and Triceps across compound + stretched angles",
      warmup: "Band shoulder dislocations, scapular push-ups, and 2–3 progressive press warm-up sets.",
      blocks: [
        ["Heavy Horizontal Press", ["chest"], ["bench press", "flat dumbbell", "machine chest"], clampSets(4), "5–8", 6, "RPE 8", 150],
        ["Clavicular Incline Press", ["chest"], ["incline dumbbell", "incline barbell", "incline machine"], clampSets(3), "8–10", 8, "RPE 8.5", 120],
        ["Vertical Shoulder Press", ["shoulders"], ["overhead press", "seated dumbbell", "machine shoulder"], 3, "8–10", 8, "RPE 8", 105],
        ["Pec Stretch Isolation", ["chest"], ["cable crossover", "pec deck", "fly", "dip"], 3, "10–15", 12, "RPE 9", 75],
        ["Medial Delt Cap", ["shoulders"], ["cable lateral", "dumbbell lateral", "machine lateral"], 4, "12–15", 15, "RPE 9", 60],
        ["Long & Lateral Triceps", ["arms"], ["overhead", "pushdown", "skull crusher"], 3, "10–12", 12, "RPE 9", 75],
      ],
    },
    pull: {
      title: "Pull Density & Strict Biceps",
      subtitle: "Vertical width, mid-back thickness, rear delts, and strict elbow flexion",
      warmup: "Dead hangs, scapular pull-ups, light face pulls, and 2 ramp-up row sets.",
      blocks: [
        ["Vertical Lat Driver", ["back"], ["pull-up", "lat pulldown", "chin-up"], clampSets(4), "6–10", 8, "RPE 8", 120],
        ["Heavy Horizontal Row", ["back"], ["barbell row", "chest-supported", "t-bar", "one-arm dumbbell"], clampSets(4), "6–10", 8, "RPE 8.5", 120],
        ["Unilateral / Stretch Lat", ["back"], ["seated cable row", "single-arm", "straight-arm", "pullover"], 3, "10–12", 10, "RPE 8.5", 90],
        ["Rear Delt & Upper Back", ["shoulders"], ["face pull", "rear delt"], 3, "12–15", 15, "RPE 8.5", 60],
        ["Strict Biceps Primary", ["arms"], ["wall-strict", "barbell curl", "ez-bar curl", "preacher"], 3, "6–10", 8, "RPE 9", 90],
        ["Brachialis Finisher", ["arms"], ["hammer curl", "incline dumbbell curl"], 3, "10–12", 12, "RPE 9", 60],
      ],
    },
    legs: {
      title: "Lower Body Strength & Quad/Glute Sweep",
      subtitle: "Knee-dominant squat pattern + hip hinge + unilateral stability + calves",
      warmup: "Hip 90/90s, ankle dorsiflexion pulses, bodyweight squats, and 3 barbell ramp sets.",
      blocks: [
        ["Primary Squat Pattern", ["legs"], ["back squat", "hack squat", "front squat", "goblet"], clampSets(4), "4–8", 6, "RPE 8", 165],
        ["Primary Hip Hinge", ["back", "legs"], ["romanian", "conventional", "stiff-leg", "hip thrust"], clampSets(3), "6–10", 8, "RPE 8", 135],
        ["Unilateral Leg Drive", ["legs"], ["bulgarian", "leg press", "walking lunge", "reverse lunge"], 3, "8–12", 10, "RPE 8.5", 90],
        ["Hamstring Knee-Flexion", ["legs"], ["seated leg curl", "lying leg curl", "nordic"], 3, "10–15", 12, "RPE 9", 75],
        ["Quad Peak Contraction", ["legs"], ["leg extension", "sissy", "step-up"], 3, "12–15", 12, "RPE 9", 75],
        ["Calves Full Stretch", ["legs"], ["standing calf", "seated calf"], 4, "10–15", 12, "RPE 9", 60],
      ],
    },
    upper: {
      title: "Upper Body Powerbuilding",
      subtitle: "High-output chest, back, delts, and arms in one balanced session",
      warmup: "5 min upper warm-up + band pull-aparts + progressive press warm-up.",
      blocks: [
        ["Primary Press", ["chest"], ["bench press", "incline dumbbell", "flat dumbbell"], clampSets(4), "5–8", 6, "RPE 8", 150],
        ["Primary Row / Pull", ["back"], ["barbell row", "chest-supported", "pull-up", "lat pulldown"], clampSets(4), "6–10", 8, "RPE 8", 120],
        ["Overhead / Incline", ["shoulders", "chest"], ["overhead press", "seated dumbbell", "incline"], 3, "8–10", 8, "RPE 8.5", 105],
        ["Vertical Pull", ["back"], ["lat pulldown", "chin-up", "seated cable row"], 3, "8–12", 10, "RPE 8.5", 90],
        ["Strict Biceps", ["arms"], ["wall-strict", "barbell curl", "dumbbell curl"], 3, "8–12", 10, "RPE 9", 75],
        ["Triceps & Lateral Delt", ["arms", "shoulders"], ["pushdown", "skull crusher", "lateral raise"], 3, "10–15", 12, "RPE 9", 60],
      ],
    },
    lower: {
      title: "Lower Body Power & Posterior Chain",
      subtitle: "Heavy squat + deadlift/hinge synergy + trunk bracing",
      warmup: "Dynamic leg swings, glute bridges, goblet squats, and progressive bar warm-ups.",
      blocks: [
        ["Heavy Squat / Press", ["legs"], ["back squat", "safety bar", "leg press", "hack squat"], clampSets(4), "4–6", 5, "RPE 8", 165],
        ["Heavy Hinge", ["back", "legs"], ["deadlift", "romanian", "trap-bar", "hip thrust"], clampSets(3), "5–8", 6, "RPE 8", 150],
        ["Single-Leg Stability", ["legs"], ["bulgarian", "reverse lunge", "step-up"], 3, "8–10", 8, "RPE 8.5", 90],
        ["Posterior Isolation", ["legs", "back"], ["lying leg curl", "seated leg curl", "back extension"], 3, "10–12", 12, "RPE 9", 75],
        ["Calf Architecture", ["legs"], ["standing calf", "seated calf"], 3, "12–15", 15, "RPE 9", 60],
        ["Braced Core", ["core"], ["hanging leg", "ab wheel", "plank"], 3, "10–15", 12, "RPE 8.5", 60],
      ],
    },
    full_body: {
      title: "Full-Body Athletic Strength",
      subtitle: "High-efficiency total-body compound progression",
      warmup: "5 min total-body flow + ramp-up sets on first two compounds.",
      blocks: [
        ["Lower Compound", ["legs"], ["back squat", "trap-bar", "goblet", "leg press"], clampSets(3), "5–8", 6, "RPE 8", 150],
        ["Upper Push", ["chest", "shoulders"], ["bench press", "incline dumbbell", "overhead press", "push-up"], clampSets(3), "6–10", 8, "RPE 8", 120],
        ["Upper Pull", ["back"], ["pull-up", "one-arm dumbbell row", "lat pulldown", "seated cable row"], clampSets(3), "8–10", 8, "RPE 8", 105],
        ["Hip Hinge", ["back", "legs"], ["romanian", "hip thrust", "kettlebell swing"], 3, "8–12", 10, "RPE 8.5", 90],
        ["Strict Arms", ["arms"], ["wall-strict", "barbell curl", "pushdown", "hammer curl"], 3, "8–12", 10, "RPE 8.5", 75],
        ["Core / Carry", ["core", "cardio"], ["farmer", "plank", "dead bug", "ab wheel"], 3, "10–15", 12, "RPE 8", 60],
      ],
    },
    arms_curl: {
      title: "Strict Curl & Arm Specialization",
      subtitle: "Targeted biceps, brachialis, triceps, and shoulder cap volume",
      warmup: "Wrist circles, light band curls & pushdowns, 2 progressive bar curl warm-up sets.",
      blocks: [
        ["Ranked Strict Curl", ["arms"], ["wall-strict", "barbell curl", "ez-bar curl"], clampSets(4), "4–6", 5, "RPE 8.5", 135],
        ["Heavy Triceps Compound", ["arms", "chest"], ["close-grip", "dip", "skull crusher"], clampSets(4), "6–8", 8, "RPE 8.5", 120],
        ["Lengthened Biceps", ["arms"], ["incline dumbbell curl", "bayesian", "preacher"], 3, "8–12", 10, "RPE 9", 75],
        ["Lengthened Triceps", ["arms"], ["overhead", "skull crusher", "pushdown"], 3, "10–12", 12, "RPE 9", 75],
        ["Forearm & Brachialis", ["arms"], ["hammer curl", "reverse"], 3, "10–15", 12, "RPE 9", 60],
        ["3D Deltoid Finish", ["shoulders"], ["lateral raise", "face pull"], 3, "12–15", 15, "RPE 9", 60],
      ],
    },
  };

  const chosen = blueprints[pref.split] || blueprints.climb_power;
  const slots: GeneratedExerciseSlot[] = [];

  for (let i = 0; i < Math.min(slotCount, chosen.blocks.length); i++) {
    const [role, groups, kw, sets, repRange, targetReps, rpe, restSec] =
      chosen.blocks[i];
    const picked = pickSlot(
      atlas,
      `slot-${i + 1}`,
      role,
      groups,
      kw,
      pref,
      used,
      sets,
      repRange,
      targetReps,
      rpe,
      restSec,
    );
    if (picked) slots.push(picked);
  }

  return {
    title: chosen.title,
    subtitle: chosen.subtitle,
    estimatedMinutes: pref.durationMin,
    warmupNote: chosen.warmup,
    slots,
  };
}
