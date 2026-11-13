/** Exact, pinned exception for the owner-authorized portfolio/template revision only. */
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const pins=JSON.parse(readFileSync(new URL('../docs/portfolio-chapters/authorized-changes.json',import.meta.url)));
export function normalizePortfolioChanges(path,bytes){const pin=pins[path];if(!pin)return bytes;const s=String(bytes);if(s===pin.before)return bytes;assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.afterSHA256,'Only the exact authorized chapter revision may replace historical bytes: '+path);return pin.before;}
