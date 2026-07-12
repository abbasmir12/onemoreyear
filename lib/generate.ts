import type { Settings } from "./settings";
import { DEFAULT_NARRATOR_ID, HOUSE_VOICES, isHouseVoiceId } from "./voices";
import { cachedAudio } from "./asset-cache";

/* ————— the documentary plan ————— */

export type CastMember = {
  id: string;
  role: string; // "narrator", "the subject", "the old coach", …
  voice: string; // short casting note, e.g. "low, worn, warm"
};

export type Segment = {
  speaker: string; // cast id
  tag: string; // restrained opening eleven_v3 audio tag
  text: string; // clean transcript shown in the edition
  /** Eleven v3 performance copy: may add sparse, meaningful spoken disfluency. */
  performance?: string;
  scene: string; // rich visual description — used for AI image generation
  footage_query: string; // short keyword phrase — used for real stock-photo search
  em?: boolean;
  transition: {
    mode: "direct" | "sound" | "silence";
    duration_seconds: number;
    prompt: string;
    gain: number;
    reason: string;
  };
};

export type DocumentaryPlan = {
  headline: string;
  logline: string;
  cast: CastMember[];
  segments: Segment[];
  sfx_prompt: string;
  music_prompt: string;
  music_mode: "instrumental" | "vocal" | "hybrid" | "none";
  music_rationale: string;
  music_entry_seconds: number;
};

export type Asset = { url: string; bytes: Uint8Array };

const NON_VOCAL_TAG = /\[(?:pause|music|score|camera|cut|zoom|rain|crowd|stadium|footsteps|door|room tone|ambience)[^\]]*\]/i;

/** Keep malformed director output away from paid TTS calls. */
export function performanceScript(segment: Segment): string {
  const candidate = segment.performance?.trim();
  if (candidate) {
    const tags = candidate.match(/\[[^\]]+\]/g) ?? [];
    const safe =
      candidate.length <= 600 &&
      tags.length <= 2 &&
      !NON_VOCAL_TAG.test(candidate) &&
      !/<\/?(?:break|speak|phoneme)\b/i.test(candidate);
    if (safe) return candidate;
  }
  const opening = /^\[[^\]]{2,60}\]$/.test(segment.tag.trim()) && !NON_VOCAL_TAG.test(segment.tag)
    ? `${segment.tag.trim()} `
    : "";
  return `${opening}${segment.text}`.trim();
}

const errBody = async (res: Response) => (await res.text().catch(() => "")).slice(0, 160);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

Write entirely in English, regardless of the language of the answers below. Do not translate the JSON keys or the instructions — only the spoken content is yours to write, and it must be English.

This is a full production script, not a summary: it must contain 8 to 10 segments totalling 150–200 words of spoken text. A short or lazy response will be rejected. Do not stop early.

Their interview answers:
1. The thing they can't quit: ${thing || "(not given)"}
2. When it almost ended: ${almostEnd || "(not given)"}
3. Why they stayed: ${why || "(not given)"}
4. A line only they would say: ${ownLine || "(not given)"}

Write a short documentary (70–90 seconds spoken, roughly 150–200 words). Follow real documentary craft:
- COLD OPEN: start with the subject mid-thought — a hook, no context. Segment 0 still needs real spoken words — the mandatory opening sound bed is that segment's transition (before its voice begins), never a substitute for it. No segment may have empty "text": every segment is a real recorded voice line.
- Use a NARRATOR sparingly, only to hand context between voices.
- Build an ensemble of 4 or 5 editorial voices from the approved house cast. The first two are always narrator and subject. Other roles may be "memory", "doubt", "younger self", or another clearly symbolic editorial voice.
- Symbolic voices are fragments of the subject's interior story, not factual witnesses. They must never claim to be a coach, friend, rival, family member, or person who was present.
- Never invent a quote, date, injury, achievement, relationship, or event the person did not provide.
- Alternate perspectives with purpose: narrator supplies only factual connective tissue; subject owns first-person truth; symbolic voices can repeat, question, or challenge words already supported by the input.
- END on the subject, quiet, with their own line if they gave one. The last segment is the strongest, marked "em": true.

