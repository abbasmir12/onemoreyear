/**
 * The print desk: ffmpeg.wasm, fully in the browser. Mixes narration,
 * score, and room tone, then prints the frame + mix as an mp4.
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

export type FilmInputs = {
  frame: Uint8Array; // png/jpeg still
  narration: Uint8Array; // mp3
  music?: Uint8Array | null; // mp3, optional
  sfx?: Uint8Array | null; // mp3, optional
  onLog?: (line: string) => void;
};

/** Returns an object URL for the finished mp4. */
export async function printFilm({ frame, narration, music, sfx, onLog }: FilmInputs): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const logger = ({ message }: { message: string }) => onLog?.(message);
  ffmpeg.on("log", logger);
  try {
    await ffmpeg.writeFile("frame.png", frame);
    await ffmpeg.writeFile("narration.mp3", narration);
    if (music) await ffmpeg.writeFile("music.mp3", music);
    if (sfx) await ffmpeg.writeFile("sfx.mp3", sfx);

    // mix the audio desks — narration leads, score and room tone under it
    const inputs = ["-i", "narration.mp3"];
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

    // print: still frame + mix → mp4
    await ffmpeg.exec([
      "-loop", "1",
      "-i", "frame.png",
      "-i", "mix.mp3",
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black",
      "-c:v", "libx264",
      "-tune", "stillimage",
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
