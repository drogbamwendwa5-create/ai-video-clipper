# Module contracts

All time values are seconds. Functions that invoke external processes or providers are asynchronous and reject with an `Error` containing a concise human-readable message. JavaScript modules use ES modules.

## Data types

```js
/**
 * @typedef {object} Probe
 * @property {number} duration Video duration in seconds.
 * @property {number} width Display width in pixels, accounting for rotation.
 * @property {number} height Display height in pixels, accounting for rotation.
 * @property {number} fps Frames per second.
 * @property {boolean} hasAudio Whether the input contains an audio stream.
 * @property {number} rotation Video rotation in degrees.
 */

/**
 * @typedef {object} Word
 * @property {string} word Recognized text for this word.
 * @property {number} start Start time relative to the original video.
 * @property {number} end End time relative to the original video.
 */

/**
 * @typedef {object} Sentence
 * @property {number} id One-based sentence identifier.
 * @property {string} text Sentence text.
 * @property {number} start Start time relative to the original video.
 * @property {number} end End time relative to the original video.
 */

/**
 * @typedef {object} Transcript
 * @property {string} language Detected language.
 * @property {number} duration Transcript duration in seconds.
 * @property {Word[]} words Word-level transcript.
 * @property {Sentence[]} sentences Sentence-level transcript.
 */

/**
 * @typedef {object} Clip
 * @property {number} index One-based output clip index.
 * @property {number} startSentenceId First included sentence identifier.
 * @property {number} endSentenceId Last included sentence identifier.
 * @property {number} start Clip start time in the original video.
 * @property {number} end Clip end time in the original video.
 * @property {string} title Short clip title.
 * @property {string} hook Opening hook.
 * @property {number} score Editorial score.
 * @property {string} reason Reason for selecting this clip.
 */
```

## Module A: media probe and audio

- `probe(inputPath: string): Promise<Probe>` — Reads media metadata. Rejects inputs without audio or with duration under 30 seconds.
- `extractAudio(inputPath: string, outDir: string): Promise<string>` — Extracts mono 16 kHz audio and returns its path.
- `splitAudio(audioPath: string, outDir: string, chunkSeconds?: number): Promise<Array<{ path: string, offset: number }>>` — Splits audio into chunks and returns each chunk's original-audio offset.

## Module B: transcription and sentences

- `transcribeChunks(chunks: Array<{ path: string, offset: number }>, options: { outDir: string, force?: boolean }): Promise<{ language: string, duration: number, words: Word[] }>` — Transcribes audio chunks and returns word-level timestamps relative to the original video.
- `buildSentences(words: Word[]): Sentence[]` — Groups word-level timestamps into sentence records.

## Module C: LLM and clip selection

- `generateJson(input: { system: string, user: string, schema: import("zod").ZodType }): Promise<unknown>` — Requests structured model output and validates it using the provided Zod schema.
- `selectClips(input: { sentences: Sentence[], duration: number, count: number, min: number, max: number }): Promise<Clip[]>` — Selects non-overlapping candidate clips, sorted by start time and indexed from one.

## Module D: captions

- `buildAss(words: Word[], clip: Clip, options?: { uppercase?: boolean }): string` — Generates an ASS subtitle document with vertical-video styling and synchronized word highlighting.
- `writeAss(words: Word[], clip: Clip, assPath: string, options?: { uppercase?: boolean }): Promise<string>` — Atomically writes the ASS subtitle document and returns its path.

## Module E: rendering

- `renderClip(input: { input: string, probe: Probe, clip: Clip, assPath: string, outPath: string }): Promise<string>` — Cuts a clip, crops/scales it to 9:16, burns in subtitles, and returns the output path.

## Shared utility

- `run(cmd: string, args: string[], options?: import("node:child_process").SpawnOptions): Promise<{ stdout: string, stderr: string }>` — Runs a process directly (never through a shell) and captures its output.

## Output layout

```text
out/
  audio.mp3
  chunks/
  transcript.json
  clips.json
  clip_01.mp4
  clip_01.ass
  run.log
```
