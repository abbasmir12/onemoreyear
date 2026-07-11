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
import MomentArt from "./MomentArt";
import Reveal from "./Reveal";
import Theater from "./Theater";

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

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Wire() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  /** 'wire' plays every edition through; 'solo' stops at the end of one card */
  const [mode, setMode] = useState<"wire" | "solo">("wire");
  const [theater, setTheater] = useState(false);

  const engineRef = useRef<AmbienceEngine | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const charsRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const { chapterIdx, local } = useMemo(() => locate(time), [time]);
  const chapter = chapters[chapterIdx];
  const ended = time >= totalDuration;

  const typed = useMemo(
    () =>
      chapter.lines.map((l) =>
        Math.max(0, Math.min(l.text.length, Math.floor((local - l.at) * CPS)))
      ),
    [chapter, local]
  );
  const totalChars = typed.reduce((a, b) => a + b, 0);

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
        // in solo mode, stop at the edge of the current card
        if (modeRef.current === "solo") {
          const { chapterIdx: ci } = locate(t);
          const edge = chapterStart(ci) + chapters[ci].duration;
          if (next >= edge) {
            setPlaying(false);
            engineRef.current?.pause();
            return edge - 0.01;
          }
        }
        if (next >= totalDuration) {
          setPlaying(false);
          engineRef.current?.pause();
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

  const runWire = useCallback(async () => {
    setStarted(true);
    setMode("wire");
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

  const playCard = useCallback(async (idx: number, solo: boolean) => {
    setStarted(true);
    setMode(solo ? "solo" : "wire");
    setTime(chapterStart(idx));
    charsRef.current = 0;
    engineRef.current ??= new AmbienceEngine();
    await engineRef.current.play(chapters[idx].ambience);
    setPlaying(true);
  }, []);

  const progress = Math.min(time / totalDuration, 1);

  return (
    <section id="wire" className="cut-r relative bg-black pb-28 text-white">
      {/* ——— the main image, low opacity, behind everything ——— */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {chapters.map((c, i) => (
          <MomentArt
            key={c.id}
            id={c.id}
            className="absolute inset-0 h-full w-full transition-opacity duration-1000"
            style={{ opacity: (started ? i === chapterIdx : c.id === "onemore") ? 0.09 : 0 }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">
            Step three — tonight&rsquo;s back page
          </p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">{STORY_SUBJECT}</span>
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/80">{STORY_LOGLINE}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={playing && mode === "wire" ? hold : runWire}
              className="display border-4 border-white px-8 py-3 text-3xl transition-colors hover:bg-white hover:text-black"
            >
              {playing && mode === "wire" ? "❚❚ Hold the wire" : ended ? "↻ Run it again" : "▶ Run the wire"}
            </button>
            <button
              onClick={() => {
                hold();
                setTheater(true);
              }}
              className="display bg-white px-8 py-3 text-3xl text-black outline outline-4 outline-white transition-colors hover:bg-black hover:text-white"
            >
              ⛶ Watch it as a film
            </button>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/50">
              {fmt(totalDuration)} · six moments · or play any card alone
              <br />
              sound on — room tone synthesized live, standing in for the elevenlabs score
            </p>
          </div>
        </Reveal>

        {/* ——— master timeline ——— */}
        <Reveal delay={120}>
          <div className="relative mt-10 border-4 border-white">
            <div className="flex">
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => playCard(i, false)}
                  data-active={started && i === chapterIdx}
                  className="edition group relative border-0 py-3 text-[0.6rem] font-bold tracking-widest"
                  style={{ width: `${(c.duration / totalDuration) * 100}%` }}
                  aria-label={`Run the wire from ${c.headline} (${fmt(chapterStart(i))})`}
                >
                  <span className="block">{c.year}</span>
                  <span className="hidden opacity-60 sm:block">{fmt(chapterStart(i))}</span>
                  {i > 0 && <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-white/40" />}
                </button>
              ))}
            </div>
            {/* playhead */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-[3px] bg-white mix-blend-difference transition-[left] duration-200"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
        </Reveal>

        {/* ——— the cards ——— */}
        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {chapters.map((c, i) => {
            const active = started && i === chapterIdx;
            const start = chapterStart(i);
            const cardTyped = active ? typed : null;
            const cardDone = started && time >= start + c.duration - 0.05;
            const activeLine = cardTyped ? cardTyped.findLastIndex((n) => n > 0) : -1;
            return (
              <Reveal key={c.id} delay={(i % 3) * 100} className="h-full">
                <article
                  data-active={active}
                  className={`flex h-full flex-col border-4 border-white bg-black transition-all duration-500 ${
                    active
                      ? "z-10 -translate-y-2 shadow-[10px_10px_0_rgba(255,255,255,0.35)]"
                      : started && playing
                        ? "opacity-45"
                        : ""
                  }`}
                  style={{ transform: `rotate(${((i * 37) % 3) - 1}deg)${active ? " translateY(-8px)" : ""}` }}
                >
                  {/* dateline + timeline slot */}
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-white px-4 py-2">
                    <span className="display text-2xl">{c.year}</span>
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                      on the wire {fmt(start)} → {fmt(start + c.duration)}
                    </span>
                  </header>

                  {/* artwork */}
                  <div className="relative border-b-4 border-white">
                    <MomentArt id={c.id} className="block aspect-[4/3] w-full" />
                    <div aria-hidden className="dots-white pointer-events-none absolute inset-0 opacity-[0.07]" />
                    {active && playing && (
                      <span className="absolute right-2 top-2 border-2 border-white bg-black px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                        ● on air
                      </span>
                    )}
                    <p className="absolute bottom-0 left-0 bg-black px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-white/70">
                      art: gemini — or upload your own ↺
                    </p>
                  </div>

                  <h3 className="display border-b-4 border-white px-4 py-3 text-4xl">{c.headline}</h3>

                  {/* transcript */}
                  <div className="flex-1 space-y-3 px-4 py-4 text-sm leading-relaxed">
                    {active ? (
                      c.lines.map((l, li) => {
                        const n = cardTyped![li];
                        if (n === 0) return null;
                        const done = n >= l.text.length;
                        return (
                          <p
                            key={li}
                            className={`${l.em ? "bg-white px-1 font-bold text-black" : ""} ${
                              !done && li === activeLine && playing ? "caret" : ""
                            }`}
                          >
                            {l.text.slice(0, n)}
                          </p>
                        );
                      })
                    ) : cardDone ? (
                      c.lines.map((l, li) => (
                        <p key={li} className={`${l.em ? "bg-white px-1 font-bold text-black" : "text-white/80"}`}>
                          {l.text}
                        </p>
                      ))
                    ) : (
                      <p className="text-white/40">“{c.lines[0].text}”…</p>
                    )}
                  </div>

                  {/* card controls */}
                  <footer className="mt-auto flex items-stretch border-t-4 border-white">
                    <button
                      onClick={() => (active && playing ? hold() : playCard(i, true))}
                      className="flex-1 py-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-black"
                    >
                      {active && playing ? "❚❚ hold" : "▶ play this moment alone"}
                    </button>
                    <span className="border-l-4 border-white px-3 py-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/60">
                      {fmt(c.duration)}
                    </span>
                  </footer>
                </article>
              </Reveal>
            );
          })}
        </div>

        {ended && (
          <Reveal>
            <p className="stamp mt-12 text-sm">end of wire — fin.</p>
          </Reveal>
        )}

        <Reveal delay={200}>
          <p className="mt-10 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/50">
            prototype — artwork is procedural placeholder. in production every frame is generated by
            gemini from your fragments, or you drop in your own photographs; every line is voiced
            and scored by elevenlabs.
          </p>
        </Reveal>
      </div>

      {theater && <Theater onClose={() => setTheater(false)} />}
    </section>
  );
}
