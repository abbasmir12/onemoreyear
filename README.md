# One More Year

**An open-source documentary studio for the thing you cannot quit.** You give it fragments — voice notes, photographs, the things you only say at 2 a.m. Gemini directs the cut. ElevenLabs performs it with a deliberately limited house cast.

Built for the [DEV Weekend Challenge: Passion Edition](https://dev.to) (July 10–13, 2026).

## What it is

One More Year transforms a person's passion journey into a living cinematic memory:

1. **Fragments** — you don't write your story; you empty your pockets. Voice notes, photos, half-sentences, in any order.
2. **The AI Director** — Gemini reads the fragments, finds the arc you couldn't see from inside it, writes the script, designs one visual world, and decides where the silence goes.
3. **Voice & Score** — ElevenLabs gives the story a narrator, the atmosphere (rain on an empty pitch, a hallway's hum, sixty thousand people standing), and the score.
4. **The film** — a real, generated documentary: multiple cast voices, sound effects, an original score, and frames, cut and mixed into a downloadable mp4.

The featured demo, **Danny Moreau, №9**, is a real output of this pipeline — not a mockup.

## Open-source studio

One More Year is designed as an inspectable creative studio, not a closed generation service. The interview, director prompt, cast assignment, Gemini calls, procedural fallback art, and browser-side FFmpeg print desk all live in this repository. Bring-your-own-key mode keeps the prototype deployable without operating a paid proxy, while the featured edition remains the judge-safe path.

The ElevenLabs cast is intentionally constrained to eleven project-curated voice IDs in `lib/voices.ts`. The first is the default deep narrator; two are explicitly identified as female voices by the collection owner. We do not infer identity or demographic labels for the others. The allowlist is enforced immediately before every TTS request, so changing localStorage cannot silently select an unapproved voice. Voice cloning is not part of this project.

## Status: working prototype with live AI integrations

The **Studio** — the "Start your story" flow — runs for real when you connect keys:

- **⚙ The Press Room** stores your Gemini director key locally for this open-source prototype. The paid ElevenLabs key must be configured server-side as `ELEVENLABS_API_KEY`; it is never exposed to browser JavaScript.
- **Gemini — the director** (`generateContent` with JSON structured output, default `gemini-2.5-flash`) reads your four interview answers and writes the full production plan live: headline, audio-tagged script, and prompts for the image, sound-effects, and music desks (`lib/generate.ts`).
- **The picture desk** can draw with Gemini, use uploaded images, or fetch real free-to-use photography through AssetPipe. AssetPipe follows its documented `GET /search` → select a landscape result → `POST /fetch` → stable `/asset` URL flow. If AI image generation fails, the print desk automatically tries AssetPipe before procedural house art.
- **ElevenLabs — the voice, foley & score desks**: `eleven_v3` ensemble narration with inline performance tags, three timed Sound Effects v2 regions, and an AI-selected Music v2 mode. Sound is structured as opening world, private/rupture detail, and return/release—not one ambience loop. Crowd or cheering is only generated when the supplied story establishes an audience.
- **ffmpeg.wasm — the print desk**: mixes narration, score, and room tone and prints frame + audio into a downloadable mp4, entirely in your browser (`lib/assemble.ts`; core served from `public/ffmpeg/`).

The Studio requires a Gemini key to begin and a server-side ElevenLabs key to print. Before generation it checks the subscription endpoint and shows the tier and remaining credit balance. Successful TTS, sound, and music responses are cached in IndexedDB by a content hash, so retrying the final mix or refreshing does not purchase identical assets again.

The fixed paid-run budget uses four or five cast voices, eight to ten short TTS segments, five to seven sound-effect regions, and one Music v2 production. Gemini chooses `instrumental`, `vocal`, or `hybrid` and records its rationale; every film is scored — if the model still returns "none," the app coerces it to a sparse instrumental score rather than skip music. Extra voices are clearly symbolic editorial perspectives—not invented witnesses—and may not add biographical facts.

Every scene carries a director-selected transition: `direct`, `sound`, or `silence`. The opening must establish place with a 4–5 second generated effect before speech; Gemini selects four to six additional 3–5 second sound bridges (five to seven total), while other voices cut directly together. Music has an independent 2–8 second entry cue. Effects are generated as focused, non-looping takes and placed before the associated voice rather than merely layered beneath it.

Copy `.env.example` to `.env.local` and add the key after subscribing:

```bash
ELEVENLABS_API_KEY=your_key_here
```

### Human speech direction

The director produces two versions of every spoken beat: a clean `text` transcript for the interface and a `performance` string written specifically for Eleven v3. Performance copy may contain a sparse, emotionally motivated repetition, false start, self-correction, filler, or mid-line audio tag. Most lines remain clean so the imperfect moments carry meaning. Ellipses and em dashes shape v3 pacing; SSML breaks and literal `[pause]` tags are forbidden. Narration uses Eleven v3's Natural stability baseline to balance tag responsiveness with reliability.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Headphones recommended.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · ffmpeg.wasm · Anton + IBM Plex Mono + Caveat

## Challenge notes

All code in this repository was started and completed within the challenge window (July 10–13, 2026).
