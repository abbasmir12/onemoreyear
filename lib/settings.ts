import { DEFAULT_NARRATOR_ID } from "./voices";

export type Settings = {
  geminiKey: string;
  geminiModel: string;
  geminiImageModel: string;
  elevenModel: string;
  elevenVoiceId: string;
  /** film frame source */
  imageSource: "ai" | "stock" | "upload" | "art";
};

export const DEFAULTS: Settings = {
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",
  geminiImageModel: "gemini-2.5-flash-image",
  elevenModel: "eleven_v3",
  // The deep house voice — every selectable voice comes from our curated allowlist.
  elevenVoiceId: DEFAULT_NARRATOR_ID,
  imageSource: "stock",
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
export const hasDirector = (s: Settings | null) => !!s?.geminiKey;
