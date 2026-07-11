"use client";

import Reveal from "./Reveal";

export default function Notice() {
  return (
    <section className="cut-r relative bg-black pb-16 text-white">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.3em]">Personal notices</p>
          <div className="mt-8 grid gap-0 md:grid-cols-[2fr_1fr]">
            <div className="border-4 border-white p-8 md:p-14">
              <h2 className="display text-6xl leading-[0.9] sm:text-8xl">
                What&rsquo;s the thing <span className="bg-white px-2 text-black">you</span> can&rsquo;t
                quit?
              </h2>
              <p className="mt-8 max-w-md text-sm leading-relaxed text-white/80">
                A team. A craft. A person. A stubborn, half-built dream. Empty your pockets —
                we&rsquo;ll print the back page.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-studio"))}
                className="display mt-10 inline-block border-4 border-white px-8 py-4 text-3xl transition-colors hover:bg-white hover:text-black"
              >
                ▶ Start your story
              </button>
            </div>
            <div className="dots-white hidden border-4 border-l-0 border-white md:block" aria-hidden />
          </div>
        </Reveal>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t-4 border-white pt-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/60">
          <span>One More Year · final edition · july 2026</span>
          <span>a weekend challenge entry — printed with passion, about passion</span>
        </footer>
      </div>
    </section>
  );
}
