import { elevenRequest, upstream } from "@/lib/elevenlabs-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown; milliseconds?: unknown; mode?: unknown } | null;
  const modes = ["instrumental", "vocal", "hybrid"];
  if (!body || typeof body.prompt !== "string" || body.prompt.length < 3 || body.prompt.length > 1000 || typeof body.milliseconds !== "number" || typeof body.mode !== "string" || !modes.includes(body.mode)) return Response.json({ error: "Invalid music request" }, { status: 400 });
  const response = await elevenRequest("/v1/music?output_format=mp3_48000_192", { method: "POST", body: JSON.stringify({ prompt: body.prompt, music_length_ms: Math.min(90000, Math.max(10000, Math.round(body.milliseconds))), model_id: "music_v2", force_instrumental: body.mode === "instrumental" }) });
  return upstream(response);
}
