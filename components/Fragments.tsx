"use client";

import { useState } from "react";
import { sampleFragments } from "@/lib/story";
import Reveal from "./Reveal";

type Stub = { kind: string; text: string; meta: string; yours?: boolean };

const KIND_MARK: Record<string, string> = {
  "voice note": "◉",
  photo: "▣",
  text: "✎",
};

export default function Fragments() {
  const [stubs, setStubs] = useState<Stub[]>(sampleFragments);
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setStubs((s) => [...s, { kind: "text", text, meta: "just now", yours: true }]);
    setDraft("");
  };

  return (
    <section id="fragments" className="relative mx-auto max-w-5xl px-6 py-36 md:py-48">
      <Reveal>
        <p className="slate slate-amber">01 — How it begins</p>
        <h2 className="mt-6 max-w-2xl text-3xl leading-snug sm:text-5xl" style={{ fontWeight: 350 }}>
          You don&rsquo;t write your story.
          <br />
          <span className="italic text-paper-dim">You empty your pockets.</span>
        </h2>
        <p className="mt-8 max-w-xl leading-relaxed text-paper-dim">
          No forms. No timeline editor. You hand over fragments in any order, half-finished, out of
          sequence — the way memory actually works. These are the fourteen fragments Danny gave us.
          Four of them are shown here.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-5 sm:grid-cols-2">
        {stubs.map((f, i) => (
          <Reveal key={i} delay={(i % 4) * 120}>
            <figure
              className="stub relative rounded-sm p-6"
              style={{ transform: `rotate(${((i * 37) % 5) - 2}deg)` }}
            >
              <figcaption className="slate flex items-center justify-between">
                <span className={f.yours ? "slate-amber" : ""}>
                  {KIND_MARK[f.kind] ?? "✎"}&ensp;{f.yours ? "your fragment" : f.kind}
                </span>
                <span>{f.meta}</span>
              </figcaption>
              <blockquote className="mt-4 text-lg italic leading-relaxed text-paper/90">
                “{f.text}”
              </blockquote>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <div className="stub mt-12 rounded-sm p-6">
          <label htmlFor="fragment-input" className="slate slate-amber">
            ✎&ensp;Try it — leave a fragment of your own
          </label>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <input
              id="fragment-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="tell it like you'd tell a friend at 2 a.m."
              className="w-full border-b border-paper-faint/40 bg-transparent pb-2 text-lg italic text-paper outline-none transition-colors placeholder:text-paper-faint focus:border-amber"
            />
            <button
              onClick={add}
              className="slate shrink-0 border border-paper-faint/40 px-5 py-3 transition-colors hover:border-amber hover:text-amber"
            >
              Keep it
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
