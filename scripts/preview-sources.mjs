#!/usr/bin/env node
// MONTE WO Intelligence — private static server for the repo root.
//
// Feeds the TITAN source audit in the local preview: scripts/preview-intelligence.mjs forwards
// TITAN_SOURCES_URL to the worker, and TITAN fetches the mobile app sources over HTTP from it
// (reading the repo at runtime only works where the repo is reachable — local dev / CI).
//
// Binds to 127.0.0.1 ONLY: wrangler (same host) reads it; it is never exposed publicly.
// Directories render a simple HTML listing — TITAN discovers source files from the hrefs in it.
//
// Usage: node scripts/preview-sources.mjs [port]   (default 8082)
import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] || process.env.PORT || 8082);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.ts': 'text/plain', '.tsx': 'text/plain', '.json': 'application/json', '.toml': 'text/plain', '.sql': 'text/plain', '.md': 'text/plain', '.html': 'text/html' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end(); }
    let st; try { st = await stat(file); } catch { res.writeHead(404); return res.end('not found'); }
    if (st.isDirectory()) {
      if (url.pathname.endsWith('/')) {
        const names = await readdir(file);
        const links = names.filter(n => !n.startsWith('.')).map(n => `<a href="${n}">${n}</a>`).join('\n');
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
        return res.end(`<!doctype html><html><body>${links}</body></html>`);
      }
      const index = path.join(file, 'index.html');
      try { await stat(index); file = index; } catch { res.writeHead(404); return res.end('not found'); }
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`app-sources on 127.0.0.1:${PORT} (repo root, private, with directory listings)`));
