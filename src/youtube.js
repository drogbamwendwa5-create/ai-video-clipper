import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { run } from "./util.js";

export function validateYouTubeUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Enter a valid YouTube URL.");
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (!["youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"].includes(host)) {
    throw new Error("Only YouTube URLs are supported.");
  }
  if (host === "youtu.be" && !parsed.pathname.slice(1)) {
    throw new Error("YouTube video ID is missing.");
  }
  if (host !== "youtu.be" && !parsed.searchParams.get("v")) {
    const videoPath = parsed.pathname.match(/^\/(?:shorts|live)\/([^/?]+)/);
    if (!videoPath) throw new Error("YouTube URL must include a video ID.");
  }
  return parsed.href;
}

export async function downloadYouTube(url, outDir) {
  validateYouTubeUrl(url);
  await mkdir(outDir, { recursive: true });
  const tempPath = resolve(join(outDir, `source-${process.pid}-${Date.now()}.download.mp4`));
  const finalPath = resolve(join(outDir, "source.mp4"));
  try {
    await run("yt-dlp", [
      "--no-playlist",
      "--force-overwrites",
      "-f", "bv*+ba/b",
      "--merge-output-format", "mp4",
      "-o", tempPath,
      url,
    ]);
    const info = await stat(tempPath);
    if (!info.isFile() || info.size === 0) throw new Error("YouTube download produced no video.");
    await rm(finalPath, { force: true });
    await rename(tempPath, finalPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    if (/not recognized|ENOENT|spawn.*yt-dlp/i.test(error.message)) {
      throw new Error("Missing yt-dlp. Reinstall yt-dlp and ensure it is on PATH.");
    }
    throw error;
  }
  return finalPath;
}
