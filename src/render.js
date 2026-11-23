import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { run } from "./util.js";

export function buildFilter(probe, assRelName = "sub.ass") {
  const video = probe.width >= probe.height
    ? "crop='ih*9/16':ih:(iw-oh*9/16)/2:0,scale=1080:1920"
    : "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
  return `${video},subtitles=${assRelName}`;
}

export async function renderClip({ input, probe, clip, assPath, outPath }) {
  const duration = clip.end - clip.start;
  if (!Number.isFinite(clip.start) || clip.start < 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error("Clip start time or duration is invalid.");
  }
  if (!probe.hasAudio) throw new Error("Input has no audio stream.");

  await mkdir(dirname(outPath), { recursive: true });
  const tempDir = join(process.cwd(), `.clipper-render-${process.pid}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  const tempAss = join(tempDir, "sub.ass");
  const tempOutput = join(tempDir, "output.mp4");
  try {
    await copyFile(assPath, tempAss);
    await run("ffmpeg", [
      "-y", "-ss", String(clip.start), "-i", input, "-t", String(duration),
      "-vf", buildFilter(probe),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", tempOutput,
    ], { cwd: tempDir });
    await rm(outPath, { force: true });
    await rename(tempOutput, outPath);
  } catch (error) {
    await rm(tempOutput, { force: true });
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
  return outPath;
}
