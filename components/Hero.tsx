"use client";

import { useEffect, useRef } from "react";
import { tickerItems } from "@/lib/story";

export default function Hero() {
  const nineRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (nineRef.current) {
          nineRef.current.style.transform = `rotateY(${y * 0.25}deg) rotateZ(${-8 + y * 0.01}deg)`;
        }
        if (headRef.current) {
          headRef.current.style.transform = `translateY(${y * 0.28}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const ticker = [...tickerItems, ...tickerItems];

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-white text-black">
      {/* ticker masthead */}
      <div className="flex items-stretch border-b-4 border-black">
        <p className="display shrink-0 border-r-4 border-black px-4 py-2 text-lg">
          One More Year
        </p>
        <div className="relative flex-1 overflow-hidden bg-black text-white">
          <div className="ticker-track flex h-full w-max items-center gap-10 whitespace-nowrap px-4 text-xs font-bold tracking-widest">
            {ticker.map((t, i) => (
              <span key={i}>+++ {t}</span>
            ))}
          </div>
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
            className="dots-text display block select-none text-[22rem] leading-none md:text-[34rem]"
            style={{ transform: "rotateZ(-8deg)", transformStyle: "preserve-3d" }}
          >
            9
          </span>
        </div>

        <div ref={headRef} className="relative">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em]">
            The back page of a life · July 2026
          </p>
          <h1 className="display text-[19vw] leading-[0.88] sm:text-[15vw] md:text-[11rem]">
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
              You hand over the fragments — voice notes, photographs, the things you only say at 2
              a.m.
            </p>
            <p className="mt-3 font-bold">We print the story of why it matters.</p>
          </div>
          <p className="hand mt-6 -rotate-2 text-3xl">this one&rsquo;s about football. yours doesn&rsquo;t have to be.</p>
        </div>
      </div>

      <a
        href="#scrapbook"
        className="display block border-t-4 border-black py-4 text-center text-2xl transition-colors hover:bg-black hover:text-white"
      >
        Turn over ↓
      </a>
    </section>
  );
}
