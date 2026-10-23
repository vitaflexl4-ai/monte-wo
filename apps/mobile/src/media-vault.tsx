import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Film, ImagePlus, Trash2, Link2, Sparkles } from "lucide-react-native";
import { C, Button, Field, ModalSheet, Chips } from "./ui";

export type AttachedMediaItem = {
  exerciseId: string;
  kind: "video" | "gif" | "image";
  sourceType: "file" | "url";
  uri: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  addedAt: string;
};

type StoredMediaRecord = {
  exerciseId: string;
  kind: "video" | "gif" | "image";
  sourceType: "file" | "url";
  url?: string;
  blob?: Blob;
  fileName: string;
  mimeType: string;
  bytes: number;
  addedAt: string;
};

const DB_NAME = "montewo_media_vault_v1";
const STORE_NAME = "exercise_media";

const activeBlobUrls = new Map<string, string>();
const listeners = new Set<() => void>();

function notifyMediaListeners() {
  for (const fn of listeners) fn();
}

export function subscribeMediaVault(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "exerciseId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}

function inferKind(mime: string, nameOrUrl: string): "video" | "gif" | "image" {
  const lower = (mime + " " + nameOrUrl).toLowerCase();
  if (lower.includes("gif") || /\.gif(\?|$)/i.test(nameOrUrl)) return "gif";
  if (
    lower.includes("video") ||
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(nameOrUrl)
  ) {
    return "video";
  }
  return "image";
}

export async function loadMediaVaultMap(): Promise<
  Record<string, AttachedMediaItem>
> {
  if (Platform.OS !== "web" || typeof indexedDB === "undefined") {
    return {};
  }
  try {
    const db = await openMediaDb();
    const rows: StoredMediaRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    const out: Record<string, AttachedMediaItem> = {};
    for (const r of rows) {
      let uri = r.url || "";
      if (r.sourceType === "file" && r.blob) {
        const prev = activeBlobUrls.get(r.exerciseId);
        if (prev) URL.revokeObjectURL(prev);
        uri = URL.createObjectURL(r.blob);
        activeBlobUrls.set(r.exerciseId, uri);
      }
      if (uri) {
        out[r.exerciseId] = {
          exerciseId: r.exerciseId,
          kind: r.kind,
          sourceType: r.sourceType,
          uri,
          fileName: r.fileName,
          mimeType: r.mimeType,
          bytes: r.bytes || 0,
          addedAt: r.addedAt,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function attachMediaFileToExercise(
  exerciseId: string,
  file: { uri?: string; name?: string; mimeType?: string; size?: number; file?: File },
): Promise<AttachedMediaItem> {
  const fileName = file.name || `${exerciseId}.mp4`;
  const mimeType = file.mimeType || file.file?.type || "video/mp4";
  const kind = inferKind(mimeType, fileName);
  const addedAt = new Date().toISOString();

  if (Platform.OS === "web" && typeof indexedDB !== "undefined") {
    let blob: Blob;
    if (file.file instanceof Blob) {
      blob = file.file;
    } else if (file.uri) {
      const resp = await fetch(file.uri);
      blob = await resp.blob();
    } else {
      throw new Error("Could not read selected media file.");
    }
    const db = await openMediaDb();
    const record: StoredMediaRecord = {
      exerciseId,
      kind,
      sourceType: "file",
      blob,
      fileName,
      mimeType,
      bytes: blob.size,
      addedAt,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const prev = activeBlobUrls.get(exerciseId);
    if (prev) URL.revokeObjectURL(prev);
    const uri = URL.createObjectURL(blob);
    activeBlobUrls.set(exerciseId, uri);
    notifyMediaListeners();
    return {
      exerciseId,
      kind,
      sourceType: "file",
      uri,
      fileName,
      mimeType,
      bytes: blob.size,
      addedAt,
    };
  }

  const uri = file.uri || "";
  if (!uri) throw new Error("No media URI returned.");
  notifyMediaListeners();
  return {
    exerciseId,
    kind,
    sourceType: "file",
    uri,
    fileName,
    mimeType,
    bytes: file.size || 0,
    addedAt,
  };
}

export async function attachMediaUrlToExercise(
  exerciseId: string,
  rawUrl: string,
  forcedKind?: "video" | "gif" | "image",
): Promise<AttachedMediaItem> {
  const trimmed = String(rawUrl || "").trim();
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
    throw new Error("Enter an https:// or local / media URL.");
  }
  const kind = forcedKind || inferKind("", trimmed);
  const addedAt = new Date().toISOString();
  const fileName = trimmed.split("/").pop()?.split("?")[0] || exerciseId;

  if (Platform.OS === "web" && typeof indexedDB !== "undefined") {
    const db = await openMediaDb();
    const record: StoredMediaRecord = {
      exerciseId,
      kind,
      sourceType: "url",
      url: trimmed,
      fileName,
      mimeType: kind === "video" ? "video/mp4" : kind === "gif" ? "image/gif" : "image/jpeg",
      bytes: 0,
      addedAt,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  notifyMediaListeners();
  return {
    exerciseId,
    kind,
    sourceType: "url",
    uri: trimmed,
    fileName,
    mimeType: kind === "video" ? "video/mp4" : "image/gif",
    bytes: 0,
    addedAt,
  };
}

export async function removeMediaFromExercise(exerciseId: string): Promise<void> {
  const prev = activeBlobUrls.get(exerciseId);
  if (prev) {
    URL.revokeObjectURL(prev);
    activeBlobUrls.delete(exerciseId);
  }
  if (Platform.OS === "web" && typeof indexedDB !== "undefined") {
    try {
      const db = await openMediaDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(exerciseId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // ignore
    }
  }
  notifyMediaListeners();
}

export function useMediaVault() {
  const [mediaMap, setMediaMap] = useState<Record<string, AttachedMediaItem>>({});

  async function reload() {
    const loaded = await loadMediaVaultMap();
    setMediaMap(loaded);
  }

  useEffect(() => {
    reload();
    return subscribeMediaVault(() => {
      reload();
    });
  }, []);

  return { mediaMap, reload };
}

export function AttachMediaModal({
  visible,
  exerciseId,
  exerciseName,
  existing,
  onClose,
}: {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  existing?: AttachedMediaItem | null;
  onClose: () => void;
}) {
  const [urlInput, setUrlInput] = useState(
    existing?.sourceType === "url" ? existing.uri : "",
  );
  const [kindChoice, setKindChoice] = useState<"auto" | "video" | "gif">("auto");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrlInput(existing?.sourceType === "url" ? existing.uri : "");
    setStatus("");
  }, [exerciseId, visible]);

  async function pickFile() {
    setBusy(true);
    setStatus("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["video/*", "image/gif", "image/*"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) {
        setBusy(false);
        return;
      }
      const asset = picked.assets[0] as any;
      await attachMediaFileToExercise(exerciseId, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        file: asset.file,
      });
      setStatus("Saved MP4/GIF to this exercise.");
      onClose();
    } catch (e: any) {
      setStatus(e?.message || "Could not attach media file.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUrl() {
    setBusy(true);
    setStatus("");
    try {
      await attachMediaUrlToExercise(
        exerciseId,
        urlInput,
        kindChoice === "auto" ? undefined : kindChoice,
      );
      setStatus("Linked media URL.");
      onClose();
    } catch (e: any) {
      setStatus(e?.message || "Invalid media URL.");
    } finally {
      setBusy(false);
    }
  }

  async function clearMedia() {
    await removeMediaFromExercise(exerciseId);
    onClose();
  }

  return (
    <ModalSheet
      visible={visible}
      title={`Media · ${exerciseName}`}
      onClose={onClose}
    >
      <View
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: "#0e1420",
          borderWidth: 1,
          borderColor: "#1f2d45",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Film size={18} color={C.cyan} />
          <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
            Upload MP4, WebM, GIF, or Poster from Device
          </Text>
        </View>
        <Text style={{ color: C.muted, fontSize: 12.5, lineHeight: 18 }}>
          Add demo clips or looping GIFs as you build out the library. Stored persistently in your browser/device Media Vault.
        </Text>
        <Button
          title="Choose .MP4 / .GIF / Video File"
          onPress={pickFile}
          busy={busy}
        />
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Link2 size={16} color={C.cyan} />
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13.5 }}>
            Or Link a Direct Video / GIF URL
          </Text>
        </View>
        <Chips
          items={[
            { id: "auto", name: "Auto-Detect" },
            { id: "video", name: "MP4 / Video" },
            { id: "gif", name: "Animated GIF" },
          ]}
          value={kindChoice}
          onChange={(v) => setKindChoice(v as any)}
        />
        <Field
          label="Direct .mp4 / .gif / image URL"
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://.../exercise-loop.mp4 or .gif"
        />
        <Button
          title="Save Media Link"
          secondary
          onPress={saveUrl}
          disabled={!urlInput.trim()}
          busy={busy}
        />
      </View>

      {existing ? (
        <Pressable
          accessibilityRole="button"
          onPress={clearMedia}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 11,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.redBorder,
            backgroundColor: C.redSoft,
          }}
        >
          <Trash2 size={15} color="#ff8496" />
          <Text style={{ color: "#ff8496", fontWeight: "800", fontSize: 12.5 }}>
            Remove Custom Media ({existing.fileName})
          </Text>
        </Pressable>
      ) : null}

      {status ? (
        <Text style={{ color: "#ff8496", fontSize: 12 }}>{status}</Text>
      ) : null}
    </ModalSheet>
  );
}

export function ExerciseMediaBanner({
  exerciseId,
  exerciseName,
  builtInVideoUri,
  posterSource,
  customMedia,
  height = 190,
  onManageMedia,
}: {
  exerciseId: string;
  exerciseName: string;
  builtInVideoUri?: string | null;
  posterSource?: any;
  customMedia?: AttachedMediaItem | null;
  height?: number;
  onManageMedia?: () => void;
}) {
  const activeVideoUri =
    customMedia?.kind === "video" ? customMedia.uri : builtInVideoUri || null;
  const activeImageUri =
    customMedia && customMedia.kind !== "video" ? customMedia.uri : null;

  return (
    <View
      style={{
        height,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#05070c",
        borderWidth: 1,
        borderColor: "#1b2538",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {activeImageUri ? (
        <Image
          source={{ uri: activeImageUri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      ) : activeVideoUri && Platform.OS === "web" ? (
        React.createElement("video", {
          key: activeVideoUri,
          src: activeVideoUri,
          loop: true,
          muted: true,
          autoPlay: true,
          playsInline: true,
          controls: true,
          style: {
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000000",
          },
        })
      ) : posterSource ? (
        <Image
          source={posterSource}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onManageMedia}
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 16,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#101929",
              borderWidth: 1,
              borderColor: "#243a5e",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImagePlus size={20} color={C.cyan} />
          </View>
          <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13 }}>
            Media Slot Ready · {exerciseName}
          </Text>
          <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center" }}>
            Tap to attach .MP4, .GIF, or demo clip
          </Text>
        </Pressable>
      )}

      {onManageMedia ? (
        <Pressable
          accessibilityRole="button"
          onPress={onManageMedia}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "rgba(5, 8, 15, 0.86)",
            borderWidth: 1,
            borderColor: customMedia ? "#1d6e53" : "#293c59",
          }}
        >
          <Sparkles size={12} color={customMedia ? C.green : C.cyan} />
          <Text
            style={{
              color: "#ffffff",
              fontSize: 10.5,
              fontWeight: "800",
            }}
          >
            {customMedia
              ? customMedia.kind === "gif"
                ? "Custom GIF · Edit"
                : "Custom MP4 · Edit"
              : activeVideoUri
                ? "Replace / Add GIF"
                : "+ Add MP4 / GIF"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