Write for ElevenLabs Eleven v3, not for a page reader:
- Keep "text" as a clean, readable transcript. Never put tags in "text".
- Add "performance" as the exact string Eleven v3 should perform. Preserve every fact and the meaning of "text".
- Human speech is not polished prose. In only 2 or 3 segments across the entire film, add ONE motivated imperfection: a repeated word ("he… he was there"), a false start ("I thought— no, I knew"), a self-correction, or a small filler ("well", "I mean").
- Imperfections must reveal uncertainty, memory, grief, affection, or surprise. Never sprinkle random "um" sounds everywhere. Never imitate a speech disorder. Never misspell words to fake an accent.
- The primary narrator stays comparatively composed. The subject may hesitate, correct themselves, or begin mid-thought. Symbolic voices should be concise and distinct rather than theatrical characters.
- Use punctuation as performance direction: … for a weighted hesitation and — for an interruption or sudden turn. Eleven v3 does NOT support SSML <break> tags. Do not write [pause].
- Use zero, one, or at most two audible square-bracket tags per performance. Useful restrained examples: [quietly], [whispers], [sighs], [exhales], [voice catches], [suddenly louder], [with a small uncertain laugh].
- A tag may appear where the emotion changes, not only at the beginning: "He was gone. [suddenly louder] He was THERE."
- Tags must describe audible vocal delivery. Never put camera direction, body movement, music, rain, crowds, room tone, or visual action in a speech tag.
- Keep most segments simple. Contrast makes the imperfect moments feel human.
- Avoid inspirational slogans, symmetrical sentence patterns, constant poetic metaphors, exclamation marks, and trailer-announcer language.

Direct the edit like a real audio documentary:
- Every segment has a transition BEFORE its voice: "direct", "sound", or "silence".
- Segment 1 MUST use "sound" for 4–5 seconds before anyone speaks. Establish the physical world first: rain, stadium distance, an empty room, workshop air, keyboard hum, or another story-specific environment.
- Across the rest of the piece, choose 4 to 6 additional "sound" transitions of 3–5 seconds (5 to 7 total, including the opening). This is a real, distinct sound effect for each — you are choosing exactly where the listener hears the world, not just narration. Still leave 1 to 3 segments that cut DIRECTLY from one voice into the next with no effect between them — that contrast is what keeps the pacing feeling natural rather than mechanical, so do not put a sound effect before every single voice.
- Vary the sound effects — never reuse the same ambience twice. Each "sound" prompt names one concrete, specific, recordable event fitting that exact beat: a stadium crowd cheering in the distance, a single door closing, studs on a concrete floor, rain on a tin roof, a whistle, a locker slamming, a phone buzzing on a table, wind across an open pitch, footsteps down a corridor. Draw the specific effect from the scene it precedes.
- Use "silence" for 1–3 seconds only when absence is emotionally meaningful.
- A sound prompt describes one focused ambience or Foley event. Keep it concise and professionally recordable. Explicitly say no dialogue, no narration, no music.
- Crowd, cheering, applause, or stadium sound is allowed only when the supplied facts establish a public sporting moment. Never add a crowd merely to manufacture emotion.
- Give every transition a short editorial reason.
- Every film gets a score — music_mode is never "none". If the story calls for restraint, choose "instrumental" and keep it sparse (a single held note, a slow pad, minimal piano) rather than skipping the score entirely. Choose music_entry_seconds between 2 and 8: music should normally enter after the opening environment has established place, not at frame zero.

Examples of the intended restraint:
- clean text: "I don't know if he believed he would return."
  performance: "I… I don't know if he believed he would return."
- clean text: "He was there."
  performance: "[quietly] He— [voice catches] he was there."
