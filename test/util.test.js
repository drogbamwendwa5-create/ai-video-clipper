import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "../src/util.js";

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
