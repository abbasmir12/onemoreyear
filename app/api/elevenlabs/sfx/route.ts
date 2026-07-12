import { elevenRequest, upstream } from "@/lib/elevenlabs-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown; seconds?: unknown } | null;
  if (!body || typeof body.prompt !== "string" || body.prompt.length < 3 || body.prompt.length > 500 || typeof body.seconds !== "number") return Response.json({ error: "Invalid sound request" }, { status: 400 });
  const response = await elevenRequest("/v1/sound-generation?output_format=mp3_44100_128", { method: "POST", body: JSON.stringify({ text: `${body.prompt}. Realistic environment, no dialogue, no narration, no music.`, duration_seconds: Math.min(5, Math.max(3, body.seconds)), prompt_influence: 0.45, model_id: "eleven_text_to_sound_v2", loop: false }) });
  return upstream(response);
}
