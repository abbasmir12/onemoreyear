/**
 * Standalone test harness for the director prompt — calls the exact same
 * directDocumentary() the app uses, so results reflect the real code path.
 *
 * Usage:
 *   GEMINI_KEY=AIza... npx tsx scripts/test-director.ts
 *   GEMINI_MODEL=gemini-2.5-flash GEMINI_KEY=... npx tsx scripts/test-director.ts
 *
 * Optional: pass four answers as CLI args (thing, almostEnd, why, ownLine),
 * otherwise a default football story is used.
 */
import { directDocumentary } from "../lib/generate";
import { DEFAULTS, type Settings } from "../lib/settings";

const answers = process.argv.slice(2);
const defaultAnswers = [
  "football",
  "the knee, 2021",
  "because the grass smell before kickoff is the whole reason",
  "one more year. always one more year.",
];

const settings: Settings = {
  ...DEFAULTS,
  geminiKey: process.env.GEMINI_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? DEFAULTS.geminiModel,
};

if (!settings.geminiKey) {
  console.error("Set GEMINI_KEY in the environment.");
  process.exit(1);
}

console.log(`— calling the director (gemini · ${settings.geminiModel}) —\n`);

async function main() {
  const started = Date.now();
  try {
    const plan = await directDocumentary(answers.length === 4 ? answers : defaultAnswers, settings);
    console.log(`✓ valid script in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
    console.log("headline:", plan.headline);
    console.log("logline:", plan.logline);
    console.log("cast:", plan.cast.map((c) => `${c.id} (${c.role})`).join(", "));
    console.log(`music: ${plan.music_mode} · entry ${plan.music_entry_seconds}s · ${plan.music_rationale}`);
    console.log(`\n${plan.segments.length} segments:\n`);
    for (const seg of plan.segments) {
      const t = seg.transition;
      console.log(`[${seg.speaker}] transition: ${t.mode} ${t.duration_seconds}s${t.prompt ? ` — "${t.prompt}"` : ""}`);
      console.log(`  text: ${seg.text}`);
      if (seg.performance && seg.performance !== seg.text) console.log(`  performance: ${seg.performance}`);
      console.log(`  scene: ${seg.scene}${seg.em ? "  [EM]" : ""}`);
      console.log(`  footage_query: ${seg.footage_query}\n`);
    }
    const words = plan.segments.reduce((n, s) => n + s.text.trim().split(/\s+/).length, 0);
    console.log(`total: ${words} words`);
  } catch (e) {
    console.error(`✗ failed after ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
