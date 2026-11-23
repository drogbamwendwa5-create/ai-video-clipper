import assert from "node:assert/strict";
import { test } from "node:test";
import { validateYouTubeUrl } from "../src/youtube.js";

test("accepts YouTube watch and short URLs", () => {
  assert.equal(
    validateYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assert.match(validateYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), /youtu\.be/);
  assert.match(validateYouTubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ"), /shorts/);
});

test("rejects non-YouTube and incomplete URLs", () => {
  assert.throws(
    () => validateYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ"),
    /Only YouTube/,
  );
  assert.throws(
    () => validateYouTubeUrl("https://youtube.com/shorts"),
    /video ID/,
  );
});
