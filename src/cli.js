import "dotenv/config";
import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { probe } from "./probe.js";
import { extractAudio, splitAudio } from "./audio.js";
import { transcribeChunks } from "./transcribe.js";
import { buildSentences } from "./sentences.js";
import { selectClips } from "./select.js";
import { writeAss } from "./captions.js";
import { renderClip } from "./render.js";
import { cached, checkBinaries, getCostSummary, log } from "./util.js";

export async function main(argv = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      count: { type: "string", default: "5" },
      min: { type: "string", default: "20" },
      max: { type: "string", default: "60" },
      out: { type: "string", default: "./out" },
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      uppercase: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      url: { type: "string" },
    },
  });
  let input = positionals[0];
  if (!input && values.url) {
    const { downloadYouTube } = await import("./youtube.js");
    input = await downloadYouTube(values.url, join(values.out, "downloads"));
  }
  if (!input) throw new Error("Usage: node src/cli.js <video.mp4> [--url <youtube-url>] [--count 5] [--out ./out]");
  await checkBinaries();
  await mkdir(values.out, { recursive: true });

  log("probe", input);
  const media = await probe(input);
  log("audio", "extracting");
  await extractAudio(input, values.out);
  const chunks = await splitAudio(join(values.out, "audio.mp3"), values.out);
  log("transcribe", "transcribing audio chunks");
  const transcript = await cached(join(values.out, "transcript.json"), async () => {
    const result = await transcribeChunks(chunks, { outDir: values.out, force: values.force });
    return { language: result.language, duration: media.duration, words: result.words, sentences: [] };
  }, { force: values.force });
  transcript.duration = media.duration;
  transcript.sentences = buildSentences(transcript.words);

  log("select", "choosing clips");
  const clips = await cached(join(values.out, "clips.json"), () =>
    selectClips({
      sentences: transcript.sentences,
      duration: media.duration,
      count: Number(values.count),
      min: Number(values.min),
      max: Number(values.max),
    }), { force: values.force });
  if (values["dry-run"]) {
    log("dry-run", "stopped after clips.json");
    return clips;
  }

  for (const clip of clips) {
    log("render", `clip ${String(clip.index).padStart(2, "0")}`);
    const assPath = join(values.out, `clip_${String(clip.index).padStart(2, "0")}.ass`);
    const outPath = join(values.out, `clip_${String(clip.index).padStart(2, "0")}.mp4`);
    await writeAss(transcript.words, clip, assPath, { uppercase: values.uppercase });
    await renderClip({ input, probe: media, clip, assPath, outPath });
  }

  const summary = {
    clips,
    cost: getCostSummary(),
  };
  const text = JSON.stringify(summary, null, 2);
  await writeFile(join(values.out, "run.log"), text);
  log("done", `${clips.length} clips`);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    if (process.argv.includes("--verbose")) console.error(error.stack);
    else console.error(error.message);
    process.exitCode = 1;
  });
}
