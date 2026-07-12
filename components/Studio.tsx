"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MomentArt from "./MomentArt";
import SettingsPanel from "./Settings";
import { loadSettings, hasDirector, type Settings } from "@/lib/settings";
import {
  directDocumentary,
  generateFrame,
  stockFrame,
  synthesize,
  makeSfx,
  makeMusic,
  audioDuration,
  castVoices,
  performanceScript,
  VOICE_POOL,
  type DocumentaryPlan,
  type Asset,
} from "@/lib/generate";
import { printDocumentary } from "@/lib/assemble";

type Phase = "gate" | "interview" | "agent" | "proof" | "print";
type VoiceState = "idle" | "loading" | "playing" | "error";
type DeskState = { s: "wait" | "run" | "done" | "skip" | "error"; note?: string };
type ElevenStatus = { ready: boolean; tier?: string; used?: number; limit?: number; remaining?: number; error?: string };

const QUESTIONS = [
  {
    q: "What's the thing you can't quit?",
    ph: "football. a person. a half-built dream.",
  },
  {
    q: "When did it almost end?",
    ph: "the injury. the move. the year nobody called.",
  },
  {
    q: "Why did you stay?",
    ph: "say it like you'd say it at 2 a.m.",
  },
  {
    q: "Give us one line only you would say.",
    ph: "the grass smell before kickoff. that's the whole reason.",
  },
];

/** the director's process, narrated while the real call runs */
const STEPS = [
  { call: "reading the fragments", out: "the dates, the doubt, the things said sideways…" },
  { call: "finding the arc", out: "the turn, the quiet year, the reason you stayed…" },
  { call: "casting the film", out: "a narrator, you, and the people who watched you not quit…" },
  { call: "writing the talking heads", out: "letting the voices disagree a little…" },
  { call: "scouting the frames", out: "one photograph per beat, black & white, no captions…" },
  { call: "voice direction · eleven_v3", out: "[quiet] [warmer] [steady] [almost a whisper]" },
  { call: "silence map", out: "deciding where the silence goes…" },
];

const STEP_MS = 1400;

const DESKS: { id: string; label: string }[] = [
  { id: "voices", label: "The voice desk — the cast records" },
  { id: "frames", label: "The picture desk — one frame per scene" },
  { id: "sfx", label: "The foley desk — room tone" },
  { id: "music", label: "The score desk — eleven music" },
  { id: "print", label: "The print desk — ffmpeg.wasm cut & mix" },
];
const DESKS_IDLE: Record<string, DeskState> = Object.fromEntries(
  DESKS.map((d) => [d.id, { s: "wait" } as DeskState])
);

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** rasterize the house-style SVG art into PNG bytes for the print desk */
async function svgToPngBytes(svgEl: SVGSVGElement, w = 1280, h = 960): Promise<Uint8Array> {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  });
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

async function mapLimit<T, R>(items: T[], limit: number, work: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await work(items[index], index);
    }
  }));
  return results;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** the kind of voice this is — a documentary lower-third, not a queue position */
function castKicker(speakerId: string): string {
  if (speakerId === "narrator") return "NARRATION";
  if (speakerId === "subject") return "IN THEIR OWN WORDS";
  return "AN INTERIOR VOICE";
}

/** the director's performance note for this line — a real, dynamic detail */
function performanceNote(segment: DocumentaryPlan["segments"][number]): string {
  const bare = segment.tag.replace(/[[\]]/g, "").trim();
  return bare ? bare.toUpperCase() : "SPOKEN";
}

