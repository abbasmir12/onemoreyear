"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chapters,
  chapterStart,
  totalDuration,
  STORY_SUBJECT,
  STORY_LOGLINE,
} from "@/lib/story";
import { AmbienceEngine } from "@/lib/ambience";
import Reveal from "./Reveal";

const CPS = 22; // teletype chars per second

function locate(time: number) {
  let acc = 0;
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    if (time < acc + c.duration || i === chapters.length - 1) {
      return { chapterIdx: i, local: Math.min(time - acc, c.duration) };
    }
    acc += c.duration;
  }
  return { chapterIdx: 0, local: 0 };
}

export default function Wire() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const engineRef = useRef<AmbienceEngine | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const charsRef = useRef(0);

  const { chapterIdx, local } = useMemo(() => locate(time), [time]);
  const chapter = chapters[chapterIdx];
  const ended = time >= totalDuration;

  // per-line typed characters, derived from the clock
  const typed = useMemo(
    () =>
      chapter.lines.map((l) =>
        Math.max(0, Math.min(l.text.length, Math.floor((local - l.at) * CPS)))
      ),
    [chapter, local]
  );
  const totalChars = typed.reduce((a, b) => a + b, 0);

  // key-click when new characters land
  useEffect(() => {
    if (!playing) return;
    if (totalChars > charsRef.current) engineRef.current?.tick();
    charsRef.current = totalChars;
  }, [totalChars, playing]);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setTime((t) => {
        const next = t + dt;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  useEffect(() => {
    if (playing) engineRef.current?.setScene(chapter.ambience);
  }, [chapter, playing]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const play = useCallback(async () => {
    setStarted(true);
    const from = time >= totalDuration ? 0 : time;
    if (time >= totalDuration) setTime(0);
    engineRef.current ??= new AmbienceEngine();
    await engineRef.current.play(chapters[locate(from).chapterIdx].ambience);
    setPlaying(true);
  }, [time]);

  const hold = useCallback(() => {
    setPlaying(false);
    engineRef.current?.pause();
  }, []);

  const jump = useCallback(async (idx: number) => {
    setStarted(true);
    setTime(chapterStart(idx));
    charsRef.current = 0;
    engineRef.current ??= new AmbienceEngine();
    await engineRef.current.play(chapters[idx].ambience);
    setPlaying(true);
  }, []);

  const progress = Math.min(time / totalDuration, 1);
  const activeLine = typed.findLastIndex((n) => n > 0);

  return (
    <section id="wire" className="cut-r relative bg-black pb-28 text-white">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">
            Step three — tonight&rsquo;s back page
          </p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">{STORY_SUBJECT}</span>
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/80">{STORY_LOGLINE}</p>
          <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/50">
            sound on — the room tone is synthesized live, standing in for the ElevenLabs score
          </p>
        </Reveal>

        {/* ——— the press ——— */}
        <Reveal delay={150}>
          <div className="mt-14 border-4 border-white">
            {/* dateline */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-white px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.2em]">
              <span>{chapter.edition} · {chapter.year}</span>
              <span className="hidden text-white/60 sm:block">{chapter.ambience.label}</span>
            </div>

            <div className="min-h-[60svh] px-5 py-10 md:px-12">
              {!started ? (
                <div className="flex min-h-[50svh] flex-col items-start justify-center">
                  <p className="hand text-3xl text-white/70">six editions · 1998 → 2026 · about two minutes</p>
                  <button
                    onClick={play}
                    className="display mt-6 border-4 border-white px-10 py-5 text-4xl transition-colors hover:bg-white hover:text-black sm:text-6xl"
                  >
                    ▶ Run the wire
                  </button>
                </div>
              ) : (
                <>
                  <h3
                    key={chapter.id}
                    className="display slam-wrap text-[15vw] leading-[0.9] sm:text-8xl md:text-9xl"
                  >
                    <span className="slam is-in">{chapter.headline}</span>
                  </h3>

                  <div className="mt-10 max-w-3xl space-y-5" aria-live="polite">
                    {chapter.lines.map((l, i) => {
                      const n = typed[i];
                      if (n === 0) return null;
                      const done = n >= l.text.length;
                      return (
                        <p
                          key={`${chapter.id}-${i}`}
                          className={`text-lg leading-relaxed md:text-2xl ${
                            l.em ? "bg-white px-2 font-bold text-black" : ""
                          } ${!done && i === activeLine && playing ? "caret" : ""}`}
                        >
                          {l.text.slice(0, n)}
                        </p>
                      );
                    })}
                    {ended && (
                      <div className="flex flex-wrap items-center gap-6 pt-6">
                        <button
                          onClick={play}
                          className="display border-4 border-white px-6 py-3 text-2xl transition-colors hover:bg-white hover:text-black"
                        >
                          ↻ Run it again
                        </button>
                        <span className="stamp text-xs">end of wire</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ——— controls: editions, not a scrub bar ——— */}
            <div className="border-t-4 border-white">
              <div className="h-2 w-full bg-white/20">
                <div
                  className="h-full bg-white transition-[width] duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap items-stretch">
                <button
                  onClick={playing ? hold : play}
                  className="display border-r-4 border-white px-6 py-4 text-2xl transition-colors hover:bg-white hover:text-black"
                  aria-label={playing ? "Hold the wire" : "Run the wire"}
                >
                  {playing ? "❚❚ Hold" : "▶ Run"}
                </button>
                <div className="flex flex-1 flex-wrap">
                  {chapters.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => jump(i)}
                      data-active={started && i === chapterIdx}
                      className="edition flex-1 border-0 px-2 py-4 text-xs font-bold tracking-widest"
                      aria-label={`Run ${c.headline} (${c.year})`}
                    >
                      {c.year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/50">
            prototype — narration, imagery and score are placeholders. in production every line is
            voiced and scored by elevenlabs, directed by gemini.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
