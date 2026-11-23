import { z } from "zod";
import { fmtMmSs } from "./util.js";
import { generateJson } from "./llm.js";

export const EDITOR_SYSTEM_PROMPT = `You are an editor of short-form vertical videos. Choose segments that stand alone without outside context, open with a strong hook within the first 3 seconds, contain one complete idea, and end on a natural conclusion. Avoid intros, sponsor reads, housekeeping, and small talk. Each clip must be between min and max seconds. Return only start_sentence_id and end_sentence_id, title (max 60 chars), hook (the opening line), score 1 to 10, and one-sentence reason. Ask for twice the requested count.`;

export async function selectClips({ sentences, duration, count, min, max }) {
  const schema = z.object({
    clips: z.array(z.object({
      start_sentence_id: z.number().int(),
      end_sentence_id: z.number().int(),
      title: z.string().max(60),
      hook: z.string(),
      score: z.number().min(1).max(10),
      reason: z.string(),
    })),
  });
  const result = await generateJson({
    system: EDITOR_SYSTEM_PROMPT,
    user: `min=${min} max=${max} count=${count}\n${sentences.map((sentence) => `[${sentence.id}] (${fmtMmSs(sentence.start)}) ${sentence.text}`).join("\n")}`,
    schema,
  });

  const byId = new Map(sentences.map((sentence) => [sentence.id, sentence]));
  const candidates = [];
  for (const item of result.clips ?? []) {
    const startSentence = byId.get(item.start_sentence_id);
    const endSentence = byId.get(item.end_sentence_id);
    if (!startSentence || !endSentence) continue;
    let start = Math.max(0, startSentence.start - 0.25);
    let end = Math.min(duration, endSentence.end + 0.4);
    while (end - start > max && endSentence) {
      const previous = [...byId.values()].filter((sentence) => sentence.id < endSentence.id).at(-1);
      if (!previous) break;
      end = previous.end + 0.4;
    }
    if (end - start < min) continue;
    candidates.push({
      index: 0,
      startSentenceId: startSentence.id,
      endSentenceId: endSentence.id,
      start,
      end,
      title: item.title,
      hook: item.hook,
      score: item.score,
      reason: item.reason,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const candidate of candidates) {
    const overlap = kept.some((existing) => {
      const overlapStart = Math.max(existing.start, candidate.start);
      const overlapEnd = Math.min(existing.end, candidate.end);
      const overlapLength = Math.max(0, overlapEnd - overlapStart);
      return overlapLength / (candidate.end - candidate.start) > 0.2;
    });
    if (!overlap) kept.push(candidate);
  }
  return kept
    .sort((a, b) => a.start - b.start)
    .slice(0, count)
    .map((clip, index) => ({ ...clip, index: index + 1 }));
}
