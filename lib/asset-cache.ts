"use client";

type CachedAudio = { bytes: ArrayBuffer; mime: string; createdAt: number };
const DB = "one-more-year-assets";
const STORE = "generated-audio-v1";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function read(key: string): Promise<CachedAudio | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as CachedAudio | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function write(key: string, value: CachedAudio) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cachedAudio(
  identity: unknown,
  produce: () => Promise<Response>
): Promise<{ url: string; bytes: Uint8Array; cached: boolean }> {
  const key = await digest(JSON.stringify(identity));
  const existing = await read(key).catch(() => null);
  if (existing) {
    const bytes = new Uint8Array(existing.bytes);
    return { url: URL.createObjectURL(new Blob([bytes], { type: existing.mime })), bytes, cached: true };
  }
  let response!: Response;
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await produce();
    if (response.ok || (![429, 500, 502, 503, 504].includes(response.status))) break;
    // ElevenLabs recommends exponential backoff with full jitter for 429/5xx.
    // A fresh response is requested after the wait; unsuccessful bodies carry
    // no billable audio and are not cached.
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, Math.random() * Math.min(8000, 600 * 2 ** attempt)));
  }
  if (!response.ok) throw new Error(`${response.status}: ${(await response.text().catch(() => "")).slice(0, 160)}`);
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await write(key, { bytes: bytes.buffer.slice(0), mime: blob.type || "audio/mpeg", createdAt: Date.now() }).catch(() => {});
  return { url: URL.createObjectURL(new Blob([bytes], { type: blob.type || "audio/mpeg" })), bytes, cached: false };
}
