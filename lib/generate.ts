import type { Settings } from "./settings";

/* ————— the documentary plan ————— */

export type CastMember = {
  id: string;
  role: string; // "narrator", "the subject", "the old coach", …
  voice: string; // short casting note, e.g. "low, worn, warm"
};

export type Segment = {
  speaker: string; // cast id
  tag: string; // eleven_v3 audio tag
  text: string;
  scene: string; // visual description — used for image gen AND stock search
  em?: boolean;
};

export type DocumentaryPlan = {
  headline: string;
  logline: string;
  cast: CastMember[];
  segments: Segment[];
  sfx_prompt: string;
  music_prompt: string;
};

export type Asset = { url: string; bytes: Uint8Array };

const errBody = async (res: Response) => (await res.text().catch(() => "")).slice(0, 160);

async function toAsset(res: Response): Promise<Asset> {
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), bytes: new Uint8Array(await blob.arrayBuffer()) };
}

function parseLooseJson(text: string) {
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return JSON.parse(stripped);
}

function dataUrlToAsset(dataUrl: string): Asset {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { url: URL.createObjectURL(new Blob([bytes], { type: mime })), bytes };
}

/* ————— the director ————— */

const DIRECTOR_PROMPT = (answers: string[]) => {
  const [thing, almostEnd, why, ownLine] = answers;
  return `You are the AI Director for "One More Year", a product that turns a person's passion into a short documentary film in the style of the best sports documentaries: interview-led, multiple voices, emotionally restrained.

Their interview answers:
1. The thing they can't quit: ${thing || "(not given)"}
2. When it almost ended: ${almostEnd || "(not given)"}
3. Why they stayed: ${why || "(not given)"}
4. A line only they would say: ${ownLine || "(not given)"}

Write a short documentary (60–90 seconds spoken). Follow real documentary craft:
- COLD OPEN: start with the subject mid-thought — a hook, no context.
- Use a NARRATOR sparingly, only to hand context between voices.
- TALKING HEADS: the subject speaks in first person; invent 1–2 plausible witnesses (a coach, an old friend, a rival — fitting their story) who speak ABOUT the subject in first person.
- Alternate perspectives. Let voices disagree slightly or reveal different sides.
- END on the subject, quiet, with their own line if they gave one. The last segment is the strongest, marked "em": true.

Return ONLY JSON:
{
 "headline": string (1-4 words naming the thing they love),
 "logline": string (one sentence, restrained),
 "cast": [{"id": string, "role": string, "voice": string (casting note like "low, worn, warm male")}] — 3 or 4 members, first one MUST be {"id":"narrator","role":"narrator",...},
 "segments": [{"speaker": cast id, "tag": eleven v3 audio tag like [quiet]/[warmer]/[steady]/[almost a whisper], "text": string (1-2 short sentences, spoken language, no clichés, no exclamation marks), "scene": string (a concrete black-and-white documentary photograph for this beat — describable in a few words, no text in image), "em": boolean}] — 6 to 9 segments,
 "sfx_prompt": string (the ambient sound of their world, one sentence),
 "music_prompt": string (restrained documentary score, one sentence: instrumentation, mood, tempo)
}`;
};

