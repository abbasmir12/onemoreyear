"use client";

import { useEffect, useRef, useState } from "react";
import { editorSteps } from "@/lib/story";
import Reveal from "./Reveal";

const STEP_MS = 2400;

export default function CuttingRoom() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setRunning(true),
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running || step >= editorSteps.length - 1) return;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [running, step]);

  return (
    <section ref={ref} className="cut-l relative bg-white pb-28 text-black">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">Step two — the cutting room</p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">Then an editor</span>
          </h2>
          <h2 className="display slam-wrap text-6xl sm:text-8xl">
            <span className="slam" style={{ transitionDelay: "120ms" }}>
              goes to work.
            </span>
          </h2>
          <p className="mt-8 max-w-lg text-sm leading-relaxed">
            Gemini reads the fragments like an old-school desk editor reads wire copy: it cuts what
            a stranger would write about you, and keeps what only you would say.
          </p>
        </Reveal>

        <Reveal delay={150}>
          <div className="relative mt-14 border-4 border-black p-6 md:p-10">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">
              draft — wire copy, do not print
            </p>

            <p className="mt-6 max-w-2xl text-base leading-loose md:text-lg">
              LOCAL MAN, 34, CONTINUES CAREER DESPITE INJURY.{" "}
              <span className={`strike ${step >= 1 ? "on" : ""}`}>
                Sources say retirement was considered.
              </span>{" "}
              He returned to training in 2023.{" "}
              <span className={`strike ${step >= 2 ? "on" : ""}`}>
                A club statement praised his professionalism.
              </span>{" "}
              The knee made a sound he still hears in{" "}
              <span className={`circled ${step >= 3 ? "on" : ""}`}>quiet rooms</span>. He signed for
              one more year.
            </p>

            {/* margin note */}
            <p
              aria-hidden={step < 4}
              className="hand absolute -right-2 bottom-16 max-w-[11rem] rotate-[-4deg] text-2xl leading-tight transition-opacity duration-300 md:right-8 md:text-3xl"
              style={{ opacity: step >= 4 ? 1 : 0 }}
            >
              keep this — only he would say it ↑
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
              <p className="text-sm font-bold" aria-live="polite">
                <span className="mr-3 inline-block h-3 w-3 animate-pulse bg-black" aria-hidden />
                {editorSteps[step]}
              </p>
              <span
                className="stamp text-sm transition-opacity duration-300"
                style={{ opacity: step >= 5 ? 1 : 0 }}
              >
                To the voice desk → ElevenLabs
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
