"use client";

import { useEffect, useRef, useState } from "react";
import { directorSteps } from "@/lib/story";
import Reveal from "./Reveal";

const STEP_MS = 2600;

export default function Director() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // begin the sequence only once it's on screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setRunning(true),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setStep((s) => (s + 1) % directorSteps.length),
      STEP_MS
    );
    return () => clearInterval(id);
  }, [running]);

  return (
    <section ref={sectionRef} className="relative mx-auto max-w-5xl px-6 py-36 md:py-48">
      <Reveal>
        <p className="slate slate-amber">02 — The dark room</p>
        <h2 className="mt-6 max-w-2xl text-3xl leading-snug sm:text-5xl" style={{ fontWeight: 350 }}>
          Then a director sits with your fragments,
          <br />
          <span className="italic text-paper-dim">alone, for a while.</span>
        </h2>
      </Reveal>

      <Reveal delay={150}>
        <div className="relative mt-20 flex flex-col items-center rounded-sm border border-paper-faint/20 bg-ink-2/60 px-6 py-20">
          {/* film-leader countdown dial */}
          <div className="relative h-28 w-28" aria-hidden>
            <svg viewBox="0 0 100 100" className="h-full w-full opacity-70">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--paper-faint)" strokeWidth="1" />
              <circle cx="50" cy="50" r="34" fill="none" stroke="var(--paper-faint)" strokeWidth="0.5" opacity="0.5" />
              <line className="leader-hand" x1="50" y1="50" x2="50" y2="8" stroke="var(--amber)" strokeWidth="1.5" />
            </svg>
            <span className="slate absolute inset-0 flex items-center justify-center text-2xl text-paper">
              {directorSteps.length - step}
            </span>
          </div>

          <div className="relative mt-12 h-10 w-full max-w-lg text-center" aria-live="polite">
            <p
              key={step}
              className="absolute inset-0 text-lg italic text-paper/90"
              style={{ animation: `caption-cycle ${STEP_MS}ms ease forwards` }}
            >
              {directorSteps[step]}
            </p>
          </div>

          <p className="slate mt-10 text-paper-faint">
            AI Director · concept preview — this is where Gemini works
          </p>

          {/* drifting fragment ghosts */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {["1998", "0:41", "№9", "19 mo", "5 a.m.", "june"].map((t, i) => (
              <span
                key={t}
                className="drift slate absolute text-paper-faint/40"
                style={{
                  left: `${8 + i * 16}%`,
                  top: `${6 + (i % 3) * 5}%`,
                  ["--r" as string]: `${((i * 31) % 9) - 4}deg`,
                  animationDelay: `${i * 0.7}s`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={250}>
        <p className="mx-auto mt-14 max-w-xl text-center leading-relaxed text-paper-dim">
          It doesn&rsquo;t summarize you. It looks for the turn — the injury, the doubt, the reason
          you stayed — and builds one visual world for the whole journey to live inside. Then it
          hands the script to a voice.
        </p>
      </Reveal>
    </section>
  );
}
