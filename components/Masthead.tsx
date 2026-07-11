"use client";

import Reveal from "./Reveal";

const CREW = [
  {
    role: "Editor-in-chief",
    name: "Gemini",
    duties: [
      "Reads every fragment — the voice notes, the dates, the things said sideways.",
      "Finds the arc you couldn't see from inside it: the turn, the doubt, the reason you stayed.",
      "Writes the script, picks the headlines, decides where the silence goes.",
    ],
  },
  {
    role: "Voice & sound desk",
    name: "ElevenLabs",
    duties: [
      "Gives the story a narrator — a voice chosen to match the weight of what you shared.",
      "Builds the atmosphere: rain on an empty pitch, a hallway's hum, sixty thousand people standing.",
      "Scores each edition, and knows when the loudest sound is none at all.",
    ],
  },
];

export default function Masthead() {
  return (
    <section className="cut-l relative bg-white pb-28 text-black">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">The staff box</p>
          <h2 className="display slam-wrap mt-4 text-6xl sm:text-8xl">
            <span className="slam">Every memory ships</span>
          </h2>
          <h2 className="display slam-wrap text-6xl sm:text-8xl">
            <span className="slam" style={{ transitionDelay: "120ms" }}>
              with a two-person crew.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={150}>
          <div className="mt-14 grid border-4 border-black md:grid-cols-2">
            {CREW.map((c, i) => (
              <div
                key={c.name}
                className={`p-6 md:p-10 ${i === 0 ? "border-b-4 border-black md:border-b-0 md:border-r-4" : ""}`}
              >
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">{c.role}</p>
                <p className="display mt-2 text-5xl">{c.name}</p>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed">
                  {c.duties.map((d) => (
                    <li key={d} className="flex gap-3">
                      <span aria-hidden className="font-bold">—</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={220}>
          <div className="mt-10 border-4 border-black bg-black p-6 text-white md:p-8">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/60">
              colophon — how the press will run
            </p>
            <p className="display mt-4 text-2xl leading-tight sm:text-4xl">
              your fragments → gemini cuts the story → elevenlabs voices &amp; scores it → your back
              page, printed.
            </p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/80">
              This prototype mocks both desks so the experience could be designed first. The
              generation pipeline drops in behind the exact page you just read — nothing changes
              except the story becomes yours.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
