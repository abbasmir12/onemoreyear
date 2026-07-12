import { isHouseVoiceId } from "@/lib/voices";
import { elevenRequest, upstream } from "@/lib/elevenlabs-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { text?: unknown; voiceId?: unknown } | null;
  if (!body || typeof body.text !== "string" || body.text.length < 2 || body.text.length > 600 || typeof body.voiceId !== "string" || !isHouseVoiceId(body.voiceId)) return Response.json({ error: "Invalid TTS request" }, { status: 400 });
  const response = await elevenRequest(`/v1/text-to-speech/${encodeURIComponent(body.voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    body: JSON.stringify({ text: body.text, model_id: "eleven_v3", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, speed: 0.96, use_speaker_boost: true } }),
  });
  return upstream(response);
}