/** Turn every raw photograph into a unique newspaper/documentary frame. */
async function documentaryCard(
  bytes: Uint8Array,
  segment: DocumentaryPlan["segments"][number],
  role: string,
  index: number,
  count: number,
  headline: string
) {
  const blob = new Blob([bytes.slice()], { type: "image/jpeg" });
  const url = URL.createObjectURL(blob); const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("frame decode failed")); image.src = url; });
  const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, 1280, 720);
  const photoW = 790; const scale = Math.max(photoW / image.width, 720 / image.height);
  const dw = image.width * scale, dh = image.height * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, photoW, 720); ctx.clip(); ctx.filter = "grayscale(1) contrast(1.16)"; ctx.drawImage(image, (photoW - dw) / 2, (720 - dh) / 2, dw, dh); ctx.restore();
  const gradient = ctx.createLinearGradient(430, 0, 800, 0); gradient.addColorStop(0, "rgba(5,5,5,0)"); gradient.addColorStop(1, "#050505"); ctx.fillStyle = gradient; ctx.fillRect(430, 0, 370, 720);
  ctx.fillStyle = "#f4f1e8"; ctx.fillRect(790, 0, 490, 720);
  ctx.fillStyle = "#050505"; ctx.font = "700 24px Georgia, serif"; ctx.fillText(role.toUpperCase(), 835, 60);
  ctx.font = "italic 14px Georgia, serif"; ctx.fillText(castKicker(segment.speaker), 835, 82);
  ctx.fillRect(835, 96, 390, 4);
  ctx.font = "700 13px monospace"; ctx.fillText(`${headline.toUpperCase()} · PART ${index + 1} OF ${count}`, 835, 128);
  ctx.font = "700 36px Georgia, serif"; const lines = wrap(ctx, segment.text, 380).slice(0, 8); lines.forEach((line, i) => ctx.fillText(line, 835, 205 + i * 48));
  ctx.fillStyle = "#050505"; ctx.fillRect(835, 622, 142, 38); ctx.fillStyle = "#fff"; ctx.font = "700 12px monospace"; ctx.fillText(performanceNote(segment), 854, 646);
  ctx.strokeStyle = "#050505"; ctx.lineWidth = 2; ctx.strokeRect(992, 622, 188, 38); ctx.fillStyle = "#050505"; ctx.fillText(segment.em ? "THE LAST WORD" : "ON THE RECORD", 1008, 646);
  URL.revokeObjectURL(url);
  const output = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("frame render failed")), "image/png"));
  return new Uint8Array(await output.arrayBuffer());
}

