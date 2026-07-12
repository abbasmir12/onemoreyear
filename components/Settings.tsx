"use client";

import { useEffect, useState } from "react";
import { loadSettings, saveSettings, DEFAULTS, type Settings } from "@/lib/settings";
import { HOUSE_VOICES } from "@/lib/voices";

const FIELDS: {
  key: Exclude<keyof Settings, "imageSource">;
  label: string;
  hint: string;
  placeholder: string;
  secret?: boolean;
}[] = [
  {
    key: "geminiKey",
    label: "Gemini API key",
    hint: "aistudio.google.com → Get API key. Powers the director — writes your documentary live.",
    placeholder: "AIza…",
    secret: true,
  },
  {
    key: "geminiModel",
    label: "Gemini model",
    hint: "any generateContent model — writes the script",
    placeholder: DEFAULTS.geminiModel,
  },
  {
    key: "geminiImageModel",
    label: "Gemini image model",
    hint: "draws the frames when the frame source is set to AI",
    placeholder: DEFAULTS.geminiImageModel,
  },
  {
    key: "elevenVoiceId",
    label: "Narrator voice ID",
    hint: "the narrator's voice — selected from the studio's curated house cast",
    placeholder: DEFAULTS.elevenVoiceId,
  },
];

const IMAGE_SOURCES: { v: Settings["imageSource"]; label: string }[] = [
  { v: "ai", label: "AI — drawn per scene" },
  { v: "stock", label: "Stock — free photos" },
  { v: "upload", label: "Your own photos" },
  { v: "art", label: "House art" },
];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Settings>(() => loadSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    saveSettings(s);
    setSaved(true);
    setTimeout(onClose, 700);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-10"
      role="dialog"
      aria-label="Settings — the press room"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl border-4 border-black bg-white text-black">
        <div className="flex items-center justify-between border-b-4 border-black px-6 py-4">
          <p className="display text-3xl">The press room</p>
          <button
            onClick={onClose}
            className="px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-black hover:text-white"
          >
            ✕ close
          </button>
        </div>

        <div className="space-y-7 px-6 py-7">
          <p className="text-xs leading-relaxed text-black/70">
            The studio runs on your own keys. The director needs a <b>Gemini</b> key; ElevenLabs
            voices the cast. Its paid key is read from the server&rsquo;s
            <code> ELEVENLABS_API_KEY</code> environment variable and is never sent to the browser.
          </p>

          {FIELDS.map((f) => (
            <div key={f.key}>
              <label
                htmlFor={`set-${f.key}`}
                className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
              >
                {f.label}
              </label>
              {f.key === "elevenVoiceId" ? (
                <select
                  id={`set-${f.key}`}
                  value={s.elevenVoiceId}
                  onChange={(e) => setS({ ...s, elevenVoiceId: e.target.value })}
                  className="mt-2 w-full border-2 border-black/30 bg-white px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-black"
                >
                  {HOUSE_VOICES.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.label} — {voice.note}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`set-${f.key}`}
                  type={f.secret ? "password" : "text"}
                  value={s[f.key]}
                  onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-2 w-full border-2 border-black/30 bg-transparent px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-black"
                />
              )}
              <p className="mt-1.5 text-[0.7rem] text-black/50">{f.hint}</p>
            </div>
          ))}

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">Film frame source</p>
            <div className="mt-2 flex flex-wrap">
              {IMAGE_SOURCES.map(({ v, label }, i) => (
                <button
                  key={v}
                  onClick={() => setS({ ...s, imageSource: v })}
                  className={`border-2 border-black px-4 py-2 font-mono text-xs transition-colors ${
                    s.imageSource === v ? "bg-black text-white" : "hover:bg-black/10"
                  } ${i > 0 ? "border-l-0" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.7rem] text-black/50">
              one frame per scene — AI draws them, stock searches free photos (assetpipe), or bring
              your own
            </p>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={save}
              className="display bg-black px-8 py-3 text-2xl text-white transition-colors hover:bg-white hover:text-black hover:outline hover:outline-4 hover:outline-black"
            >
              {saved ? "✓ Saved" : "Save"}
            </button>
            <button
              onClick={() => setS({ ...DEFAULTS })}
              className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-black/50 hover:text-black"
            >
              reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
