// ARGON telemetry contract. The mobile app is an UNTRUSTED source: payloads are strictly
// validated, identifiers and free-form text are rejected, and every field is bounded.
// Nothing here may carry user identity, credentials, message contents or location.
import { requireThat } from './errors.js';

export const EVENT_TYPES = Object.freeze(['session_start', 'app_crash', 'js_error', 'http_error', 'login_failed', 'slow_interaction', 'feature_used']);
export const PLATFORMS = Object.freeze(['android', 'ios']);
export const ERROR_TYPES = Object.freeze(['app_crash', 'js_error', 'http_error', 'login_failed']);
const VERSION_RE = /^[a-z0-9][a-z0-9.\-+]{0,31}$/i;
const FINGERPRINT_RE = /^[a-z0-9][a-z0-9_.:/\-]{0,99}$/i;
const SESSION_REF_RE = /^[a-z0-9]{8,64}$/i;

// Per-event-type whitelisted detail keys. Any other key rejects the whole batch.
export const DETAIL_KEYS = Object.freeze({
  session_start: Object.freeze(['locale']),
  app_crash: Object.freeze(['errorClass', 'isFatal']),
  js_error: Object.freeze(['errorClass', 'screen']),
  http_error: Object.freeze(['route', 'statusCode', 'method']),
  login_failed: Object.freeze(['stage', 'statusCode']),
  slow_interaction: Object.freeze(['screen', 'durationMs']),
  feature_used: Object.freeze(['feature'])
});
const SHARED_KEYS = Object.freeze(['eventId', 'occurredAt']);
const SCREEN_RE = /^\/[a-z0-9/_\-]{0,60}$/i;
const ROUTE_RE = /^\/[a-z0-9/_\-]{0,80}$/i;
const ERROR_CLASS_RE = /^[A-Za-z0-9_.\-$ ]{0,80}$/;
const FEATURE_RE = /^[a-z0-9_.\-]{0,60}$/;
const STAGES = Object.freeze(['authorize', 'token', 'session', 'other']);
const METHODS = Object.freeze(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const clean = (value, re, field) => {
  requireThat(typeof value === 'string' && re.test(value), 'invalid-' + field, 400);
  return value;
};
const optional = (value, re, field) => value === undefined || value === null ? undefined : clean(value, re, field);
const boundedInt = (value, min, max, field) => {
  const n = Number(value);
  requireThat(Number.isInteger(n) && n >= min && n <= max, 'invalid-' + field, 400);
  return n;
};

// Validates one raw event and returns a storable row, or throws IntelError.
export function validateTelemetryEvent(raw, now = new Date()) {
  requireThat(raw && typeof raw === 'object' && !Array.isArray(raw), 'invalid-event', 400);
  const allowed = new Set([...DETAIL_KEYS[raw.type] || [], ...SHARED_KEYS, 'type', 'appVersion', 'platform', 'fingerprint', 'sessionRef', 'durationMs']);
  requireThat(EVENT_TYPES.includes(raw.type), 'invalid-type', 400);
  for (const key of Object.keys(raw)) requireThat(allowed.has(key), 'unexpected-field:' + key, 400);
  requireThat(raw.appVersion !== undefined && raw.platform !== undefined, 'invalid-event', 400);
  const row = {
    id: raw.eventId === undefined || raw.eventId === null ? crypto.randomUUID() : clean(raw.eventId, /^[a-f0-9-]{36}$/i, 'eventId'),
    event_type: raw.type,
    app_version: clean(raw.appVersion, VERSION_RE, 'appVersion'),
    platform: clean(raw.platform, new RegExp('^(' + PLATFORMS.join('|') + ')$'), 'platform'),
    fingerprint: ERROR_TYPES.includes(raw.type) ? clean(raw.fingerprint, FINGERPRINT_RE, 'fingerprint') : '',
    session_ref: optional(raw.sessionRef, SESSION_REF_RE, 'sessionRef') || null,
    duration_ms: raw.durationMs === undefined || raw.durationMs === null ? null : boundedInt(raw.durationMs, 0, 600000, 'durationMs'),
    detail_json: '{}',
    occurred_at: typeof raw.occurredAt === 'string' && !Number.isNaN(Date.parse(raw.occurredAt))
      ? new Date(raw.occurredAt).toISOString()
      : now.toISOString()
  };
  requireThat(Date.parse(row.occurred_at) > Date.parse(now) - 7 * 86400000, 'stale-event', 400);
  const detail = {};
  for (const key of DETAIL_KEYS[raw.type] || []) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    switch (key) {
      case 'route': detail.route = clean(value, ROUTE_RE, 'route'); break;
      case 'screen': detail.screen = clean(value, SCREEN_RE, 'screen'); break;
      case 'errorClass': detail.errorClass = clean(value, ERROR_CLASS_RE, 'errorClass'); break;
      case 'feature': detail.feature = clean(value, FEATURE_RE, 'feature'); break;
      case 'method': detail.method = clean(value, new RegExp('^(' + METHODS.join('|') + ')$'), 'method'); break;
      case 'stage': detail.stage = clean(value, new RegExp('^(' + STAGES.join('|') + ')$'), 'stage'); break;
      case 'statusCode': detail.statusCode = boundedInt(value, 100, 599, 'statusCode'); break;
      case 'durationMs': detail.durationMs = boundedInt(value, 0, 600000, 'durationMs'); break;
      case 'isFatal': detail.isFatal = value === true; break;
      case 'locale': detail.locale = clean(value, /^(en|ht|fr)$/, 'locale'); break;
      default: requireThat(false, 'unexpected-field:' + key, 400);
    }
  }
  row.detail_json = JSON.stringify(detail);
  return row;
}

// Validates a whole batch (max 50). All-or-nothing: one bad event rejects the batch.
export function validateTelemetryBatch(payload, now = new Date()) {
  requireThat(payload && typeof payload === 'object' && !Array.isArray(payload), 'invalid-payload', 400);
  requireThat(Array.isArray(payload.events), 'invalid-events', 400);
  requireThat(payload.events.length > 0 && payload.events.length <= 50, 'invalid-batch-size', 400);
  return payload.events.map(e => validateTelemetryEvent(e, now));
}
