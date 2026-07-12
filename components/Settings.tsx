"use client";

import { useEffect, useState } from "react";
import { loadSettings, saveSettings, DEFAULTS, type Settings } from "@/lib/settings";

const FIELDS: {
  key: keyof Settings;
  label: string;
  hint: string;
  placeholder: string;
  secret?: boolean;
}[] = [
  {
    key: "geminiKey",
    label: "Gemini API key",
    hint: "aistudio.google.com → Get API key. Powers the director: your story is written live.",
    placeholder: "AIza…",
    secret: true,
  },
  {
    key: "geminiModel",
    label: "Gemini model",
    hint: "any generateContent model works",
    placeholder: DEFAULTS.geminiModel,
  },
  {
    key: "elevenKey",
    label: "ElevenLabs API key",
    hint: "elevenlabs.io → Profile → API keys. Powers the voice: your proof is spoken aloud.",
    placeholder: "sk_…",
    secret: true,
  },
  {
    key: "elevenModel",
    label: "ElevenLabs model",
    hint: "eleven_v3 reads [audio tags]; eleven_multilingual_v2 is a safe fallback",
    placeholder: DEFAULTS.elevenModel,
  },
  {
    key: "elevenVoiceId",
    label: "Voice ID",
    hint: "any voice from your ElevenLabs voice library",
    placeholder: DEFAULTS.elevenVoiceId,
  },
];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setS(loadSettings());
  }, []);

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
            Connect your own keys and the studio runs for real: Gemini writes your story, ElevenLabs
            speaks it. Keys are stored in <b>this browser&rsquo;s localStorage only</b> — they never
            touch a server. Leave them empty to keep the simulation.
          </p>

          {FIELDS.map((f) => (
            <div key={f.key}>
              <label
                htmlFor={`set-${f.key}`}
                className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
              >
                {f.label}
              </label>
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
              <p className="mt-1.5 text-[0.7rem] text-black/50">{f.hint}</p>
            </div>
          ))}

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
