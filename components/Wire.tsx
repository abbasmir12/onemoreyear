"use client";

import { useRef, useState } from "react";
import { STORY_SUBJECT, STORY_LOGLINE } from "@/lib/story";
import Reveal from "./Reveal";

export default function Wire() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  const goFullscreen = () => {
    wrapRef.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <section id="wire" className="cut-r relative bg-black pb-28 text-white">
      <div className="relative mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">
            Step three — tonight&rsquo;s back page
          </p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">{STORY_SUBJECT}</span>
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/80">{STORY_LOGLINE}</p>
          <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/50">
            an original film · sound on
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div ref={wrapRef} className="group relative mt-12 border-4 border-white bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src="/examplevideo.mp4"
              controls
              playsInline
              className="block w-full"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            {!playing && (
              <button
                onClick={goFullscreen}
                className="display absolute right-4 top-4 border-2 border-white bg-black/70 px-4 py-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ⛶ fullscreen
              </button>
            )}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-8 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/40">
            directed by gemini · cast &amp; scored by elevenlabs · printed with ffmpeg — start your
            own above
          </p>
        </Reveal>
      </div>
    </section>
  );
}
