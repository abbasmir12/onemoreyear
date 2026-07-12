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
  segments: { audio: Uint8Array; frame: Uint8Array; duration: number }[];
  music?: Uint8Array | null;
  sfx?: Uint8Array | null;
  onLog?: (line: string) => void;
};

/** Returns an object URL for the finished mp4. */
export async function printDocumentary({ segments, music, sfx, onLog }: Reel): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const logger = ({ message }: { message: string }) => onLog?.(message);
  ffmpeg.on("log", logger);
  try {
    // write per-segment assets
    for (let i = 0; i < segments.length; i++) {
      await ffmpeg.writeFile(`s${i}.mp3`, segments[i].audio);
      await ffmpeg.writeFile(`f${i}.png`, segments[i].frame);
    }
    if (music) await ffmpeg.writeFile("music.mp3", music);
    if (sfx) await ffmpeg.writeFile("sfx.mp3", sfx);

    // 1 · the spoken track: concat every voice segment
    const audioList = segments.map((_, i) => `file 's${i}.mp3'`).join("\n");
    await ffmpeg.writeFile("audio.txt", audioList);
    await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "audio.txt", "-c:a", "copy", "voice.mp3"]);

    // 2 · the mix: voice leads, score and room tone under it
    const inputs = ["-i", "voice.mp3"];
    const chains: string[] = [];
    const mixed = ["[0:a]"];
    let idx = 1;
    if (music) {
      inputs.push("-i", "music.mp3");
      chains.push(`[${idx}:a]volume=0.22[m]`);
      mixed.push("[m]");
      idx++;
    }
    if (sfx) {
      inputs.push("-i", "sfx.mp3");
      chains.push(`[${idx}:a]volume=0.45,aloop=loop=-1:size=2e9[s]`);
      mixed.push("[s]");
      idx++;
    }
    const filter =
      (chains.length ? chains.join(";") + ";" : "") +
      `${mixed.join("")}amix=inputs=${mixed.length}:duration=first:dropout_transition=2,` +
      `afade=t=in:d=0.6[a]`;
    await ffmpeg.exec([...inputs, "-filter_complex", filter, "-map", "[a]", "mix.mp3"]);

    // 3 · the picture: one frame per segment, held for its spoken length
    const frameList =
      "ffconcat version 1.0\n" +
      segments.map((seg, i) => `file 'f${i}.png'\nduration ${Math.max(0.5, seg.duration).toFixed(3)}`).join("\n") +
      `\nfile 'f${segments.length - 1}.png'\n`;
    await ffmpeg.writeFile("frames.txt", frameList);

    await ffmpeg.exec([
      "-f", "concat", "-safe", "0",
      "-i", "frames.txt",
      "-i", "mix.mp3",
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,fps=25",
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
