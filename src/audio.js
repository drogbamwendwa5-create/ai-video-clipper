import { mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { run } from "./util.js";

export async function extractAudio(inputPath, outDir) {
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "audio.mp3");
  const tempPath = join(outDir, `.audio-${process.pid}.mp3`);
  await run("ffmpeg", [
    "-y", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k",
    tempPath,
  ]);
  await rm(outPath, { force: true });
  await import("node:fs/promises").then(({ rename }) => rename(tempPath, outPath));
  return resolve(outPath);
}

export async function splitAudio(audioPath, outDir, chunkSeconds = 600) {
  const chunksDir = join(outDir, "chunks");
  await rm(chunksDir, { recursive: true, force: true });
  await mkdir(chunksDir, { recursive: true });
  await run("ffmpeg", [
    "-y", "-i", audioPath, "-f", "segment",
    "-segment_time", String(chunkSeconds), "-c", "copy",
    join(chunksDir, "chunk_%03d.mp3"),
  ]);

  const names = (await readdir(chunksDir))
    .filter((name) => /^chunk_\d{3}\.mp3$/.test(name))
    .sort();
  const chunks = [];
  let cumulative = 0;
  for (let index = 0; index < names.length; index += 1) {
    const path = join(chunksDir, names[index]);
    let duration = chunkSeconds;
    try {
      const { stdout } = await run("ffprobe", [
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", path,
      ]);
      const parsed = Number(stdout.trim());
      if (Number.isFinite(parsed)) duration = parsed;
    } catch {}
    chunks.push({ path: resolve(path), offset: cumulative });
    cumulative += duration;
  }
  return chunks;
}
