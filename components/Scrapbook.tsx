"use client";

import { useState } from "react";
import { sampleFragments } from "@/lib/story";
import Reveal from "./Reveal";

type Scrap = { kind: string; text: string; meta: string; yours?: boolean };

export default function Scrapbook() {
  const [scraps, setScraps] = useState<Scrap[]>(sampleFragments);
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setScraps((s) => [...s, { kind: "text", text, meta: "just now", yours: true }]);
    setDraft("");
  };

  return (
    <section id="scrapbook" className="cut-r relative bg-black pb-28 text-white">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">Step one — the shoebox</p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">You don&rsquo;t write it.</span>
          </h2>
          <h2 className="display slam-wrap text-6xl text-white/60 sm:text-8xl">
            <span className="slam" style={{ transitionDelay: "120ms" }}>
              You empty your pockets.
            </span>
          </h2>
          <p className="mt-8 max-w-lg text-sm leading-relaxed text-white/80">
            No forms. No timeline editor. Fragments in any order, half-finished, out of sequence —
            the way memory actually works. Danny gave us fourteen. Four are taped in below.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {scraps.map((f, i) => (
            <Reveal key={i} delay={(i % 4) * 100}>
              <figure
                className="scrap p-6 pt-8"
                style={{ transform: `rotate(${((i * 41) % 5) - 2}deg)` }}
              >
                <span className="tape" aria-hidden />
                <figcaption className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                  <span>{f.yours ? "★ your fragment" : f.kind}</span>
                  <span>{f.meta}</span>
                </figcaption>
                <blockquote className="hand mt-3 text-3xl leading-tight">“{f.text}”</blockquote>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <div className="scrap mt-16 p-6 pt-8" style={{ transform: "rotate(1deg)" }}>
            <span className="tape" aria-hidden />
            <label
              htmlFor="fragment-input"
              className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
            >
              Blank scrap — leave a fragment of your own
            </label>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <input
                id="fragment-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="tell it like you'd tell a friend at 2 a.m."
                className="hand w-full border-b-2 border-black/40 bg-transparent pb-1 text-3xl outline-none placeholder:text-black/35 focus:border-black"
              />
              <button
                onClick={add}
                className="display shrink-0 border-4 border-black px-5 py-2 text-xl transition-colors hover:bg-black hover:text-white"
              >
                Tape it in
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
