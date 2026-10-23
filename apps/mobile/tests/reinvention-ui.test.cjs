const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "../..");
const read = (p) => fs.readFileSync(path.resolve(mobileRoot, p), "utf8");

function loadTsModule(relPath, mocks = {}) {
  const fullPath = path.resolve(mobileRoot, relPath);
  const code = ts.transpileModule(fs.readFileSync(fullPath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = new Module(fullPath, module);
  mod.filename = fullPath;
  mod.paths = module.paths;
  const origRequire = mod.require.bind(mod);
  mod.require = (id) => (id in mocks ? mocks[id] : origRequire(id));
  mod._compile(code, fullPath);
  return mod.exports;
}

test("mobile climb-scale dataset matches canonical proposed v0.1 dataset", () => {
  const mobileJson = read("src/climb-scale-data.json");
  const rootJson = fs.readFileSync(
    path.resolve(repoRoot, "content/strength-proposals/climb-scale-proposed-v0.1.json"),
    "utf8",
  );
  assert.equal(mobileJson, rootJson);
  const parsed = JSON.parse(mobileJson);
  assert.equal(parsed.status, "proposed");
  assert.equal(parsed.officialAwardsEnabled, false);
  assert.equal(parsed.ranks.length, 9);
  assert.equal(parsed.disciplines.length, 4);
});

test("NutritionScreen exposes World Foods, Barcode Scanner, AI Macro Scanner, Meal Plan AI, and blank calculator inputs", () => {
  const src = read("src/NutritionScreen.tsx");
  assert.ok(src.includes('const [age, setAge] = useState("")'));
  assert.ok(src.includes('const [weight, setWeight] = useState("")'));
  assert.ok(src.includes('const [heightCm, setHeightCm] = useState("")'));
  assert.match(src, /Global Food Barcode Scanner/);
  assert.match(src, /AI Meal & Label Macro Scanner/);
  assert.match(src, /Custom Meal Plan Generator/);
});

test("World Foods engine supports Haitian + global search, plate parsing, label parsing, and preference meal plans", () => {
  const wf = loadTsModule("src/world-foods.ts", {
    "react-native": { Platform: { OS: "ios" } },
  });
  const haitian = wf.searchLocalFoods("griot", "haitian");
  assert.ok(haitian.length >= 1);
  assert.ok(wf.BUILTIN_WORLD_FOODS.length >= 120);
  assert.ok(wf.searchLocalFoods("jollof", "african").length >= 1);
  assert.ok(wf.searchLocalFoods("ramen", "asian").length >= 1);
  assert.ok(wf.searchLocalFoods("tikka masala", "indian").length >= 1);
  assert.ok(wf.searchLocalFoods("shawarma", "mediterranean").length >= 1);
  const plate = wf.parseNaturalPlateDescription(
    "200g chicken breast, 1 cup diri ak pwa, half avocado",
  );
  assert.equal(plate.length, 3);

  const label = wf.parseNutritionLabelText(
    "Calories 250 Total Fat 8g Total Carbohydrate 22g Protein 24g",
  );
  assert.equal(label.calories, 250);
  assert.equal(label.proteinG, 24);

  const veganPlan = wf.generatePreferenceMealPlan({
    calories: 2400,
    proteinG: 170,
    carbsG: 260,
    fatG: 70,
    mealsPerDay: 4,
    cuisine: "all",
    diet: "vegan",
    dairyFree: true,
    glutenFree: false,
    excludeText: "peanuts",
  });
  assert.equal(veganPlan.meals.length, 4);
  for (const m of veganPlan.meals) {
    for (const ing of m.ingredients) {
      assert.ok(ing.food.tags.includes("vegan"));
      assert.ok(!ing.food.name.toLowerCase().includes("peanut"));
    }
  }
});

test("Universal Exercise Atlas & Smart Workout Generator cover 120+ movements and custom splits", () => {
  const ge = loadTsModule("src/global-exercises.ts", {
    "react-native": { Platform: { OS: "ios" } },
    "./workout-library": { packMediaUri: () => null },
  });
  const canonical = require("../src/generated/exercises.json");
  const atlas = ge.buildUniversalExerciseAtlas(canonical, canonical, []);
  assert.ok(atlas.length >= 120);
  assert.ok(ge.searchUniversalExercises(atlas, "larsen press").length >= 1);
  assert.ok(ge.searchUniversalExercises(atlas, "wall-strict").length >= 1);

  const plan = ge.generateSmartWorkout(atlas, {
    split: "climb_power",
    equipment: "full_gym",
    durationMin: 60,
    level: "intermediate",
    focusLift: "bench",
  });
  assert.equal(plan.slots.length, 5);
});

test("RankScreen separates MONTE Verified from Proposed v0.1 Self-Reported checks", () => {
  const src = read("src/RankScreen.tsx");
  const stage = read("src/RankAvatarStage.tsx");
  const sfx = read("src/sound-fx.ts");
  assert.match(src, /Proposed Standard v0\.1/);
  assert.match(src, /MONTE Verified/);
  assert.match(src, /SELF-REPORTED · NOT VERIFIED/);
  assert.match(src, /STRICT MOVEMENT STANDARD/);
  assert.match(stage, /YOU NOW · CURRENT FORM/);
  assert.match(stage, /POSSIBLE NEXT RANK/);
  assert.match(sfx, /playRankAscensionFanfare/);
});

test("App exposes all five primary tabs: Home, Workout, Rank, Nutrition, Explore", () => {
  const app = read("App.tsx");
  assert.match(app, /name="Home"/);
  assert.match(app, /name="Train"[\s\S]*?title:\s*"Workout"/);
  assert.match(app, /name="Rank"/);
  assert.match(app, /name="Nutrition"/);
  assert.match(app, /name="Library"[\s\S]*?title:\s*"Explore"/);
});

test("MuscleDefinitionCamera wires expo-camera, shadow shader, gallery roll save, and 9:16 MONTE WO · LEVEL UP story card", () => {
  const cam = read("src/MuscleDefinitionCamera.tsx");
  assert.match(cam, /from "expo-camera"/);
  assert.match(cam, /from "expo-media-library"/);
  assert.match(cam, /from "expo-sharing"/);
  assert.match(cam, /MONTE WO AI GAINS DETECTOR — SHADOW RECONSTRUCTION ACTIVE/);
  assert.match(cam, /Save to Gallery/);
  assert.match(cam, /Share to Story/);
  assert.match(cam, /MONTE WO · LEVEL UP/);
  assert.match(cam, /Instagram Stories/);
  assert.match(cam, /TikTok Stories/);
});
