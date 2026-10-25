// MONTE WO Intelligence — local preview proxy.
//
// Why this exists: `wrangler pages dev` only attaches CLI-provided bindings (like --d1 INTEL_DB)
// to requests whose Host header is localhost/127.0.0.1. Preview tunnels that forward a different
// Host therefore reach a binding-less environment and the API correctly fails closed. This tiny
// dependency-free proxy listens on PUBLIC_PORT, forwards to the wrangler server on UPSTREAM_PORT
// and rewrites the Host header to localhost so bindings resolve.
//
// Security: the intelligence API still enforces authentication. When PREVIEW_TOKEN is set (see
// scripts/preview-intelligence.mjs) the token is required from EVERY host — including localhost —
// so exposing this port does not expose the dashboard. Production never uses this proxy.
//
// Usage: node scripts/preview-proxy.mjs [publicPort] [upstreamPort]
import http from 'node:http';

const PUBLIC_PORT = Number(process.argv[2] || process.env.PUBLIC_PORT || 8080);
const UPSTREAM_PORT = Number(process.argv[3] || process.env.UPSTREAM_PORT || 8081);
const UPSTREAM_HOST = '127.0.0.1';

const proxy = http.createServer((req, res) => {
  const headers = { ...req.headers, host: 'localhost' };
  const upstream = http.request({ host: UPSTREAM_HOST, port: UPSTREAM_PORT, method: req.method, path: req.url, headers }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
    upstreamRes.pipe(res, { end: true });
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('preview proxy: upstream unavailable');
  });
  req.pipe(upstream, { end: true });
});
proxy.on('clientError', (err, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
proxy.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`[preview-proxy] http://0.0.0.0:${PUBLIC_PORT} -> http://${UPSTREAM_HOST}:${UPSTREAM_PORT} (Host rewritten to localhost; API authentication still enforced)`);
});
