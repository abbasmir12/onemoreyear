import type { Settings } from "./settings";

export type GeneratedStory = {
  headline: string;
  lines: { tag: string; text: string; em?: boolean }[];
  /** production plan, written by the director for the tool desks */
  image_prompt: string;
  sfx_prompt: string;
  music_prompt: string;
};

export type Asset = { url: string; bytes: Uint8Array };

async function toAsset(res: Response): Promise<Asset> {
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), bytes: new Uint8Array(await blob.arrayBuffer()) };
}

/**
 * The director: one Gemini call returns the full production plan —
 * script, headline, and the prompts for every tool desk.
 */
export async function generateStory(answers: string[], s: Settings): Promise<GeneratedStory> {
  const [thing, almostEnd, why, ownLine] = answers;
  const prompt = `You are the AI Director for "One More Year", a product that turns a person's passion into a short, restrained, cinematic story in the style of a great newspaper back page.

Their interview answers:
1. The thing they can't quit: ${thing || "(not given)"}
2. When it almost ended: ${almostEnd || "(not given)"}
3. Why they stayed: ${why || "(not given)"}
4. A line only they would say: ${ownLine || "(not given)"}

Write their story AND the production plan. Rules:
- "headline": 1-4 words naming the thing they love (no punctuation, lowercase ok).
- "lines": 4 to 6 short script lines, second person ("you"), emotionally restrained, concrete, no clichés, no exclamation marks. Weave in their own words where they gave them. The final line must be the strongest and marked "em": true. If they gave a line only they would say, quote it in one of the lines.
- Each line gets a "tag": an ElevenLabs v3 audio tag like [quiet], [warmer], [steady], [almost a whisper], [long pause].
- "image_prompt": one still frame for their film. Describe a high-contrast black-and-white halftone newspaper photograph, grainy, cinematic, no text or lettering in the image, concrete scene drawn from their answers.
- "sfx_prompt": the ambient sound of their world in one sentence (e.g. "light rain on an empty football pitch, distant traffic, one ball bouncing").
- "music_prompt": a restrained score in one sentence (instrumentation, mood, tempo; minor key, sparse, cinematic).

Return ONLY JSON matching: {"headline": string, "lines": [{"tag": string, "text": string, "em": boolean}], "image_prompt": string, "sfx_prompt": string, "music_prompt": string}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${encodeURIComponent(s.geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 160)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  if (!parsed?.headline || !Array.isArray(parsed?.lines) || parsed.lines.length === 0) {
    throw new Error("Gemini returned an unexpected shape");
  }
  return {
    image_prompt: "",
    sfx_prompt: "",
    music_prompt: "",
    ...parsed,
  } as GeneratedStory;
}

/**
 * The picture desk: Gemini image generation (Nano Banana). Returns the
 * frame as bytes + object URL. Response carries base64 in inlineData.
 */
export async function generateImage(prompt: string, s: Settings): Promise<Asset> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiImageModel}:generateContent?key=${encodeURIComponent(s.geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini image ${res.status}: ${body.slice(0, 160)}`);
  }
  const data = await res.json();
  const parts: { inlineData?: { mimeType: string; data: string } }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img?.inlineData) throw new Error("Gemini image: no image in response");
  const bin = atob(img.inlineData.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: img.inlineData.mimeType || "image/png" });
  return { url: URL.createObjectURL(blob), bytes };
}

/** The voice desk: ElevenLabs speaks the script (audio tags included). */
export async function synthesize(text: string, s: Settings): Promise<Asset> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${s.elevenVoiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": s.elevenKey },
      body: JSON.stringify({ text, model_id: s.elevenModel }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 160)}`);
  }
  return toAsset(res);
}

/** The foley desk: ElevenLabs text-to-sound-effects (0.5–30s). */
export async function makeSfx(prompt: string, seconds: number, s: Settings): Promise<Asset> {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": s.elevenKey },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: Math.min(30, Math.max(0.5, seconds)),
      prompt_influence: 0.4,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs SFX ${res.status}: ${body.slice(0, 160)}`);
  }
  return toAsset(res);
}

/** The score desk: ElevenLabs Music. */
export async function makeMusic(prompt: string, ms: number, s: Settings): Promise<Asset> {
  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": s.elevenKey },
    body: JSON.stringify({
      prompt,
      music_length_ms: Math.min(300000, Math.max(10000, Math.round(ms))),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs Music ${res.status}: ${body.slice(0, 160)}`);
  }
  return toAsset(res);
}

/** Length of an audio asset in seconds, via the browser's decoder. */
export function audioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(a.duration);
    a.onerror = () => reject(new Error("could not decode audio"));
    a.src = url;
  });
}
