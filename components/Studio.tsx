"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MomentArt from "./MomentArt";
import Theater from "./Theater";

type Phase = "interview" | "agent" | "proof";

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

/** the agent run, step by step — the real pipeline this prototype mocks */
const STEPS = [
  {
    call: "POST /interactions · model: gemini-3-pro",
    out: "reading your 4 fragments — the dates, the doubt, the things said sideways…",
  },
  {
    call: "structured output · response_schema: story_arc.json",
    out: `{ "chapters": 6, "turn": "the year it almost ended", "ending": "hope" }`,
  },
  {
    call: "managed agent · shot list → gemini-3-pro-image-preview",
    out: "6 frames queued · black & white · halftone · one visual world",
  },
  {
    call: "voice casting → eleven_v3 (alpha)",
    out: "narrator chosen: low, worn, warm — a voice like rain on a tin roof",
  },
  {
    call: "text_to_dialogue · audio tags",
    out: "[quiet] [rain] [crowd swells] [long pause] [almost a whisper]",
  },
  {
    call: "silence map",
    out: "deciding where the silence goes…",
  },
  {
    call: "render",
    out: "stitching picture, narration, score. cutting the ending. keeping the hope.",
  },
];

const STEP_MS = 1400;

export default function Studio({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("interview");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState(0);
  const [theater, setTheater] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // esc closes (theater handles its own esc first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !theater) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, theater]);

  // agent steps advance on a clock
  useEffect(() => {
    if (phase !== "agent") return;
    if (step >= STEPS.length) {
      const id = setTimeout(() => setPhase("proof"), 900);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [phase, step]);

  const submit = useCallback(
    (skip = false) => {
      const a = skip ? "" : draft.trim();
      setAnswers((prev) => [...prev, a]);
      setDraft("");
      if (qi + 1 < QUESTIONS.length) setQi(qi + 1);
      else {
        setPhase("agent");
        setStep(0);
      }
    },
    [draft, qi]
  );

  const fragments = useMemo(
    () =>
      answers.map((a, i) => ({
        label: `fragment 0${i + 1}`,
        text: a || "(skipped — the director will work around it)",
        real: !!a,
      })),
    [answers]
  );

  const headlineOf = (answers[0] || "the thing you love").toUpperCase();
  const proofLines = [
    answers[1] ? `It almost ended — ${answers[1]}.` : "It almost ended. It didn't.",
    answers[2] ? `You stayed. ${answers[2]}` : "You stayed, and you know why.",
  ];
  const proofEm = answers[3] || "the grass smell before kickoff. that's the whole reason.";

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-white text-black"
      role="dialog"
      aria-label="Start your story"
    >
      {/* studio masthead */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black bg-white px-5 py-3 md:px-10">
        <p className="display text-xl">
          <span className="outline-text">One</span> More <span className="bg-black px-1.5 text-white">Year</span>
          <span className="ml-4 text-base text-black/50">— the studio</span>
        </p>
        <button
          onClick={onClose}
          className="text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-black hover:text-white px-3 py-2"
        >
          ✕ leave the studio
        </button>
      </div>

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

            <h2 key={qi} className="display fade-up mt-12 text-5xl leading-[0.95] sm:text-7xl md:text-8xl">
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

      {/* ——— phase 2 · the agent at work ——— */}
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
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/50">{f.label}</p>
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
                      <span className={i < step ? "text-white" : "animate-pulse"}>{i < step ? "✓" : "█"}</span>
                      <span className="text-white/60">{s.call}</span>
                    </p>
                    <p className="mt-1 pl-6 text-base text-white md:text-lg">{s.out}</p>
                  </div>
                ))}
                {step >= STEPS.length && (
                  <p className="fade-up mt-6 bg-white px-2 py-1 font-bold text-black">
                    ✓ first proof ready — sending it to press…
                  </p>
                )}
              </div>
              <p className="mt-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                simulation — the calls shown are the real pipeline (interactions api · structured
                output · gemini-3-pro-image-preview · eleven_v3 text_to_dialogue)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ——— phase 3 · the first proof ——— */}
      {phase === "proof" && (
        <div className="px-5 py-14 md:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
                your back page · first proof
              </p>
              <span className="stamp text-xs">simulation</span>
            </div>

            <h2 className="display mt-8 text-6xl leading-[0.9] sm:text-8xl">
              One more year
              <br />
              <span className="mt-[0.08em] inline-block bg-black px-3 pb-[0.05em] text-white">
                of {headlineOf}.
              </span>
            </h2>

            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <div className="border-4 border-black">
                <MomentArt id="onemore" className="block aspect-[4/3] w-full" />
                <p className="border-t-4 border-black px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                  frame 6/6 · gemini-3-pro-image-preview · or upload your own
                </p>
              </div>

              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black/50">
                  script proof · eleven_v3 audio tags
                </p>
                <div className="mt-4 space-y-4 font-mono text-base leading-relaxed">
                  <p>
                    <span className="text-black/40">[quiet]</span> {proofLines[0]}
                  </p>
                  <p>
                    <span className="text-black/40">[warmer]</span> {proofLines[1]}
                  </p>
                  <p className="bg-black px-2 py-1 font-bold text-white">
                    <span className="opacity-50">[almost a whisper]</span> “{proofEm}”
                  </p>
                  <p className="text-black/40">[long pause] [crowd, far away] [fin]</p>
                </div>

                <div className="mt-10 flex flex-wrap gap-4">
                  <button
                    onClick={() => setTheater(true)}
                    className="display bg-black px-6 py-3 text-2xl text-white transition-colors hover:bg-white hover:text-black hover:outline hover:outline-4 hover:outline-black"
                  >
                    ⛶ Watch the finished demo
                  </button>
                  <button
                    onClick={() => {
                      setPhase("interview");
                      setQi(0);
                      setAnswers([]);
                      setStep(0);
                    }}
                    className="display border-4 border-black px-6 py-3 text-2xl transition-colors hover:bg-black hover:text-white"
                  >
                    ↻ Start over
                  </button>
                </div>
                <p className="mt-6 max-w-md text-xs leading-relaxed text-black/60">
                  This proof is assembled from your words by a template. Connect a Gemini key and an
                  ElevenLabs key and the same screen returns the real thing: six frames, a voice,
                  a score, and the silences in the right places.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {theater && <Theater onClose={() => setTheater(false)} />}
    </div>
  );
}