export default function Studio({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("gate");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [elevenStatus, setElevenStatus] = useState<ElevenStatus>({ ready: false });
  const [plan, setPlan] = useState<DocumentaryPlan | null>(null);
  const [genState, setGenState] = useState<"pending" | "done" | "error">("pending");
  const [genError, setGenError] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [desks, setDesks] = useState<Record<string, DeskState>>(DESKS_IDLE);
  const [film, setFilm] = useState<string | null>(null);
  const [ffLog, setFfLog] = useState("");
  const [uploads, setUploads] = useState<File[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const generatedFramesRef = useRef<Uint8Array[] | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSettings(loadSettings()), 0);
    return () => clearTimeout(id);
  }, [settingsOpen]);

  useEffect(() => {
    fetch("/api/elevenlabs/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((status: ElevenStatus) => setElevenStatus(status))
      .catch(() => setElevenStatus({ ready: false, error: "preflight unavailable" }));
  }, []);

  const ready = hasDirector(settings);
  const hasVoice = elevenStatus.ready;

  useEffect(() => {
    if (phase === "gate" && ready) {
      const id = setTimeout(() => setPhase("interview"), 0);
      return () => clearTimeout(id);
    }
  }, [phase, ready]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (audioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
    },
    []
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase === "interview") inputRef.current?.focus();
  }, [phase, qi]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !settingsOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, settingsOpen]);

  // agent steps advance on a clock; the proof waits for the director
  useEffect(() => {
    if (phase !== "agent") return;
    if (step >= STEPS.length) {
      if (genState !== "done") return;
      const id = setTimeout(() => setPhase("proof"), 900);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [phase, step, genState]);

  const startAgent = useCallback(
    (finalAnswers: string[]) => {
      if (!settings || !hasDirector(settings)) return;
      setPhase("agent");
      setStep(0);
      setPlan(null);
      generatedFramesRef.current = null;
      setGenError("");
      setGenState("pending");
      directDocumentary(finalAnswers, settings)
        .then((p) => {
          setPlan(p);
          setGenState("done");
        })
        .catch((e) => {
          setGenError(errMsg(e));
          setGenState("error");
        });
    },
    [settings]
  );

  const submit = useCallback(
    (skip = false) => {
      const a = skip ? "" : draft.trim();
      const next = [...answers, a];
      setAnswers(next);
      setDraft("");
      if (qi + 1 < QUESTIONS.length) setQi(qi + 1);
      else startAgent(next);
    },
    [draft, qi, answers, startAgent]
  );

  const voices = useMemo(
    () => (plan && settings ? castVoices(plan.cast, settings.elevenVoiceId) : {}),
    [plan, settings]
  );

  /** preview: the cold open, in the subject's cast voice */
  const preview = useCallback(async () => {
    if (!hasVoice || !settings || !plan) return;
    if (voice === "playing") {
      audioRef.current?.pause();
      setVoice("idle");
      return;
    }
    setVoice("loading");
    setVoiceError("");
    try {
      const seg = plan.segments[0];
      const asset = await synthesize(performanceScript(seg), voices[seg.speaker], settings);
      audioRef.current?.pause();
      const audio = new Audio(asset.url);
      audioRef.current = audio;
      audio.onended = () => setVoice("idle");
      await audio.play();
      setVoice("playing");
    } catch (e) {
      setVoiceError(errMsg(e));
      setVoice("error");
    }
  }, [settings, plan, voices, voice, hasVoice]);

  /** the print run — every desk does its real job, then ffmpeg binds the edition */
  const produce = useCallback(async () => {
    if (!hasVoice || !settings || !plan) return;
    let artBytes: Uint8Array | null = null;
    const svg = frameRef.current?.querySelector("svg");
    if (svg) artBytes = await svgToPngBytes(svg as unknown as SVGSVGElement).catch(() => null);

    setPhase("print");
    setFilm(null);
    setFfLog("");
    setDesks({ ...DESKS_IDLE });
    const upd = (k: string, v: DeskState) => setDesks((p) => ({ ...p, [k]: v }));

    try {
      const segs = plan.segments;

      // Voice and picture desks run together. Voice concurrency is capped at
      // five to keep the ensemble fast without an unbounded API burst.
      const voiceWork = mapLimit(segs, 2, async (segment, i) => {
        upd("voices", { s: "run", note: `recording ${Math.min(i + 1, segs.length)}/${segs.length} · safe Starter queue` });
        const asset = await synthesize(performanceScript(segment), voices[segment.speaker], settings);
        return { bytes: asset.bytes, duration: await audioDuration(asset.url).catch(() => 6) };
      }).catch((error) => { throw new Error(`VOICE_DESK:${errMsg(error)}`); });

      const uploadBytes: Uint8Array[] = await Promise.all(
        uploads.map(async (f) => new Uint8Array(await f.arrayBuffer()))
      );
      let framesNote: string = settings.imageSource;
      const frameWork = generatedFramesRef.current?.length === segs.length
        ? Promise.resolve(generatedFramesRef.current.map((frame) => frame.slice()))
        : mapLimit(segs, 4, async (segment, i) => {
        upd("frames", { s: "run", note: `scene ${i + 1}/${segs.length} · 4 in parallel · ${settings.imageSource}` });
        let bytes: Uint8Array | null = null;
        try {
          if (settings.imageSource === "ai") bytes = (await generateFrame(segment.scene, settings)).bytes;
          else if (settings.imageSource === "stock") bytes = (await stockFrame(segment.footage_query || segment.scene)).bytes;
          else if (settings.imageSource === "upload" && uploadBytes.length)
            bytes = uploadBytes[i % uploadBytes.length];
        } catch {
          if (settings.imageSource === "ai") {
            try {
              bytes = (await stockFrame(segment.footage_query || segment.scene)).bytes;
              framesNote = "AI with AssetPipe fallback";
            } catch {
              framesNote = "AI/AssetPipe unavailable, some fell back to house art";
            }
          } else framesNote = `${settings.imageSource}, some fell back to house art`;
        }
        const raw = (bytes ?? artBytes ?? new Uint8Array()).slice();
        if (!raw.length) return raw;
        const role = plan.cast.find((member) => member.id === segment.speaker)?.role ?? segment.speaker;
        return documentaryCard(raw, segment, role, i, segs.length, plan.headline);
      });

      const [audios, frames] = await Promise.all([voiceWork, frameWork]);
      const leadIns = segs.map((segment) => segment.transition.duration_seconds);
      const total = audios.reduce((sum, audio, i) => sum + leadIns[i] + audio.duration, 0);
      upd("voices", { s: "done", note: `${plan.cast.length} voices · ${segs.length} performances · ${total.toFixed(0)}s with breath` });
      if (frames.some((f) => f.length === 0)) throw new Error("no frames available");
      generatedFramesRef.current = frames.map((frame) => frame.slice());
      upd("frames", { s: "done", note: `${frames.length} editorial frames · ${framesNote}` });

      // Foley regions and score run together after the spoken duration is known.
      const soundScenes = segs.map((segment, index) => ({ segment, index })).filter(({ segment }) => segment.transition.mode === "sound");
      upd("sfx", { s: "run", note: `${soundScenes.length} director-selected sound beats` }); upd("music", { s: "run" });
      // Music occupies one paid-provider slot, so Foley uses one serial slot;
      // together they remain below Starter's concurrency limit of three.
      const sfxWork = mapLimit(soundScenes, 1, async ({ segment, index }) => {
        try {
          const transition = segment.transition;
          const asset = await makeSfx(transition.prompt, transition.duration_seconds, settings);
          const start = audios.slice(0, index).reduce((sum, audio, i) => sum + leadIns[i] + audio.duration, 0);
          return { audio: asset.bytes, start, gain: transition.gain, duration: transition.duration_seconds };
        } catch { return null; }
      }).then((items) => items.filter((item): item is NonNullable<typeof item> => !!item));
      // every film gets a score — coerce a "none" call from the director
      // rather than trust it, since a missing score reads as broken, not restrained
      const musicMode = plan.music_mode === "none" ? "instrumental" : plan.music_mode;
      const musicPrompt =
        plan.music_prompt ||
        `a restrained instrumental score for a short documentary about ${plan.headline}, sparse, cinematic, minor key, no vocals`;
      const musicWork: Promise<Asset | null> = makeMusic(
        musicPrompt,
        (total + 2) * 1000,
        musicMode,
        settings
      ).catch(() => null);
      const [sfx, music] = await Promise.all([sfxWork, musicWork]);
      upd("sfx", sfx.length ? { s: "done", note: `${sfx.length} sound-first scene transitions` } : { s: "skip", note: "sound generation unavailable" });
      upd("music", music ? { s: "done", note: `${musicMode} · ${plan.music_rationale}` } : { s: "skip", note: "the score desk didn't answer" });

      // 5 · print
      upd("print", { s: "run" });
      const url = await printDocumentary({
        segments: segs.map((_, i) => ({
          audio: audios[i].bytes,
          frame: frames[i],
          duration: audios[i].duration,
          leadIn: leadIns[i],
        })),
        music: music ? { audio: music.bytes, start: plan.music_entry_seconds, gain: 0.22 } : null,
        sfx,
        onLog: (l) => setFfLog(l),
      });
      upd("print", { s: "done" });
      setFilm(url);
    } catch (e) {
      const message = errMsg(e);
      if (message.startsWith("VOICE_DESK:")) upd("voices", { s: "error", note: message.slice(11) });
      else upd("print", { s: "error", note: message });
    }
  }, [settings, plan, voices, uploads, hasVoice]);

  const fragments = useMemo(
    () =>
      answers.map((a, i) => ({
        label: `fragment 0${i + 1}`,
        text: a || "(skipped — the director will work around it)",
        real: !!a,
      })),
    [answers]
  );

  const voiceLabel = (id: string) => VOICE_POOL.find((v) => v.id === id)?.label ?? id.slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-white text-black"
      role="dialog"
      aria-label="Start your story"
    >
      {/* studio masthead */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black bg-white px-5 py-3 md:px-10">
        <p className="display text-xl">
          <span className="outline-text">One</span> More{" "}
          <span className="bg-black px-1.5 text-white">Year</span>
          <span className="ml-4 text-base text-black/50">— the studio</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-black hover:text-white"
          >
            ⚙ press room{ready ? " · connected" : ""}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-black hover:text-white"
          >
            ✕ leave the studio
          </button>
        </div>
      </div>

      {/* ——— phase 0 · the gate ——— */}
      {phase === "gate" && (
        <div className="flex min-h-[calc(100svh-64px)] flex-col justify-center px-5 py-16 md:px-10">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
              before we begin
            </p>
            <h2 className="display mt-6 text-5xl leading-[0.95] sm:text-7xl md:text-8xl">
              This studio runs
              <br />
              <span className="mt-[0.08em] inline-block bg-black px-3 pb-[0.05em] text-white">
                on real ink.
              </span>
            </h2>
            <p className="mt-8 max-w-lg text-sm leading-relaxed md:text-base">
              Your documentary is written live, voiced by a real cast, and printed to film — nothing
              canned. Connect the director in this browser; the paid ElevenLabs key stays in the
              server environment and is checked before a single credit is spent.
            </p>

            <div className="mt-10 max-w-lg space-y-3 font-mono text-sm">
              <p className="flex items-center justify-between border-2 border-black px-4 py-3">
                <span>Gemini key — the director</span>
                <span className={ready ? "" : "bg-black px-2 py-0.5 text-white"}>
                  {ready ? "✓ connected" : "required"}
                </span>
              </p>
              <p className="flex items-center justify-between border-2 border-black/40 px-4 py-3">
                <span>ElevenLabs key — the cast, tone &amp; score</span>
                <span className={hasVoice ? "" : "text-black/50"}>
                  {hasVoice ? `✓ ${elevenStatus.tier ?? "connected"} · ${elevenStatus.remaining ?? "?"} credits left` : "set ELEVENLABS_API_KEY"}
                </span>
              </p>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="display mt-10 bg-black px-10 py-4 text-3xl text-white transition-colors hover:bg-white hover:text-black hover:outline hover:outline-4 hover:outline-black"
            >
              ⚙ Open the press room
            </button>
            <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-black/50">
              keys: aistudio.google.com · elevenlabs.io
            </p>
          </div>
        </div>
      )}

      {/* ——— phase 1 · the interview ——— */}
      {phase === "interview" && (
        <div className="flex min-h-[calc(100svh-64px)] flex-col justify-center px-5 py-16 md:px-10">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
              the interview · question {qi + 1} of {QUESTIONS.length}
            </p>
            <div className="mt-2 h-1 w-full bg-black/10">
              <div
                className="h-full bg-black transition-[width] duration-500"
                style={{ width: `${(qi / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <h2
              key={qi}
              className="display fade-up mt-12 text-5xl leading-[0.95] sm:text-7xl md:text-8xl"
            >
              {QUESTIONS[qi].q}
            </h2>

            <div className="mt-12">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={QUESTIONS[qi].ph}
                className="hand w-full border-b-4 border-black/30 bg-transparent pb-2 text-4xl outline-none transition-colors placeholder:text-black/25 focus:border-black md:text-5xl"
                aria-label={QUESTIONS[qi].q}
              />
              <div className="mt-8 flex items-center gap-6">
                <button
                  onClick={() => submit()}
                  className="display bg-black px-8 py-3 text-2xl text-white transition-colors hover:bg-white hover:text-black hover:outline hover:outline-4 hover:outline-black"
                >
                  {qi + 1 < QUESTIONS.length ? "Next →" : "Send to the director →"}
                </button>
                <button
                  onClick={() => submit(true)}
                  className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-black/50 hover:text-black"
                >
                  skip this one
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——— phase 2 · the director at work ——— */}
      {phase === "agent" && (
        <div className="min-h-[calc(100svh-64px)] bg-black px-5 py-14 text-white md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
              job nº 0714 · the dark room
            </p>
            <h2 className="display slam-wrap mt-3 text-4xl sm:text-6xl">
              <span className="slam is-in">The director is working.</span>
            </h2>
          </div>

          <div className="mx-auto mt-10 grid w-full max-w-6xl gap-14 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
                source fragments
              </p>
              <div className="mt-6 space-y-8">
                {fragments.map((f, i) => (
                  <figure
                    key={f.label}
                    className="scrap p-5 pt-7"
                    style={{ transform: `rotate(${((i * 41) % 5) - 2}deg)` }}
                  >
                    <span className="tape" aria-hidden />
                    <figcaption className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-black/50">
                      {f.label}
                    </figcaption>
                    <blockquote
                      className={`hand mt-2 text-2xl leading-tight ${f.real ? "" : "text-black/35"}`}
                    >
                      “{f.text}”
                    </blockquote>
                  </figure>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
                the wire copy — live
              </p>
              <div
                className="scrap relative mt-6 p-6 pt-9 md:p-9 md:pt-11"
                style={{ transform: "rotate(0.6deg)", filter: "drop-shadow(10px 16px 22px rgba(0,0,0,0.55))" }}
              >
                <span className="tape" aria-hidden />
                <div className="flex items-center justify-between">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-black/50">
                    draft — do not print
                  </p>
                  {genState === "pending" && (
                    <span className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-black/50">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-black" aria-hidden />
                      writing
                    </span>
                  )}
                </div>

                {/* progress sprockets */}
                <div className="mt-4 flex gap-1.5" aria-hidden>
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 transition-colors duration-500 ${i <= step ? "bg-black" : "bg-black/15"}`}
                    />
                  ))}
                </div>

                <div className="mt-7 space-y-4">
                  {STEPS.slice(0, Math.min(step + 1, STEPS.length)).map((s, i) => (
                    <p
                      key={i}
                      className={`fade-up text-lg leading-snug md:text-xl ${
                        i === step && genState !== "done"
                          ? "bg-black px-2 py-1 font-bold text-white"
                          : "text-black/55 line-through decoration-black/30"
                      }`}
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {s.out}
                    </p>
                  ))}
                </div>

                {step >= STEPS.length && genState === "pending" && (
                  <p className="hand fade-up mt-6 text-2xl text-black/60">still writing<span className="caret" /></p>
                )}
                {step >= STEPS.length && genState === "done" && (
                  <span className="stamp fade-up mt-6 inline-block text-sm">approved — to press</span>
                )}
                {step >= STEPS.length && genState === "error" && (
                  <div className="fade-up mt-6">
                    <span className="stamp mb-3 inline-block text-sm">rejected — see notes</span>
                    <p className="text-sm leading-relaxed text-black/70">
                      the director didn&rsquo;t answer — {genError}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => startAgent(answers)}
                        className="display border-2 border-black px-5 py-2 text-xl transition-colors hover:bg-black hover:text-white"
                      >
                        ↻ Try again
                      </button>
                      <button
                        onClick={() => setSettingsOpen(true)}
                        className="display border-2 border-black/40 px-5 py-2 text-xl text-black/70 transition-colors hover:border-black hover:bg-black hover:text-white"
                      >
                        ⚙ Check the press room
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                live — your documentary is being written by your ai director right now
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ——— phase 3 · the first proof ——— */}
      {phase === "proof" && plan && (
        <div className="px-5 py-14 md:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
                your documentary · first proof
              </p>
              <span className="stamp text-xs">an original film · not reused</span>
            </div>

            <h2 className="display mt-8 text-6xl leading-[0.9] sm:text-8xl">
              One more year
              <br />
              <span className="mt-[0.08em] inline-block bg-black px-3 pb-[0.05em] text-white">
                of {plan.headline.toUpperCase()}.
              </span>
            </h2>
            <p className="mt-6 max-w-xl text-sm italic leading-relaxed text-black/70">
              {plan.logline}
            </p>

            {/* the cast */}
            <div className="mt-10 border-4 border-black">
              <p className="border-b-4 border-black px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                starring
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                {plan.cast.map((c, i) => (
                  <div
                    key={c.id}
                    className={`px-4 py-3 ${i > 0 ? "border-t-2 border-black sm:border-t-0 sm:border-l-2" : ""}`}
                  >
                    <p className="display text-xl">{c.role}</p>
                    <p className="hand mt-1 text-lg text-black/70">{voiceLabel(voices[c.id]).split(" — ")[0]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 grid gap-10 md:grid-cols-[1fr_1.4fr]">
              <div>
                <div ref={frameRef} className="border-4 border-black">
                  <MomentArt id="onemore" className="block aspect-[4/3] w-full" />
                  <p className="border-t-4 border-black px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                    {settings?.imageSource === "ai" && "frames · drawn per scene at print time"}
                    {settings?.imageSource === "stock" && "frames · free stock photos per scene"}
                    {settings?.imageSource === "upload" && "frames · your photographs"}
                    {settings?.imageSource === "art" && "frames · house style"}
                  </p>
                </div>

                {settings?.imageSource === "upload" && (
                  <div className="mt-4 border-2 border-black p-4">
                    <label
                      htmlFor="upload-input"
                      className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
                    >
                      your photographs ({uploads.length} chosen)
                    </label>
                    <input
                      id="upload-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setUploads([...(e.target.files ?? [])])}
                      className="mt-2 block w-full font-mono text-xs"
                    />
                    <p className="mt-2 text-[0.7rem] text-black/50">
                      they&rsquo;ll be cut across the {plan.segments.length} scenes in order
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
                  the script · {plan.segments.length} talking heads
                </p>
                <div className="mt-4 space-y-4 font-mono text-sm leading-relaxed">
                  {plan.segments.map((seg, i) => {
                    const member = plan.cast.find((c) => c.id === seg.speaker);
                    return (
                      <div key={i} className={seg.em ? "bg-black px-3 py-2 text-white" : ""}>
                        <p className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] ${seg.em ? "text-white/60" : "text-black/50"}`}>
                          {member?.role ?? seg.speaker} <span className="normal-case">{seg.tag}</span>
                        </p>
                        <p className={seg.em ? "font-bold" : ""}>{seg.text}</p>
                      </div>
                    );
                  })}
                  <p className="text-black/40">[long pause] [fin]</p>
                </div>

                <div className="mt-10 flex flex-wrap gap-4">
                  {hasVoice && (
                    <button
                      onClick={produce}
                      className="display bg-black px-6 py-3 text-2xl text-white transition-colors hover:bg-white hover:text-black hover:outline hover:outline-4 hover:outline-black"
                    >
                      🖨 Print the film
                    </button>
                  )}
                  {hasVoice ? (
                    <button
                      onClick={preview}
                      disabled={voice === "loading"}
                      className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white disabled:opacity-60"
                    >
                      {voice === "loading"
                        ? "… casting"
                        : voice === "playing"
                          ? "❚❚ Stop"
                          : "▶ Hear the cold open"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white"
                    >
                      ⚙ Add the cast — ElevenLabs
                    </button>
                  )}
                  <button
                    onClick={() => {
                      audioRef.current?.pause();
                      setVoice("idle");
                      setPhase("interview");
                      setQi(0);
                      setAnswers([]);
                      setStep(0);
                      setPlan(null);
                      generatedFramesRef.current = null;
                      setGenState("pending");
                    }}
                    className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white"
                  >
                    ↻ Start over
                  </button>
                </div>
                {voice === "error" && (
                  <p className="mt-4 border-2 border-black px-3 py-2 font-mono text-xs">
                    the voice desk didn&rsquo;t answer ({voiceError}) — check the server-side ElevenLabs
                    key, its permissions, and available credits.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——— phase 4 · the print run ——— */}
      {phase === "print" && plan && (
        <div className="min-h-[calc(100svh-64px)] bg-black px-5 py-14 text-white md:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
              the print run · one more year of {plan.headline}
            </p>

            {!film ? (
              <>
                <h2 className="display slam-wrap mt-6 text-5xl sm:text-7xl">
                  <span className="slam is-in">Five desks, one edition.</span>
                </h2>
                <div className="mt-10 border-2 border-white/40 p-5 font-mono text-sm leading-relaxed md:p-7">
                  {DESKS.map((d) => {
                    const st = desks[d.id];
                    return (
                      <p key={d.id} className="mt-3 flex items-baseline gap-3 first:mt-0">
                        <span className={st.s === "run" ? "animate-pulse" : ""}>
                          {st.s === "wait" && "·"}
                          {st.s === "run" && "█"}
                          {st.s === "done" && "✓"}
                          {st.s === "skip" && "—"}
                          {st.s === "error" && "!"}
                        </span>
                        <span className={st.s === "wait" ? "text-white/40" : "text-white"}>
                          {d.label}
                          {st.note && <span className="text-white/50"> · {st.note}</span>}
                        </span>
                      </p>
                    );
                  })}
                  {desks.print.s === "run" && ffLog && (
                    <p className="mt-5 truncate text-[0.7rem] text-white/40">{ffLog}</p>
                  )}
                  {Object.values(desks).some((desk) => desk.s === "error") && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={produce}
                        className="display border-2 border-white px-5 py-2 text-xl transition-colors hover:bg-white hover:text-black"
                      >
                        ↻ Run the presses again
                      </button>
                      <button
                        onClick={() => setPhase("proof")}
                        className="display border-2 border-white/50 px-5 py-2 text-xl text-white/70 transition-colors hover:border-white hover:bg-white hover:text-black"
                      >
                        ← Back to the proof
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                  everything runs in your browser — cast &amp; score from elevenlabs, frames from{" "}
                  {settings?.imageSource === "ai"
                    ? "the image model"
                    : settings?.imageSource === "stock"
                      ? "assetpipe stock"
                      : settings?.imageSource === "upload"
                        ? "your photographs"
                        : "the house art"}
                  , the cut and mp4 from ffmpeg.wasm
                </p>
              </>
            ) : (
              <>
                <h2 className="display slam-wrap mt-6 text-5xl sm:text-7xl">
                  <span className="slam is-in">Hot off the press.</span>
                </h2>
                <div className="mt-10 border-4 border-white">
                    <video src={film} controls autoPlay className="block w-full" />
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href={film}
                    download={`one-more-year-of-${plan.headline.replace(/\s+/g, "-")}.mp4`}
                    className="display bg-white px-6 py-3 text-2xl text-black transition-colors hover:bg-black hover:text-white hover:outline hover:outline-4 hover:outline-white"
                  >
                    ↓ Keep your film
                  </a>
                  <button
                    onClick={() => setPhase("proof")}
                    className="display border-4 border-white px-6 py-3 text-2xl transition-colors hover:bg-white hover:text-black"
                  >
                    ← Back to the proof
                  </button>
                  <button
                    onClick={produce}
                    className="display border-4 border-white/50 px-6 py-3 text-2xl text-white/70 transition-colors hover:border-white hover:bg-white hover:text-black"
                  >
                    ↻ Reprint
                  </button>
                </div>
                <p className="mt-6 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                  {plan.cast.length} voices · {plan.segments.length} scenes · cut, mixed and printed
                  by ffmpeg.wasm in your browser
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
