import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const fixturesDir = new URL("./fixtures/", import.meta.url);

async function loadFixture(name) {
  const contents = await readFile(new URL(name, fixturesDir), "utf8");
  return JSON.parse(contents);
}

test("mock media fixture describes a video probe result", async () => {
  const fixture = await loadFixture("sample-video.mock.json");

  assert.equal(typeof fixture.path, "string");
  assert.equal(typeof fixture.duration, "number");
  assert.equal(typeof fixture.width, "number");
  assert.equal(typeof fixture.height, "number");
  assert.equal(typeof fixture.hasAudio, "boolean");
  assert.equal(typeof fixture.rotation, "number");
});

test("Whisper fixture contains word timestamps", async () => {
  const fixture = await loadFixture("whisper.json");

  assert.equal(typeof fixture.language, "string");
  assert.ok(Array.isArray(fixture.words));
  assert.ok(fixture.words.length > 0);
  for (const word of fixture.words) {
    assert.equal(typeof word.word, "string");
    assert.equal(typeof word.start, "number");
    assert.equal(typeof word.end, "number");
  }
});

test("LLM fixture contains sentence-id clip candidates", async () => {
  const fixture = await loadFixture("llm_response.json");

  assert.ok(Array.isArray(fixture.clips));
  assert.ok(fixture.clips.length > 0);
  for (const clip of fixture.clips) {
    assert.equal(typeof clip.start_sentence_id, "number");
    assert.equal(typeof clip.end_sentence_id, "number");
    assert.equal(typeof clip.title, "string");
    assert.equal(typeof clip.hook, "string");
    assert.equal(typeof clip.score, "number");
    assert.equal(typeof clip.reason, "string");
  }
});
