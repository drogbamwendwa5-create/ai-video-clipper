import OpenAI, { toFile } from "openai";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { addCost, cached, retry } from "./util.js";

let injectedClient;
export function setTranscriptionClient(client) {
  injectedClient = client;
}

export async function transcribeChunks(chunks, { outDir, force = false } = {}) {
  const client = injectedClient ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  await mkdir(join(outDir, "transcripts"), { recursive: true });
  const workers = [];
  let next = 0;

  async function worker() {
    while (next < chunks.length) {
      const index = next++;
      const chunk = chunks[index];
      const cachePath = join(outDir, "transcripts", `chunk_${String(index).padStart(3, "0")}.json`);
      const response = await cached(cachePath, async () =>
        retry(async () => {
          const file = await toFile(await readFile(chunk.path), chunk.path);
          const result = await client.audio.transcriptions.create({
            file,
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word", "segment"],
          });
          return result;
        }),
      { force });
      responses[index] = { response, offset: chunk.offset };
    }
  }

  const responses = [];
  await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, () => worker()));

  const words = [];
  let language = "unknown";
  for (const entry of responses.filter(Boolean).sort((a, b) => a.offset - b.offset)) {
    language = entry.response.language ?? language;
    for (const word of entry.response.words ?? []) {
      const start = Number(word.start) + entry.offset;
      const end = Number(word.end) + entry.offset;
      words.push({
        word: String(word.word ?? "").trim(),
        start,
        end: Math.max(start, end),
      });
    }
  }

  words.sort((a, b) => a.start - b.start);
  const cleaned = [];
  for (const word of words) {
    if (!word.word) continue;
    const previous = cleaned[cleaned.length - 1];
    if (previous) {
      word.start = Math.max(word.start, previous.end);
      word.end = Math.max(word.end, word.start);
    }
    cleaned.push(word);
  }
  const duration = cleaned.length ? cleaned[cleaned.length - 1].end : 0;
  addCost("transcription", (duration / 60) * 0.006);
  return { language, duration, words: cleaned };
}
