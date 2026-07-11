"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chapters,
  chapterStart,
  totalDuration,
  STORY_TITLE,
  STORY_SUBJECT,
  STORY_LOGLINE,
} from "@/lib/story";
import { AmbienceEngine } from "@/lib/ambience";
import Reveal from "./Reveal";

function locate(time: number) {
  let acc = 0;
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    if (time < acc + c.duration || i === chapters.length - 1) {
      const local = Math.min(time - acc, c.duration);
      let line = -1;
      for (let j = 0; j < c.lines.length; j++) {
        if (local >= c.lines[j].at) line = j;
      }
      return { chapterIdx: i, local, line };
    }
    acc += c.duration;
  }
  return { chapterIdx: 0, local: 0, line: -1 };
}

export default function Film() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const engineRef = useRef<AmbienceEngine | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const worldRef = useRef<HTMLDivElement>(null);

  const { chapterIdx, line } = useMemo(() => locate(time), [time]);
  const chapter = chapters[chapterIdx];
  const ended = time >= totalDuration;

  // playback clock
  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
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
      // timeline-based breathing — drives the floodlight glow
      if (worldRef.current) {
        const pulse = (Math.sin(now / 1400) + 1) / 2;
        worldRef.current.style.setProperty("--pulse", pulse.toFixed(3));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // scene sound follows the chapter
  useEffect(() => {
    if (playing) engineRef.current?.setScene(chapter.ambience);
  }, [chapter, playing]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const play = useCallback(async () => {
    setStarted(true);
    if (time >= totalDuration) setTime(0);
    engineRef.current ??= new AmbienceEngine();
    await engineRef.current.play(chapters[locate(time >= totalDuration ? 0 : time).chapterIdx].ambience);
    setPlaying(true);
  }, [time]);

  const pause = useCallback(() => {
    setPlaying(false);
    engineRef.current?.pause();
  }, []);

  const jump = useCallback(
    async (idx: number) => {
      setStarted(true);
      setTime(chapterStart(idx));
      engineRef.current ??= new AmbienceEngine();
      await engineRef.current.play(chapters[idx].ambience);
      setPlaying(true);
    },
    []
  );

  const w = chapter.world;
  const progress = Math.min(time / totalDuration, 1);

  return (
    <section id="film" className="relative px-0 py-36 md:py-48">
      <Reveal className="mx-auto max-w-5xl px-6">
        <p className="slate slate-amber">03 — Tonight&rsquo;s memory</p>
        <h2 className="mt-6 text-3xl leading-snug sm:text-5xl" style={{ fontWeight: 350 }}>
          {STORY_TITLE}
          <span className="mt-2 block text-xl italic text-paper-dim sm:text-2xl">
            {STORY_SUBJECT}
          </span>
        </h2>
        <p className="mt-6 max-w-xl leading-relaxed text-paper-dim">{STORY_LOGLINE}</p>
        <p className="slate mt-6 text-paper-faint">
          headphones recommended · atmosphere is synthesized live as a placeholder for the
          ElevenLabs score
        </p>
      </Reveal>

      {/* ——— the theatre ——— */}
      <Reveal delay={150}>
        <div
          ref={worldRef}
          className="world relative mx-auto mt-16 flex min-h-[80svh] max-w-6xl flex-col overflow-hidden rounded-sm border border-paper-faint/20 md:min-h-[86svh]"
          style={{
            background: `linear-gradient(to bottom, ${w.sky[0]}, ${w.sky[1]} 70%)`,
          }}
        >
          {/* floodlight */}
          <div
            aria-hidden
            className="floodlight absolute inset-0"
            style={{
              background: `radial-gradient(ellipse ${w.lightSize}% ${w.lightSize * 0.7}% at ${w.lightX}% ${w.lightY}%, ${w.lightColor}, transparent 70%)`,
              opacity: `calc(0.75 + 0.25 * var(--pulse, 0))`,
            }}
          />
          {/* fog + pitch horizon */}
          <div
            aria-hidden
            className="floodlight absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background: `linear-gradient(to top, rgba(236,229,216,${w.fog * 0.06}), transparent)`,
            }}
          />
          <div aria-hidden className="absolute inset-x-0 bottom-[22%] h-px bg-paper/10" />
          <div
            aria-hidden
            className="absolute bottom-[10%] left-1/2 h-24 w-44 -translate-x-1/2 rounded-t-full border border-paper/8 border-b-0"
          />

          {/* slate header */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-10">
            <p className="slate">
              <span className="slate-amber">{chapter.reel}</span>
              &ensp;—&ensp;{chapter.title}
            </p>
            <p className="slate hidden text-paper-faint sm:block">{chapter.ambience.label}</p>
          </div>

          {/* transcript stage */}
          <div className="relative z-10 flex flex-1 items-center px-6 py-12 md:px-16">
            {!started ? (
              <div className="mx-auto flex flex-col items-center text-center">
                <button
                  onClick={play}
                  className="breathe group flex h-32 w-32 flex-col items-center justify-center rounded-full border border-amber/50 text-amber transition-colors hover:bg-amber/10 md:h-40 md:w-40"
                  aria-label="Play the memory"
                >
                  <span className="text-3xl leading-none">▶</span>
                </button>
                <p className="slate mt-8 text-paper-dim">Press to remember</p>
                <p className="slate mt-2 text-paper-faint">2 min 10 sec · six moments · 1998–2026</p>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl" aria-live="polite">
                <p className="slate mb-8 text-paper-faint">{chapter.year}</p>
                {chapter.lines.map((l, i) => (
                  <p
                    key={`${chapter.id}-${i}`}
                    className={`line mb-5 text-balance leading-snug ${
                      l.em
                        ? "text-2xl italic text-amber sm:text-4xl"
                        : "text-xl text-paper sm:text-3xl"
                    } ${i < line ? "line-past" : i === line ? "line-now" : "line-future"}`}
                    style={{ fontWeight: 350 }}
                  >
                    {l.text}
                  </p>
                ))}
                {ended && (
                  <div className="mt-10 flex items-center gap-6">
                    <button
                      onClick={play}
                      className="slate border border-paper-faint/40 px-5 py-3 transition-colors hover:border-amber hover:text-amber"
                    >
                      ↻ Remember it again
                    </button>
                    <p className="slate text-paper-faint">fin.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ——— controls: a career, not a scrub bar ——— */}
          <div className="relative z-10 border-t border-paper-faint/15 bg-ink/40 px-6 pb-6 pt-5 backdrop-blur-sm md:px-10">
            {/* filament progress */}
            <div className="relative mb-6 h-px w-full bg-paper-faint/25">
              <div
                className="absolute inset-y-0 left-0 bg-amber transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="flex items-end justify-between gap-4">
              <button
                onClick={playing ? pause : play}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-paper-faint/40 text-paper transition-colors hover:border-amber hover:text-amber"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>

              <div className="flex flex-1 items-end justify-between overflow-x-auto pb-1">
                {chapters.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => jump(i)}
                    data-active={started && i === chapterIdx}
                    className={`yr slate shrink-0 px-2 text-center transition-colors hover:text-amber md:px-3 ${
                      started && i === chapterIdx ? "slate-amber" : "text-paper-faint"
                    }`}
                    aria-label={`Play ${c.title} (${c.year})`}
                  >
                    <span className="block text-sm tracking-widest">{c.year}</span>
                    <span className="mt-1 hidden text-[0.6rem] md:block">{c.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={250}>
        <p className="slate mx-auto mt-8 max-w-6xl px-6 text-paper-faint">
          Prototype note — narration voice, imagery, and score are placeholders. In production each
          moment is voiced and scored by ElevenLabs and directed by Gemini.
        </p>
      </Reveal>
    </section>
  );
}
