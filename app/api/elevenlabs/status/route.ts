import { NextResponse } from "next/server";
import { elevenRequest } from "@/lib/elevenlabs-server";

export async function GET() {
  try {
    const response = await elevenRequest("/v1/user/subscription");
    if (!response.ok) return NextResponse.json({ ready: false, error: `ElevenLabs ${response.status}` }, { status: 503 });
    const data = await response.json();
    const used = Number(data.character_count || 0);
    const limit = Number(data.character_limit || 0);
    return NextResponse.json({ ready: data.status === "active" || data.status === "trialing" || data.status === "free", tier: data.tier, used, limit, remaining: Math.max(0, limit - used) });
  } catch {
    return NextResponse.json({ ready: false, error: "ElevenLabs is not configured" }, { status: 503 });
  }
}
