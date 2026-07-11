"use client";

export default function Prologue() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6">
      {/* a single floodlight beam */}
      <div
        aria-hidden
        className="beam absolute -top-1/3 left-1/2 h-[160%] w-[46rem] max-w-[90vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(224,164,60,0.22), transparent 70%)",
        }}
      />

      <p className="slate rise mb-10" style={{ animationDelay: "0.4s" }}>
        A cinematic memory
      </p>

      <h1 className="max-w-4xl text-center">
        <span
          className="rise block text-balance text-4xl leading-tight sm:text-6xl md:text-7xl"
          style={{ animationDelay: "1s", fontWeight: 350 }}
        >
          Everyone has one thing
        </span>
        <span
          className="rise block text-balance text-4xl italic leading-tight text-amber sm:text-6xl md:text-7xl"
          style={{ animationDelay: "1.9s", fontWeight: 350 }}
        >
          they can&rsquo;t quit.
        </span>
      </h1>

      <div
        className="rise mt-14 max-w-md text-center text-base leading-relaxed text-paper-dim"
        style={{ animationDelay: "3s" }}
      >
        <p>
          You give us the fragments — the voice notes, the photographs, the things you only say at
          2&nbsp;a.m.
        </p>
        <p className="mt-4">We give you back the film of why it matters.</p>
      </div>

      <a
        href="#fragments"
        className="rise slate mt-16 border border-paper-faint/40 px-6 py-3 transition-colors hover:border-amber hover:text-amber"
        style={{ animationDelay: "3.8s" }}
      >
        Begin a memory ↓
      </a>

      <p
        className="rise slate absolute bottom-8 left-1/2 -translate-x-1/2 text-paper-faint/70"
        style={{ animationDelay: "4.4s" }}
      >
        or scroll — a story is already playing tonight
      </p>
    </section>
  );
}
