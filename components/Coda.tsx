"use client";

import Reveal from "./Reveal";

export default function Coda() {
  return (
    <section className="relative flex min-h-[70svh] flex-col items-center justify-center px-6 py-36 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(224,164,60,0.1), transparent 70%)",
        }}
      />
      <Reveal>
        <p className="slate slate-amber">05 — Your turn</p>
        <h2
          className="mx-auto mt-8 max-w-3xl text-balance text-4xl leading-tight sm:text-6xl"
          style={{ fontWeight: 350 }}
        >
          What&rsquo;s the thing
          <span className="italic text-amber"> you can&rsquo;t quit?</span>
        </h2>
        <p className="mx-auto mt-8 max-w-md leading-relaxed text-paper-dim">
          A team. A craft. A person. A stubborn, half-built dream. Empty your pockets — we&rsquo;ll
          find the film inside.
        </p>
        <a
          href="#fragments"
          className="slate mt-14 inline-block border border-amber/60 px-8 py-4 text-amber transition-colors hover:bg-amber/10"
        >
          Begin a memory
        </a>
      </Reveal>

      <footer className="slate absolute bottom-8 left-1/2 w-full -translate-x-1/2 px-6 text-paper-faint">
        One More Year · a weekend challenge entry · built with passion, about passion
      </footer>
    </section>
  );
}
