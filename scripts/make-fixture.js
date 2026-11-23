import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/util.js";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../test/fixtures");
await mkdir(fixtureDir, { recursive: true });

await run("ffmpeg", [
  "-y",
  "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30",
  "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=48000",
  "-t", "40",
  "-pix_fmt", "yuv420p",
  "-c:v", "libx264",
  "-c:a", "aac",
  resolve(fixtureDir, "sample_landscape.mp4"),
]);

await run("ffmpeg", [
  "-y",
  "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30",
  "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=48000",
  "-t", "40",
  "-pix_fmt", "yuv420p",
  "-c:v", "libx264",
  "-c:a", "aac",
  resolve(fixtureDir, "sample_portrait.mp4"),
]);

await run("ffmpeg", [
  "-y",
  "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30",
  "-t", "40",
  "-pix_fmt", "yuv420p",
  "-c:v", "libx264",
  resolve(fixtureDir, "sample_noaudio.mp4"),
]);
