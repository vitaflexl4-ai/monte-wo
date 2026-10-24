// Ensure exported Expo Web SPA at public/mobile/index.html renders dark cockpit #000000 before JS hydration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public/mobile/index.html");
if (fs.existsSync(target)) {
  const styleTag =
    "<style id=\"montewo-dark-boot\">html,body,#root{background-color:#000000 !important;color:#f5f7fb;margin:0;}</style>";
  let html = fs.readFileSync(target, "utf8");
  if (!html.includes("id=\"montewo-dark-boot\"")) {
    html = html.replace("</head>", styleTag + "</head>");
    fs.writeFileSync(target, html);
  }
  console.log("Patched public/mobile/index.html dark cockpit boot style.");
}
