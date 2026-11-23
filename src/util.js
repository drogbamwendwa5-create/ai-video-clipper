import { spawn } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const costs = new Map();

export async function checkBinaries() {
  for (const binary of ["ffmpeg", "ffprobe"]) {
    try {
      await run(binary, ["-version"]);
    } catch {
      throw new Error(
        `Missing ${binary}. Install FFmpeg and ensure ffmpeg and ffprobe are on PATH.`,
      );
    }
  }
}

export function log(stage, message) {
  const stamp = new Date().toISOString();
  process.stdout.write(`[${stamp}] ${stage}: ${message}\n`);
}

export function addCost(label, usd) {
  const amount = Number.isFinite(usd) ? usd : 0;
  costs.set(label, (costs.get(label) ?? 0) + amount);
}

export function getCostSummary() {
  const items = [...costs.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, usd]) => ({ label, usd }));
  return {
    items,
    totalUsd: items.reduce((total, item) => total + item.usd, 0),
  };
}

export async function retry(fn, { tries = 3, baseMs = 250 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === tries) break;
      const jitter = 0.5 + Math.random();
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** (attempt - 1) * jitter));
    }
  }
  throw lastError;
}

export async function cached(filePath, producerFn, { force = false } = {}) {
  if (!force) {
    try {
      const { readFile } = await import("node:fs/promises");
      return JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const result = await producerFn();
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
  return result;
}

export function fmtMmSs(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const wholeSeconds = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
}

export function toAssTime(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const roundedCentiseconds = Math.round(safe * 100);
  const hours = Math.floor(roundedCentiseconds / 360000);
  const minutes = Math.floor((roundedCentiseconds % 360000) / 6000);
  const secs = Math.floor((roundedCentiseconds % 6000) / 100);
  const centiseconds = roundedCentiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

/**
 * Runs a process without a shell and captures its stdout and stderr.
 *
 * @param {string} cmd Executable to run.
 * @param {string[]} args Arguments passed directly to the executable.
 * @param {import("node:child_process").SpawnOptions} [options] Spawn options.
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, options);
    } catch (error) {
      reject(new Error(`Failed to execute ${cmd}: ${error.message}`, { cause: error }));
      return;
    }

    let stdout = "";
    let stderr = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      reject(new Error(`Failed to execute ${cmd}: ${error.message}`, { cause: error }));
    });
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const stderrTail = stderr.split(/\r?\n/).filter(Boolean).slice(-20).join("\n");
      const status = signal ? `signal ${signal}` : `exit code ${code}`;
      const detail = stderrTail ? `\n${stderrTail}` : "";
      reject(new Error(`${cmd} failed with ${status}.${detail}`));
    });
  });
}
