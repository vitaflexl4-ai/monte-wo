// MONTE WO — ARGON telemetry client (consent-gated, privacy-bounded).
//
// PRIVACY CONTRACT — read before enabling:
//   • NOTHING is sent until the user has given explicit, informed consent (setConsent(true)).
//   • Payloads contain ONLY: event type, app version, platform, error fingerprint,
//     whitelisted detail keys, and a random daily-rotating session reference.
//   • NEVER add user identifiers, account emails, credentials, message contents,
//     workout data, precise location or free-form text to these events.
//   • The server (server/intelligence/telemetry.js) rejects anything outside this
//     contract; the client must not try to work around it.
//
// INTEGRATION:
//   import { telemetry } from "./src/telemetry";
//   await telemetry.configure({ endpoint: "https://YOUR-DOMAIN/api/intelligence/events", key: "public-ingest-key" });
//   telemetry.setConsent(true);            // only after the user accepted the notice
//   telemetry.sessionStart();              // once per app launch (denominator for rates)
//   telemetry.httpError("/api/mobile/config", 500, "GET");
//
// The ingest key is a rotatable public key, not a secret: mobile clients cannot hold
// real secrets, so the server treats this telemetry as untrusted input, rate-limits it,
// and caps the confidence of every conclusion derived from it.
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";

export type TelemetryEvent = {
  type: "session_start" | "app_crash" | "js_error" | "http_error" | "login_failed" | "slow_interaction" | "feature_used";
  appVersion: string;
  platform: "android" | "ios" | "web";
  fingerprint?: string;
  sessionRef?: string;
  durationMs?: number;
  eventId?: string;
  occurredAt?: string;
  route?: string;
  statusCode?: number;
  method?: string;
  screen?: string;
  errorClass?: string;
  isFatal?: boolean;
  stage?: "authorize" | "token" | "session" | "other";
  feature?: string;
  locale?: "en" | "ht" | "fr";
};

const MAX_QUEUE = 50; // matches the server batch cap
const FLUSH_INTERVAL_MS = 30000;

class Telemetry {
  private endpoint: string | null = null;
  private key: string | null = null;
  private consent = false;
  private queue: TelemetryEvent[] = [];
  private sessionRef = "";
  private timer: ReturnType<typeof setInterval> | null = null;

  configure(opts: { endpoint: string; key: string }) {
    this.endpoint = opts.endpoint.replace(/\/$/, "");
    this.key = opts.key;
  }

  // Consent is explicit and revocable. Revoking drops the queue immediately.
  setConsent(value: boolean) {
    this.consent = value;
    if (!value) this.queue = [];
    if (value && !this.timer && this.endpoint) {
      this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    }
  }

  hasConsent() { return this.consent; }

  private appVersion(): string {
    const v = Constants.expoConfig?.version ?? "unknown";
    return /^[a-z0-9][a-z0-9.\-+]{0,31}$/i.test(String(v)) ? String(v) : "unknown";
  }

  private platform(): "android" | "ios" | "web" {
    if (Platform.OS === "web") return "web";
    return Platform.OS === "ios" || Constants.platform?.ios ? "ios" : "android";
  }

  // Random, daily-rotating reference. NOT a user identifier: it only links events
  // from the same approximate session so the server can compute denominators.
  private ref(): string {
    const day = new Date().toISOString().slice(0, 10);
    if (!this.sessionRef || !this.sessionRef.startsWith(day)) {
      this.sessionRef = day + "-" + Crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    }
    return this.sessionRef;
  }

  private push(event: TelemetryEvent) {
    if (!this.consent || !this.endpoint) return;
    event.eventId = event.eventId ?? Crypto.randomUUID();
    event.occurredAt = event.occurredAt ?? new Date().toISOString();
    this.queue.push(event);
    if (this.queue.length >= MAX_QUEUE) void this.flush();
  }

  sessionStart(locale?: "en" | "ht" | "fr") {
    this.push({ type: "session_start", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), locale });
  }

  // fingerprint must be a stable, short grouping key (e.g. errorClass + screen).
  // Never include variable message text — it may contain user content.
  jsError(errorClass: string, screen: string) {
    this.push({ type: "js_error", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), fingerprint: `js-${errorClass}-${screen}`.slice(0, 100), errorClass, screen });
  }

  appCrash(errorClass: string, isFatal: boolean) {
    this.push({ type: "app_crash", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), fingerprint: `crash-${errorClass}`.slice(0, 100), errorClass, isFatal });
  }

  httpError(route: string, statusCode: number, method: string) {
    this.push({ type: "http_error", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), fingerprint: `${method}-${route}-${statusCode}`.slice(0, 100), route, statusCode, method });
  }

  loginFailed(stage: "authorize" | "token" | "session" | "other", statusCode?: number) {
    this.push({ type: "login_failed", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), fingerprint: `login-${stage}`.slice(0, 100), stage, statusCode });
  }

  slowInteraction(screen: string, durationMs: number) {
    this.push({ type: "slow_interaction", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), fingerprint: `slow-${screen}`.slice(0, 100), screen, durationMs });
  }

  featureUsed(feature: string) {
    this.push({ type: "feature_used", appVersion: this.appVersion(), platform: this.platform(), sessionRef: this.ref(), fingerprint: `feature-${feature}`.slice(0, 100), feature });
  }

  // Batched, best-effort delivery with one retry. Event ids make retries idempotent
  // server-side; failure never blocks or crashes the app.
  async flush(): Promise<void> {
    if (!this.consent || !this.endpoint || !this.key || this.queue.length === 0) return;
    const batch = this.queue.splice(0, MAX_QUEUE);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-MW-Key": this.key },
          body: JSON.stringify({ events: batch }),
        });
        if (response.ok) return;
        if (response.status === 400) return; // rejected payload will not improve on retry
      } catch {
        // network error: retry once below
      }
    }
    // Delivery failed: drop rather than queue indefinitely (telemetry is best-effort).
  }
}

export const telemetry = new Telemetry();
