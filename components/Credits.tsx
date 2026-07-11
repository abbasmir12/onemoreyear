"use client";

import Reveal from "./Reveal";

const CREW = [
  {
    role: "Direction",
    name: "Gemini",
    lines: [
      "Reads every fragment — the voice notes, the dates, the things said sideways.",
      "Finds the arc you couldn't see from inside it: the turn, the doubt, the reason you stayed.",
      "Writes the script, designs the single visual world, and decides where the silence goes.",
    ],
  },
  {
    role: "Voice & Score",
    name: "ElevenLabs",
    lines: [
      "Gives the story a narrator — a voice chosen to match the weight of what you shared.",
      "Builds the atmosphere: rain on an empty pitch, a hallway's hum, sixty thousand people standing.",
      "Scores each moment, and knows when the most powerful sound is none at all.",
    ],
  },
];

export default function Credits() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-36 md:py-48">
      <Reveal>
        <p className="slate slate-amber">04 — The crew</p>
        <h2 className="mt-6 max-w-2xl text-3xl leading-snug sm:text-5xl" style={{ fontWeight: 350 }}>
          Every memory ships with
          <br />
          <span className="italic text-paper-dim">a two-person crew.</span>
        </h2>
      </Reveal>

      <div className="mt-20 grid gap-16 md:grid-cols-2">
        {CREW.map((c, i) => (
          <Reveal key={c.name} delay={i * 150}>
            <div className="border-t border-paper-faint/25 pt-8">
              <p className="slate">{c.role}</p>
              <p className="mt-3 text-3xl italic text-amber" style={{ fontWeight: 350 }}>
                {c.name}
              </p>
              <ul className="mt-8 space-y-5">
                {c.lines.map((l) => (
                  <li key={l} className="leading-relaxed text-paper-dim">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <div className="mt-24 border-t border-paper-faint/25 pt-8">
          <p className="slate">How it will flow</p>
          <ol className="slate mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-paper-dim">
            <li>your fragments</li>
            <li aria-hidden className="text-paper-faint">→</li>
            <li className="slate-amber">gemini · script + world + direction</li>
            <li aria-hidden className="text-paper-faint">→</li>
            <li className="slate-amber">elevenlabs · voice + atmosphere + score</li>
            <li aria-hidden className="text-paper-faint">→</li>
            <li>a living cinematic memory</li>
          </ol>
          <p className="mt-8 max-w-xl leading-relaxed text-paper-dim">
            This prototype mocks both stages so the experience could be designed first. The
            generation pipeline drops in behind the exact interface you just used — nothing about
            the experience changes except that the story becomes yours.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
