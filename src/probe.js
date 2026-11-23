import { stat } from "node:fs/promises";
import { run } from "./util.js";

function fraction(value) {
  if (!value || value === "0/0") return 0;
  const [numerator, denominator] = value.split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

export async function probe(inputPath) {
  try {
    await stat(inputPath);
  } catch {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_streams",
    "-show_format",
    inputPath,
  ]);
  const media = JSON.parse(stdout);
  const video = media.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("Input has no video stream.");

  const audio = media.streams?.some((stream) => stream.codec_type === "audio");
  if (!audio) throw new Error("Input has no audio stream.");

  const duration = Number(media.format?.duration);
  if (!Number.isFinite(duration) || duration < 30) {
    throw new Error("Video must be at least 30 seconds long.");
  }

  const rotationTag = Number(video.tags?.rotate);
  const matrixRotation = video.side_data_list?.find((side) =>
    String(side.rotation).length,
  )?.rotation;
  const rotation = Number.isFinite(matrixRotation)
    ? Math.abs(Number(matrixRotation))
    : (Number.isFinite(rotationTag) ? Math.abs(rotationTag) : 0);
  const swap = rotation === 90 || rotation === 270;

  return {
    duration,
    width: swap ? Number(video.height) : Number(video.width),
    height: swap ? Number(video.width) : Number(video.height),
    fps: fraction(video.r_frame_rate) || fraction(video.avg_frame_rate),
    hasAudio: true,
    rotation,
  };
}