- clean text: "I wanted to stop, but I came back the next morning."
  performance: "I wanted to stop. I mean… I did stop. [exhales] Then I came back the next morning."

Return ONLY JSON:
{
 "headline": string (1-4 words naming the thing they love),
 "logline": string (one sentence, restrained),
 "cast": [{"id": string, "role": string, "voice": string}] — 4 or 5 members; first {"id":"narrator","role":"narrator",...}, second {"id":"subject","role":"the subject",...}; remaining ids are symbolic editorial roles,
 "segments": [{"speaker": cast id, "tag": restrained opening eleven v3 audio tag or empty string, "text": non-empty clean transcript string (1-2 short sentences — every segment, including segment 0, must have real spoken words; the silence or sound before it lives in "transition", not in an empty "text"), "performance": exact Eleven v3 performance string with sparse inline tags/disfluency, "scene": string (a concrete black-and-white documentary photograph for this beat, richly described for an AI image generator — describable in a few words, no text in image), "footage_query": string (2 to 6 plain keywords for a REAL stock-photo search engine to find an actual matching photograph — concrete and generic, e.g. "empty football pitch dawn", "physio room knee brace", "stadium crowd cheering"; never invent a composition too specific or staged for a real photo to exist), "em": boolean, "transition":{"mode":"direct"|"sound"|"silence","duration_seconds": number, "prompt": string, "gain": number, "reason": string}}] — 8 to 10 segments; total clean transcript 150–200 words. For direct use duration 0, empty prompt, gain 0. For silence use 1–3 seconds, empty prompt, gain 0. For sound use 3–5 seconds (first scene 4–5), a real prompt, and gain 0.15–0.7 — gain only applies to "sound", since it is the sound effect's mix volume,
 "sfx_prompt": string (legacy one-sentence summary of the sound world),
 "music_mode": "instrumental" | "vocal" | "hybrid" — never "none", every film is scored,
 "music_rationale": string (one concise production reason why this mode and this treatment serves this story),
 "music_entry_seconds": number 2–8,
 "music_prompt": string (a precise Eleven Music v2 prompt, never empty. For vocal/hybrid mode include original non-copyrighted lyric direction and require vocals to remain sparse beneath speech. For instrumental mode state no vocals and describe the sparse instrumentation.)
}

Two fully worked example segments from an UNRELATED story (a woodworker), showing only the required detail and JSON shape — segment 0 (mandatory opening "sound" transition) and a later "direct" transition. These examples exist to teach FORMAT ONLY. Never reuse their wording, scene, sound prompt, or subject matter — your segments must be entirely original and built from the interview answers above, in whatever domain those answers describe:

{"speaker":"narrator","tag":"[steady]","text":"She had not touched the lathe in eleven months.","performance":"[steady] She had not touched the lathe in eleven months.","scene":"a dust-covered workshop bench, tools hanging untouched, morning light through a small window","footage_query":"woodworking workshop empty bench","em":false,"transition":{"mode":"sound","duration_seconds":4.5,"prompt":"a quiet workshop at rest, a single drip from a tap, faint traffic outside, no dialogue, no narration, no music","gain":0.4,"reason":"establish the physical world before any voice"}}

{"speaker":"subject","tag":"","text":"I told myself the shop was just closed for the season.","performance":"I told myself the shop was just closed for the season.","scene":"a woman in her fifties standing in a doorway, looking in without entering","footage_query":"woman standing in doorway","em":false,"transition":{"mode":"direct","duration_seconds":0,"prompt":"","gain":0,"reason":"cut straight from the narrator into the subject's own voice"}}

