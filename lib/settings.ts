export type Settings = {
  geminiKey: string;
  geminiModel: string;
  elevenKey: string;
  elevenModel: string;
  elevenVoiceId: string;
};

export const DEFAULTS: Settings = {
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",
  elevenKey: "",
  elevenModel: "eleven_v3",
  // "George" — a low, warm premade ElevenLabs voice
  elevenVoiceId: "JBFqnCBsd6RMkjVDRZzb",
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
