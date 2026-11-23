import { test } from "node:test";
import assert from "node:assert/strict";

test("all module stubs import", async () => {
  const modules = [
    "../src/probe.js",
    "../src/audio.js",
    "../src/transcribe.js",
    "../src/sentences.js",
    "../src/llm.js",
    "../src/select.js",
    "../src/captions.js",
    "../src/render.js",
  ];
  for (const modulePath of modules) {
    assert.equal(typeof (await import(modulePath)), "object");
  }
});