/** one call, either provider: the whole documentary plan */
export async function directDocumentary(answers: string[], s: Settings): Promise<DocumentaryPlan> {
  let text: string;
  if (s.openrouterKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.openrouterKey}`,
      },
      body: JSON.stringify({
        model: s.openrouterModel,
        messages: [{ role: "user", content: DIRECTOR_PROMPT(answers) }],
        temperature: 0.9,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await errBody(res)}`);
    const data = await res.json();
    text = data?.choices?.[0]?.message?.content ?? "";
  } else {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${encodeURIComponent(s.geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: DIRECTOR_PROMPT(answers) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await errBody(res)}`);
    const data = await res.json();
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  const plan = parseLooseJson(text) as DocumentaryPlan;
  if (!plan?.headline || !Array.isArray(plan?.cast) || !Array.isArray(plan?.segments) || plan.segments.length === 0) {
    throw new Error("the director returned an unexpected shape");
  }
  // every segment must point at a real cast member
  const ids = new Set(plan.cast.map((c) => c.id));
  plan.segments = plan.segments.filter((seg) => ids.has(seg.speaker));
  if (plan.segments.length === 0) throw new Error("script and cast don't match");
  return plan;
}

/* ————— the picture desk ————— */

const IMAGE_STYLE =
  "High-contrast black-and-white documentary photograph, film grain, halftone newspaper texture, cinematic, no text or lettering anywhere in the image. ";

/** AI frame via OpenRouter (modalities) or Gemini inlineData */
export async function generateFrame(scene: string, s: Settings): Promise<Asset> {
  if (s.openrouterKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.openrouterKey}`,
      },
      body: JSON.stringify({
        model: s.openrouterImageModel,
        messages: [{ role: "user", content: IMAGE_STYLE + scene }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter image ${res.status}: ${await errBody(res)}`);
    const data = await res.json();
    const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("OpenRouter image: no image in response");
    return dataUrlToAsset(url);
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiImageModel}:generateContent?key=${encodeURIComponent(s.geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: IMAGE_STYLE + scene }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini image ${res.status}: ${await errBody(res)}`);
  const data = await res.json();
  const parts: { inlineData?: { mimeType: string; data: string } }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img?.inlineData) throw new Error("Gemini image: no image in response");
  return dataUrlToAsset(`data:${img.inlineData.mimeType || "image/png"};base64,${img.inlineData.data}`);
}

/** stock frame via AssetPipe (free-to-use photo search) */
const ASSETPIPE = "https://assetpipe-production.up.railway.app";

export async function stockFrame(scene: string): Promise<Asset> {
  const q = encodeURIComponent(scene.split(/[,.]/)[0].trim().slice(0, 60));
  const search = await fetch(`${ASSETPIPE}/search?q=${q}&count=3`);
  if (!search.ok) throw new Error(`AssetPipe search ${search.status}`);
  const results = await search.json();
  const first = results?.results?.[0] ?? results?.[0];
  const assetId = first?.asset_id;
  if (!assetId) throw new Error("AssetPipe: no results");
  const fetched = await fetch(`${ASSETPIPE}/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: assetId, size: "large" }),
  });
  if (!fetched.ok) throw new Error(`AssetPipe fetch ${fetched.status}`);
  const meta = await fetched.json();
  if (!meta?.url) throw new Error("AssetPipe: no url");
  const img = await fetch(meta.url);
  if (!img.ok) throw new Error(`AssetPipe asset ${img.status}`);
  return toAsset(img);
}

/* ————— the voice desk ————— */

export async function synthesize(text: string, voiceId: string, s: Settings): Promise<Asset> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": s.elevenKey },
      body: JSON.stringify({ text, model_id: s.elevenModel }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await errBody(res)}`);
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
  if (!res.ok) throw new Error(`ElevenLabs SFX ${res.status}: ${await errBody(res)}`);
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
  if (!res.ok) throw new Error(`ElevenLabs Music ${res.status}: ${await errBody(res)}`);
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

/* ————— the casting desk: eleven premade voices ————— */

export const VOICE_POOL: { id: string; label: string }[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — low, warm" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — calm, clear" },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie — younger, bright" },
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte — soft, close" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — steady, deep" },
];

/** narrator gets the configured voice; everyone else draws from the pool */
export function castVoices(cast: CastMember[], narratorVoiceId: string): Record<string, string> {
  const pool = VOICE_POOL.filter((v) => v.id !== narratorVoiceId);
  const out: Record<string, string> = {};
  let i = 0;
  for (const member of cast) {
    out[member.id] = member.id === "narrator" ? narratorVoiceId : pool[i++ % pool.length].id;
  }
  return out;
}
