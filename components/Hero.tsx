"use client";

import { useEffect, useRef, useState } from "react";
import Studio from "./Studio";
import SettingsPanel from "./Settings";

export default function Hero() {
  const nineRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [studio, setStudio] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (nineRef.current) {
          nineRef.current.style.transform = `rotateY(${y * 0.25}deg) rotateZ(${-8 + y * 0.01}deg)`;
        }
        if (headlineRef.current) {
          headlineRef.current.style.transform = `translateY(${y * 0.28}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // anywhere on the page can open the studio
  useEffect(() => {
    const open = () => setStudio(true);
    window.addEventListener("open-studio", open);
    return () => window.removeEventListener("open-studio", open);
  }, []);

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-white text-black">
      {/* nameplate */}
      <div className="flex items-end justify-between border-b-4 border-black px-5 pb-3 pt-4 md:px-10">
        <p className="display text-3xl leading-none md:text-5xl" aria-label="One More Year">
          <span className="outline-text">One</span> <span>More</span>{" "}
          <span className="bg-black px-2 text-white">Year</span>
        </p>
        <div className="flex items-center gap-5 pb-1">
          <p className="hidden text-[0.6rem] font-bold uppercase tracking-[0.25em] sm:block">
            Open-source documentary studio · July 2026
          </p>
          <button
            onClick={() => setSettings(true)}
            className="text-[0.6rem] font-bold uppercase tracking-[0.25em] transition-colors hover:bg-black hover:text-white px-2 py-1"
            aria-label="Open settings"
          >
            ⚙ press room
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-center px-5 py-16 md:px-10">
        {/* the rotating halftone №9 */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-4rem] top-1/2 -translate-y-1/2 md:right-8"
          style={{ perspective: "900px" }}
        >
          <span
            ref={nineRef}
            className="dots-text display block select-none text-[22rem] leading-none md:text-[32rem]"
            style={{ transform: "rotateZ(-8deg)", transformStyle: "preserve-3d" }}
          >
            9
          </span>
        </div>

        <div className="relative">
          {/* only the headline gets the scroll parallax — the CTA row stays
              put so it never gets pushed toward the next section's overlap */}
          <h1
            ref={headlineRef}
            className="display text-[17vw] leading-[0.88] sm:text-[13vw] md:text-[10rem]"
          >
            Everyone
            <br />
            has one thing
            <br />
            <span className="mt-[0.08em] inline-block bg-black px-3 pb-[0.05em] text-white">
              they can&rsquo;t quit.
            </span>
          </h1>
          <div className="mt-8 max-w-md text-sm leading-relaxed md:text-base">
            <p>
              You answer a few questions. Gemini directs the story. ElevenLabs gives it a voice.
            </p>
            <p className="mt-3 font-bold">We print the film of why it matters.</p>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setStudio(true)}
              className="display bg-black px-10 py-4 text-3xl text-white transition-colors hover:bg-white hover:text-black hover:outline hover:outline-4 hover:outline-black md:text-4xl"
            >
              ▶ Start your story
            </button>
            <a
              href="#wire"
              className="display border-4 border-black px-8 py-4 text-2xl transition-colors hover:bg-black hover:text-white md:text-3xl"
            >
              Read tonight&rsquo;s edition ↓
            </a>
          </div>
          <p className="hand mt-6 -rotate-2 text-3xl">
            tonight&rsquo;s edition is about football. yours doesn&rsquo;t have to be.
          </p>
        </div>
      </div>

      {studio && <Studio onClose={() => setStudio(false)} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
    </section>
  );
}
