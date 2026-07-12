export type Settings = {
  geminiKey: string;
  geminiModel: string;
  geminiImageModel: string;
  elevenKey: string;
  elevenModel: string;
  elevenVoiceId: string;
  /** film frame source: AI-generated or the house procedural art */
  imageSource: "ai" | "art";
};

export const DEFAULTS: Settings = {
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",
  geminiImageModel: "gemini-2.5-flash-image",
  elevenKey: "",
  elevenModel: "eleven_v3",
  // "George" — a low, warm premade ElevenLabs voice
  elevenVoiceId: "JBFqnCBsd6RMkjVDRZzb",
  imageSource: "ai",
};

const KEY = "onemoreyear.settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
