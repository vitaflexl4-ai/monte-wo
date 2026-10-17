import {saveWorkoutCopy} from "../../../shared/workout-transfer.js";
import type {WorkoutRecord} from "../../../shared/workouts.js";
import {mobileConfigSupported} from "../../../shared/service-readiness.js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
WebBrowser.maybeCompleteAuthSession();
const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
export const API_BASE = (
  configured ||
  (Platform.OS === "web"
    ? window.location.origin
    : "https://vitaflex-monte-wo.pages.dev")
).replace(/\/$/, "");
if (
  !/^https:\/\//.test(API_BASE) &&
  !(typeof __DEV__ !== "undefined" && __DEV__) &&
  !(
    Platform.OS === "web" && /^http:\/\/(localhost|127\.0\.0\.1)/.test(API_BASE)
  )
)
  throw Error("Production API must use HTTPS.");
const listeners = new Set<() => void>();
export function onSessionCleared(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const KEY = "montewo.mobile.session.v1";
let session: { token: string; expiresAt: number } | null = null;
let sessionRevision = 0;
export const getSessionRevision = () => sessionRevision;
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code.replaceAll("-", " "));
  }
}
export async function restoreSession() {
  const revision = sessionRevision;
  if (Platform.OS !== "web") {
    const value = await SecureStore.getItemAsync(KEY);
    if (revision !== sessionRevision) return session;
    if (value) {
      try {
        const restored = JSON.parse(value);
        if (restored?.token !== session?.token) sessionRevision++;
        session = restored;
      } catch {
        await clearSession();
      }
    }
  }
  if (session && session.expiresAt <= Date.now()) await clearSession();
  return session;
}
export async function clearSession() {
  session = null;
  sessionRevision++;
  for (const fn of listeners) fn();
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
}
export function authorization(): Record<string, string> {
  return session ? { Authorization: "Bearer " + session.token } : {};
}
export async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = new Headers(options.headers);
    for (const [k, v] of Object.entries(authorization())) headers.set(k, v);
    if (options.body && !headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
    const res = await fetch(API_BASE + "/api/mobile" + path, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      headers,
    });
    const type = res.headers.get("Content-Type") || "";
    if (!type.includes("application/json"))
      throw new ApiError("mobile-api-not-deployed", res.status);
    const data = await res.json();
    if (path === "/config" && (res.status === 404 || data?.error === "Not implemented in this build"))
      throw new ApiError("mobile-api-not-deployed", res.status);
    if (!res.ok) {
      if (res.status === 401) await clearSession();
      throw new ApiError(data.error || "request-failed", res.status);
    }
    if (path === "/config" && !mobileConfigSupported(data))
      throw new ApiError("mobile-api-incompatible", res.status);
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof Error && e.name === "AbortError")
      throw new ApiError("request-timed-out", 0);
    throw new ApiError("network-unavailable", 0);
  } finally {
    clearTimeout(timer);
  }
}
export const post = <T = any>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });
export async function signIn() {
  const revision = sessionRevision;
  const config = await request("/config");
  if (!config.available) throw new ApiError("mobile-backend-unavailable", 503);
  const verifier = Array.from(Crypto.getRandomBytes(32), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const challenge = (
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    )
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const state = Crypto.randomUUID(),
    redirectUri =
      Platform.OS === "web"
        ? API_BASE + "/mobile/"
        : AuthSession.makeRedirectUri({ scheme: "montewo", path: "auth" });
  const url =
    API_BASE +
    "/api/mobile/auth/authorize?" +
    new URLSearchParams({
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      redirect_uri: redirectUri,
    });
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (result.type !== "success") throw new ApiError("sign-in-cancelled", 0);
  const callback = new URL(result.url);
  if (callback.searchParams.get("state") !== state)
    throw new ApiError("invalid-auth-state", 401);
  const code = callback.searchParams.get("code");
  if (!code) throw new ApiError("authorization-code-missing", 401);
  if (revision !== sessionRevision) throw new ApiError("account-session-changed", 401);
  const nextSession = await post("/auth/token", {
    code,
    codeVerifier: verifier,
    redirectUri,
  });
  if (revision !== sessionRevision) throw new ApiError("account-session-changed", 401);
  session = nextSession;
  sessionRevision++;
  if (Platform.OS !== "web")
    await SecureStore.setItemAsync(KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  return session;
}
export async function saveAccountWorkout(workout: WorkoutRecord, exerciseIds: Set<string>, expectedRevision: number) {
  return saveWorkoutCopy(workout, exerciseIds,
    snapshot => post("/workouts", snapshot),
    () => sessionRevision === expectedRevision && !!session && session.expiresAt > Date.now());
}
export async function signOut() {
  try {
    if (session) await post("/auth/logout", {});
  } finally {
    await clearSession();
  }
}
export function errorMessage(e: unknown) {
  if (e instanceof ApiError) {
    const messages: Record<string, string> = {
      "account-session-changed": "The account session changed. Check the original account history before retrying.",
      "mobile-api-not-deployed":
        "The connected website has not deployed the mobile API yet. The exercise library still works.",
      "mobile-api-incompatible":
        "The website returned an unsupported mobile API response. Check website connection status before signing in. Device-only workouts are not synced.",
      "mobile-backend-unavailable":
        "Mobile account services are not configured on this deployment. No data was saved.",
      "session-expired": "Your session expired. Sign in again.",
      "network-unavailable":
        "Cannot reach the server. Check your connection and retry. No success is assumed.",
      "draft-rulebook":
        "This MONTE Standard is still draft. It cannot approve evidence.",
      "authentication-required": "Sign in to your enrolled account first.",
      "account-not-provisioned":
        "This identity is not enrolled in the restricted pilot. Contact support.",
      "sign-in-cancelled": "Sign-in was cancelled.",
      "request-timed-out":
        "The request timed out. Check history before retrying a submission.",
    };
    return messages[e.code] || e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong. Please retry.";
}
