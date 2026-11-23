import { spawn } from "node:child_process";

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
