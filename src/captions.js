import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { toAssTime } from "./util.js";

export function buildAss(words, clip, opts = {}) {
  const clipWords = (words ?? [])
    .filter((word) => word.start >= clip.start - 0.05 && word.end <= clip.end + 0.05)
    .map((word) => ({
      ...word,
      text: opts.uppercase ? word.word.toUpperCase() : word.word,
    }));

  const lines = [];
  let current = [];
  for (let index = 0; index < clipWords.length; index += 1) {
    const word = clipWords[index];
    current.push(word);
    const duration = word.end - current[0].start;
    const terminal = /[.!?]["')\]]?$/.test(word.text);
    if (current.length >= 4 || duration >= 1.4 || terminal) {
      lines.push(current);
      current = [];
    }
  }
  if (current.length) lines.push(current);

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Default,Arial,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,80,80,420,1",
    "",
    "[Events]",
    "Format: Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  let previousEnd = 0;
  for (const line of lines) {
    const startRaw = Math.max(0, line[0].start - clip.start);
    const naturalEnd = line[line.length - 1].end - clip.start;
    const start = Math.max(previousEnd, startRaw);
    let end = Math.min(naturalEnd + 0.15, clip.end - clip.start);
    if (line !== lines[lines.length - 1]) {
      const nextLine = lines[lines.indexOf(line) + 1];
      end = Math.min(end, Math.max(start, nextLine[0].start - clip.start));
    }
    end = Math.max(start, end);
    const text = line.map((word) => {
      const escaped = escapeAss(word.text);
      const duration = Math.max(0.01, word.end - word.start);
      return `{\\k${Math.round(duration * 100)}}${escaped}`;
    }).join(" ");
    header.push(`Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Default,,0,0,0,,${text}`);
    previousEnd = end;
  }
  return `${header.join("\n")}\n`;
}

function escapeAss(text) {
  return String(text).replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/[{}]/g, (char) => `\\${char}`);
}

export async function writeAss(words, clip, assPath, opts = {}) {
  await mkdir(dirname(assPath), { recursive: true });
  const tempPath = `${assPath}.${process.pid}.tmp`;
  await writeFile(tempPath, buildAss(words, clip, opts), "utf8");
  try {
    await rm(assPath, { force: true });
    await rename(tempPath, assPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
  return assPath;
}
