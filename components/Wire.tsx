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
      {/* the active moment's artwork, faint, behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {started && (
          <MomentArt
            key={chapter.id}
            id={chapter.id}
            className="absolute inset-0 h-full w-full opacity-[0.035] transition-opacity duration-1000"
          />
        )}
      </div>

      <div className="relative mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">
            Step three — tonight&rsquo;s back page
          </p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">{STORY_SUBJECT}</span>
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/80">{STORY_LOGLINE}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
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
          </div>
          <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/50">
            {fmt(totalDuration)} · sound on · or click any moment to play it alone
          </p>
        </Reveal>

        {/* master timeline — the only place with slot times */}
        <Reveal delay={120}>
          <div className="relative mt-12 overflow-hidden border-2 border-white/60">
            {/* played portion */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
            <div className="relative flex">
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => playCard(i, false)}
                  className={`py-2.5 text-[0.6rem] font-bold tracking-widest transition-colors hover:bg-white hover:text-black ${
                    started && i === chapterIdx
                      ? "text-white underline underline-offset-4"
                      : "text-white/60"
                  }`}
                  style={{ width: `${(c.duration / totalDuration) * 100}%` }}
                  aria-label={`Run the wire from ${c.headline} (${fmt(chapterStart(i))})`}
                >
                  {c.year}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ——— the moments: quiet posters, one voice at a time ——— */}
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c, i) => {
            const active = started && i === chapterIdx;
            const cardTyped = active ? typed : null;
            const activeLine = cardTyped ? cardTyped.findLastIndex((n) => n > 0) : -1;
            return (
              <Reveal key={c.id} delay={(i % 3) * 100}>
                <article
                  data-active={active}
                  className={`transition-opacity duration-500 ${
                    started && playing && !active ? "opacity-40" : ""
                  }`}
                >
                  <button
                    onClick={() => (active && playing ? hold() : playCard(i, true))}
                    className="group relative block w-full border-2 border-white text-left"
                    aria-label={
                      active && playing
                        ? `Pause ${c.headline}`
                        : `Play ${c.headline} alone (${fmt(c.duration)})`
                    }
                  >
                    <MomentArt id={c.id} className="block aspect-[4/3] w-full" />

                    {/* poster title */}
                    <span className="absolute bottom-0 left-0 flex items-baseline gap-3 bg-black py-1 pl-0 pr-4">
                      <span className="display border-t-2 border-white/0 pl-0 text-3xl">
                        <span className="mr-3 text-base text-white/50">{c.year}</span>
                        {c.headline}
                      </span>
                    </span>

                    {/* on air */}
                    {active && playing && (
                      <span className="absolute right-3 top-3 bg-white px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-black">
                        ● on air
                      </span>
                    )}

                    {/* hover invitation */}
                    {!(active && playing) && (
                      <span className="absolute inset-0 hidden items-center justify-center bg-black/70 text-[0.7rem] font-bold uppercase tracking-[0.25em] group-hover:flex group-focus-visible:flex">
                        ▶ play this moment · {fmt(c.duration)}
                      </span>
                    )}
                  </button>

                  {/* transcript — only the moment on air speaks */}
                  {active && (
                    <div className="space-y-2.5 border-2 border-t-0 border-white px-4 py-4 text-sm leading-relaxed">
                      {c.lines.map((l, li) => {
                        const n = cardTyped![li];
                        if (n === 0) return null;
                        const done = n >= l.text.length;
                        return (
                          <p
                            key={li}
                            className={`${l.em ? "bg-white px-1 font-bold text-black" : "text-white/90"} ${
                              !done && li === activeLine && playing ? "caret" : ""
                            }`}
                          >
                            {l.text.slice(0, n)}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={200}>
          <p className="mt-14 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/40">
            {ended ? "end of wire — fin. · " : ""}artwork: procedural placeholders — generated by
            gemini from your fragments, or upload your own. voice &amp; score: elevenlabs.
          </p>
        </Reveal>
      </div>

      {theater && <Theater onClose={() => setTheater(false)} />}
    </section>
  );
}
