"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chapters, chapterStart, totalDuration, STORY_TITLE, STORY_SUBJECT } from "@/lib/story";
import { AmbienceEngine } from "@/lib/ambience";
import MomentArt from "./MomentArt";

const CPS = 22;
/** seconds of black frame at the head of each chapter — where the silence goes */
const BLACK_BEAT = 0.7;

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

export default function Theater({ onClose }: { onClose: () => void }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [controls, setControls] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AmbienceEngine | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const charsRef = useRef(0);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { chapterIdx, local } = useMemo(() => locate(time), [time]);
  const chapter = chapters[chapterIdx];
  const ended = time >= totalDuration;
  const inBlackBeat = !ended && local < BLACK_BEAT;

  // current line + typed chars
  const { lineIdx, chars, totalChars } = useMemo(() => {
    let li = -1;
    let total = 0;
    for (let i = 0; i < chapter.lines.length; i++) {
      const n = Math.max(
        0,
        Math.min(chapter.lines[i].text.length, Math.floor((local - chapter.lines[i].at) * CPS))
      );
      total += n;
      if (n > 0) li = i;
    }
    const n =
      li >= 0
        ? Math.min(
            chapter.lines[li].text.length,
            Math.floor((local - chapter.lines[li].at) * CPS)
          )
        : 0;
    return { lineIdx: li, chars: n, totalChars: total };
  }, [chapter, local]);

  useEffect(() => {
    if (!playing) return;
    if (totalChars > charsRef.current) engineRef.current?.tick();
    charsRef.current = totalChars;
  }, [totalChars, playing]);

  // clock
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

  // open: fullscreen, lock scroll, start the film
  useEffect(() => {
    const root = rootRef.current;
    document.body.style.overflow = "hidden";
    root?.requestFullscreen?.().catch(() => {});
    engineRef.current = new AmbienceEngine();
    engineRef.current.play(chapters[0].ambience).then(() => setPlaying(true));
    return () => {
      document.body.style.overflow = "";
      engineRef.current?.dispose();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // leave when the user exits fullscreen
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [onClose]);

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (p) engineRef.current?.pause();
      else {
        if (time >= totalDuration) setTime(0);
        engineRef.current?.play(chapters[locate(time >= totalDuration ? 0 : time).chapterIdx].ambience);
      }
      return !p;
    });
  }, [time]);

  const jump = useCallback((idx: number) => {
    setTime(chapterStart(idx));
    charsRef.current = 0;
    engineRef.current?.play(chapters[idx].ambience);
    setPlaying(true);
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "ArrowRight") jump(Math.min(chapterIdx + 1, chapters.length - 1));
      if (e.key === "ArrowLeft") jump(Math.max(chapterIdx - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, toggle, jump, chapterIdx]);

  // auto-hide controls
  const wake = useCallback(() => {
    setControls(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setControls(false), 2600);
  }, []);
  useEffect(() => {
    wake();
    return () => {
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, [wake]);

  const progress = Math.min(time / totalDuration, 1);
  const line = lineIdx >= 0 ? chapter.lines[lineIdx] : null;

  return (
    <div
      ref={rootRef}
      onMouseMove={wake}
      onClick={wake}
      className={`fixed inset-0 z-[100] bg-black text-white ${controls ? "" : "cursor-none"}`}
      role="dialog"
      aria-label="One More Year — theater"
    >
      {/* the picture */}
      {!inBlackBeat && !ended && (
        <div key={chapter.id} className="absolute inset-0 overflow-hidden">
          <MomentArt id={chapter.id} className="pushin h-full w-full opacity-40" />
          <div aria-hidden className="dots-white absolute inset-0 opacity-[0.05]" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 40%, rgba(0,0,0,0.85))" }}
          />
        </div>
      )}

      {/* the words */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {ended ? (
          <div className="fade-up flex flex-col items-center gap-8">
            <p className="max-w-3xl bg-white px-4 py-2 text-2xl font-bold text-black md:text-4xl">
              Because he had something left to love.
            </p>
            <span className="stamp text-sm">fin.</span>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setTime(0);
                  charsRef.current = 0;
                  engineRef.current?.play(chapters[0].ambience);
                  setPlaying(true);
                }}
                className="display border-4 border-white px-6 py-3 text-2xl transition-colors hover:bg-white hover:text-black"
              >
                ↻ Again
              </button>
              <button
                onClick={onClose}
                className="display border-4 border-white px-6 py-3 text-2xl transition-colors hover:bg-white hover:text-black"
              >
                Leave the theater
              </button>
            </div>
          </div>
        ) : !inBlackBeat ? (
          <>
            <h2
              key={chapter.id}
              className="display fade-up text-[14vw] leading-[0.9] sm:text-8xl md:text-9xl"
            >
              {chapter.headline}
            </h2>
            <div className="mt-10 flex min-h-[7rem] items-start justify-center md:min-h-[8rem]">
              {line && (
                <p
                  className={`max-w-4xl text-xl leading-snug md:text-4xl ${
                    line.em ? "bg-white px-3 py-1 font-bold text-black" : ""
                  } ${chars < line.text.length && playing ? "caret" : ""}`}
                >
                  {line.text.slice(0, chars)}
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* controls */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-500 ${
          controls || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mx-auto max-w-5xl px-6 pb-6">
          <div className="flex items-center justify-between pb-3 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/70">
            <span>
              {STORY_TITLE} · {STORY_SUBJECT}
            </span>
            <span>
              {fmt(Math.min(time, totalDuration))} / {fmt(totalDuration)} · esc to leave
            </span>
          </div>
          <div className="relative h-[3px] w-full bg-white/25">
            <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-4 flex items-center gap-5">
            <button
              onClick={toggle}
              className="flex h-11 w-11 items-center justify-center border-2 border-white text-sm transition-colors hover:bg-white hover:text-black"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <div className="flex flex-1 justify-between">
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => jump(i)}
                  className={`text-[0.65rem] font-bold tracking-widest transition-colors hover:text-white ${
                    i === chapterIdx && !ended ? "text-white underline underline-offset-4" : "text-white/45"
                  }`}
                >
                  {c.year}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/70 transition-colors hover:text-white"
            >
              ✕ leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
