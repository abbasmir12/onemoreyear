export type Settings = {
  /** OpenRouter (OpenAI-compatible) — preferred provider when set */
  openrouterKey: string;
  openrouterModel: string;
  openrouterImageModel: string;
  /** Google direct — used when no OpenRouter key */
  geminiKey: string;
  geminiModel: string;
  geminiImageModel: string;
  elevenKey: string;
  elevenModel: string;
  elevenVoiceId: string;
  /** film frame source */
  imageSource: "ai" | "stock" | "upload" | "art";
};

export const DEFAULTS: Settings = {
  openrouterKey: "",
  openrouterModel: "google/gemini-2.5-flash",
  openrouterImageModel: "google/gemini-2.5-flash-image",
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",
  geminiImageModel: "gemini-2.5-flash-image",
  elevenKey: "",
  elevenModel: "eleven_v3",
  // "George" — a low, warm premade ElevenLabs voice (the narrator)
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

/** can the director work? either provider will do */
export const hasDirector = (s: Settings | null) => !!(s?.openrouterKey || s?.geminiKey);
