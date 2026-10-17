// Compile the actual mobile merge/search helpers: do not fork catalog/filter logic.
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  crypto = require("node:crypto"),
  ts = require("../apps/mobile/node_modules/typescript");
const root = path.resolve(__dirname, ".."),
  src = path.join(root, "apps/mobile/src");
function load(name) {
  const file = path.join(src, name),
    m = new Module(file, module);
  m.filename = file;
  m.paths = module.paths;
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const { mergeWorkoutLibrary, packMediaUri } = load("workout-library.ts");
const catalog = mergeWorkoutLibrary(
  JSON.parse(fs.readFileSync(path.join(root, "content/exercises.json"))),
);
for (const row of catalog.exercises)
  if (row.pack) {
    row.preview = {
      poster: "/assets/workout-preview/" + row.id + ".jpg",
      demo: packMediaUri(row.pack, "demo"),
      loop: packMediaUri(row.pack, "loop"),
    };
    row.pack = { manifest: row.pack.manifest };
    fs.mkdirSync(path.join(root, "public/assets/workout-preview"), {
      recursive: true,
    });
    fs.copyFileSync(
      path.join(root, "apps/mobile/assets/workout-posters", row.id + ".jpg"),
      path.join(root, "public/assets/workout-preview", row.id + ".jpg"),
    );
  }
const moduleSource = fs.readFileSync(
  path.join(src, "library-index.ts"),
  "utf8",
);
fs.writeFileSync(
  path.join(root, "public/cockpit-library.js"),
  "// GENERATED from apps/mobile/src/library-index.ts. Do not edit.\n" +
    ts.transpileModule(moduleSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
);
const sources = [
  "content/exercises.json",
  "apps/mobile/src/workout-library.ts",
  "apps/mobile/src/library-index.ts",
  "apps/mobile/src/generated/workout-library.json",
];
const inputs = Object.fromEntries(
  sources.map((p) => [
    p,
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, p)))
      .digest("hex"),
  ]),
);
const data = {
  inputs,
  libraryModuleSha256: crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, "public/cockpit-library.js")))
    .digest("hex"),
  catalog,
};
fs.writeFileSync(
  path.join(root, "public/cockpit-catalog.json"),
  JSON.stringify(data) + "\n",
);
console.log("Published shared catalog:", catalog.exercises.length, "entries");