Match this level of concrete detail and this exact JSON shape for every one of the 8–10 segments — but write about the actual person and story from the interview answers, not about a workshop or a lathe.`;
};

const ambiencePrompt = (scene: string) =>
  `the ambient sound of this scene: ${scene}. no dialogue, no narration, no music`.slice(0, 450);

/**
 * Fixes the two pacing rules models most often skip — a mandatory opening
 * sound bed, and a 5–7 count of sound transitions overall — by editing
 * transition metadata in place. Never touches speaker, text, performance,
 * or scene, so no content is invented or altered.
 */
function repairPacing(segments: Segment[]) {
  if (segments.length === 0) return;

  if (segments[0].transition.mode !== "sound" || segments[0].transition.duration_seconds < 4 || segments[0].transition.duration_seconds > 5) {
    segments[0].transition = {
      mode: "sound",
      duration_seconds: 4.5,
      prompt: ambiencePrompt(segments[0].scene),
      gain: 0.4,
      reason: "establish the physical world before any voice (auto-applied opening rule)",
    };
  }

  let sound = segments.filter((s) => s.transition.mode === "sound");
  for (let i = 1; i < segments.length && sound.length < 5; i++) {
    if (segments[i].transition.mode !== "sound") {
      segments[i].transition = {
        mode: "sound",
        duration_seconds: 3.5,
        prompt: ambiencePrompt(segments[i].scene),
        gain: 0.35,
        reason: "auto-applied — held below the 5-transition minimum",
      };
      sound.push(segments[i]);
    }
  }

  sound = segments.filter((s) => s.transition.mode === "sound");
  if (sound.length > 7) {
    for (let i = segments.length - 1; i >= 1 && sound.length > 7; i--) {
      if (segments[i].transition.mode === "sound") {
        segments[i].transition = { mode: "direct", duration_seconds: 0, prompt: "", gain: 0, reason: "auto-applied — over the 7-transition maximum" };
        sound = segments.filter((s) => s.transition.mode === "sound");
      }
    }
  }
}

/** one call, either provider: the whole documentary plan */
export async function directDocumentary(
  answers: string[],
  s: Settings,
  attempts = 3
): Promise<DocumentaryPlan> {
  try {
    return await directDocumentaryOnce(answers, s);
  } catch (e) {
    // auth errors fail identically every time — no point burning retries
    const authFailure = /\bGemini (401|403):/.test(errMsg(e));
    // LLM calls otherwise occasionally return empty, truncated, or malformed
    // JSON regardless of provider — retry transparently before surfacing
    if (authFailure || attempts <= 1) throw e;
    await new Promise((r) => setTimeout(r, 800));
    return directDocumentary(answers, s, attempts - 1);
  }
}

async function directDocumentaryOnce(answers: string[], s: Settings): Promise<DocumentaryPlan> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${encodeURIComponent(s.geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: DIRECTOR_PROMPT(answers) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9, maxOutputTokens: 8000 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await errBody(res)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`Gemini returned empty content (finishReason: ${reason})`);
  }
  let raw: unknown;
  try {
    raw = parseLooseJson(text);
  } catch {
    throw new Error(`the director's reply wasn't valid JSON — raw: ${text.slice(0, 700) || "(empty)"}`);
  }
  const plan = raw as DocumentaryPlan;
  const problems: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) problems.push(msg);
  };

  check(!!plan?.headline, "missing headline");
  check(typeof plan?.logline === "string", "missing logline");

  const cast = Array.isArray(plan?.cast) ? plan.cast : [];
  check(Array.isArray(plan?.cast), "cast is not an array");
  check(cast.length >= 4 && cast.length <= 5, `cast has ${cast.length} members, need 4–5`);
  check(cast[0]?.id === "narrator", `cast[0].id is "${cast[0]?.id}", expected "narrator"`);
  check(cast[1]?.id === "subject", `cast[1].id is "${cast[1]?.id}", expected "subject"`);

  const segments = Array.isArray(plan?.segments) ? plan.segments : [];
  check(Array.isArray(plan?.segments), "segments is not an array");
  check(segments.length >= 8 && segments.length <= 10, `segments has ${segments.length} items, need 8–10`);

  check(typeof plan?.sfx_prompt === "string", "missing sfx_prompt");
  check(typeof plan?.music_prompt === "string", "missing music_prompt");
  check(
    ["instrumental", "vocal", "hybrid", "none"].includes(plan?.music_mode),
    `music_mode is "${plan?.music_mode}", expected instrumental/vocal/hybrid/none`
  );
  check(typeof plan?.music_rationale === "string", "missing music_rationale");
  // entry time is meaningless without music — only enforce the 2–8s window
  // when the director actually scored the piece
  check(
    plan?.music_mode === "none" ||
      (typeof plan?.music_entry_seconds === "number" &&
        plan.music_entry_seconds >= 2 &&
        plan.music_entry_seconds <= 8),
    `music_entry_seconds is ${plan?.music_entry_seconds}, need 2–8 (unless music_mode is "none")`
  );

  if (problems.length) {
    throw new Error(`the director's script failed review: ${problems.join("; ")} — raw: ${text.slice(0, 700)}`);
  }

  // every segment must point at a real cast member
  const ids = new Set(cast.map((c) => c.id));
  plan.segments = segments.filter((seg) => ids.has(seg.speaker));
  check(plan.segments.length >= 8, `only ${plan.segments.length} segments point at real cast members`);
  plan.segments.forEach((seg, i) => {
    check(typeof seg.text === "string" && seg.text.length >= 2 && seg.text.length <= 420, `segment ${i}: text out of range`);
    check(typeof seg.scene === "string", `segment ${i}: missing scene`);
    check(
      typeof seg.footage_query === "string" && seg.footage_query.trim().length >= 2 && seg.footage_query.length <= 80,
      `segment ${i}: footage_query missing or out of range`
    );
    check(performanceScript(seg).length <= 600, `segment ${i}: performance too long`);
    const t = seg.transition;
    check(!!t && ["direct", "sound", "silence"].includes(t?.mode), `segment ${i}: bad transition.mode "${t?.mode}"`);
    check(typeof t?.duration_seconds === "number", `segment ${i}: transition.duration_seconds not a number`);
    check(typeof t?.prompt === "string", `segment ${i}: transition.prompt not a string`);
    check(typeof t?.gain === "number", `segment ${i}: transition.gain not a number`);
    check(typeof t?.reason === "string", `segment ${i}: transition.reason not a string`);
  });
  if (problems.length) {
    throw new Error(`the director's script failed review: ${problems.join("; ")} — raw: ${text.slice(0, 700)}`);
  }

  const words = plan.segments.reduce((count, seg) => count + seg.text.trim().split(/\s+/).length, 0);
  // The prompt targets 150–200 words, but concise human stories should not be
  // rejected merely for landing outside that editorial target. This wider hard
  // boundary still protects TTS spend and excessive run time.
  check(words >= 70 && words <= 260, `script is ${words} words; safe range is 70–260`);

  // Sound pacing is production metadata the app owns, not content the
  // director invented — models frequently nail the script and cast but skip
  // the mandatory opening beat or land outside the sound-transition count.
  // Repair the pacing in place rather than discard an otherwise good script.
  repairPacing(plan.segments);

  const soundTransitions = plan.segments.filter((segment) => segment.transition.mode === "sound");
  const first = plan.segments[0]?.transition;
  check(first?.mode === "sound", `segment 0 transition.mode is "${first?.mode}", expected "sound"`);
  check(
    !first || (first.duration_seconds >= 4 && first.duration_seconds <= 5),
    `segment 0 transition.duration_seconds is ${first?.duration_seconds}, need 4–5`
  );
  check(soundTransitions.length >= 5 && soundTransitions.length <= 7, `${soundTransitions.length} sound transitions total, need 5–7`);
  plan.segments.forEach((segment, i) => {
    const t = segment.transition;
    // gain is the sound-effect mix level — only meaningful when there's a
    // sound effect to mix; "direct" and "silence" transitions have none
    if (t.mode === "direct") {
      check(
        t.duration_seconds === 0 && t.prompt === "" && t.gain === 0,
        `segment ${i}: "direct" transition must have duration 0, empty prompt, and gain 0`
      );
    } else if (t.mode === "silence") {
      check(
        t.duration_seconds >= 1 && t.duration_seconds <= 3 && t.prompt === "" && t.gain === 0,
        `segment ${i}: "silence" transition must be 1–3s with empty prompt and gain 0`
      );
    } else {
      check(t.gain >= 0.15 && t.gain <= 0.7, `segment ${i}: "sound" transition.gain ${t.gain} out of range 0.15–0.7`);
      check(
        t.duration_seconds >= 3 && t.duration_seconds <= 5 && t.prompt.length >= 3 && t.prompt.length <= 450,
        `segment ${i}: "sound" transition must be 3–5s with a 3–450 char prompt`
      );
    }
  });

  if (problems.length) {
    throw new Error(`the director's edit plan failed review: ${problems.join("; ")} — raw: ${text.slice(0, 700)}`);
  }
  return plan;
}

