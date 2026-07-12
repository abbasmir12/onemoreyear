/**
 * Curated house cast for the open-source studio.
 *
 * These are the only ElevenLabs voices One More Year will send to TTS.
 * We intentionally avoid guessing identity, gender, accent, or age where the
 * collection owner has not supplied that information.
 */
export const HOUSE_VOICES = [
  { id: "hD8aK7CmEPgH3mbFO08e", label: "Deep narrator", note: "deep, grounded" },
  { id: "DcLiO3XaUWTu3gyon6hW", label: "House voice 02", note: "curated cast" },
  { id: "hfqsl1OMbiWsgPpht3el", label: "House voice 03", note: "curated cast" },
  { id: "vDchjyOZZytffNeZXfZK", label: "House voice 04", note: "curated cast" },
  { id: "eZm9vdjYgL9PZKtf7XMM", label: "House voice 05", note: "curated cast" },
  { id: "A5ZB2U0hi4Q69aAf1CMf", label: "House voice 06", note: "curated cast" },
  { id: "FWFvA8So0XWjEaAR0MLQ", label: "House voice 07", note: "curated cast" },
  { id: "h1K1TprdvtRaF85PAeFm", label: "House voice 08", note: "curated cast" },
  { id: "iDGAM9cRJP6MBcIA948c", label: "House voice 09", note: "curated cast" },
  { id: "6u6JbqKdaQy89ENzLSju", label: "House voice 10", note: "female voice" },
  { id: "tnVKC6NjwhdRxoQIfKue", label: "House voice 11", note: "female voice" },
] as const;

export type HouseVoiceId = (typeof HOUSE_VOICES)[number]["id"];
export const DEFAULT_NARRATOR_ID: HouseVoiceId = HOUSE_VOICES[0].id;
const HOUSE_VOICE_IDS = new Set<string>(HOUSE_VOICES.map((voice) => voice.id));

export function isHouseVoiceId(id: string): id is HouseVoiceId {
  return HOUSE_VOICE_IDS.has(id);
}

export function houseVoiceLabel(id: string) {
  return HOUSE_VOICES.find((voice) => voice.id === id)?.label ?? "Unknown voice";
}
