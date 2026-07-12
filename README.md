# One More Year

**A cinematic memory.** You give us the fragments of something you love — the voice notes, the photographs, the things you only say at 2 a.m. We give you back the film of why it matters.

Built for the [DEV Weekend Challenge: Passion Edition](https://dev.to) (July 10–13, 2026).

## What it is

One More Year transforms a person's passion journey into a living cinematic memory:

1. **Fragments** — you don't write your story; you empty your pockets. Voice notes, photos, half-sentences, in any order.
2. **The AI Director** — Gemini reads the fragments, finds the arc you couldn't see from inside it, writes the script, designs one visual world, and decides where the silence goes.
3. **Voice & Score** — ElevenLabs gives the story a narrator, the atmosphere (rain on an empty pitch, a hallway's hum, sixty thousand people standing), and the score.
4. **The memory** — an interactive film: six moments across a career timeline (1998–2026), synchronized transcript, a light world that shifts with each chapter, and playback controls that behave like a career, not a media player.

The featured demo tells the story of **Danny Moreau, №9** — a flat ball, a torn knee, and a man who could not stop.

## Status: working prototype with live AI integrations

The featured Danny Moreau story is mocked content (script in `lib/story.ts`, WebAudio ambience in `lib/ambience.ts`). But the **Studio** — the "Start your story" flow — runs for real when you connect keys:

- **⚙ The Press Room** (settings, top of the page) stores your API keys in your browser's localStorage only; nothing touches a server.
- **Gemini** (`generateContent` with JSON structured output, default `gemini-2.5-flash`) reads your four interview answers and writes your story live — headline plus an audio-tagged script (`lib/generate.ts`).
- **ElevenLabs** (`eleven_v3` with [audio tags], any voice from your library) speaks the finished proof aloud from the same screen.

Without keys, the Studio runs an honest simulation of the same pipeline, labeled as such.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Headphones recommended.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · WebAudio API · Fraunces + Geist Mono

## Challenge notes

All code in this repository was started and completed within the challenge window (July 10–13, 2026).
