import type { Settings } from "./settings";

export type GeneratedStory = {
  headline: string;
  lines: { tag: string; text: string; em?: boolean }[];
};

/**
 * The real director: Gemini reads the interview answers and returns the
 * script for the back page as structured JSON.
 */
export async function generateStory(
  answers: string[],
  s: Settings
): Promise<GeneratedStory> {
  const [thing, almostEnd, why, ownLine] = answers;
  const prompt = `You are the AI Director for "One More Year", a product that turns a person's passion into a short, restrained, cinematic story in the style of a great newspaper back page.

Their interview answers:
1. The thing they can't quit: ${thing || "(not given)"}
2. When it almost ended: ${almostEnd || "(not given)"}
3. Why they stayed: ${why || "(not given)"}
4. A line only they would say: ${ownLine || "(not given)"}

Write their story. Rules:
- "headline": 1-4 words naming the thing they love (no punctuation, lowercase ok).
- "lines": 4 to 6 short script lines, second person ("you"), emotionally restrained, concrete, no clichés, no exclamation marks. Weave in their own words where they gave them. The final line must be the strongest and marked "em": true. If they gave a line only they would say, quote it in one of the lines.
- Each line gets a "tag": an ElevenLabs v3 audio tag like [quiet], [warmer], [steady], [almost a whisper], [long pause].

Return ONLY JSON matching: {"headline": string, "lines": [{"tag": string, "text": string, "em": boolean}]}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${encodeURIComponent(s.geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.9,
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 160)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  if (!parsed?.headline || !Array.isArray(parsed?.lines) || parsed.lines.length === 0) {
    throw new Error("Gemini returned an unexpected shape");
  }
  return parsed as GeneratedStory;
}

/**
 * The real voice desk: ElevenLabs speaks the script. Audio tags in square
 * brackets are interpreted by eleven_v3 as delivery directions.
 */
export async function synthesize(text: string, s: Settings): Promise<string> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${s.elevenVoiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": s.elevenKey,
      },
      body: JSON.stringify({
        text,
        model_id: s.elevenModel,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 160)}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
