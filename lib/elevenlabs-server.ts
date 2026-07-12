import "server-only";

export function elevenKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Network-level failures (a reset TLS handshake, a dropped connection) throw
 * before ever producing a Response, and are otherwise indistinguishable from
 * a permanent failure. Retry those the same as a 5xx, with a bounded
 * per-attempt timeout so a hung connection fails fast instead of stalling.
 */
export async function elevenRequest(path: string, init?: RequestInit) {
  const url = `https://api.elevenlabs.io${path}`;
  const headers = { "xi-api-key": elevenKey(), "Content-Type": "application/json", ...init?.headers };
  let lastResponse: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok || !RETRYABLE_STATUS.has(response.status)) return response;
      lastResponse = response;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt + Math.random() * 300));
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("ElevenLabs request failed after retries");
}

export function upstream(response: Response) {
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/octet-stream" },
  });
}
