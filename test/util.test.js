import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  cached,
  fmtMmSs,
  getCostSummary,
  retry,
  run,
  toAssTime,
  addCost,
} from "../src/util.js";

test("run captures stdout and stderr", async () => {
  const { stdout, stderr } = await run(process.execPath, [
    "-e",
    "process.stdout.write('out'); process.stderr.write('err');",
  ]);

  assert.equal(stdout, "out");
  assert.equal(stderr, "err");
});

test("run reports a non-zero exit and includes the end of stderr", async () => {
  await assert.rejects(
    run(process.execPath, [
      "-e",
      "for (let i = 0; i < 25; i++) console.error(`line ${i}`); process.exit(7);",
    ]),
    (error) => {
      assert.match(error.message, /exit code 7/);
      assert.match(error.message, /line 24/);
      assert.doesNotMatch(error.message, /line 4\n/);
      return true;
    },
  );
});

test("run reports executable startup failures", async () => {
  await assert.rejects(run("clipper-command-that-does-not-exist", []), /Failed to execute/);
});

test("fmtMmSs formats minutes and seconds", () => {
  assert.equal(fmtMmSs(0), "00:00");
  assert.equal(fmtMmSs(61.9), "01:01");
});

test("toAssTime rounds rather than truncating", () => {
  assert.equal(toAssTime(3661.239), "1:01:01.24");
});

test("cached writes atomically and reuses JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "clipper-cache-"));
  const file = join(dir, "result.json");
  let calls = 0;
  try {
    const first = await cached(file, async () => {
      calls += 1;
      return { ok: true };
    });
    const second = await cached(file, async () => {
      calls += 1;
      return { ok: false };
    });
    assert.deepEqual(first, { ok: true });
    assert.deepEqual(second, { ok: true });
    assert.equal(calls, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("retry succeeds after a transient failure", async () => {
  let attempts = 0;
  const value = await retry(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("transient");
    return "ready";
  }, { tries: 3, baseMs: 1 });
  assert.equal(value, "ready");
  assert.equal(attempts, 3);
});

test("cost summary totals tracked labels", () => {
  addCost("test-util", 0.125);
  addCost("test-util", 0.025);
  const summary = getCostSummary();
  assert.equal(summary.items.find((item) => item.label === "test-util")?.usd, 0.15);
  assert.equal(summary.totalUsd >= 0.15, true);
});
