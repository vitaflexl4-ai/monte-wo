// Actual app preview; empty account bindings. Pack media is a fixed, hash-checked
// allowlist from a pinned public Git commit, NOT an arbitrary file/URL proxy.
import http from "node:http";
import os from "node:os";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { onRequest } from "../functions/api/[[route]].js";
const run = promisify(execFile),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const library = JSON.parse(
  await readFile(
    path.join(root, "apps/mobile/src/generated/workout-library.json"),
    "utf8",
  ),
);
const media = new Map();
for (const p of library.records)
  for (const [kind, file] of Object.entries(p.files))
    media.set(
      "/workout-media/" +
        p.manifest.id +
        "/" +
        (kind === "poster" ? "poster.jpg" : kind + ".mp4"),
      file,
    );
const cache = path.join(os.tmpdir(), "montewo-preview-media");
await mkdir(cache, { recursive: true });
async function mediaBytes(file) {
  const location = path.join(cache, file.oid + path.extname(file.path));
  let data;
  try {
    data = await readFile(location);
  } catch {
    try {
      data = (
        await run("git", ["cat-file", "blob", file.oid], {
          cwd: root,
          encoding: "buffer",
          maxBuffer: 8_000_000,
        })
      ).stdout;
    } catch {
      const response = await fetch(
        "https://raw.githubusercontent.com/" +
          library.source.repository +
          "/" +
          library.source.commit +
          "/" +
          file.path,
        { signal: AbortSignal.timeout(20000) },
      );
      if (!response.ok) throw Error("Pinned source unavailable");
      data = Buffer.from(await response.arrayBuffer());
    }
  }
  if (
    data.length !== file.bytes ||
    createHash("sha256").update(data).digest("hex") !== file.sha256
  )
    throw Error("Source media integrity mismatch");
  await writeFile(location, data);
  return data;
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://" + req.headers.host);
      if (url.pathname === "/" && process.env.PREVIEW_ENTRY !== "/") {
        const entry = ["/app/", "/exercises/", "/mobile/"].includes(process.env.PREVIEW_ENTRY)
          ? process.env.PREVIEW_ENTRY : "/mobile/";
        res.writeHead(302, { Location: entry });
        res.end();
        return;
      }
      if (url.pathname.startsWith("/workout-media/")) {
        if (!["GET", "HEAD"].includes(req.method)) {
          res.writeHead(405);
          res.end();
          return;
        }
        const file = media.get(url.pathname);
        if (!file) {
          res.writeHead(404);
          res.end("Media not in pinned inventory");
          return;
        }
        const data = await mediaBytes(file),
          headers = {
            "Content-Type": file.path.endsWith(".mp4")
              ? "video/mp4"
              : "image/jpeg",
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            ETag: '"' + file.sha256 + '"',
            "X-Content-Type-Options": "nosniff",
        "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
          };
        let start = 0,
          end = data.length - 1,
          status = 200;
        if (req.headers.range) {
          const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (!m || (!m[1] && !m[2])) {
            res.writeHead(416, { "Content-Range": "bytes */" + data.length });
            res.end();
            return;
          }
          if (!m[1]) start = Math.max(0, data.length - Number(m[2]));
          else {
            start = Number(m[1]);
            if (m[2]) end = Math.min(Number(m[2]), data.length - 1);
          }
          if (
            !Number.isSafeInteger(start) ||
            !Number.isSafeInteger(end) ||
            start > end ||
            start >= data.length
          ) {
            res.writeHead(416, { "Content-Range": "bytes */" + data.length });
            res.end();
            return;
          }
          status = 206;
          headers["Content-Range"] = `bytes ${start}-${end}/${data.length}`;
        }
        res.writeHead(status, {
          ...headers,
          "Content-Length": end - start + 1,
        });
        res.end(
          req.method === "HEAD" ? undefined : data.subarray(start, end + 1),
        );
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const response = await onRequest({
          request: new Request(url, {
            method: req.method,
            headers: req.headers,
            ...(!["GET", "HEAD"].includes(req.method)
              ? { body: Buffer.concat(chunks) }
              : {}),
          }),
          env: {},
        });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      const mobile = url.pathname.startsWith("/mobile/"),
        base = path.join(root, mobile ? "apps/mobile/web-build" : "public");
      const relative = decodeURIComponent(
        mobile ? url.pathname.slice(8) : url.pathname.slice(1),
      );
      let file = path.resolve(base, relative || ".");
      if (!file.startsWith(base + path.sep) && file !== base) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        if ((await stat(file)).isDirectory())
          file = path.join(file, "index.html");
      } catch {
        res.writeHead(404, {"Content-Type":"text/html; charset=utf-8"});
        res.end(await readFile(path.join(root,"public/404.html")));
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(500);
      res.end("Preview request failed");
    }
  })
  .listen(Number(process.env.PORT || 8082), "0.0.0.0", () =>
    console.log(
      "MONTE WO preview: / and /mobile/ open the actual Expo app; /app/ is the separate website concept · account API disabled · no production bindings.",
    ),
  );
