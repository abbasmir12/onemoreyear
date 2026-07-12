/**
 * The print desk: ffmpeg.wasm, fully in the browser. Concatenates the
 * cast's voice segments, mixes in score and room tone, and cuts one
 * frame per segment into a documentary mp4.
 */
import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  ffmpegPromise ??= (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
    });
    return ffmpeg;
  })();
  return ffmpegPromise;
}

export type Reel = {
  /** one entry per segment, in order */
  segments: { audio: Uint8Array; frame: Uint8Array; duration: number; leadIn?: number }[];
  music?: { audio: Uint8Array; start: number; gain: number } | null;
  sfx?: { audio: Uint8Array; start: number; gain: number; duration: number }[];
  onLog?: (line: string) => void;
};

/** Returns an object URL for the finished mp4. */
export async function printDocumentary({ segments, music, sfx = [], onLog }: Reel): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const logger = ({ message }: { message: string }) => onLog?.(message);
  ffmpeg.on("log", logger);
  try {
    // write per-segment assets
    for (let i = 0; i < segments.length; i++) {
      // writeFile may transfer/detach the supplied ArrayBuffer. Never hand the
      // worker state-owned or cached buffers directly.
      await ffmpeg.writeFile(`s${i}.mp3`, segments[i].audio.slice());
      await ffmpeg.writeFile(`f${i}.png`, segments[i].frame.slice());
    }
    if (music) await ffmpeg.writeFile("music.mp3", music.audio.slice());
    for (let i = 0; i < sfx.length; i++) await ffmpeg.writeFile(`sfx${i}.mp3`, sfx[i].audio.slice());

    // 1 · spoken track: place performances on a timeline with deliberate
    // inter-voice breathing room for Foley and room tone.
    const voiceInputs = segments.flatMap((_, i) => ["-i", `s${i}.mp3`]);
    let voiceCursor = 0;
    const voiceChains = segments.map((segment, i) => {
      voiceCursor += segment.leadIn ?? 0;
      const start = voiceCursor;
      voiceCursor += segment.duration;
      const placed = Math.round(start * 1000);
      return `[${i}:a]adelay=${placed}|${placed}[v${i}]`;
    });
    const voiceMix = `${voiceChains.join(";")};${segments.map((_, i) => `[v${i}]`).join("")}amix=inputs=${segments.length}:duration=longest:normalize=0,alimiter=limit=.95[voice]`;
    await ffmpeg.exec([...voiceInputs, "-filter_complex", voiceMix, "-map", "[voice]", "voice.mp3"]);

    // 2 · the mix: voice leads, score and room tone under it
    const inputs = ["-i", "voice.mp3"];
    const chains: string[] = [];
    const mixed = ["[0:a]"];
    let idx = 1;
    if (music) {
      inputs.push("-i", "music.mp3");
      const musicDelay = Math.max(0, Math.round(music.start * 1000));
      chains.push(`[${idx}:a]volume=${music.gain.toFixed(2)},afade=t=in:d=1.2,adelay=${musicDelay}|${musicDelay}[m]`);
      mixed.push("[m]");
      idx++;
    }
    for (let i = 0; i < sfx.length; i++) {
      inputs.push("-stream_loop", "-1", "-i", `sfx${i}.mp3`);
      const startMs = Math.max(0, Math.round(sfx[i].start * 1000));
      const fadeOutAt = Math.max(0.5, sfx[i].duration - 1.2);
      chains.push(`[${idx}:a]atrim=0:${sfx[i].duration.toFixed(3)},afade=t=in:d=0.7,afade=t=out:st=${fadeOutAt.toFixed(3)}:d=1.2,volume=${sfx[i].gain.toFixed(2)},adelay=${startMs}|${startMs}[s${i}]`);
      mixed.push(`[s${i}]`);
      idx++;
    }
    // amix defaults to normalize=1, which silently divides every input's
    // volume by the input count (up to 9 here: voice + music + 7 sfx) — the
    // more sound effects the director adds, the quieter everything gets.
    // Disable that, then apply a deliberate master boost with a limiter so
    // voice, music, and sfx all rise together without clipping.
    const filter =
      (chains.length ? chains.join(";") + ";" : "") +
      `${mixed.join("")}amix=inputs=${mixed.length}:duration=first:dropout_transition=2:normalize=0,` +
      `afade=t=in:d=0.6,volume=1.4,alimiter=limit=0.95[a]`;
    await ffmpeg.exec([...inputs, "-filter_complex", filter, "-map", "[a]", "mix.mp3"]);

    // 3 · picture: each card is an independent timed input. This avoids the
    // concat-demuxer behavior that collapsed middle stills in some browsers.
    const imageInputs = segments.flatMap((segment, i) => ["-loop", "1", "-t", Math.max(0.5, (segment.leadIn ?? 0) + segment.duration).toFixed(3), "-i", `f${i}.png`]);
    const cards = segments.map((_, i) => `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=25[c${i}]`);
    const cardConcat = `${cards.join(";")};${segments.map((_, i) => `[c${i}]`).join("")}concat=n=${segments.length}:v=1:a=0[video]`;
    await ffmpeg.exec([
      ...imageInputs,
      "-i", "mix.mp3",
      "-filter_complex", cardConcat,
      "-map", "[video]",
      "-map", `${segments.length}:a`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      "out.mp4",
    ]);

    const out = await ffmpeg.readFile("out.mp4");
    const bytes = out instanceof Uint8Array ? out : new TextEncoder().encode(out as string);
    return URL.createObjectURL(new Blob([bytes.slice()], { type: "video/mp4" }));
  } finally {
    ffmpeg.off("log", logger);
  }
}
