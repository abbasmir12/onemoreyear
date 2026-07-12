"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MomentArt from "./MomentArt";
import Theater from "./Theater";
import SettingsPanel from "./Settings";
import { loadSettings, type Settings } from "@/lib/settings";
import {
  generateStory,
  generateImage,
  synthesize,
  makeSfx,
  makeMusic,
  audioDuration,
  type GeneratedStory,
  type Asset,
} from "@/lib/generate";
import { printFilm } from "@/lib/assemble";

type Phase = "gate" | "interview" | "agent" | "proof" | "print";
type VoiceState = "idle" | "loading" | "playing" | "error";
type DeskState = { s: "wait" | "run" | "done" | "skip" | "error"; note?: string };

const DESKS: { id: string; label: string }[] = [
  { id: "narration", label: "The voice desk — eleven_v3 narration" },
  { id: "frame", label: "The picture desk — the film frame" },
  { id: "sfx", label: "The foley desk — sound-generation room tone" },
  { id: "music", label: "The score desk — eleven music" },
  { id: "print", label: "The print desk — ffmpeg.wasm mix & mp4" },
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

/** the agent run, step by step */
const STEPS = [
  {
    call: "POST generateContent",
    out: "reading your 4 fragments — the dates, the doubt, the things said sideways…",
  },
  {
    call: "structured output · response_schema: story_arc.json",
    out: "finding the arc you couldn't see from inside it…",
  },
  {
    call: "casting the headline",
    out: "naming the thing you love, in four words or fewer…",
  },
  {
    call: "voice direction · eleven_v3 audio tags",
    out: "[quiet] [warmer] [steady] [almost a whisper] [long pause]",
  },
  {
    call: "silence map",
    out: "deciding where the silence goes…",
  },
];

const STEP_MS = 1400;

export default function Studio({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("gate");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState(0);
  const [theater, setTheater] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [genState, setGenState] = useState<"pending" | "done" | "error">("pending");
  const [genError, setGenError] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [desks, setDesks] = useState<Record<string, DeskState>>(DESKS_IDLE);
  const [film, setFilm] = useState<string | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [ffLog, setFfLog] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, [settingsOpen]);

  const ready = !!settings?.geminiKey;
  const hasVoice = !!settings?.elevenKey;

  // the studio opens on the gate until the director is connected
  useEffect(() => {
    if (phase === "gate" && ready) setPhase("interview");
  }, [phase, ready]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (audioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
    },
    []
  );

  // lock page scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase === "interview") inputRef.current?.focus();
  }, [phase, qi]);

  // esc closes (theater and settings handle their own esc first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !theater && !settingsOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, theater, settingsOpen]);

  // agent steps advance on a clock; the proof waits for the director
  useEffect(() => {
    if (phase !== "agent") return;
    if (step >= STEPS.length) {
      if (genState !== "done") return; // pending: hold · error: shown in console
      const id = setTimeout(() => setPhase("proof"), 900);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [phase, step, genState]);

  const startAgent = useCallback(
    (finalAnswers: string[]) => {
      if (!settings?.geminiKey) return;
      setPhase("agent");
      setStep(0);
      setStory(null);
      setGenError("");
      setGenState("pending");
      generateStory(finalAnswers, settings)
        .then((s) => {
          setStory(s);
          setGenState("done");
        })
        .catch((e) => {
          setGenError(e instanceof Error ? e.message : String(e));
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

  const hear = useCallback(async () => {
    if (!settings?.elevenKey || !story) return;
    if (voice === "playing") {
      audioRef.current?.pause();
      setVoice("idle");
      return;
    }
    setVoice("loading");
    setVoiceError("");
    try {
      const asset = await synthesize(
        story.lines.map((l) => `${l.tag} ${l.text}`).join("\n"),
        settings
      );
      audioRef.current?.pause();
      const audio = new Audio(asset.url);
      audioRef.current = audio;
      audio.onended = () => setVoice("idle");
      await audio.play();
      setVoice("playing");
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : String(e));
      setVoice("error");
    }
  }, [settings, story, voice]);

  /** the print run — every desk does its real job, then ffmpeg binds the edition */
  const produce = useCallback(async () => {
    if (!settings?.elevenKey || !story) return;
    // rasterize the house art now, while the proof's SVG is still mounted
    let artBytes: Uint8Array | null = null;
    const svg = frameRef.current?.querySelector("svg");
    if (svg) artBytes = await svgToPngBytes(svg as unknown as SVGSVGElement).catch(() => null);

    setPhase("print");
    setFilm(null);
    setFrameUrl(null);
    setFfLog("");
    setDesks({ ...DESKS_IDLE });
    const upd = (k: string, v: DeskState) => setDesks((p) => ({ ...p, [k]: v }));

    try {
      // 1 · narration first — its length times everything else
      upd("narration", { s: "run" });
      const narration = await synthesize(
        story.lines.map((l) => `${l.tag} ${l.text}`).join("\n"),
        settings
      );
      const dur = await audioDuration(narration.url).catch(() => 30);
      upd("narration", { s: "done", note: `${dur.toFixed(1)}s · ${settings.elevenModel}` });

      // 2 · the frame — Gemini draws it, or the house art steps in
      upd("frame", { s: "run" });
      let frameBytes = artBytes;
      if (settings.imageSource === "ai" && story.image_prompt) {
        try {
          const img = await generateImage(story.image_prompt, settings);
          frameBytes = img.bytes;
          setFrameUrl(img.url);
          upd("frame", { s: "done", note: settings.geminiImageModel });
        } catch (e) {
          upd("frame", { s: "error", note: `${errMsg(e)} — using house art` });
        }
      } else {
        upd("frame", { s: "done", note: "house style" });
      }
      if (!frameBytes) throw new Error("no frame available");

      // 3 · room tone
      let sfx: Asset | null = null;
      upd("sfx", { s: "run" });
      if (story.sfx_prompt) {
        try {
          sfx = await makeSfx(story.sfx_prompt, Math.min(dur, 22), settings);
          upd("sfx", { s: "done" });
        } catch (e) {
          upd("sfx", { s: "skip", note: errMsg(e) });
        }
      } else upd("sfx", { s: "skip", note: "no prompt from the director" });

      // 4 · score
      let music: Asset | null = null;
      upd("music", { s: "run" });
      if (story.music_prompt) {
        try {
          music = await makeMusic(story.music_prompt, (dur + 2) * 1000, settings);
          upd("music", { s: "done" });
        } catch (e) {
          upd("music", { s: "skip", note: errMsg(e) });
        }
      } else upd("music", { s: "skip", note: "no prompt from the director" });

      // 5 · print
      upd("print", { s: "run" });
      const url = await printFilm({
        frame: frameBytes,
        narration: narration.bytes,
        music: music?.bytes ?? null,
        sfx: sfx?.bytes ?? null,
        onLog: (l) => setFfLog(l),
      });
      upd("print", { s: "done" });
      setFilm(url);
    } catch (e) {
      upd("print", { s: "error", note: errMsg(e) });
    }
  }, [settings, story]);

  const fragments = useMemo(
    () =>
      answers.map((a, i) => ({
        label: `fragment 0${i + 1}`,
        text: a || "(skipped — the director will work around it)",
        real: !!a,
      })),
    [answers]
  );

  const headlineOf = (story?.headline || "").toUpperCase();

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
              Your story is written live by Gemini and spoken by ElevenLabs — nothing canned.
              Connect your keys once and they stay in this browser&rsquo;s localStorage. They never
              touch a server.
            </p>

            <div className="mt-10 max-w-lg space-y-3 font-mono text-sm">
              <p className="flex items-center justify-between border-2 border-black px-4 py-3">
                <span>Gemini API key — writes your story</span>
                <span className={ready ? "" : "bg-black px-2 py-0.5 text-white"}>
                  {ready ? "✓ connected" : "required"}
                </span>
              </p>
              <p className="flex items-center justify-between border-2 border-black/40 px-4 py-3">
                <span>ElevenLabs API key — speaks it</span>
                <span className={hasVoice ? "" : "text-black/50"}>
                  {hasVoice ? "✓ connected" : "optional"}
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
              free keys: aistudio.google.com · elevenlabs.io
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
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
                job nº 0714 · source fragments
              </p>
              <div className="mt-6 space-y-4">
                {fragments.map((f) => (
                  <div key={f.label} className="border-2 border-white/40 p-4">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/50">
                      {f.label}
                    </p>
                    <p className={`hand mt-1 text-2xl leading-tight ${f.real ? "" : "text-white/40"}`}>
                      “{f.text}”
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
                gemini is directing — live
              </p>
              <div className="mt-6 border-2 border-white/40 p-5 font-mono text-sm leading-relaxed md:p-7">
                {STEPS.slice(0, Math.min(step + 1, STEPS.length)).map((s, i) => (
                  <div key={i} className={`fade-up ${i > 0 ? "mt-5" : ""}`}>
                    <p className="flex items-baseline gap-3">
                      <span className={i < step ? "text-white" : "animate-pulse"}>
                        {i < step ? "✓" : "█"}
                      </span>
                      <span className="text-white/60">{s.call}</span>
                    </p>
                    <p className="mt-1 pl-6 text-base text-white md:text-lg">{s.out}</p>
                  </div>
                ))}
                {step >= STEPS.length && genState === "pending" && (
                  <p className="fade-up mt-6 animate-pulse text-white/80">
                    █ gemini is writing — waiting for the director…
                  </p>
                )}
                {step >= STEPS.length && genState === "done" && (
                  <p className="fade-up mt-6 bg-white px-2 py-1 font-bold text-black">
                    ✓ first proof ready — sending it to press…
                  </p>
                )}
                {step >= STEPS.length && genState === "error" && (
                  <div className="fade-up mt-6">
                    <p className="border-2 border-white bg-white px-3 py-2 font-bold text-black">
                      the director didn&rsquo;t answer — {genError}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => startAgent(answers)}
                        className="display border-2 border-white px-5 py-2 text-xl transition-colors hover:bg-white hover:text-black"
                      >
                        ↻ Try again
                      </button>
                      <button
                        onClick={() => setSettingsOpen(true)}
                        className="display border-2 border-white/50 px-5 py-2 text-xl text-white/70 transition-colors hover:border-white hover:bg-white hover:text-black"
                      >
                        ⚙ Check the press room
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                live — your story is being written by {settings?.geminiModel} right now
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ——— phase 3 · the first proof ——— */}
      {phase === "proof" && story && (
        <div className="px-5 py-14 md:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
                your back page · first proof
              </p>
              <span className="stamp text-xs">live · written by {settings?.geminiModel}</span>
            </div>

            <h2 className="display mt-8 text-6xl leading-[0.9] sm:text-8xl">
              One more year
              <br />
              <span className="mt-[0.08em] inline-block bg-black px-3 pb-[0.05em] text-white">
                of {headlineOf}.
              </span>
            </h2>

            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <div ref={frameRef} className="border-4 border-black">
                <MomentArt id="onemore" className="block aspect-[4/3] w-full" />
                <p className="border-t-4 border-black px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                  {settings?.imageSource === "ai"
                    ? `frame · ${settings.geminiImageModel} draws it at print time`
                    : "frame · house style — switch to AI in the press room"}
                </p>
              </div>

              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
                  script proof · {settings?.elevenModel || "eleven_v3"} audio tags
                </p>
                <div className="mt-4 space-y-4 font-mono text-base leading-relaxed">
                  {story.lines.map((l, i) =>
                    l.em ? (
                      <p key={i} className="bg-black px-2 py-1 font-bold text-white">
                        <span className="opacity-50">{l.tag}</span> {l.text}
                      </p>
                    ) : (
                      <p key={i}>
                        <span className="text-black/40">{l.tag}</span> {l.text}
                      </p>
                    )
                  )}
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
                      onClick={hear}
                      disabled={voice === "loading"}
                      className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white disabled:opacity-60"
                    >
                      {voice === "loading"
                        ? "… casting the voice"
                        : voice === "playing"
                          ? "❚❚ Stop"
                          : "▶ Hear it"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white"
                    >
                      ⚙ Add a voice — ElevenLabs
                    </button>
                  )}
                  <button
                    onClick={() => setTheater(true)}
                    className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white"
                  >
                    ⛶ Watch the demo film
                  </button>
                  <button
                    onClick={() => {
                      audioRef.current?.pause();
                      setVoice("idle");
                      setPhase("interview");
                      setQi(0);
                      setAnswers([]);
                      setStep(0);
                      setStory(null);
                      setGenState("pending");
                    }}
                    className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white"
                  >
                    ↻ Start over
                  </button>
                </div>
                {voice === "error" && (
                  <p className="mt-4 border-2 border-black px-3 py-2 font-mono text-xs">
                    the voice desk didn&rsquo;t answer ({voiceError}) — check your ElevenLabs key or
                    try model eleven_multilingual_v2 in the press room (⚙).
                  </p>
                )}
                <p className="mt-6 max-w-md text-xs leading-relaxed text-black/60">
                  This script was written live by Gemini from your answers.
                  {hasVoice
                    ? " Press hear it and ElevenLabs speaks it, audio tags and all."
                    : " Add an ElevenLabs key in the press room to hear it read aloud."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——— phase 4 · the print run ——— */}
      {phase === "print" && story && (
        <div className="min-h-[calc(100svh-64px)] bg-black px-5 py-14 text-white md:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
              the print run · one more year of {story.headline}
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
                  {desks.print.s === "error" && (
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
                  everything runs in your browser — narration and score from elevenlabs, the frame
                  from gemini, the mix and mp4 from ffmpeg.wasm
                </p>
              </>
            ) : (
              <>
                <h2 className="display slam-wrap mt-6 text-5xl sm:text-7xl">
                  <span className="slam is-in">Hot off the press.</span>
                </h2>
                <div className="mt-10 border-4 border-white">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={film} controls autoPlay className="block w-full" />
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href={film}
                    download={`one-more-year-of-${story.headline.replace(/\s+/g, "-")}.mp4`}
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
                {frameUrl && (
                  <p className="mt-6 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                    frame drawn by {settings?.geminiImageModel} · narration &amp; score by
                    elevenlabs · printed by ffmpeg.wasm in your browser
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {theater && <Theater onClose={() => setTheater(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