/* ————— the picture desk ————— */

const IMAGE_STYLE =
  "High-contrast black-and-white documentary photograph, film grain, halftone newspaper texture, cinematic, no text or lettering anywhere in the image. ";

/** AI frame via Gemini image generation (inlineData) */
export async function generateFrame(scene: string, s: Settings): Promise<Asset> {
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
export async function stockFrame(scene: string): Promise<Asset> {
  const image = await fetch(`/api/assets/frame?scene=${encodeURIComponent(scene)}`);
  if (!image.ok) throw new Error(`AssetPipe frame ${image.status}: ${await errBody(image)}`);
  return toAsset(image);
}

/* ————— the voice desk ————— */

export async function synthesize(text: string, voiceId: string, s: Settings): Promise<Asset> {
  void s;
  if (!isHouseVoiceId(voiceId)) throw new Error("Voice is not in the One More Year house cast");
  return cachedAudio({ kind: "tts-v1", text, voiceId, model: "eleven_v3" }, () => fetch("/api/elevenlabs/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voiceId }) }));
}

/** The foley desk: ElevenLabs text-to-sound-effects (0.5–30s). */
export async function makeSfx(prompt: string, seconds: number, s: Settings): Promise<Asset> {
  void s;
  const safeSeconds = Math.min(5, Math.max(3, seconds));
  return cachedAudio({ kind: "sfx-v3-transition", prompt, seconds: safeSeconds, loop: false }, () => fetch("/api/elevenlabs/sfx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, seconds: safeSeconds }) }));
}

/** The score desk: ElevenLabs Music. */
export async function makeMusic(prompt: string, ms: number, mode: DocumentaryPlan["music_mode"], s: Settings): Promise<Asset> {
  void s;
  const milliseconds = Math.min(90000, Math.max(10000, Math.round(ms)));
  return cachedAudio({ kind: "music-v2", prompt, milliseconds, mode }, () => fetch("/api/elevenlabs/music", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, milliseconds, mode }) }));
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

/* ————— the casting desk: the curated ElevenLabs house cast ————— */

export const VOICE_POOL: { id: string; label: string }[] = HOUSE_VOICES.map((voice) => ({
  id: voice.id,
  label: `${voice.label} — ${voice.note}`,
}));

/** narrator gets the configured voice; everyone else draws from the pool */
export function castVoices(cast: CastMember[], narratorVoiceId: string): Record<string, string> {
  const narrator = isHouseVoiceId(narratorVoiceId) ? narratorVoiceId : DEFAULT_NARRATOR_ID;
  const pool = VOICE_POOL.filter((v) => v.id !== narrator);
  const out: Record<string, string> = {};
  let i = 0;
  for (const member of cast) {
    out[member.id] = member.id === "narrator" ? narrator : pool[i++ % pool.length].id;
  }
  return out;
}
